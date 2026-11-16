# -*- coding: utf-8 -*-
"""
main.py - API local e servidor do frontend do Cashboard.

Uso:  python -m uvicorn server.main:app --host 127.0.0.1 --port 8000
"""
import io
import json
import os
import threading
import webbrowser
from contextlib import asynccontextmanager
from datetime import date, datetime

from fastapi import Body, FastAPI, Query, Request
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import FileResponse, JSONResponse, PlainTextResponse, Response, StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import guide, metrics, store

WEB = store.APP_DIR / "web"


@asynccontextmanager
async def lifespan(_app):
    if os.environ.get("WD_OPEN_BROWSER") == "1":
        url = "http://localhost:" + os.environ.get("WD_PORT", "8000")
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    yield


app = FastAPI(title=store.APP_NAME, docs_url=None, redoc_url=None, lifespan=lifespan)


@app.exception_handler(store.StoreError)
async def store_error(_req, exc):
    return JSONResponse(status_code=exc.status, content={"erro": exc.msg})


@app.middleware("http")
async def cabecalhos_de_cache(request, call_next):
    resp = await call_next(request)
    # API sempre fresca; arquivos do site revalidam pelo ETag (resposta 304, sem baixar de novo)
    resp.headers["Cache-Control"] = "no-store" if request.url.path.startswith("/api/") else "no-cache"
    return resp


app.add_middleware(GZipMiddleware, minimum_size=1024)

# O painel so e recalculado quando algum arquivo da pasta, a configuracao ou o dia mudam.
_CACHE = {"chave": None, "dados": None, "json": None}


def _payload(cfg):
    fp = store.fingerprint(cfg)
    chave = (fp, date.today().isoformat(), json.dumps(cfg, sort_keys=True, default=str))
    if _CACHE["chave"] == chave:
        return _CACHE["dados"]
    tables = {n: store.read_table(n, cfg)[1] for n in store.TABLES}
    data = metrics.build(tables, store.read_parameters(cfg), cfg)
    data["fingerprint"] = fp
    data["pasta"] = store.describe_dir(store.data_dir(cfg))
    data["exemplo"] = data["pasta"]["sample"]
    _CACHE.update(chave=chave, dados=data, json=None)
    return data


# ---------------------------------------------------------------- configuracao
@app.get("/api/config")
def get_config():
    cfg = store.load_config()
    return {"data_directory": cfg["data_directory"], "append_only": bool(cfg["append_only"]),
            "parameters": store.read_parameters(cfg), "new_directory": store.NEW_DATA_DIR,
            **store.describe_dir(store.data_dir(cfg))}


@app.put("/api/config")
def put_config(body: dict = Body(...)):
    """Troca a pasta de dados ("data_directory"; com "create": true a pasta e criada) e grava
    parametros ("parameters": {"Meta da reserva de emergência": 9000, "Aporte mensal": 1000})."""
    if "data_directory" in body:
        pasta = str(body.get("data_directory") or "").strip()
        if not pasta:
            raise store.StoreError(400, "Informe o caminho da pasta de dados.")
        destino = store.resolve_dir(pasta)
        if not destino.is_dir():
            if not body.get("create"):
                raise store.StoreError(400, f"Pasta não encontrada: {destino}")
            try:
                destino.mkdir(parents=True, exist_ok=True)
            except OSError as e:
                raise store.StoreError(400, f"Não foi possível criar a pasta: {e}")
        store.save_config({"data_directory": pasta})
    if "parameters" in body:
        store.save_parameters(body.get("parameters") or {})
    return get_config()


# ---------------------------------------------------------------- leitura
@app.get("/api/state")
def state():
    return {"fingerprint": store.fingerprint(store.load_config())}


@app.get("/api/dashboard")
def dashboard():
    dados = _payload(store.load_config())
    if _CACHE["json"] is None or _CACHE["dados"] is not dados:
        _CACHE["json"] = json.dumps(dados, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    return Response(_CACHE["json"], media_type="application/json")


@app.get("/api/schema")
def schema():
    return store.public_schema()


@app.get("/api/table/{name}")
def table(name: str):
    cols, rows = store.read_table(name, store.load_config())
    return {"columns": cols, "rows": rows}


# ---------------------------------------------------------------- gravacao
@app.post("/api/table/{name}")
def add_row(name: str, body: dict = Body(...)):
    return store.append_row(name, body.get("row", {}), store.load_config())


@app.post("/api/table/{name}/rows")
def add_rows(name: str, body: dict = Body(...)):
    """Varias linhas de uma vez: {"rows": [{...}, {...}]}. Entram todas ou nenhuma."""
    return store.append_rows(name, body.get("rows") or [], store.load_config(), body.get("fonte"))


@app.put("/api/table/{name}/{row_id}")
def edit_row(name: str, row_id: int, body: dict = Body(...)):
    return store.update_row(name, row_id, body.get("hash", ""), body.get("row", {}),
                            store.load_config())


@app.delete("/api/table/{name}/{row_id}")
def remove_row(name: str, row_id: int, hash: str = Query(...)):
    return store.delete_row(name, row_id, hash, store.load_config())


@app.post("/api/import")
def import_text(body: dict = Body(...)):
    """Confere ("dry_run": true, o padrao) ou grava um bloco de texto colado, no formato do guia."""
    return store.import_text(body.get("text", ""), store.load_config(),
                             dry_run=body.get("dry_run", True) is not False)


# ---------------------------------------------------------------- para IAs
@app.get("/api/guia.md")
def guia_md(request: Request):
    return PlainTextResponse(guide.build(store.load_config(), str(request.base_url)),
                             media_type="text/markdown; charset=utf-8")


@app.get("/api/ia")
def ia(request: Request):
    cfg, base = store.load_config(), str(request.base_url)
    return {"pasta": str(store.data_dir(cfg)), "guia_arquivo": str(store.APP_DIR / "GUIA_IA.md"),
            "prompt_arquivos": guide.prompt_files(cfg, base), "prompt_chat": guide.prompt_chat(cfg)}


# ---------------------------------------------------------------- notas em Markdown
@app.get("/api/docs")
def docs():
    return store.list_docs(store.load_config())


@app.get("/api/doc")
def doc(path: str = Query(...)):
    return store.read_doc(path, store.load_config())


@app.put("/api/doc")
def save_doc(body: dict = Body(...)):
    return store.write_doc(body.get("path", ""), body.get("content", ""), store.load_config())


@app.delete("/api/doc")
def remove_doc(path: str = Query(...)):
    return store.delete_doc(path, store.load_config())


# ---------------------------------------------------------------- exportacao
def build_workbook(d):
    import openpyxl
    from openpyxl.styles import Font, PatternFill

    wb = openpyxl.Workbook()
    brl, pct = '"R$" #,##0.00', "0.00%"

    def sheet(title, header, rows, formats=None, first=False):
        ws = wb.active if first else wb.create_sheet()
        ws.title = title
        ws.append(header)
        for c in ws[1]:
            c.font = Font(bold=True, color="FFFFFF")
            c.fill = PatternFill("solid", fgColor="1F3864")
        for r in rows:
            ws.append(r)
        for col, fmt in (formats or {}).items():
            for cell in ws[col][1:]:
                cell.number_format = fmt
        for i, h in enumerate(header):
            largura = max([len(str(h))] + [len(str(r[i])) for r in rows if r[i] is not None])
            ws.column_dimensions[openpyxl.utils.get_column_letter(i + 1)].width = min(largura + 3, 48)
        return ws

    b, res = d["blocos"], d["resultado"]
    resumo = [["Data da carteira", d["snapshot"] or "sem investimentos"], ["Patrimônio total", b["total"]],
              ["Investimentos (sem a reserva)", b["base"]], ["Já investido", b["investido"]],
              ["Em conta, a investir", b["caixa"]], ["Reserva de emergência", b["reserva"]],
              ["Fora da carteira", b["fora"]],
              ["Lucro até agora (valor atual menos valor investido)", res["sobre_custo"]],
              ["Rendimento desde a primeira atualização (títulos sem valor investido)", res["observado"]],
              ["Lucro de vendas", res["realizado"]["total"]],
              ["Gerado em", datetime.now().isoformat(" ", "minutes")]]
    sheet("Resumo", ["Item", "Valor"], resumo, {"B": brl}, first=True)
    sheet("Investimentos", ["Nome", "Código", "Tipo", "Grupo", "Classe", "Quantidade", "Preço médio",
                            "Preço atual", "Valor atual", "Valor investido", "Lucro", "Lucro %", "Cálculo",
                            "Taxa ou índice", "Vencimento", "Fonte"],
          [[p["ativo"], p["ticker"], p["tipo"], p["bloco"], p["classe"], p["quantidade"],
            p["preco_medio"], p["preco_mercado"], p["valor"], p["custo"], p["resultado"],
            p["resultado_pct"], p["metodo"], p["indexador"], p["vencimento"], p["fonte"]]
           for p in d["posicoes"]],
          {"G": brl, "H": brl, "I": brl, "J": brl, "K": brl, "L": pct})
    sheet("Alocação", ["Classe", "Valor", "Hoje", "Meta", "Mínimo", "Máximo", "Situação",
                       "Falta para a meta"],
          [[l["classe"], l["valor"], l["pct"], l["alvo"], l["min"], l["max"], l["situacao"],
            l["falta"]] for l in d["alocacao"]["linhas"]],
          {"B": brl, "C": pct, "D": pct, "E": pct, "F": pct, "H": brl})
    sheet("Lucro por tipo", ["Tipo", "Valor atual", "Valor investido", "Lucro",
                             "Rendimento observado", "Investimentos", "Sem valor investido"],
          [[t["tipo"], t["valor"], t["custo"], t["sobre_custo"], t["observado"], t["n"],
            t["n_sem_dado"]] for t in res["por_tipo"]],
          {"B": brl, "C": brl, "D": brl, "E": brl})
    sheet("Gastos por mês", ["Mês", "Renda", "Fixo", "Variável", "Gastos", "Sobrou", "Quanto guardei"],
          [[g["mes"], g["renda"], g["fixo"], g["variavel"], g["gastos"], g["sobra"], g["taxa"]]
           for g in d["gastos"]],
          {"B": brl, "C": brl, "D": brl, "E": brl, "F": brl, "G": pct})
    ws = wb.create_sheet("Config")
    ws.append(["Parâmetro", "Valor", "Origem"])
    for nome, p in d["parametros"].items():
        ws.append([nome, p["valor"], p["origem"]])
    ws.append([])
    ws.append([d["config"]["disclaimer"]])
    return wb


@app.get("/api/export.xlsx")
def export_xlsx():
    d = _payload(store.load_config())
    if d.get("vazio"):
        raise store.StoreError(400, "Ainda não há dados para exportar.")
    buf = io.BytesIO()
    build_workbook(d).save(buf)
    buf.seek(0)
    nome = f"cashboard-{d['snapshot'] or d['hoje']}.xlsx"
    return StreamingResponse(
        buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nome}"'})


# ---------------------------------------------------------------- frontend
@app.get("/")
def index():
    return FileResponse(WEB / "index.html")


app.mount("/", StaticFiles(directory=WEB), name="web")

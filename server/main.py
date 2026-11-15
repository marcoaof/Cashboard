# -*- coding: utf-8 -*-
"""
main.py - API local e servidor do frontend do WealthDashboard.

Uso:  python -m uvicorn server.main:app --host 127.0.0.1 --port 8000
"""
import io
import os
import threading
import webbrowser
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import Body, FastAPI, Query
from fastapi.responses import FileResponse, JSONResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles

from . import metrics, store

WEB = store.APP_DIR / "web"


@asynccontextmanager
async def lifespan(_app):
    if os.environ.get("WD_OPEN_BROWSER") == "1":
        url = "http://localhost:" + os.environ.get("WD_PORT", "8000")
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()
    yield


app = FastAPI(title="WealthDashboard", docs_url=None, redoc_url=None, lifespan=lifespan)


@app.exception_handler(store.StoreError)
async def store_error(_req, exc):
    return JSONResponse(status_code=exc.status, content={"erro": exc.msg})


@app.middleware("http")
async def no_cache(request, call_next):
    resp = await call_next(request)
    resp.headers["Cache-Control"] = "no-store"
    return resp


def _payload(cfg):
    tables = {n: store.read_table(n, cfg)[1] for n in store.TABLES}
    data = metrics.build(tables, store.read_parameters(cfg), cfg)
    data["fingerprint"] = store.fingerprint(cfg)
    data["pasta"] = store.describe_dir(store.data_dir(cfg))
    return data


# ---------------------------------------------------------------- configuracao
@app.get("/api/config")
def get_config():
    cfg = store.load_config()
    return {"data_directory": cfg["data_directory"], "append_only": bool(cfg["append_only"]),
            **store.describe_dir(store.data_dir(cfg))}


@app.put("/api/config")
def put_config(body: dict = Body(...)):
    pasta = str(body.get("data_directory", "")).strip()
    if not pasta:
        raise store.StoreError(400, "Informe o caminho da pasta de dados.")
    info = store.describe_dir(store.resolve_dir(pasta))
    if not info["exists"]:
        raise store.StoreError(400, f"Pasta não encontrada: {info['resolved']}")
    store.save_config({"data_directory": pasta})
    return get_config()


# ---------------------------------------------------------------- leitura
@app.get("/api/state")
def state():
    return {"fingerprint": store.fingerprint(store.load_config())}


@app.get("/api/dashboard")
def dashboard():
    return _payload(store.load_config())


@app.get("/api/schema")
def schema():
    return {n: {"label": t["label"], "path": t["path"], "required": t["required"],
                "columns": [{"name": c, "type": tp} for c, tp in t["columns"]]}
            for n, t in store.TABLES.items()}


@app.get("/api/table/{name}")
def table(name: str):
    cols, rows = store.read_table(name, store.load_config())
    return {"columns": cols, "rows": rows}


# ---------------------------------------------------------------- gravacao
@app.post("/api/table/{name}")
def add_row(name: str, body: dict = Body(...)):
    return store.append_row(name, body.get("row", {}), store.load_config())


@app.put("/api/table/{name}/{row_id}")
def edit_row(name: str, row_id: int, body: dict = Body(...)):
    return store.update_row(name, row_id, body.get("hash", ""), body.get("row", {}),
                            store.load_config())


@app.delete("/api/table/{name}/{row_id}")
def remove_row(name: str, row_id: int, hash: str = Query(...)):
    return store.delete_row(name, row_id, hash, store.load_config())


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
    resumo = [["Data da posição", d["snapshot"]], ["Patrimônio total", b["total"]],
              ["Carteira de investimento (base)", b["base"]], ["Investido", b["investido"]],
              ["Caixa a investir", b["caixa"]], ["Reserva", b["reserva"]],
              ["Fora da carteira", b["fora"]],
              ["Resultado não realizado sobre custo", res["sobre_custo"]],
              ["Rendimento observado (títulos sem custo)", res["observado"]],
              ["Resultado realizado calculado", res["realizado"]["total"]],
              ["Gerado em", datetime.now().isoformat(" ", "minutes")]]
    sheet("Resumo", ["Item", "Valor"], resumo, {"B": brl}, first=True)
    sheet("Posições", ["Ativo", "Ticker", "Tipo", "Bloco", "Classe", "Qtd", "Preço médio",
                       "Preço mercado", "Valor", "Custo", "Resultado", "Resultado %", "Método",
                       "Indexador", "Vencimento", "Fonte"],
          [[p["ativo"], p["ticker"], p["tipo"], p["bloco"], p["classe"], p["quantidade"],
            p["preco_medio"], p["preco_mercado"], p["valor"], p["custo"], p["resultado"],
            p["resultado_pct"], p["metodo"], p["indexador"], p["vencimento"], p["fonte"]]
           for p in d["posicoes"]],
          {"G": brl, "H": brl, "I": brl, "J": brl, "K": brl, "L": pct})
    sheet("Alocação", ["Classe", "Valor", "Atual", "Alvo", "Banda mín.", "Banda máx.", "Situação",
                       "Falta para o alvo"],
          [[l["classe"], l["valor"], l["pct"], l["alvo"], l["min"], l["max"], l["situacao"],
            l["falta"]] for l in d["alocacao"]["linhas"]],
          {"B": brl, "C": pct, "D": pct, "E": pct, "F": pct, "H": brl})
    sheet("Resultado por tipo", ["Tipo", "Valor", "Custo", "Resultado sobre custo",
                                 "Rendimento observado", "Posições", "Sem dado"],
          [[t["tipo"], t["valor"], t["custo"], t["sobre_custo"], t["observado"], t["n"],
            t["n_sem_dado"]] for t in res["por_tipo"]],
          {"B": brl, "C": brl, "D": brl, "E": brl})
    sheet("Gastos por mês", ["Mês", "Renda", "Fixo", "Variável", "Gastos", "Sobra", "Taxa de poupança"],
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
        raise store.StoreError(400, "Sem dados para exportar.")
    buf = io.BytesIO()
    build_workbook(d).save(buf)
    buf.seek(0)
    nome = f"relatorio-{d['snapshot']}.xlsx"
    return StreamingResponse(
        buf, media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{nome}"'})


# ---------------------------------------------------------------- frontend
@app.get("/")
def index():
    return FileResponse(WEB / "index.html")


app.mount("/", StaticFiles(directory=WEB), name="web")

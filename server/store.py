# -*- coding: utf-8 -*-
"""
store.py - configuracao, leitura e gravacao dos arquivos da pasta de dados.

Regras de gravacao:
  - todo arquivo e copiado para .backups/<data-hora>/ antes de ser alterado;
  - incluir linha em CSV acrescenta no fim, sem reescrever as linhas que ja existem;
  - editar e apagar linha so funcionam com "append_only": false;
  - nada e gravado em caminhos de "protected_paths"; arquivo que ja existe em "frozen_paths"
    nao e sobrescrito.
"""
import csv
import hashlib
import io
import json
import os
import shutil
from datetime import datetime
from pathlib import Path

APP_DIR = Path(__file__).resolve().parent.parent
CONFIG_LOCAL = APP_DIR / "config.local.json"
CONFIG_EXAMPLE = APP_DIR / "config.example.json"
BACKUPS = APP_DIR / ".backups"
DOC_DIRS = ["goals", "rules", "reports", "research"]
WORKBOOK = "carteira.xlsx"

DEFAULTS = {
    "data_directory": "sample_data",
    "append_only": False,
    "allocation_blocks": ["Caixa", "Carteira"],
    "cash_class": "Caixa",
    "reserve_block": "Reserva",
    "income_categories": ["Salário", "Rendimentos"],
    "passive_income_categories": ["Rendimentos"],
    "benchmarks": ["cdi", "selic_meta", "ipca_12m", "ibovespa", "ptax_dolar_venda"],
    "flag_words": ["ESTIMATIVA", "PREMISSA", "CARREGADO"],
    "protected_paths": ["data/raw", "archive"],
    "frozen_paths": [],
    "parameters": {},
    "simulator": {"real_rates": [0.03, 0.05, 0.07], "years": 20},
    "disclaimer": "Material de organização pessoal. Não é recomendação de investimento.",
}

# Esquema das tabelas. A ordem das colunas e a do arquivo.
# tipo: date, month, number, text, select (com opcoes fixas).
TABLES = {
    "posicoes": {
        "label": "Posições (snapshots)", "path": "data/investments/posicoes.csv",
        "columns": [("data_snapshot", "date"), ("ativo", "text"), ("ticker", "text"),
                    ("bloco", "text"), ("classe", "text"), ("quantidade", "number"),
                    ("preco_medio", "number"), ("preco_mercado", "number"),
                    ("valor_brl", "number"), ("indexador", "text"), ("vencimento", "date"),
                    ("isento_ir", "select:sim,nao"), ("fonte", "text"), ("obs", "text")],
        "required": ["data_snapshot", "ativo", "bloco", "classe", "valor_brl", "fonte"],
    },
    "transacoes": {
        "label": "Movimentações", "path": "data/investments/transacoes.csv",
        "columns": [("data", "date"), ("tipo", "select:compra,venda,aplicacao,resgate"),
                    ("ativo", "text"), ("ticker", "text"), ("classe", "text"),
                    ("quantidade", "number"), ("valor_brl", "number"), ("ir_brl", "number"),
                    ("status", "select:liquidado,pendente"), ("liquidacao", "date"),
                    ("fonte", "text"), ("obs", "text")],
        "required": ["data", "tipo", "ativo", "valor_brl", "status", "fonte"],
    },
    "aportes": {
        "label": "Aportes", "path": "data/investments/aportes.csv",
        "columns": [("mes", "month"), ("classe", "text"), ("instrumento", "text"),
                    ("valor_brl", "number"),
                    ("status", "select:planejado,executado,planejado_nao_executado,substituido"),
                    ("fonte", "text"), ("obs", "text")],
        "required": ["mes", "classe", "valor_brl", "status", "fonte"],
    },
    "alvos": {
        "label": "Metas de alocação", "path": "data/investments/alvos.csv",
        "columns": [("versao_politica", "text"), ("vigencia_inicio", "date"), ("classe", "text"),
                    ("alvo", "number"), ("banda_min", "number"), ("banda_max", "number"),
                    ("instrumento", "text"), ("fonte", "text")],
        "required": ["versao_politica", "vigencia_inicio", "classe", "alvo", "fonte"],
    },
    "vencimentos": {
        "label": "Calendário de eventos", "path": "data/investments/vencimentos.csv",
        "columns": [("data", "date"), ("evento", "text"), ("ativo", "text"), ("classe", "text"),
                    ("valor_aprox_brl", "number"), ("acao", "text"), ("fonte", "text"),
                    ("status", "select:aberto,encerrado")],
        "required": ["data", "evento", "fonte", "status"],
    },
    "despesas": {
        "label": "Gastos e entradas", "path": "data/expenses/despesas.csv",
        "columns": [("data", "date"), ("mes", "month"), ("descricao", "text"),
                    ("categoria", "text"), ("tipo", "select:Fixo,Variável,Entrada"),
                    ("valor_brl", "number"), ("fonte", "text"), ("obs", "text")],
        "required": ["data", "mes", "descricao", "categoria", "tipo", "valor_brl", "fonte"],
    },
    "indicadores": {
        "label": "Indicadores de mercado", "path": "data/market/indicadores.csv",
        "columns": [("data_ref", "date"), ("indicador", "text"), ("valor", "number"),
                    ("unidade", "text"), ("fonte", "text"), ("obs", "text")],
        "required": ["data_ref", "indicador", "valor", "fonte"],
    },
    "precos": {
        "label": "Preços de ativos", "path": "data/market/precos.csv",
        "columns": [("data_ref", "date"), ("ticker", "text"), ("preco_brl", "number"),
                    ("taxa_adm_aa", "number"), ("pl_brl", "number"), ("fonte", "text"),
                    ("obs", "text")],
        "required": ["data_ref", "ticker", "fonte"],
    },
}


class StoreError(Exception):
    def __init__(self, status, msg):
        super().__init__(msg)
        self.status, self.msg = status, msg


# ---------------------------------------------------------------- configuracao
def _read_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def load_config():
    cfg = dict(DEFAULTS)
    cfg.update(_read_json(CONFIG_EXAMPLE))
    cfg.update(_read_json(CONFIG_LOCAL))
    return cfg


def resolve_dir(value):
    p = Path(os.path.expanduser(str(value)))
    return (p if p.is_absolute() else APP_DIR / p).resolve()


def data_dir(cfg=None):
    return resolve_dir((cfg or load_config())["data_directory"])


def save_config(changes):
    """Grava so as chaves informadas em config.local.json."""
    local = _read_json(CONFIG_LOCAL)
    local.update(changes)
    CONFIG_LOCAL.write_text(json.dumps(local, ensure_ascii=False, indent=2) + "\n",
                            encoding="utf-8")
    return load_config()


def describe_dir(path):
    path = Path(path)
    found = [n for n, t in TABLES.items() if (path / t["path"]).is_file()]
    return {"resolved": str(path), "exists": path.is_dir(), "tables_found": found,
            "workbook": (path / WORKBOOK).is_file()}


# ---------------------------------------------------------------- caminhos
def _norm(rel):
    return str(rel).replace("\\", "/").strip("/")


def _inside(rel, prefixes):
    rel = _norm(rel).lower()
    return any(rel == _norm(p).lower() or rel.startswith(_norm(p).lower() + "/") for p in prefixes)


def safe_path(rel, cfg):
    root = data_dir(cfg)
    full = (root / _norm(rel)).resolve()
    if root != full and root not in full.parents:
        raise StoreError(400, "Caminho fora da pasta de dados.")
    return full


def check_writable(rel, cfg, overwrite):
    if _inside(rel, cfg["protected_paths"]):
        raise StoreError(403, f"'{rel}' fica em área protegida (somente leitura).")
    if overwrite and _inside(rel, cfg["frozen_paths"]):
        raise StoreError(403, f"'{rel}' é arquivo congelado: crie um arquivo novo em vez de editar.")


def backup(full, cfg):
    """Copia o arquivo para .backups/<data-hora>/<caminho relativo> antes de alterar."""
    if not full.is_file():
        return None
    rel = full.relative_to(data_dir(cfg))
    dest = BACKUPS / datetime.now().strftime("%Y-%m-%d_%H%M%S") / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(full, dest)
    return str(dest.relative_to(APP_DIR))


# ---------------------------------------------------------------- CSV
def _row_hash(values):
    return hashlib.md5("\x1f".join(values).encode("utf-8")).hexdigest()[:12]


def read_table(name, cfg):
    """Devolve (colunas, linhas). Cada linha ganha _id (posicao) e _hash (conteudo)."""
    if name not in TABLES:
        raise StoreError(404, f"Tabela desconhecida: {name}")
    full = safe_path(TABLES[name]["path"], cfg)
    cols = [c for c, _ in TABLES[name]["columns"]]
    if not full.is_file():
        return cols, []
    with open(full, newline="", encoding="utf-8-sig") as f:
        reader = csv.DictReader(f)
        header = reader.fieldnames or cols
        rows = []
        for i, r in enumerate(reader):
            row = {c: (r.get(c) or "") for c in header}
            row["_id"] = i
            row["_hash"] = _row_hash([row[c] for c in header])
            rows.append(row)
    return header, rows


def _clean(name, row, header):
    spec = TABLES[name]
    types = dict(spec["columns"])
    out = {}
    for c in header:
        v = str(row.get(c, "") if row.get(c) is not None else "").strip()
        v = v.replace("\r", " ").replace("\n", " ")
        t = types.get(c, "text")
        if v and t == "number":
            v = v.replace(" ", "")
            if "," in v:
                v = v.replace(".", "").replace(",", ".")
            try:
                float(v)
            except ValueError:
                raise StoreError(400, f"'{c}' precisa ser número (use ponto decimal).")
        if v and t == "date":
            try:
                datetime.strptime(v, "%Y-%m-%d")
            except ValueError:
                raise StoreError(400, f"'{c}' precisa ser data no formato AAAA-MM-DD.")
        if v and t == "month":
            try:
                datetime.strptime(v, "%Y-%m")
            except ValueError:
                raise StoreError(400, f"'{c}' precisa ser mês no formato AAAA-MM.")
        if v and t.startswith("select:") and v not in t[7:].split(","):
            raise StoreError(400, f"'{c}' aceita só: {t[7:].replace(',', ', ')}.")
        out[c] = v
    faltam = [c for c in spec["required"] if c in header and not out.get(c)]
    if faltam:
        raise StoreError(400, "Campo obrigatório vazio: " + ", ".join(faltam))
    return out


def _newline(raw):
    return "\r\n" if b"\r\n" in raw else "\n"


def append_row(name, row, cfg):
    spec = TABLES.get(name)
    if not spec:
        raise StoreError(404, f"Tabela desconhecida: {name}")
    check_writable(spec["path"], cfg, overwrite=False)
    full = safe_path(spec["path"], cfg)
    header, _ = read_table(name, cfg)
    clean = _clean(name, row, header)
    raw = full.read_bytes() if full.is_file() else b""
    nl = _newline(raw)
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator=nl)
    if not raw:
        w.writerow(header)
    w.writerow([clean[c] for c in header])
    bkp = backup(full, cfg)
    full.parent.mkdir(parents=True, exist_ok=True)
    with open(full, "ab") as f:
        if raw and not raw.endswith(b"\n"):
            f.write(nl.encode())
        f.write(buf.getvalue().encode("utf-8"))
    return {"backup": bkp}


def _rewrite(name, cfg, mutate):
    spec = TABLES.get(name)
    if not spec:
        raise StoreError(404, f"Tabela desconhecida: {name}")
    if cfg.get("append_only"):
        raise StoreError(403, "Pasta em modo somente acréscimo: linha existente não se edita nem "
                              "se apaga. Lance uma linha nova.")
    check_writable(spec["path"], cfg, overwrite=True)
    full = safe_path(spec["path"], cfg)
    header, rows = read_table(name, cfg)
    rows = mutate(header, rows)
    raw = full.read_bytes() if full.is_file() else b""
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator=_newline(raw))
    w.writerow(header)
    for r in rows:
        w.writerow([r[c] for c in header])
    bkp = backup(full, cfg)
    tmp = full.with_suffix(full.suffix + ".tmp")
    tmp.write_bytes(buf.getvalue().encode("utf-8"))
    os.replace(tmp, full)
    return {"backup": bkp}


def _find(rows, row_id, row_hash):
    if row_id < 0 or row_id >= len(rows) or rows[row_id]["_hash"] != row_hash:
        raise StoreError(409, "A linha mudou no arquivo desde a última leitura. Atualize a tela.")
    return rows[row_id]


def update_row(name, row_id, row_hash, row, cfg):
    def mutate(header, rows):
        alvo = _find(rows, row_id, row_hash)
        alvo.update(_clean(name, row, header))
        return rows
    return _rewrite(name, cfg, mutate)


def delete_row(name, row_id, row_hash, cfg):
    def mutate(header, rows):
        _find(rows, row_id, row_hash)
        return [r for r in rows if r["_id"] != row_id]
    return _rewrite(name, cfg, mutate)


# ---------------------------------------------------------------- documentos
def list_docs(cfg):
    root = data_dir(cfg)
    out = []
    for d in DOC_DIRS:
        base = root / d
        if not base.is_dir():
            continue
        for p in sorted(base.rglob("*.md")):
            rel = _norm(p.relative_to(root))
            st = p.stat()
            out.append({"path": rel, "size": st.st_size,
                        "modified": datetime.fromtimestamp(st.st_mtime).isoformat(" ", "minutes"),
                        "frozen": _inside(rel, cfg["frozen_paths"])})
    return out


def _doc_path(rel, cfg):
    rel = _norm(rel)
    if not rel.lower().endswith(".md") or rel.split("/")[0] not in DOC_DIRS:
        raise StoreError(400, "Notas ficam em goals/, rules/, reports/ ou research/, em arquivo .md.")
    return rel, safe_path(rel, cfg)


def read_doc(rel, cfg):
    rel, full = _doc_path(rel, cfg)
    if not full.is_file():
        raise StoreError(404, "Arquivo não encontrado.")
    return {"path": rel, "content": full.read_text(encoding="utf-8-sig"),
            "frozen": _inside(rel, cfg["frozen_paths"])}


def write_doc(rel, content, cfg):
    rel, full = _doc_path(rel, cfg)
    check_writable(rel, cfg, overwrite=full.exists())
    bkp = backup(full, cfg)
    full.parent.mkdir(parents=True, exist_ok=True)
    full.write_text(content.replace("\r\n", "\n"), encoding="utf-8", newline="\n")
    return {"path": rel, "backup": bkp}


def delete_doc(rel, cfg):
    rel, full = _doc_path(rel, cfg)
    if cfg.get("append_only"):
        raise StoreError(403, "Pasta em modo somente acréscimo: arquivos não são apagados.")
    check_writable(rel, cfg, overwrite=True)
    if not full.is_file():
        raise StoreError(404, "Arquivo não encontrado.")
    bkp = backup(full, cfg)
    full.unlink()
    return {"backup": bkp}


# ---------------------------------------------------------------- deteccao de mudanca
def fingerprint(cfg):
    """Resumo de nome, tamanho e data de modificacao dos arquivos lidos pelo painel."""
    root = data_dir(cfg)
    files = [root / t["path"] for t in TABLES.values()] + [root / WORKBOOK]
    for d in DOC_DIRS:
        if (root / d).is_dir():
            files.extend((root / d).rglob("*.md"))
    h = hashlib.md5(str(root).encode("utf-8"))
    for p in sorted(files):
        try:
            st = p.stat()
            h.update(f"{p}|{st.st_size}|{st.st_mtime_ns}".encode("utf-8"))
        except OSError:
            continue
    return h.hexdigest()


def read_parameters(cfg):
    """Parametros (nome -> valor) da aba Config de carteira.xlsx; cai para config 'parameters'.

    Procura na coluna A a celula 'Parâmetro' e le nome, valor e origem ate a primeira linha vazia.
    """
    params = {k: {"valor": v, "origem": "config.local.json"}
              for k, v in (cfg.get("parameters") or {}).items()}
    full = data_dir(cfg) / WORKBOOK
    if not full.is_file():
        return params
    try:
        import openpyxl
        wb = openpyxl.load_workbook(full, read_only=True, data_only=True)
        nome = next((s for s in wb.sheetnames if s.strip().lower() == "config"), None)
        if nome:
            lendo = False
            for r in wb[nome].iter_rows(max_col=3, values_only=True):
                a = str(r[0]).strip() if r and r[0] is not None else ""
                if not lendo:
                    lendo = a.lower() in ("parâmetro", "parametro")
                    continue
                if not a:
                    break
                if isinstance(r[1], (int, float)):
                    params[a] = {"valor": float(r[1]),
                                 "origem": str(r[2]) if len(r) > 2 and r[2] else WORKBOOK}
        wb.close()
    except Exception:
        pass
    return params

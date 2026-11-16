# -*- coding: utf-8 -*-
"""
store.py - configuracao, leitura e gravacao dos arquivos da pasta de dados.

Regras de gravacao:
  - todo arquivo e copiado para .backups/<data-hora>/ antes de ser alterado;
  - incluir linha em CSV acrescenta no fim, sem reescrever as linhas que ja existem;
  - editar e apagar linha so funcionam com "append_only": false;
  - nada e gravado em caminhos de "protected_paths"; arquivo que ja existe em "frozen_paths"
    nao e sobrescrito.

O esquema (TABLES) tambem carrega o nome amigavel e a explicacao de cada coluna. A tela monta os
formularios a partir dele e o guia para IA (guide.py) e gerado dele: um lugar so para mudar.
"""
import csv
import hashlib
import io
import json
import os
import shutil
import unicodedata
from collections import Counter
from datetime import date, datetime
from pathlib import Path

APP_NAME = "Cashboard"
APP_DIR = Path(__file__).resolve().parent.parent
CONFIG_LOCAL = APP_DIR / "config.local.json"
CONFIG_EXAMPLE = APP_DIR / "config.example.json"
BACKUPS = APP_DIR / ".backups"
SAMPLE_DIR = APP_DIR / "sample_data"
NEW_DATA_DIR = "meus_dados"
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
    "disclaimer": "Painel para organização pessoal. Não é recomendação de investimento.",
}

# Nomes dos dois parametros que a tela de metas grava em config.local.json.
PARAM_RESERVA = "Meta da reserva de emergência"
PARAM_APORTE = "Aporte mensal"


def _c(name, tipo, label, help="", example="", advanced=False, options=None):
    """Uma coluna. tipo: date, month, number, money, fraction, text ou select (com options)."""
    return {"name": name, "type": tipo, "label": label, "help": help, "example": example,
            "advanced": advanced, "options": options or {}}


_FONTE = _c("fonte", "text", "Fonte", "De onde veio o número. Fica preenchida sozinha se você deixar vazia.",
            "extrato do banco de 10/2026", advanced=True)
_OBS = _c("obs", "text", "Observação", advanced=True)

# Esquema das tabelas. A ordem de "columns" e a do arquivo e nao pode mudar.
#   title: nome no singular, usado nos formularios;  label: nome da lista;  about: uma frase.
#   form:  ordem dos campos principais no formulario (os demais seguem a ordem do arquivo).
#   defaults: valor gravado quando o campo chega vazio.
TABLES = {
    "posicoes": {
        "title": "Investimento", "label": "Investimentos", "path": "data/investments/posicoes.csv",
        "about": "Uma linha por investimento em cada atualização da carteira.",
        "columns": [
            _c("data_snapshot", "date", "Data da atualização",
               "As linhas com a mesma data formam uma foto da carteira. O painel mostra a mais recente."),
            _c("ativo", "text", "Nome",
               "Em renda fixa, comece pelo tipo: CDB, LCI, LCA, Tesouro. Em ação, ETF e FII, use o código.",
               "CDB Banco X"),
            _c("ticker", "text", "Código de negociação", "Só para o que é negociado na bolsa.", "BOVA11"),
            _c("bloco", "text", "Grupo",
               "Carteira (investimentos), Reserva (reserva de emergência) ou Caixa (dinheiro esperando "
               "para investir).", "Carteira"),
            _c("classe", "text", "Classe", "Grupo que aparece na aba Alocação.", "Renda fixa"),
            _c("quantidade", "number", "Quantidade", "Cotas ou ações. Em renda fixa, use 1."),
            _c("preco_medio", "money", "Preço médio (R$)",
               "Quanto você pagou por unidade. Em renda fixa, o valor aplicado."),
            _c("preco_mercado", "money", "Preço atual (R$)", "Cotação por unidade na data."),
            _c("valor_brl", "money", "Valor atual (R$)", "Quanto vale no total na data."),
            _c("indexador", "text", "Taxa ou índice",
               "Ex.: 110% do CDI, IPCA + 6%. Em ETF, FII e BDR, escreva ETF, FII ou BDR.", "110% do CDI"),
            _c("vencimento", "date", "Vencimento"),
            _c("isento_ir", "select", "Isento de imposto de renda", options={"sim": "Sim", "nao": "Não"}),
            _FONTE, _OBS],
        "required": ["data_snapshot", "ativo", "bloco", "classe", "valor_brl"],
        "defaults": {"isento_ir": "nao"},
    },
    "transacoes": {
        "title": "Compra ou venda", "label": "Compras e vendas", "path": "data/investments/transacoes.csv",
        "about": "Operações feitas. Servem para calcular o lucro das vendas.",
        "columns": [
            _c("data", "date", "Data"),
            _c("tipo", "select", "O que você fez",
               options={"compra": "Comprei", "venda": "Vendi", "aplicacao": "Apliquei (renda fixa)",
                        "resgate": "Resgatei (renda fixa)"}),
            _c("ativo", "text", "Investimento", example="BOVA11"),
            _c("ticker", "text", "Código de negociação",
               "Preencha em ação, ETF e FII: é por ele que o painel liga a venda à compra.", "BOVA11"),
            _c("classe", "text", "Classe", advanced=True),
            _c("quantidade", "number", "Quantidade", "Necessária em compra e venda de ação, ETF e FII."),
            _c("valor_brl", "money", "Valor total (R$)"),
            _c("ir_brl", "money", "Imposto retido (R$)", advanced=True),
            _c("status", "select", "Situação", advanced=True,
               options={"liquidado": "Concluída", "pendente": "Pendente"}),
            _c("liquidacao", "date", "Data de liquidação", advanced=True),
            _FONTE, _OBS],
        "required": ["data", "tipo", "ativo", "valor_brl"],
        "defaults": {"status": "liquidado"},
        "form": ["tipo", "ativo", "ticker", "quantidade", "valor_brl", "data"],
    },
    "aportes": {
        "title": "Aporte", "label": "Aportes", "path": "data/investments/aportes.csv",
        "about": "Quanto você planejou investir e quanto investiu em cada mês.",
        "columns": [
            _c("mes", "month", "Mês"),
            _c("classe", "text", "Classe", example="Renda fixa"),
            _c("instrumento", "text", "Onde investir", example="CDB Banco X"),
            _c("valor_brl", "money", "Valor (R$)"),
            _c("status", "select", "Situação",
               "Planos do mesmo mês lançados em dias diferentes: vale o mais recente.",
               options={"planejado": "Planejado", "executado": "Feito",
                        "planejado_nao_executado": "Planejado e não feito",
                        "substituido": "Substituído por outro plano"}),
            _FONTE, _OBS],
        "required": ["mes", "classe", "valor_brl"],
        "defaults": {"status": "planejado"},
    },
    "alvos": {
        "title": "Meta de alocação", "label": "Metas de alocação", "path": "data/investments/alvos.csv",
        "about": "Quanto da carteira você quer em cada classe.",
        "columns": [
            _c("versao_politica", "text", "Versão",
               "Nome do conjunto de metas. Vale a versão com a data de início mais recente.", "v1"),
            _c("vigencia_inicio", "date", "Vale a partir de"),
            _c("classe", "text", "Classe", example="Renda fixa"),
            _c("alvo", "fraction", "Meta", "Fração ou porcentagem: 0.25 ou 25%.", "25%"),
            _c("banda_min", "fraction", "Mínimo aceitável", example="20%"),
            _c("banda_max", "fraction", "Máximo aceitável", example="30%"),
            _c("instrumento", "text", "Como investir nessa classe", example="CDB e LCI"),
            _FONTE],
        "required": ["versao_politica", "vigencia_inicio", "classe", "alvo"],
        "defaults": {},
    },
    "vencimentos": {
        "title": "Data importante", "label": "Datas importantes", "path": "data/investments/vencimentos.csv",
        "about": "Vencimentos, revisões e lembretes.",
        "columns": [
            _c("data", "date", "Data"),
            _c("evento", "text", "Tipo", "Ex.: vencimento, revisão, lembrete.", "vencimento"),
            _c("ativo", "text", "Sobre o quê", example="LCI Banco X"),
            _c("classe", "text", "Classe", advanced=True),
            _c("valor_aprox_brl", "money", "Valor aproximado (R$)"),
            _c("acao", "text", "O que fazer", example="Reaplicar"),
            _FONTE,
            _c("status", "select", "Situação", advanced=True,
               options={"aberto": "Em aberto", "encerrado": "Encerrado"})],
        "required": ["data", "evento"],
        "defaults": {"status": "aberto"},
    },
    "despesas": {
        "title": "Gasto ou entrada", "label": "Gastos e entradas", "path": "data/expenses/despesas.csv",
        "about": "Tudo o que saiu e o que entrou na sua conta.",
        "columns": [
            _c("data", "date", "Data"),
            _c("mes", "month", "Mês", "Preenchido sozinho a partir da data.", advanced=True),
            _c("descricao", "text", "Descrição", example="Supermercado"),
            _c("categoria", "text", "Categoria", example="Alimentação"),
            _c("tipo", "select", "O que é",
               options={"Variável": "Gasto variável (muda todo mês)",
                        "Fixo": "Gasto fixo (se repete todo mês)",
                        "Entrada": "Entrada (dinheiro que entrou)"}),
            _c("valor_brl", "money", "Valor (R$)", "Sempre positivo, mesmo quando é gasto."),
            _FONTE, _OBS],
        "required": ["data", "descricao", "categoria", "tipo", "valor_brl"],
        "defaults": {},
        "form": ["tipo", "descricao", "valor_brl", "categoria", "data"],
    },
    "indicadores": {
        "title": "Indicador de mercado", "label": "Indicadores de mercado", "path": "data/market/indicadores.csv",
        "about": "CDI, Selic, IPCA e outros números de referência.",
        "columns": [
            _c("data_ref", "date", "Data"),
            _c("indicador", "text", "Indicador",
               "O painel mostra: cdi, selic_meta, ipca_12m, ibovespa e ptax_dolar_venda.", "cdi"),
            _c("valor", "number", "Valor"),
            _c("unidade", "text", "Unidade", example="% a.a."),
            _FONTE, _OBS],
        "required": ["data_ref", "indicador", "valor"],
        "defaults": {},
    },
    "precos": {
        "title": "Preço de ativo", "label": "Preços de ativos", "path": "data/market/precos.csv",
        "about": "Cotação e taxa de administração por código.",
        "columns": [
            _c("data_ref", "date", "Data"),
            _c("ticker", "text", "Código de negociação", example="BOVA11"),
            _c("preco_brl", "money", "Preço (R$)"),
            _c("taxa_adm_aa", "number", "Taxa de administração ao ano", "Fração: 0.002 é 0,2% ao ano."),
            _c("pl_brl", "money", "Patrimônio do fundo (R$)", advanced=True),
            _FONTE, _OBS],
        "required": ["data_ref", "ticker"],
        "defaults": {},
    },
}


def columns(name):
    return [c["name"] for c in TABLES[name]["columns"]]


def public_schema():
    """O esquema como a tela e as IAs recebem em /api/schema."""
    return {n: {"title": t["title"], "label": t["label"], "about": t["about"], "path": t["path"],
                "required": t["required"], "defaults": t["defaults"], "form": t.get("form", []),
                "columns": t["columns"]}
            for n, t in TABLES.items()}


class StoreError(Exception):
    def __init__(self, status, msg):
        super().__init__(msg)
        self.status, self.msg = status, msg


def _spec(name):
    if name not in TABLES:
        raise StoreError(404, f"Tabela desconhecida: {name}. Use uma destas: {', '.join(TABLES)}.")
    return TABLES[name]


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


def save_parameters(values):
    """Grava parametros numericos (meta da reserva, aporte mensal) em config.local.json.
    Valor vazio ou None remove o parametro."""
    params = dict(_read_json(CONFIG_LOCAL).get("parameters") or {})
    for nome, v in (values or {}).items():
        nome = str(nome).strip()
        if not nome:
            continue
        if v is None or str(v).strip() == "":
            params.pop(nome, None)
            continue
        try:
            n = float(_number(str(v)))
        except ValueError:
            raise StoreError(400, f"'{nome}' precisa ser um número.")
        if n < 0:
            raise StoreError(400, f"'{nome}' não pode ser negativo.")
        params[nome] = n
    return save_config({"parameters": params})


def describe_dir(path):
    path = Path(path)
    found = [n for n, t in TABLES.items() if (path / t["path"]).is_file()]
    return {"resolved": str(path), "exists": path.is_dir(), "tables_found": found,
            "workbook": (path / WORKBOOK).is_file(), "sample": path == SAMPLE_DIR.resolve()}


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
    full = safe_path(_spec(name)["path"], cfg)
    cols = columns(name)
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


def _plain(s):
    """Minusculas e sem acento, para comparar o que a pessoa escreveu com as opcoes validas."""
    return unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().strip().lower()


def _number(v):
    """Aceita 1234.56, 1.234,56 e R$ 1.234,56. Devolve o texto no formato do arquivo (ponto)."""
    v = v.replace("R$", "").replace(" ", "").replace(" ", "")
    if "," in v:
        v = v.replace(".", "").replace(",", ".")
    float(v)
    return v


def _fmt(n):
    return f"{n:.6f}".rstrip("0").rstrip(".") if n else "0"


def fonte_padrao(como="Lançamento manual"):
    return f"{como} no {APP_NAME} em {date.today().strftime('%d/%m/%Y')}"


def _clean(name, row, header, fonte=None):
    """Confere e normaliza uma linha. Aceita os formatos que as pessoas e as IAs costumam mandar
    (data DD/MM/AAAA, numero com virgula, porcentagem, opcao escrita por extenso) e grava no
    formato do arquivo."""
    spec = TABLES[name]
    cols = {c["name"]: c for c in spec["columns"]}
    out = {}
    for c in header:
        v = str(row.get(c, "") if row.get(c) is not None else "").strip()
        v = v.replace("\r", " ").replace("\n", " ")
        col = cols.get(c) or _c(c, "text", c)
        t, rot = col["type"], col["label"]
        if v and t in ("number", "money"):
            try:
                v = _number(v)
            except ValueError:
                raise StoreError(400, f"'{rot}' precisa ser um número, como 1234.56.")
        if v and t == "fraction":
            try:
                n = float(_number(v.rstrip("%"))) / (100 if v.endswith("%") else 1)
            except ValueError:
                raise StoreError(400, f"'{rot}' precisa ser uma porcentagem, como 25%.")
            if n < 0 or n > 1:
                raise StoreError(400, f"'{rot}' fica entre 0% e 100%. Escreva 25% ou 0.25.")
            v = _fmt(n)
        if v and t == "date":
            for fmt in ("%Y-%m-%d", "%d/%m/%Y"):
                try:
                    v = datetime.strptime(v, fmt).strftime("%Y-%m-%d")
                    break
                except ValueError:
                    continue
            else:
                raise StoreError(400, f"'{rot}' precisa ser uma data, como 2026-11-30 ou 30/11/2026.")
        if v and t == "month":
            for fmt in ("%Y-%m", "%m/%Y"):
                try:
                    v = datetime.strptime(v, fmt).strftime("%Y-%m")
                    break
                except ValueError:
                    continue
            else:
                raise StoreError(400, f"'{rot}' precisa ser um mês, como 2026-11 ou 11/2026.")
        if v and t == "select":
            validos = {_plain(k): k for k in col["options"]}
            validos.update({_plain(lbl): k for k, lbl in col["options"].items()})
            if _plain(v) not in validos:
                raise StoreError(400, f"'{rot}' aceita só: {', '.join(col['options'])}.")
            v = validos[_plain(v)]
        out[c] = v
    # preenchimentos automaticos, para ninguem precisar digitar o que da para deduzir
    if name == "despesas" and "mes" in out and not out["mes"] and out.get("data"):
        out["mes"] = out["data"][:7]
    for c, padrao in spec["defaults"].items():
        if c in out and not out[c]:
            out[c] = padrao
    if "fonte" in out and not out["fonte"]:
        out["fonte"] = fonte or fonte_padrao()
    faltam = [cols[c]["label"] for c in spec["required"] if c in header and not out.get(c)]
    if faltam:
        raise StoreError(400, "Falta preencher: " + ", ".join(faltam) + ".")
    return out


def _newline(raw):
    return "\r\n" if b"\r\n" in raw else "\n"


def append_rows(name, rows, cfg, fonte=None):
    """Acrescenta varias linhas de uma vez. Confere todas antes de gravar: ou entram todas, ou
    nenhuma."""
    spec = _spec(name)
    check_writable(spec["path"], cfg, overwrite=False)
    full = safe_path(spec["path"], cfg)
    header, _ = read_table(name, cfg)
    clean = []
    for i, r in enumerate(rows or [], 1):
        try:
            clean.append(_clean(name, r if isinstance(r, dict) else {}, header, fonte))
        except StoreError as e:
            raise StoreError(e.status, f"Linha {i}: {e.msg}" if len(rows) > 1 else e.msg)
    if not clean:
        raise StoreError(400, "Nenhuma linha para gravar.")
    raw = full.read_bytes() if full.is_file() else b""
    nl = _newline(raw)
    buf = io.StringIO()
    w = csv.writer(buf, lineterminator=nl)
    if not raw:
        w.writerow(header)
    for r in clean:
        w.writerow([r[c] for c in header])
    bkp = backup(full, cfg)
    full.parent.mkdir(parents=True, exist_ok=True)
    with open(full, "ab") as f:
        if raw and not raw.endswith(b"\n"):
            f.write(nl.encode())
        f.write(buf.getvalue().encode("utf-8"))
    return {"backup": bkp, "rows": len(clean)}


def append_row(name, row, cfg):
    return append_rows(name, [row], cfg)


def _rewrite(name, cfg, mutate):
    spec = _spec(name)
    if cfg.get("append_only"):
        raise StoreError(403, "Esta pasta só aceita inclusão: linha existente não se edita nem se "
                              "apaga. Lance uma linha nova.")
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


# ---------------------------------------------------------------- importacao por colagem
# Texto que uma IA de chat devolve e a pessoa cola na tela. Formato:
#     # despesas
#     data,descricao,categoria,tipo,valor_brl
#     2026-11-03,Supermercado,Alimentação,Variável,231.90
# A linha "# nome" e opcional quando o cabecalho so serve a uma tabela. Tambem aceita JSON:
#     {"despesas": [{"data": "2026-11-03", ...}]}
_AUTO = {"fonte", "mes", "status", "isento_ir"}   # colunas que o painel preenche sozinho


def _table_from_title(texto):
    """'# despesas', '## Tabela: despesas.csv' ou '[despesas]' -> 'despesas'."""
    t = _plain(texto).strip("#[]*: ").replace("tabela", "").replace("arquivo", "").strip(" :")
    t = t.split("/")[-1].split("(")[0].strip()
    if t.endswith(".csv"):
        t = t[:-4]
    return t if t in TABLES else None


def _table_from_header(fields):
    """Descobre a tabela pelo cabecalho: todas as colunas sao dela e as obrigatorias estao la."""
    fs = [f.strip().lower() for f in fields]
    if len(fs) < 2:
        return None
    achadas = []
    for n, t in TABLES.items():
        cols = columns(n)
        if all(f in cols for f in fs) and all(r in fs for r in t["required"] if r not in _AUTO):
            achadas.append((len(fs) / len(cols), n))
    if not achadas:
        return None
    achadas.sort(reverse=True)
    if len(achadas) > 1 and achadas[0][0] == achadas[1][0]:
        return None
    return achadas[0][1]


def _parse_blocks(text):
    """Devolve [(tabela, [(numero da linha no texto, {coluna: valor})])] e uma lista de erros."""
    text = (text or "").replace("\r\n", "\n").replace("\r", "\n").strip()
    if not text:
        raise StoreError(400, "Cole os dados antes de conferir.")
    blocos, erros = [], []
    limpo = text.strip("`").strip()
    if limpo.startswith("json"):
        limpo = limpo[4:].strip()
    if limpo.startswith("{"):
        try:
            dados = json.loads(limpo)
        except ValueError as e:
            raise StoreError(400, f"O texto parece JSON, mas não abre: {e}")
        for nome, linhas in dados.items():
            tab = _table_from_title(nome)
            if not tab or not isinstance(linhas, list):
                erros.append({"tabela": str(nome), "linha": 0, "erro": "Tabela desconhecida."})
                continue
            blocos.append((tab, [(i, r) for i, r in enumerate(linhas, 1) if isinstance(r, dict)]))
        return blocos, erros

    atual, header, pendente, perdido = None, None, None, False
    for n, bruta in enumerate(text.split("\n"), 1):
        linha = bruta.strip()
        if not linha or linha.startswith("```"):
            continue
        if linha[0] in "#[" or _plain(linha).startswith(("tabela", "arquivo")):
            tab = _table_from_title(linha)
            if tab:
                pendente, header, atual, perdido = tab, None, None, False
                continue
            if linha[0] == "#":
                continue   # comentario solto
        try:
            campos = next(csv.reader([linha]))
        except (csv.Error, StopIteration):
            erros.append({"tabela": pendente or "", "linha": n, "erro": "Linha fora do formato CSV."})
            continue
        if header is None or _table_from_header(campos):
            tab = pendente or _table_from_header(campos)
            cab = [c.strip().lower() for c in campos]
            if tab and all(c in columns(tab) for c in cab):
                header, pendente, perdido = cab, None, False
                atual = (tab, [])
                blocos.append(atual)
                continue
            if tab:
                estranhas = [c for c in cab if c not in columns(tab)]
                erros.append({"tabela": tab, "linha": n,
                              "erro": "A primeira linha precisa ser o cabeçalho. Colunas que não "
                                      f"existem em {tab}: {', '.join(estranhas)}."})
                pendente, perdido = None, True
                continue
            if header is None:
                if not perdido:   # avisa uma vez so, nao a cada linha do bloco
                    erros.append({"tabela": "", "linha": n,
                                  "erro": "Não reconheci a tabela. Comece o bloco com uma linha como "
                                          "'# despesas' seguida do cabeçalho."})
                perdido = True
                continue
        if len(campos) > len(header):
            erros.append({"tabela": atual[0], "linha": n,
                          "erro": f"Tem {len(campos)} valores para {len(header)} colunas. Texto com "
                                  "vírgula precisa ficar entre aspas."})
            continue
        atual[1].append((n, dict(zip(header, campos))))
    return blocos, erros


def _same(r):
    """Chave para reconhecer linha repetida: tudo menos fonte e observacao. Numero e comparado
    pelo valor, para 231.9 e 231.90 contarem como a mesma coisa."""
    def norm(v):
        v = str(v or "").strip()
        try:
            return f"{float(v):.6f}"
        except ValueError:
            return v
    return tuple((k, norm(v)) for k, v in sorted(r.items()) if k not in ("fonte", "obs", "_id", "_hash"))


def import_text(text, cfg, dry_run=True):
    """Confere (dry_run) ou grava o texto colado. So grava quando nao ha nenhum erro."""
    blocos, erros = _parse_blocks(text)
    fonte = fonte_padrao("Importado")
    tabelas, avisos, novas_por_tabela = [], [], {}
    for tab, linhas in blocos:
        header, existentes = read_table(tab, cfg)
        ja = Counter(_same(r) for r in existentes)
        novas, repetidas = [], 0
        for n, bruta in linhas:
            try:
                limpa = _clean(tab, bruta, header, fonte)
            except StoreError as e:
                erros.append({"tabela": tab, "linha": n, "erro": e.msg})
                continue
            chave = _same(limpa)
            if ja[chave] > 0:
                ja[chave] -= 1
                repetidas += 1
            else:
                novas.append(limpa)
        junto = novas_por_tabela.setdefault(tab, [])
        junto.extend(novas)
        mostrar = [c for c in header if any(r.get(c) for r in novas) and c != "fonte"]
        tabelas.append({"tabela": tab, "label": TABLES[tab]["label"], "novas": len(novas),
                        "repetidas": repetidas, "colunas": mostrar,
                        "rotulos": {c["name"]: c["label"] for c in TABLES[tab]["columns"]},
                        "amostra": [{c: r.get(c, "") for c in mostrar} for r in novas[:8]]})
        if tab == "posicoes" and novas:
            fotos = sorted({r["data_snapshot"] for r in existentes if r.get("data_snapshot")})
            for d in sorted({r["data_snapshot"] for r in novas}):
                n_nova = sum(1 for r in novas if r["data_snapshot"] == d) \
                    + sum(1 for r in existentes if r.get("data_snapshot") == d)
                if fotos and d >= fotos[-1]:
                    n_ant = sum(1 for r in existentes if r.get("data_snapshot") == fotos[-1])
                    if n_nova < n_ant:
                        avisos.append(f"A carteira de {d[8:10]}/{d[5:7]}/{d[:4]} ficará com {n_nova} "
                                      f"investimento(s); a anterior tinha {n_ant}. O painel mostra só "
                                      "a data mais recente: confira se não faltou nenhum.")
    total = sum(len(v) for v in novas_por_tabela.values())
    out = {"tabelas": tabelas, "erros": erros, "avisos": avisos, "total": total, "gravado": False}
    if dry_run or erros or not total:
        return out
    for tab, novas in novas_por_tabela.items():
        if novas:
            append_rows(tab, novas, cfg, fonte)
    out["gravado"] = True
    return out


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
        raise StoreError(403, "Esta pasta só aceita inclusão: arquivos não são apagados.")
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
    """Parametros (nome -> valor) de config 'parameters'; a aba Config de carteira.xlsx, quando
    existe, tem a palavra final.

    Na planilha, procura na coluna A a celula 'Parâmetro' e le nome, valor e origem ate a primeira
    linha vazia.
    """
    params = {k: {"valor": v, "origem": "config"}
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

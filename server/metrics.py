# -*- coding: utf-8 -*-
"""
metrics.py - calcula tudo o que o painel mostra a partir das tabelas lidas.

Nada aqui estima numero que nao esta nos arquivos. Quando falta dado (custo de aquisicao, por
exemplo), o campo sai como None e o motivo entra em "faltando".

Formulas:
  base da alocacao       = soma de valor_brl dos blocos de "allocation_blocks"
  patrimonio total       = soma de valor_brl do snapshot mais recente
  resultado sobre custo  = valor_brl - quantidade x preco_medio
  rendimento observado   = valor no snapshot mais recente - valor no primeiro snapshot em que o
                           mesmo titulo aparece (titulo com vencimento, sem custo no arquivo)
  resultado realizado    = valor da venda - quantidade vendida x custo medio das compras registradas
  taxa de poupanca       = (renda - gastos) / renda
  falta para o alvo      = alvo x (base - caixa destinado a reserva) - valor da classe
"""
import unicodedata
from datetime import date

TIPOS_PREFIXO = [("LCI", "LCI"), ("LCA", "LCA"), ("CDB", "CDB"), ("TESOURO", "Tesouro Direto"),
                 ("CRI", "CRI"), ("CRA", "CRA"), ("DEBENTURE", "Debênture"), ("CONTA", "Conta"),
                 ("POUPANCA", "Poupança"), ("FUNDO", "Fundo")]


def num(v, default=0.0):
    try:
        return float(str(v).strip())
    except (TypeError, ValueError):
        return default


def opt(v):
    v = str(v or "").strip()
    try:
        return float(v) if v else None
    except ValueError:
        return None


def _ascii(s):
    return unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().upper()


def tipo_produto(r):
    nome, idx = _ascii(r.get("ativo")).strip(), _ascii(r.get("indexador"))
    for prefixo, rotulo in TIPOS_PREFIXO:
        if nome.startswith(prefixo):
            return rotulo
    if str(r.get("ticker") or "").strip():
        if "ETF" in idx or "ETF" in nome:
            return "ETF"
        if "FII" in idx or _ascii(r.get("classe")) == "IMOVEIS":
            return "FII"
        if "BDR" in idx:
            return "BDR"
        return "Ações"
    if " FI" in nome or "FIC" in nome or "FIA" in nome:
        return "Fundo"
    return "Outros"


def _blocos(rows, cfg):
    base = sum(num(r["valor_brl"]) for r in rows if r["bloco"] in cfg["allocation_blocks"])
    caixa = sum(num(r["valor_brl"]) for r in rows
                if r["bloco"] in cfg["allocation_blocks"] and r["classe"] == cfg["cash_class"])
    reserva = sum(num(r["valor_brl"]) for r in rows if r["bloco"] == cfg["reserve_block"])
    total = sum(num(r["valor_brl"]) for r in rows)
    return {"total": total, "base": base, "caixa": caixa, "investido": base - caixa,
            "reserva": reserva, "fora": total - base - reserva}


def _custo(r):
    q, pm = opt(r.get("quantidade")), opt(r.get("preco_medio"))
    return q * pm if q is not None and pm is not None else None


def _param(params, *termos):
    for nome, p in params.items():
        n = _ascii(nome)
        if all(t in n for t in termos):
            return p["valor"]
    return None


def _chave_titulo(r):
    return (tipo_produto(r), r.get("vencimento") or "", r.get("bloco") or "")


def _posicoes(pos, snaps, cfg):
    atual = [r for r in pos if r["data_snapshot"] == snaps[-1]]
    palavras = [_ascii(p) for p in cfg["flag_words"]]
    saida = []
    for r in atual:
        valor, custo = num(r["valor_brl"]), _custo(r)
        item = {"ativo": r["ativo"], "ticker": r.get("ticker", ""), "bloco": r["bloco"],
                "classe": r["classe"], "tipo": tipo_produto(r),
                "quantidade": opt(r.get("quantidade")), "preco_medio": opt(r.get("preco_medio")),
                "preco_mercado": opt(r.get("preco_mercado")), "valor": valor,
                "indexador": r.get("indexador", ""), "vencimento": r.get("vencimento", ""),
                "isento": (r.get("isento_ir") or "").lower() == "sim",
                "fonte": r.get("fonte", ""), "obs": r.get("obs", ""),
                "alerta": any(p in _ascii(r.get("obs")) for p in palavras),
                "custo": custo, "resultado": None, "resultado_pct": None, "metodo": None,
                "desde": None}
        if custo is not None:
            item.update(resultado=valor - custo, metodo="custo",
                        resultado_pct=(valor / custo - 1) if custo else None)
        elif r.get("vencimento"):
            # Titulo com vencimento e uma aplicacao unica: a variacao entre snapshots e rendimento.
            chave = _chave_titulo(r)
            n_hoje = sum(1 for x in atual if _chave_titulo(x) == chave)
            for s in snaps:
                antigos = [x for x in pos if x["data_snapshot"] == s and _chave_titulo(x) == chave]
                if antigos:
                    if len(antigos) == n_hoje == 1 and s != snaps[-1]:
                        v0 = num(antigos[0]["valor_brl"])
                        item.update(resultado=valor - v0, metodo="observado", desde=s,
                                    resultado_pct=(valor / v0 - 1) if v0 else None)
                    break
        saida.append(item)
    return saida


def _realizado(trans):
    """Custo medio por ticker, na ordem das datas. Venda sem compra registrada fica sem custo."""
    carteira, itens, sem_custo, ir = {}, [], [], 0.0
    for t in sorted(trans, key=lambda x: x.get("data", "")):
        ir += num(t.get("ir_brl"))
        tk, tipo = (t.get("ticker") or "").strip(), (t.get("tipo") or "").lower()
        q, v = opt(t.get("quantidade")), num(t.get("valor_brl"))
        if not tk or not q:
            continue
        c = carteira.setdefault(tk, {"q": 0.0, "custo": 0.0})
        if tipo == "compra":
            c["q"] += q
            c["custo"] += v
        elif tipo == "venda":
            if c["q"] + 1e-9 >= q:
                medio = c["custo"] / c["q"]
                itens.append({"data": t["data"], "ticker": tk, "quantidade": q, "venda": v,
                              "custo": medio * q, "resultado": v - medio * q})
                c["q"] -= q
                c["custo"] -= medio * q
            else:
                sem_custo.append({"data": t["data"], "ativo": t.get("ativo") or tk, "venda": v})
    return {"itens": itens, "sem_custo": sem_custo, "ir_pago": ir,
            "total": sum(i["resultado"] for i in itens)}


def _alocacao(posicoes, alvos_rows, b, para_reserva, cfg, hoje):
    validos = [a for a in alvos_rows if a.get("vigencia_inicio", "") <= hoje.isoformat()] or alvos_rows
    versao, vigencia, alvos = None, None, {}
    if validos:
        ultimo = max(validos, key=lambda a: a.get("vigencia_inicio", ""))
        versao, vigencia = ultimo["versao_politica"], ultimo["vigencia_inicio"]
        for a in validos:
            if a["versao_politica"] == versao:
                alvos[a["classe"]] = a
    classes = list(alvos)
    for p in posicoes:
        if p["bloco"] in cfg["allocation_blocks"] and p["classe"] not in classes:
            classes.append(p["classe"])
    if cfg["cash_class"] in classes:
        classes.remove(cfg["cash_class"])
        classes.append(cfg["cash_class"])
    base_ordem = b["base"] - para_reserva
    linhas = []
    for c in classes:
        v = sum(p["valor"] for p in posicoes
                if p["classe"] == c and p["bloco"] in cfg["allocation_blocks"])
        a = alvos.get(c)
        alvo = num(a["alvo"]) if a else (0.0 if alvos else None)
        mi = num(a["banda_min"], alvo) if a else alvo
        ma = num(a["banda_max"], alvo) if a else alvo
        if v == 0 and not alvo and not ma:
            continue
        pct = v / b["base"] if b["base"] else 0.0
        situacao = None
        if alvo is not None and c != cfg["cash_class"]:
            situacao = "abaixo" if pct < mi - 1e-12 else ("acima" if pct > ma + 1e-12 else "ok")
        linhas.append({"classe": c, "valor": v, "pct": pct, "alvo": alvo, "min": mi, "max": ma,
                       "situacao": situacao,
                       "falta": (alvo * base_ordem - v) if alvo is not None else None,
                       "instrumento": a.get("instrumento", "") if a else ""})
    return {"versao": versao, "vigencia": vigencia, "linhas": linhas, "base_ordem": base_ordem,
            "soma_pct": sum(l["pct"] for l in linhas),
            "soma_alvo": sum(l["alvo"] or 0 for l in linhas)}


def _gastos(despesas, cfg):
    meses = {}
    for l in despesas:
        tipo, v = l.get("tipo", ""), num(l.get("valor_brl"))
        m = meses.setdefault(l.get("mes", ""), {"renda": 0.0, "outras_entradas": 0.0, "fixo": 0.0,
                                                "variavel": 0.0, "passiva": 0.0, "cats": {},
                                                "itens": []})
        m["itens"].append({"data": l.get("data", ""), "descricao": l.get("descricao", ""),
                           "categoria": l.get("categoria", ""), "tipo": tipo, "valor": v,
                           "obs": l.get("obs", "")})
        if tipo == "Entrada":
            if l.get("categoria") in cfg["income_categories"]:
                m["renda"] += v
            else:
                m["outras_entradas"] += v
            if l.get("categoria") in cfg["passive_income_categories"]:
                m["passiva"] += v
        else:
            m["fixo" if tipo == "Fixo" else "variavel"] += v
            m["cats"][l.get("categoria", "")] = m["cats"].get(l.get("categoria", ""), 0.0) + v
    saida = []
    for mes in sorted(k for k in meses if k):
        m = meses[mes]
        gastos = m["fixo"] + m["variavel"]
        saida.append({"mes": mes, "renda": m["renda"], "outras_entradas": m["outras_entradas"],
                      "fixo": m["fixo"], "variavel": m["variavel"], "gastos": gastos,
                      "sobra": m["renda"] - gastos, "passiva": m["passiva"],
                      "taxa": (m["renda"] - gastos) / m["renda"] if m["renda"] else None,
                      "cats": sorted(m["cats"].items(), key=lambda x: -x[1]),
                      "itens": sorted(m["itens"], key=lambda x: x["data"])})
    return saida


def _aportes(aportes):
    meses = {}
    for a in aportes:
        m = meses.setdefault(a.get("mes", ""), {"executado": 0.0, "planos": []})
        if a.get("status") == "executado":
            m["executado"] += num(a.get("valor_brl"))
        elif a.get("status") == "planejado":
            m["planos"].append(a)
    hist, ordem = [], None
    for mes in sorted(k for k in meses if k):
        m = meses[mes]
        # Um mes pode ter varios planos: vale o lote da ultima fonte registrada.
        lote = [p for p in m["planos"] if p.get("fonte") == m["planos"][-1].get("fonte")] if m["planos"] else []
        planejado = sum(num(p.get("valor_brl")) for p in lote)
        hist.append({"mes": mes, "executado": m["executado"], "planejado": planejado})
        if planejado > 0:
            ordem = {"mes": mes, "fonte": lote[0].get("fonte", ""), "total": planejado,
                     "itens": [{"classe": p.get("classe", ""), "instrumento": p.get("instrumento", ""),
                                "valor": num(p.get("valor_brl"))}
                               for p in lote if num(p.get("valor_brl")) > 0]}
    return hist, ordem


def _ultimos(indicadores, cfg):
    ult = {}
    for i in indicadores:
        k = i.get("indicador", "")
        if k and i.get("data_ref", "") >= ult.get(k, {}).get("data_ref", ""):
            ult[k] = i
    return [{"indicador": k, "valor": opt(ult[k].get("valor")), "unidade": ult[k].get("unidade", ""),
             "data": ult[k].get("data_ref", ""), "fonte": ult[k].get("fonte", "")}
            for k in cfg["benchmarks"] if k in ult]


def build(tables, params, cfg, hoje=None):
    hoje = hoje or date.today()
    pos = [r for r in tables["posicoes"] if r.get("data_snapshot")]
    snaps = sorted({r["data_snapshot"] for r in pos})
    faltando = []
    if not snaps:
        return {"vazio": True, "faltando": ["Nenhuma posição em data/investments/posicoes.csv."],
                "config": _cfg_publico(cfg), "parametros": params}

    posicoes = _posicoes(pos, snaps, cfg)
    b = _blocos([r for r in pos if r["data_snapshot"] == snaps[-1]], cfg)

    meta_reserva = _param(params, "META", "RESERVA")
    aporte_mensal = _param(params, "APORTE", "MENSAL")
    para_reserva = min(b["caixa"], max(0.0, meta_reserva - b["reserva"])) if meta_reserva else 0.0
    if meta_reserva is None:
        faltando.append("Meta da reserva: sem parâmetro 'Meta da reserva' na aba Config da planilha "
                        "nem em 'parameters' do config.")

    # Resultado por tipo de produto
    por_tipo = {}
    for p in posicoes:
        t = por_tipo.setdefault(p["tipo"], {"tipo": p["tipo"], "valor": 0.0, "custo": 0.0,
                                            "sobre_custo": 0.0, "observado": 0.0, "n": 0,
                                            "n_custo": 0, "n_observado": 0, "n_sem_dado": 0})
        t["valor"] += p["valor"]
        t["n"] += 1
        if p["metodo"] == "custo":
            t["sobre_custo"] += p["resultado"]
            t["custo"] += p["custo"]
            t["n_custo"] += 1
        elif p["metodo"] == "observado":
            t["observado"] += p["resultado"]
            t["n_observado"] += 1
        else:
            t["n_sem_dado"] += 1
    por_tipo = sorted(por_tipo.values(), key=lambda t: -t["valor"])
    sem_resultado = [p["ativo"] for p in posicoes
                     if p["metodo"] is None and p["tipo"] != "Conta" and p["valor"]]
    if sem_resultado:
        faltando.append("Sem custo de aquisição no arquivo (resultado não calculado): "
                        + "; ".join(sem_resultado) + ".")
    desde = sorted({p["desde"] for p in posicoes if p["desde"]})

    realizado = _realizado(tables["transacoes"])
    if realizado["sem_custo"]:
        faltando.append("Vendas sem compra registrada em transacoes.csv (resultado realizado não "
                        "calculado): " + "; ".join(f"{s['ativo']} em {s['data']}"
                                                   for s in realizado["sem_custo"]) + ".")

    evolucao = []
    for s in snaps:
        rows = [r for r in pos if r["data_snapshot"] == s]
        e = _blocos(rows, cfg)
        e["data"] = s
        e["sobre_custo"] = sum(num(r["valor_brl"]) - _custo(r) for r in rows if _custo(r) is not None)
        evolucao.append(e)

    gastos = _gastos(tables["despesas"], cfg)
    hist_aportes, ordem = _aportes(tables["aportes"])
    alocacao = _alocacao(posicoes, tables["alvos"], b, para_reserva, cfg, hoje)
    if not alocacao["versao"]:
        faltando.append("Sem metas de alocação em data/investments/alvos.csv.")

    eventos = sorted((v for v in tables["vencimentos"]
                      if v.get("data", "") >= hoje.isoformat()
                      and (v.get("status") or "aberto") == "aberto"), key=lambda v: v["data"])
    eventos = [{"data": v["data"], "evento": v.get("evento", ""), "ativo": v.get("ativo", ""),
                "valor": opt(v.get("valor_aprox_brl")), "acao": v.get("acao", "")} for v in eventos]
    escada = sorted(({"data": p["vencimento"], "ativo": p["ativo"], "tipo": p["tipo"],
                      "valor": p["valor"], "indexador": p["indexador"]}
                     for p in posicoes if p["vencimento"]), key=lambda x: x["data"])

    ult12 = gastos[-12:]
    return {
        "vazio": False,
        "snapshot": snaps[-1], "hoje": hoje.isoformat(),
        "blocos": b,
        "posicoes": posicoes,
        "alertas_posicao": sum(1 for p in posicoes if p["alerta"]),
        "resultado": {
            "sobre_custo": sum(p["resultado"] for p in posicoes if p["metodo"] == "custo"),
            "custo_total": sum(p["custo"] for p in posicoes if p["metodo"] == "custo"),
            "observado": sum(p["resultado"] for p in posicoes if p["metodo"] == "observado"),
            "observado_desde": desde[0] if desde else None,
            "por_tipo": por_tipo, "realizado": realizado,
        },
        "alocacao": alocacao,
        "reserva": {"atual": b["reserva"], "meta": meta_reserva, "para_reserva": para_reserva},
        "aporte_mensal": aporte_mensal,
        "evolucao": evolucao,
        "gastos": gastos,
        "passiva": {"meses": [{"mes": g["mes"], "valor": g["passiva"]} for g in gastos],
                    "total_12m": sum(g["passiva"] for g in ult12), "n_meses": len(ult12)},
        "aportes": hist_aportes, "ordem": ordem,
        "eventos": eventos, "escada": escada,
        "indicadores": _ultimos(tables["indicadores"], cfg),
        "parametros": params,
        "faltando": faltando,
        "config": _cfg_publico(cfg),
    }


def _cfg_publico(cfg):
    return {"append_only": bool(cfg.get("append_only")), "simulator": cfg.get("simulator"),
            "disclaimer": cfg.get("disclaimer"), "allocation_blocks": cfg["allocation_blocks"],
            "cash_class": cfg["cash_class"], "reserve_block": cfg["reserve_block"]}

# -*- coding: utf-8 -*-
"""
guide.py - o guia que ensina qualquer IA a alimentar o painel, gerado a partir do esquema.

Tres saidas, todas montadas de store.TABLES para nunca ficarem diferentes do que o painel aceita:
  - build():          o guia completo em Markdown (arquivo GUIA_IA.md e rota /api/guia.md);
  - prompt_files():   pedido pronto para uma IA que le e grava arquivos (Claude Code, Codex,
                      Gemini CLI, Cursor e parecidas);
  - prompt_chat():    pedido pronto para uma IA de conversa (ChatGPT, Claude, Gemini): ela devolve
                      um bloco de texto e a pessoa cola em "Importar dados".

Para regravar o arquivo depois de mudar o esquema:
    python -m server.guide
"""
from . import store

FORMATOS = {
    "date": "data AAAA-MM-DD", "month": "mês AAAA-MM", "number": "número",
    "money": "reais, ponto decimal", "fraction": "0.25 ou 25%", "text": "texto",
}

EXEMPLOS = {
    "posicoes": [
        {"data_snapshot": "2026-11-30", "ativo": "CDB Banco X", "bloco": "Carteira", "classe": "Renda fixa",
         "quantidade": "1", "preco_medio": "5000.00", "valor_brl": "5210.35", "indexador": "110% do CDI",
         "vencimento": "2028-03-15", "isento_ir": "nao", "fonte": "extrato do banco de 11/2026"},
        {"data_snapshot": "2026-11-30", "ativo": "BOVA11", "ticker": "BOVA11", "bloco": "Carteira",
         "classe": "Ações", "quantidade": "10", "preco_medio": "120.00", "preco_mercado": "128.50",
         "valor_brl": "1285.00", "indexador": "ETF", "isento_ir": "nao", "fonte": "nota da corretora"},
        {"data_snapshot": "2026-11-30", "ativo": "CDB liquidez diária", "bloco": "Reserva", "classe": "Reserva",
         "quantidade": "1", "preco_medio": "6000.00", "valor_brl": "6101.00", "indexador": "100% do CDI",
         "isento_ir": "nao", "fonte": "extrato do banco de 11/2026"},
    ],
    "transacoes": [
        {"data": "2026-11-10", "tipo": "compra", "ativo": "BOVA11", "ticker": "BOVA11", "classe": "Ações",
         "quantidade": "10", "valor_brl": "1200.00", "fonte": "nota da corretora"},
    ],
    "aportes": [
        {"mes": "2026-12", "classe": "Renda fixa", "instrumento": "CDB Banco X", "valor_brl": "600.00",
         "status": "planejado", "fonte": "plano combinado em 30/11/2026"},
    ],
    "alvos": [
        {"versao_politica": "v1", "vigencia_inicio": "2026-11-01", "classe": "Renda fixa", "alvo": "0.70",
         "banda_min": "0.65", "banda_max": "0.75", "instrumento": "CDB e Tesouro"},
        {"versao_politica": "v1", "vigencia_inicio": "2026-11-01", "classe": "Ações", "alvo": "0.30",
         "banda_min": "0.25", "banda_max": "0.35", "instrumento": "ETF"},
    ],
    "vencimentos": [
        {"data": "2028-03-15", "evento": "vencimento", "ativo": "CDB Banco X", "valor_aprox_brl": "5000",
         "acao": "Decidir onde reaplicar"},
    ],
    "despesas": [
        {"data": "2026-11-05", "descricao": "Salário", "categoria": "Salário", "tipo": "Entrada",
         "valor_brl": "6500.00", "fonte": "extrato do banco de 11/2026"},
        {"data": "2026-11-06", "descricao": "Aluguel", "categoria": "Moradia", "tipo": "Fixo",
         "valor_brl": "1800.00", "fonte": "extrato do banco de 11/2026"},
        {"data": "2026-11-12", "descricao": "Supermercado", "categoria": "Alimentação", "tipo": "Variável",
         "valor_brl": "231.90", "fonte": "extrato do banco de 11/2026"},
    ],
    "indicadores": [
        {"data_ref": "2026-11-30", "indicador": "cdi", "valor": "10.15", "unidade": "% a.a.",
         "fonte": "Banco Central"},
    ],
    "precos": [
        {"data_ref": "2026-11-30", "ticker": "BOVA11", "preco_brl": "128.50", "fonte": "B3"},
    ],
}


def _formato(col):
    if col["type"] == "select":
        return "uma de: " + ", ".join(f"`{k}`" for k in col["options"])
    return FORMATOS.get(col["type"], "texto")


def _csv_line(values):
    import csv
    import io
    buf = io.StringIO()
    csv.writer(buf, lineterminator="").writerow(values)
    return buf.getvalue()


def _exemplo(nome, completo=True):
    """Cabecalho e linhas de exemplo. completo=False mostra so as colunas usadas no exemplo."""
    cols = store.columns(nome)
    linhas = EXEMPLOS.get(nome, [])
    if not completo:
        cols = [c for c in cols if any(l.get(c) for l in linhas)]
    return "\n".join([",".join(cols)] + [_csv_line([l.get(c, "") for c in cols]) for l in linhas])


def _tabela(nome):
    t = store.TABLES[nome]
    out = [f"### `{nome}`: {t['label']}", "",
           f"Arquivo `{t['path']}`. {t['about']}", "",
           "| coluna | o que é | formato | obrigatória |", "|---|---|---|---|"]
    for c in t["columns"]:
        ajuda = c["label"] + (". " + c["help"] if c["help"] else "")
        padrao = t["defaults"].get(c["name"])
        if padrao:
            ajuda += f" Vazio vira `{padrao}`."
        out.append(f"| `{c['name']}` | {ajuda} | {_formato(c)} | "
                   f"{'sim' if c['name'] in t['required'] else ''} |")
    out += ["", "```csv", _exemplo(nome), "```", ""]
    return "\n".join(out)


def build(cfg=None, base_url="http://localhost:8000"):
    cfg = cfg or store.DEFAULTS
    renda = ", ".join(f"`{c}`" for c in cfg["income_categories"])
    blocos = [b for b in cfg["allocation_blocks"] if b != cfg["cash_class"]] or ["Carteira"]
    base_url = base_url.rstrip("/")
    partes = [f"""# Guia para IA: como alimentar o {store.APP_NAME}

O {store.APP_NAME} é um painel local de finanças pessoais. Ele não busca nada sozinho: mostra o que
está nos arquivos da pasta de dados. O seu papel, como IA, é transformar o que a pessoa conta
(extratos, comprovantes, anotações, mensagens) em linhas desses arquivos. O painel confere a pasta
a cada 4 segundos e se atualiza sozinho.

Este arquivo é gerado a partir do esquema do painel (`python -m server.guide`). Não edite à mão.

## Regras

1. **Nunca invente** valor, data, taxa ou preço. Faltou informação: pergunte à pessoa.
2. **Só acrescente linhas** no fim dos arquivos. Não apague, não reordene linhas e não mude o
   cabeçalho (nomes e ordem das colunas).
3. CSV em UTF-8, separado por vírgula, com **ponto decimal** (`1234.56`). Texto que contém vírgula
   vai entre aspas.
4. Datas `AAAA-MM-DD`; meses `AAAA-MM`.
5. Valores **sempre positivos**. A coluna `tipo` é que diz se é gasto ou entrada, compra ou venda.
6. Preencha `fonte` com a origem do dado (exemplo: `extrato do banco de 11/2026`). É o que permite
   conferir depois.
7. Antes de gravar, confira se a linha já existe, para não lançar duas vezes o mesmo extrato.
8. Você organiza dados. Não execute ordens, não movimente dinheiro e não peça senhas.

## Três jeitos de enviar os dados

**A. Editar os arquivos** (IA com acesso à pasta). Acrescente as linhas direto nos CSV da pasta de
dados. Se o arquivo ainda não existe, crie com o cabeçalho completo da tabela.

**B. Usar a API local** (painel aberto em `{base_url}`):

| O que fazer | Chamada |
|---|---|
| Ver o esquema, com a explicação de cada coluna | `GET {base_url}/api/schema` |
| Ler uma tabela | `GET {base_url}/api/table/despesas` |
| Acrescentar linhas | `POST {base_url}/api/table/despesas/rows` com `{{"rows": [{{...}}, {{...}}]}}` |
| Conferir um bloco sem gravar | `POST {base_url}/api/import` com `{{"text": "...", "dry_run": true}}` |
| Gravar o bloco conferido | `POST {base_url}/api/import` com `{{"text": "...", "dry_run": false}}` |
| Ler os números que o painel mostra | `GET {base_url}/api/dashboard` |

A API confere os dados e responde com a mensagem do erro quando algo está fora do formato. Ela
aceita data `DD/MM/AAAA`, número `1.234,56` e porcentagem `25%`, e grava no formato certo.

**C. Devolver um bloco para colar** (IA de conversa, sem acesso a arquivos). Responda só com um
bloco de código neste formato. A pessoa cola em **Adicionar > Importar dados** e o painel confere
antes de gravar:

```csv
# despesas
{_exemplo("despesas", completo=False)}

# transacoes
{_exemplo("transacoes", completo=False)}
```

No bloco e na API, colunas que você não tem podem ficar de fora (menos as obrigatórias). `mes` é
preenchido a partir de `data`, e `fonte` vazia recebe "Importado no {store.APP_NAME} em DD/MM/AAAA".
Linhas iguais às que já existem são ignoradas.

## Como o painel entende os dados

- **`posicoes` é uma foto da carteira.** Todas as linhas com a mesma `data_snapshot` formam a
  carteira daquele dia, e o painel mostra a data mais recente. Para atualizar os valores, grave uma
  foto nova com **todos** os investimentos, mesmo os que não mudaram. Uma foto com um investimento
  só faz os outros sumirem da tela.
- **`bloco`** diz para que serve o dinheiro: {", ".join(f"`{b}`" for b in blocos)} (investimentos, entra
  na alocação), `{cfg["reserve_block"]}` (reserva de emergência, fica fora da alocação) ou `{cfg["cash_class"]}`
  (dinheiro em conta esperando para investir; use também `classe` = `{cfg["cash_class"]}`). Qualquer outro
  bloco entra só no patrimônio total.
- **`classe`** é o grupo que aparece na aba Alocação (exemplos: Renda fixa, Ações, Exterior). Use
  sempre os mesmos nomes, iguais aos de `alvos`.
- **Tipo do produto** é deduzido do começo de `ativo`: `CDB`, `LCI`, `LCA`, `Tesouro`, `CRI`, `CRA`,
  `Debênture`, `Conta`, `Poupança`, `Fundo`. Para o que tem `ticker`: escreva `ETF`, `FII` ou `BDR` em
  `indexador`; sem isso, o painel trata como ação.
- **Lucro** = `valor_brl` menos `quantidade` x `preco_medio`. Em renda fixa, use `quantidade` 1 e
  `preco_medio` igual ao valor aplicado. Sem esses dois campos o painel não calcula lucro.
- **`transacoes`** não muda o valor da carteira (isso é papel de `posicoes`). Ela serve para
  calcular o lucro das vendas: a venda procura as compras do mesmo `ticker`.
- **`alvos`** guarda as metas de alocação. Vale a versão com `vigencia_inicio` mais recente; para
  mudar as metas, grave um conjunto novo de linhas com outro nome de versão. As metas somam 100%.
- **`despesas`**: `tipo` é `Fixo`, `Variável` ou `Entrada`. Conta como renda a entrada com
  `categoria` {renda}. Outras entradas (reembolso, transferência entre contas) não contam.
- **`aportes`**: `planejado` é o plano do mês, `executado` é o que foi feito de fato.
- **Meta da reserva e aporte mensal** ficam em `parameters` do arquivo `config.local.json`, na pasta
  do painel: `{{"{store.PARAM_RESERVA}": 9000, "{store.PARAM_APORTE}": 1000}}`.
- **Notas em Markdown** (`.md`) nas pastas `goals/`, `rules/`, `reports/` e `research/` aparecem em
  Lançamentos > Notas. Bom lugar para relatórios e resumos que você escrever.

## Tabelas
"""]
    partes += [_tabela(n) for n in store.TABLES]
    partes.append(f"""## Pasta de dados

```
<pasta de dados>/
├── data/
│   ├── investments/   posicoes.csv, transacoes.csv, aportes.csv, alvos.csv, vencimentos.csv
│   ├── expenses/      despesas.csv
│   └── market/        indicadores.csv, precos.csv
├── goals/  rules/  reports/  research/     notas em Markdown
└── carteira.xlsx                           opcional; só a aba Config é lida
```
""")
    return "\n".join(partes)


def prompt_files(cfg, base_url="http://localhost:8000"):
    return f"""Você vai me ajudar a manter meu painel financeiro, o {store.APP_NAME}.

1. Leia o guia antes de tudo: {store.APP_DIR / "GUIA_IA.md"}
2. Meus dados ficam nesta pasta: {store.data_dir(cfg)}
3. O painel roda em {base_url.rstrip("/")} e se atualiza sozinho quando os arquivos mudam.

Quando eu mandar extratos, comprovantes ou contar o que fiz, acrescente as linhas nos arquivos CSV dessa pasta, seguindo o guia. Não invente números e não apague nada: se faltar informação, me pergunte. Antes de gravar, mostre um resumo do que vai lançar.

Para começar, me diga o que você precisa que eu envie."""


def prompt_chat(cfg):
    linhas = []
    for nome, t in store.TABLES.items():
        if nome in ("indicadores", "precos"):
            continue
        cols = [c for c in t["columns"] if not c["advanced"] or c["name"] == "obs"]
        linhas.append(f"# {nome} ({t['label'].lower()})")
        linhas.append(",".join(c["name"] for c in cols))
        for c in cols:
            if c["type"] == "select":
                linhas.append(f"  {c['name']}: {' | '.join(c['options'])}")
        linhas.append("")
    renda = " ou ".join(cfg["income_categories"])
    return f"""Você vai organizar meus dados financeiros para eu colar no meu painel, o {store.APP_NAME}.

Vou mandar extratos, prints ou anotações. Leia tudo e devolva SOMENTE um bloco de código, sem explicação antes nem depois, neste formato: para cada tabela, uma linha "# nome", depois o cabeçalho e as linhas em CSV.

Regras:
- Separador vírgula, ponto decimal (1234.56), datas AAAA-MM-DD, meses AAAA-MM. Texto com vírgula entre aspas.
- Valores sempre positivos. A coluna tipo diz se é gasto ou entrada, compra ou venda.
- Não invente valor nem data. Se algo estiver ilegível ou faltando, pergunte antes de montar o bloco.
- Use só as tabelas que fizerem sentido. Colunas que você não souber podem ficar vazias.
- Em despesas, salário e rendimentos entram com categoria {renda}.
- posicoes é uma foto da carteira: mande todos os investimentos com a mesma data_snapshot. bloco é Carteira, Reserva ou Caixa. Em renda fixa, comece o nome pelo tipo (CDB, LCI, LCA, Tesouro), use quantidade 1 e preco_medio igual ao valor aplicado. Em ETF, FII e BDR, escreva ETF, FII ou BDR em indexador.

Tabelas e colunas:

{chr(10).join(linhas).rstrip()}

Exemplo de resposta:

# despesas
{_exemplo("despesas", completo=False)}

Para começar, me peça o que você precisa."""


if __name__ == "__main__":
    destino = store.APP_DIR / "GUIA_IA.md"
    destino.write_text(build(), encoding="utf-8", newline="\n")
    print(f"Gravado: {destino}")

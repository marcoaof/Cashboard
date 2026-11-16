# Dashboard Financeiro

Painel local de patrimônio, investimentos e gastos. Roda no seu computador (Windows), lê e grava
arquivos CSV e Markdown de uma pasta de dados que você escolhe, e nunca envia nada para fora.

O repositório traz só código e dados fictícios (`sample_data/`). Seus dados ficam na sua pasta, fora
do Git.

## O que ele mostra

| Aba | Conteúdo |
|---|---|
| Visão geral | Patrimônio total, carteira de investimento, lucro não realizado, rendimento observado, renda passiva, gastos do mês, reserva contra a meta, evolução, ordem planejada, próximos eventos e indicadores |
| Alocação | Atual contra a meta por classe, com banda e desvio; cálculo de onde aportar; vencimentos da renda fixa |
| Lucros | Resultado por posição e por tipo de produto (ETF, LCI, LCA, CDB, Tesouro, FII, ações), resultado realizado e IR retido |
| Gastos | Renda, gastos, sobra e taxa de poupança por mês; gastos por categoria; lançamentos |
| Evolução e simulador | Histórico das posições, aportes executados e planejados, renda passiva recebida, simulador de projeção com três cenários |
| Gestão | Inclusão, edição e exclusão de linhas nas tabelas; leitura e edição de notas e relatórios em Markdown |

No topo ficam o estado da sincronização (clique para recarregar), o botão de ocultar valores (esconde
os reais e mantém os percentuais) e a engrenagem de opções:

- **Tema:** moderno ou clássico.
- **Modo:** claro, escuro ou automático (segue o sistema).
- **Dados:** exportar planilha `.xlsx`, imprimir ou salvar em PDF, e escolher a pasta de dados.

Os filtros por classe e por tipo de produto ficam na aba Lucros. Tema e modo ficam guardados no
navegador.

## Instalar e rodar (Windows)

1. Instale o [Python 3.10 ou mais novo](https://www.python.org/downloads/) e marque "Add python.exe to PATH".
2. Dê dois cliques em **`iniciar_dashboard.bat`**.

Na primeira vez o script cria o ambiente `.venv`, instala as dependências de `requirements.txt`, copia
`config.example.json` para `config.local.json`, sobe o servidor e abre `http://localhost:8000` no
navegador. Para encerrar, feche a janela do terminal.

Rodar à mão, se preferir:

```bat
py -3 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn server.main:app --host 127.0.0.1 --port 8000
```

Outra porta: defina `WD_PORT` antes de rodar o `.bat` (`set WD_PORT=8080`).

Os gráficos usam a biblioteca ECharts, carregada de `cdn.jsdelivr.net`. O tema moderno usa a fonte do
sistema; o clássico usa Segoe UI e Tahoma, e a fonte VT323 (Google Fonts) nos visores. Sem internet, as
tabelas e os números continuam funcionando e os gráficos ficam indisponíveis.

Cores e fontes ficam em variáveis: `web/styles.css` (tema moderno, claro e escuro) e `web/classic.css`
(tema clássico, claro e escuro). As seis cores de série de cada combinação foram testadas quanto a
contraste e daltonismo: ao trocar, mantenha a ordem.

## Configurar a pasta de dados

Pela tela: botão **Configurações**, informe o caminho e salve. Pelo arquivo: edite `config.local.json`.

```json
{
  "data_directory": "C:/Users/voce/Documents/MinhasFinancas"
}
```

Caminho absoluto ou relativo à pasta do projeto. `config.local.json` está no `.gitignore`; o
que vale para todos fica em `config.example.json`. Chaves aceitas:

| Chave | Para que serve | Padrão |
|---|---|---|
| `data_directory` | Pasta de dados | `sample_data` |
| `append_only` | `true`: só inclui linha; editar e apagar ficam bloqueados | `false` |
| `allocation_blocks` | Blocos que entram na base da alocação | `["Caixa", "Carteira"]` |
| `cash_class` | Classe que representa dinheiro ainda não investido | `Caixa` |
| `reserve_block` | Bloco da reserva de emergência (fora da alocação) | `Reserva` |
| `income_categories` | Categorias de entrada que contam como renda | `["Salário", "Rendimentos"]` |
| `passive_income_categories` | Categorias de renda passiva | `["Rendimentos"]` |
| `benchmarks` | Indicadores exibidos na visão geral | CDI, Selic, IPCA 12 meses, Ibovespa, dólar |
| `flag_words` | Palavras na coluna `obs` que marcam um valor como estimado | `ESTIMATIVA`, `PREMISSA`, `CARREGADO` |
| `protected_paths` | Pastas em que o painel nunca grava | `data/raw`, `archive` |
| `frozen_paths` | Pastas em que arquivo existente não é sobrescrito (dá para criar novo) | vazio |
| `parameters` | Parâmetros usados quando não há planilha (ver abaixo) | vazio |
| `simulator` | Taxas reais e prazo iniciais do simulador | 3%, 5%, 7% e 20 anos |
| `disclaimer` | Texto do rodapé | "Dashboard para organização pessoal." |

## Estrutura da pasta de dados

```
<pasta de dados>/
├── carteira.xlsx                     opcional; só a aba Config é lida
├── data/
│   ├── investments/
│   │   ├── posicoes.csv              uma linha por posição por data (snapshot)
│   │   ├── transacoes.csv            compras, vendas, aplicações e resgates
│   │   ├── aportes.csv               plano e execução de aporte por mês
│   │   ├── alvos.csv                 metas de alocação por versão
│   │   └── vencimentos.csv           calendário de eventos
│   ├── expenses/despesas.csv         entradas e saídas de caixa
│   └── market/
│       ├── indicadores.csv           CDI, Selic, IPCA e outros
│       └── precos.csv                preço e taxa de ativos
├── goals/      *.md                  metas
├── rules/      *.md                  política e regras
├── reports/    **/*.md               relatórios
└── research/   **/*.md               teses e estudos
```

CSV em UTF-8, separador vírgula, ponto decimal, datas `AAAA-MM-DD` e meses `AAAA-MM`. Percentuais de
`alvos.csv` como fração (`0.25` é 25%). `sample_data/` tem um exemplo de cada arquivo.

| Arquivo | Colunas, na ordem |
|---|---|
| `posicoes.csv` | `data_snapshot, ativo, ticker, bloco, classe, quantidade, preco_medio, preco_mercado, valor_brl, indexador, vencimento, isento_ir, fonte, obs` |
| `transacoes.csv` | `data, tipo, ativo, ticker, classe, quantidade, valor_brl, ir_brl, status, liquidacao, fonte, obs` |
| `aportes.csv` | `mes, classe, instrumento, valor_brl, status, fonte, obs` |
| `alvos.csv` | `versao_politica, vigencia_inicio, classe, alvo, banda_min, banda_max, instrumento, fonte` |
| `vencimentos.csv` | `data, evento, ativo, classe, valor_aprox_brl, acao, fonte, status` |
| `despesas.csv` | `data, mes, descricao, categoria, tipo, valor_brl, fonte, obs` |
| `indicadores.csv` | `data_ref, indicador, valor, unidade, fonte, obs` |
| `precos.csv` | `data_ref, ticker, preco_brl, taxa_adm_aa, pl_brl, fonte, obs` |

Valores fixos: `tipo` de transação é `compra`, `venda`, `aplicacao` ou `resgate`; `status` de
transação é `liquidado` ou `pendente`; `status` de aporte é `planejado`, `executado`,
`planejado_nao_executado` ou `substituido`; `tipo` de despesa é `Fixo`, `Variável` ou `Entrada`;
`status` de vencimento é `aberto` ou `encerrado`.

**Parâmetros.** A meta da reserva e o aporte mensal vêm da aba `Config` de `carteira.xlsx`: o painel
procura a célula `Parâmetro` na coluna A e lê nome (A), valor (B) e origem (C) até a primeira linha
vazia. Usa os nomes que contêm "meta" e "reserva", e "aporte" e "mensal". Sem planilha, informe em
`parameters` no config: `{"Meta da reserva de emergência": 9000, "Aporte mensal": 1000}`.

## Como os números são calculados

- **Posição atual:** as linhas de `posicoes.csv` com a maior `data_snapshot`.
- **Carteira de investimento (base da alocação):** soma dos blocos de `allocation_blocks`. A reserva
  fica de fora.
- **Lucro não realizado sobre custo:** `valor_brl − quantidade × preco_medio`, para posições que têm
  as duas colunas preenchidas.
- **Rendimento observado:** para título com vencimento e sem custo no arquivo, valor atual menos o
  valor no primeiro snapshot em que o título aparece. Não é o lucro desde a aplicação.
- **Resultado realizado:** valor da venda menos o custo. O custo é a média das compras do mesmo ticker
  em `transacoes.csv`; sem compra lá, vale o preço médio que `posicoes.csv` registra para o papel no
  último snapshot até a data da venda (a linha ganha a etiqueta "preço médio"). Sem nenhum dos dois, a
  venda fica fora do total e aparece como "sem custo".
- **Tipo de produto:** deduzido do nome do ativo (`LCI`, `LCA`, `CDB`, `Tesouro`, `Conta`) e, para quem
  tem ticker, de "ETF" ou "FII" na coluna `indexador`.
- **Taxa de poupança:** `(renda − gastos) ÷ renda`, no mês.
- **Falta para o alvo:** `alvo × (base − caixa destinado à reserva) − valor da classe`.
- **Simulador:** juros compostos mensais sobre taxa real anual, aporte no fim do mês. É premissa, não
  previsão.

O painel não estima o que falta: dado ausente aparece como "n/d" e entra na lista de pontos de atenção.

## Sincronização nos dois sentidos

- **Do painel para os arquivos:** cada inclusão, edição ou exclusão grava na hora. Antes de alterar
  um arquivo, o painel guarda uma cópia em `.backups/<data-hora>/`. Incluir linha acrescenta no fim do
  CSV sem reescrever as linhas existentes.
- **Dos arquivos para o painel:** a cada 4 segundos o painel confere tamanho e data de modificação
  dos arquivos. Se algo mudou (você, um script ou uma IA editou), ele recarrega os dados mantendo a
  aba, os filtros e a posição da tela. Com um formulário aberto, espera você terminar.

## Segurança

O servidor escuta só em `127.0.0.1`. Não há senha, então não exponha a porta na rede. O painel não se
conecta a banco ou corretora e não executa ordens: ele só organiza arquivos.

## Estrutura do projeto

```
WealthDashboard/
├── iniciar_dashboard.bat     cria o .venv, instala, sobe o servidor e abre o navegador
├── requirements.txt          fastapi, uvicorn, openpyxl
├── config.example.json       configuração padrão (versionada)
├── config.local.json         sua configuração (fora do Git)
├── server/
│   ├── main.py               API REST e servidor do frontend
│   ├── store.py              leitura, gravação, backup e detecção de mudança
│   └── metrics.py            cálculos do painel
├── web/                      index.html, styles.css, classic.css, app.js
└── sample_data/              dados fictícios para rodar de imediato
```

API local: `GET /api/dashboard`, `GET /api/state`, `GET|PUT /api/config`, `GET /api/schema`,
`GET|POST /api/table/{nome}`, `PUT|DELETE /api/table/{nome}/{linha}`, `GET /api/docs`,
`GET|PUT|DELETE /api/doc`, `GET /api/export.xlsx`.

Dashboard para organização pessoal.

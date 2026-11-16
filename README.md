# Cashboard

Um painel simples para ver o seu dinheiro: quanto você tem, onde está investido, quanto rendeu e
para onde vão os gastos do mês.

Ele roda no seu computador e não envia nada para fora. Você preenche pela tela, em formulários
curtos, ou deixa uma IA (ChatGPT, Claude, Gemini, a que você preferir) organizar seus extratos e
mandar tudo para ele. O Cashboard é o lugar onde você enxerga o que está organizando.

Ele não analisa ações, não recomenda investimento e não se conecta a banco nem a corretora.

## Começar

1. Instale o [Python 3.10 ou mais novo](https://www.python.org/downloads/) e marque
   "Add python.exe to PATH" na instalação.
2. Dê dois cliques em **`iniciar_dashboard.bat`**. O navegador abre em `http://localhost:8000`.
3. O painel abre com **dados de exemplo**, inventados, para você ver como fica. Quando quiser,
   clique em **Começar com meus dados**: ele cria uma pasta vazia e mostra os primeiros passos.

Para encerrar, feche a janela preta do terminal.

## Registrar pela tela

O botão **Adicionar**, no topo, pergunta o que você quer registrar:

| Opção | Para quê |
|---|---|
| Gasto ou entrada | Uma compra, uma conta, o salário, um rendimento recebido |
| Investimento novo | Algo que você tem e ainda não está no painel. Você escolhe o tipo (CDB, Tesouro, ação, ETF, FII...) e o formulário pede só o que faz sentido para ele |
| Atualizar valores | Uma tela só com todos os seus investimentos, para corrigir quanto vale cada um hoje |
| Compra ou venda | Uma operação feita. Serve para calcular o lucro das vendas |
| Aporte | O que você planejou investir no mês e o que investiu de fato |
| Data importante | Vencimento, revisão, lembrete |
| Metas | Reserva de emergência, aporte mensal e como dividir a carteira |
| Importar dados | Colar o que a sua IA organizou |

Os formulários aceitam número do jeito brasileiro (`1.234,56`), preenchem sozinhos o que dá para
deduzir e deixam o resto em "Mais opções". Explicações ficam no **?** ao lado de cada termo.

**Como a carteira funciona.** O painel guarda uma foto da carteira por data e mostra a mais
recente. "Investimento novo" entra na foto atual. "Atualizar valores" cria uma foto nova com todos
os investimentos, e é isso que desenha o gráfico de evolução.

## Preencher com uma IA

Em **Adicionar > Importar dados** ou na engrenagem **Opções > Conectar com IA** há um pedido pronto
para copiar. São dois jeitos:

- **IA de conversa** (ChatGPT, Claude, Gemini). Cole o pedido na conversa, mande seus extratos ou
  conte o que fez, copie a resposta e cole em **Importar dados**. O painel confere tudo antes de
  gravar, mostra o que vai entrar, ignora o que já existe e aponta a linha que estiver errada.
- **IA que mexe em arquivos** (Claude Code, Codex, Gemini CLI, Cursor). Abra a IA na pasta de dados
  e cole o pedido. Ela grava nos arquivos e o painel se atualiza sozinho em até 4 segundos.

O arquivo [`GUIA_IA.md`](GUIA_IA.md) ensina qualquer IA a preencher o painel: regras, formato de
cada tabela e exemplos. O [`AGENTS.md`](AGENTS.md) é a porta de entrada para agentes.

## O que cada aba mostra

| Aba | Conteúdo |
|---|---|
| Resumo | Patrimônio total, investimentos, lucro até agora, rendimentos recebidos, gastos do mês, reserva de emergência, plano de aporte e próximas datas |
| Investimentos | Cada investimento com valor e lucro, lucro por tipo e as vendas feitas |
| Alocação | Como a carteira está dividida, comparada com a sua meta, e onde colocar o próximo aporte |
| Gastos | Renda, gastos, quanto sobrou e para onde foi o dinheiro, mês a mês |
| Evolução | Histórico do patrimônio, aportes, rendimentos e um simulador de longo prazo |
| Lançamentos | Tudo o que foi registrado, para conferir, editar ou excluir, e as suas notas |

No topo ficam o botão de esconder os valores em reais (os percentuais continuam) e a engrenagem de
opções: tema moderno ou clássico, modo claro ou escuro, baixar planilha `.xlsx`, imprimir e trocar
a pasta de dados.

## Seus dados

- Ficam em arquivos comuns (CSV e Markdown) numa pasta sua. Dá para abrir no Excel, fazer cópia e
  levar para outro lugar.
- Antes de qualquer alteração, o painel guarda uma cópia do arquivo em `.backups/`.
- O servidor só atende o seu computador (`127.0.0.1`). Não há senha: não exponha a porta na rede.
- O painel não inventa número. Quando falta um dado, ele mostra "n/d" e uma lista do que completar,
  com o botão que resolve.

---

## Para quem quer mexer

### Rodar à mão

```bat
py -3 -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python -m uvicorn server.main:app --host 127.0.0.1 --port 8000
```

Outra porta: defina `WD_PORT` antes de rodar o `.bat` (`set WD_PORT=8080`).

Os gráficos usam a biblioteca ECharts, carregada de `cdn.jsdelivr.net`. Sem internet, os números e
as tabelas continuam funcionando e os gráficos não aparecem.

### Configuração

A pasta de dados se troca pela tela (Opções > Pasta de dados) ou em `config.local.json`, que fica
fora do Git. O que vale para todos fica em `config.example.json`.

| Chave | Para que serve | Padrão |
|---|---|---|
| `data_directory` | Pasta de dados (caminho completo ou relativo à pasta do projeto) | `sample_data` |
| `parameters` | Meta da reserva e aporte mensal. A tela Metas grava aqui | vazio |
| `append_only` | `true`: o painel só inclui linhas; editar e apagar ficam bloqueados | `false` |
| `allocation_blocks` | Grupos que entram na conta da alocação | `["Caixa", "Carteira"]` |
| `cash_class` | Classe do dinheiro ainda não investido | `Caixa` |
| `reserve_block` | Grupo da reserva de emergência (fora da alocação) | `Reserva` |
| `income_categories` | Categorias de entrada que contam como renda | `["Salário", "Rendimentos"]` |
| `passive_income_categories` | Categorias de rendimentos recebidos | `["Rendimentos"]` |
| `benchmarks` | Indicadores mostrados no Resumo | CDI, Selic, IPCA 12 meses, Ibovespa, dólar |
| `flag_words` | Palavras na observação que marcam um valor como estimado | `ESTIMATIVA`, `PREMISSA`, `CARREGADO` |
| `protected_paths` | Pastas em que o painel nunca grava | `data/raw`, `archive` |
| `frozen_paths` | Pastas em que arquivo existente não é sobrescrito | vazio |
| `simulator` | Taxas e prazo iniciais do simulador | 3%, 5%, 7% e 20 anos |
| `disclaimer` | Texto do rodapé | aviso de organização pessoal |

Se a pasta de dados tiver uma planilha `carteira.xlsx` com a aba `Config`, a meta da reserva e o
aporte mensal vêm dela (nomes que contêm "meta" e "reserva", "aporte" e "mensal") e a tela Metas
mostra de onde veio o número.

### Pasta de dados

```
<pasta de dados>/
├── data/
│   ├── investments/   posicoes.csv, transacoes.csv, aportes.csv, alvos.csv, vencimentos.csv
│   ├── expenses/      despesas.csv
│   └── market/        indicadores.csv, precos.csv
├── goals/  rules/  reports/  research/     notas em Markdown
└── carteira.xlsx                           opcional; só a aba Config é lida
```

As colunas de cada arquivo, com formato e exemplo, estão no [`GUIA_IA.md`](GUIA_IA.md). O esquema
mora em um lugar só, `TABLES` em `server/store.py`: os formulários, a importação e o guia saem dele.

### Como os números são calculados

- **Patrimônio total:** soma de tudo na foto mais recente da carteira.
- **Investimentos:** soma dos grupos de `allocation_blocks`. A reserva fica de fora.
- **Lucro até agora:** valor atual menos `quantidade x preço médio`. Em renda fixa, quantidade 1 e
  preço médio igual ao valor aplicado.
- **Rendeu desde uma data:** para título com vencimento e sem valor aplicado, valor atual menos o
  valor na primeira foto em que ele aparece. Não é o lucro desde a aplicação.
- **Lucro de vendas:** valor da venda menos o custo médio das compras lançadas do mesmo código. Sem
  a compra, vale o preço médio que estava na carteira; sem os dois, a venda fica fora da soma.
- **Tipo do investimento:** pelo começo do nome (`CDB`, `LCI`, `LCA`, `Tesouro`, `Conta`...) e, para
  quem tem código, por `ETF`, `FII` ou `BDR` na coluna `indexador`.
- **Quanto guardei:** `(renda − gastos) ÷ renda`, no mês.
- **Meses de reserva:** reserva dividida pela média de gastos dos últimos 3 meses fechados.
- **Para chegar na meta:** `meta x (investimentos − caixa destinado à reserva) − valor da classe`.
- **Simulador:** juros compostos mensais sobre taxa real anual, aporte no fim do mês. É simulação,
  não previsão.

### API local

`GET /api/dashboard`, `GET /api/state`, `GET|PUT /api/config`, `GET /api/schema`,
`GET|POST /api/table/{nome}`, `POST /api/table/{nome}/rows` (várias linhas de uma vez),
`PUT|DELETE /api/table/{nome}/{linha}`, `POST /api/import` (conferir ou gravar um bloco colado),
`GET /api/guia.md`, `GET /api/ia`, `GET /api/docs`, `GET|PUT|DELETE /api/doc`, `GET /api/export.xlsx`.

### Estrutura do projeto

```
├── iniciar_dashboard.bat     cria o .venv, instala, sobe o servidor e abre o navegador
├── requirements.txt          fastapi, uvicorn, openpyxl
├── config.example.json       configuração padrão (versionada)
├── config.local.json         sua configuração (fora do Git)
├── GUIA_IA.md                como uma IA preenche o painel (gerado: python -m server.guide)
├── AGENTS.md                 instruções para agentes de IA
├── server/
│   ├── main.py               rotas da API e servidor da tela
│   ├── store.py              esquema, leitura, gravação, importação e backup
│   ├── metrics.py            cálculos do painel
│   └── guide.py              gera o guia e os pedidos prontos para IA
├── web/                      index.html, app.js (abas), forms.js (cadastro), styles.css, classic.css
└── sample_data/              dados fictícios para abrir de imediato
```

Cores e fontes ficam em variáveis: `web/styles.css` (tema moderno) e `web/classic.css` (tema
clássico). As seis cores de série foram testadas quanto a contraste e daltonismo: ao trocar,
mantenha a ordem.

Painel para organização pessoal. Não é recomendação de investimento.

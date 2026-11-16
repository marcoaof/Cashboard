# Guia para IA: como alimentar o Cashboard

O Cashboard é um painel local de finanças pessoais. Ele não busca nada sozinho: mostra o que
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

**B. Usar a API local** (painel aberto em `http://localhost:8000`):

| O que fazer | Chamada |
|---|---|
| Ver o esquema, com a explicação de cada coluna | `GET http://localhost:8000/api/schema` |
| Ler uma tabela | `GET http://localhost:8000/api/table/despesas` |
| Acrescentar linhas | `POST http://localhost:8000/api/table/despesas/rows` com `{"rows": [{...}, {...}]}` |
| Conferir um bloco sem gravar | `POST http://localhost:8000/api/import` com `{"text": "...", "dry_run": true}` |
| Gravar o bloco conferido | `POST http://localhost:8000/api/import` com `{"text": "...", "dry_run": false}` |
| Ler os números que o painel mostra | `GET http://localhost:8000/api/dashboard` |

A API confere os dados e responde com a mensagem do erro quando algo está fora do formato. Ela
aceita data `DD/MM/AAAA`, número `1.234,56` e porcentagem `25%`, e grava no formato certo.

**C. Devolver um bloco para colar** (IA de conversa, sem acesso a arquivos). Responda só com um
bloco de código neste formato. A pessoa cola em **Adicionar > Importar dados** e o painel confere
antes de gravar:

```csv
# despesas
data,descricao,categoria,tipo,valor_brl,fonte
2026-11-05,Salário,Salário,Entrada,6500.00,extrato do banco de 11/2026
2026-11-06,Aluguel,Moradia,Fixo,1800.00,extrato do banco de 11/2026
2026-11-12,Supermercado,Alimentação,Variável,231.90,extrato do banco de 11/2026

# transacoes
data,tipo,ativo,ticker,classe,quantidade,valor_brl,fonte
2026-11-10,compra,BOVA11,BOVA11,Ações,10,1200.00,nota da corretora
```

No bloco e na API, colunas que você não tem podem ficar de fora (menos as obrigatórias). `mes` é
preenchido a partir de `data`, e `fonte` vazia recebe "Importado no Cashboard em DD/MM/AAAA".
Linhas iguais às que já existem são ignoradas.

## Como o painel entende os dados

- **`posicoes` é uma foto da carteira.** Todas as linhas com a mesma `data_snapshot` formam a
  carteira daquele dia, e o painel mostra a data mais recente. Para atualizar os valores, grave uma
  foto nova com **todos** os investimentos, mesmo os que não mudaram. Uma foto com um investimento
  só faz os outros sumirem da tela.
- **`bloco`** diz para que serve o dinheiro: `Carteira` (investimentos, entra
  na alocação), `Reserva` (reserva de emergência, fica fora da alocação) ou `Caixa`
  (dinheiro em conta esperando para investir; use também `classe` = `Caixa`). Qualquer outro
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
  `categoria` `Salário`, `Rendimentos`. Outras entradas (reembolso, transferência entre contas) não contam.
- **`aportes`**: `planejado` é o plano do mês, `executado` é o que foi feito de fato.
- **Meta da reserva e aporte mensal** ficam em `parameters` do arquivo `config.local.json`, na pasta
  do painel: `{"Meta da reserva de emergência": 9000, "Aporte mensal": 1000}`.
- **Notas em Markdown** (`.md`) nas pastas `goals/`, `rules/`, `reports/` e `research/` aparecem em
  Lançamentos > Notas. Bom lugar para relatórios e resumos que você escrever.

## Tabelas

### `posicoes`: Investimentos

Arquivo `data/investments/posicoes.csv`. Uma linha por investimento em cada atualização da carteira.

| coluna | o que é | formato | obrigatória |
|---|---|---|---|
| `data_snapshot` | Data da atualização. As linhas com a mesma data formam uma foto da carteira. O painel mostra a mais recente. | data AAAA-MM-DD | sim |
| `ativo` | Nome. Em renda fixa, comece pelo tipo: CDB, LCI, LCA, Tesouro. Em ação, ETF e FII, use o código. | texto | sim |
| `ticker` | Código de negociação. Só para o que é negociado na bolsa. | texto |  |
| `bloco` | Grupo. Carteira (investimentos), Reserva (reserva de emergência) ou Caixa (dinheiro esperando para investir). | texto | sim |
| `classe` | Classe. Grupo que aparece na aba Alocação. | texto | sim |
| `quantidade` | Quantidade. Cotas ou ações. Em renda fixa, use 1. | número |  |
| `preco_medio` | Preço médio (R$). Quanto você pagou por unidade. Em renda fixa, o valor aplicado. | reais, ponto decimal |  |
| `preco_mercado` | Preço atual (R$). Cotação por unidade na data. | reais, ponto decimal |  |
| `valor_brl` | Valor atual (R$). Quanto vale no total na data. | reais, ponto decimal | sim |
| `indexador` | Taxa ou índice. Ex.: 110% do CDI, IPCA + 6%. Em ETF, FII e BDR, escreva ETF, FII ou BDR. | texto |  |
| `vencimento` | Vencimento | data AAAA-MM-DD |  |
| `isento_ir` | Isento de imposto de renda Vazio vira `nao`. | uma de: `sim`, `nao` |  |
| `fonte` | Fonte. De onde veio o número. Fica preenchida sozinha se você deixar vazia. | texto |  |
| `obs` | Observação | texto |  |

```csv
data_snapshot,ativo,ticker,bloco,classe,quantidade,preco_medio,preco_mercado,valor_brl,indexador,vencimento,isento_ir,fonte,obs
2026-11-30,CDB Banco X,,Carteira,Renda fixa,1,5000.00,,5210.35,110% do CDI,2028-03-15,nao,extrato do banco de 11/2026,
2026-11-30,BOVA11,BOVA11,Carteira,Ações,10,120.00,128.50,1285.00,ETF,,nao,nota da corretora,
2026-11-30,CDB liquidez diária,,Reserva,Reserva,1,6000.00,,6101.00,100% do CDI,,nao,extrato do banco de 11/2026,
```

### `transacoes`: Compras e vendas

Arquivo `data/investments/transacoes.csv`. Operações feitas. Servem para calcular o lucro das vendas.

| coluna | o que é | formato | obrigatória |
|---|---|---|---|
| `data` | Data | data AAAA-MM-DD | sim |
| `tipo` | O que você fez | uma de: `compra`, `venda`, `aplicacao`, `resgate` | sim |
| `ativo` | Investimento | texto | sim |
| `ticker` | Código de negociação. Preencha em ação, ETF e FII: é por ele que o painel liga a venda à compra. | texto |  |
| `classe` | Classe | texto |  |
| `quantidade` | Quantidade. Necessária em compra e venda de ação, ETF e FII. | número |  |
| `valor_brl` | Valor total (R$) | reais, ponto decimal | sim |
| `ir_brl` | Imposto retido (R$) | reais, ponto decimal |  |
| `status` | Situação Vazio vira `liquidado`. | uma de: `liquidado`, `pendente` |  |
| `liquidacao` | Data de liquidação | data AAAA-MM-DD |  |
| `fonte` | Fonte. De onde veio o número. Fica preenchida sozinha se você deixar vazia. | texto |  |
| `obs` | Observação | texto |  |

```csv
data,tipo,ativo,ticker,classe,quantidade,valor_brl,ir_brl,status,liquidacao,fonte,obs
2026-11-10,compra,BOVA11,BOVA11,Ações,10,1200.00,,,,nota da corretora,
```

### `aportes`: Aportes

Arquivo `data/investments/aportes.csv`. Quanto você planejou investir e quanto investiu em cada mês.

| coluna | o que é | formato | obrigatória |
|---|---|---|---|
| `mes` | Mês | mês AAAA-MM | sim |
| `classe` | Classe | texto | sim |
| `instrumento` | Onde investir | texto |  |
| `valor_brl` | Valor (R$) | reais, ponto decimal | sim |
| `status` | Situação. Planos do mesmo mês lançados em dias diferentes: vale o mais recente. Vazio vira `planejado`. | uma de: `planejado`, `executado`, `planejado_nao_executado`, `substituido` |  |
| `fonte` | Fonte. De onde veio o número. Fica preenchida sozinha se você deixar vazia. | texto |  |
| `obs` | Observação | texto |  |

```csv
mes,classe,instrumento,valor_brl,status,fonte,obs
2026-12,Renda fixa,CDB Banco X,600.00,planejado,plano combinado em 30/11/2026,
```

### `alvos`: Metas de alocação

Arquivo `data/investments/alvos.csv`. Quanto da carteira você quer em cada classe.

| coluna | o que é | formato | obrigatória |
|---|---|---|---|
| `versao_politica` | Versão. Nome do conjunto de metas. Vale a versão com a data de início mais recente. | texto | sim |
| `vigencia_inicio` | Vale a partir de | data AAAA-MM-DD | sim |
| `classe` | Classe | texto | sim |
| `alvo` | Meta. Fração ou porcentagem: 0.25 ou 25%. | 0.25 ou 25% | sim |
| `banda_min` | Mínimo aceitável | 0.25 ou 25% |  |
| `banda_max` | Máximo aceitável | 0.25 ou 25% |  |
| `instrumento` | Como investir nessa classe | texto |  |
| `fonte` | Fonte. De onde veio o número. Fica preenchida sozinha se você deixar vazia. | texto |  |

```csv
versao_politica,vigencia_inicio,classe,alvo,banda_min,banda_max,instrumento,fonte
v1,2026-11-01,Renda fixa,0.70,0.65,0.75,CDB e Tesouro,
v1,2026-11-01,Ações,0.30,0.25,0.35,ETF,
```

### `vencimentos`: Datas importantes

Arquivo `data/investments/vencimentos.csv`. Vencimentos, revisões e lembretes.

| coluna | o que é | formato | obrigatória |
|---|---|---|---|
| `data` | Data | data AAAA-MM-DD | sim |
| `evento` | Tipo. Ex.: vencimento, revisão, lembrete. | texto | sim |
| `ativo` | Sobre o quê | texto |  |
| `classe` | Classe | texto |  |
| `valor_aprox_brl` | Valor aproximado (R$) | reais, ponto decimal |  |
| `acao` | O que fazer | texto |  |
| `fonte` | Fonte. De onde veio o número. Fica preenchida sozinha se você deixar vazia. | texto |  |
| `status` | Situação Vazio vira `aberto`. | uma de: `aberto`, `encerrado` |  |

```csv
data,evento,ativo,classe,valor_aprox_brl,acao,fonte,status
2028-03-15,vencimento,CDB Banco X,,5000,Decidir onde reaplicar,,
```

### `despesas`: Gastos e entradas

Arquivo `data/expenses/despesas.csv`. Tudo o que saiu e o que entrou na sua conta.

| coluna | o que é | formato | obrigatória |
|---|---|---|---|
| `data` | Data | data AAAA-MM-DD | sim |
| `mes` | Mês. Preenchido sozinho a partir da data. | mês AAAA-MM |  |
| `descricao` | Descrição | texto | sim |
| `categoria` | Categoria | texto | sim |
| `tipo` | O que é | uma de: `Variável`, `Fixo`, `Entrada` | sim |
| `valor_brl` | Valor (R$). Sempre positivo, mesmo quando é gasto. | reais, ponto decimal | sim |
| `fonte` | Fonte. De onde veio o número. Fica preenchida sozinha se você deixar vazia. | texto |  |
| `obs` | Observação | texto |  |

```csv
data,mes,descricao,categoria,tipo,valor_brl,fonte,obs
2026-11-05,,Salário,Salário,Entrada,6500.00,extrato do banco de 11/2026,
2026-11-06,,Aluguel,Moradia,Fixo,1800.00,extrato do banco de 11/2026,
2026-11-12,,Supermercado,Alimentação,Variável,231.90,extrato do banco de 11/2026,
```

### `indicadores`: Indicadores de mercado

Arquivo `data/market/indicadores.csv`. CDI, Selic, IPCA e outros números de referência.

| coluna | o que é | formato | obrigatória |
|---|---|---|---|
| `data_ref` | Data | data AAAA-MM-DD | sim |
| `indicador` | Indicador. O painel mostra: cdi, selic_meta, ipca_12m, ibovespa e ptax_dolar_venda. | texto | sim |
| `valor` | Valor | número | sim |
| `unidade` | Unidade | texto |  |
| `fonte` | Fonte. De onde veio o número. Fica preenchida sozinha se você deixar vazia. | texto |  |
| `obs` | Observação | texto |  |

```csv
data_ref,indicador,valor,unidade,fonte,obs
2026-11-30,cdi,10.15,% a.a.,Banco Central,
```

### `precos`: Preços de ativos

Arquivo `data/market/precos.csv`. Cotação e taxa de administração por código.

| coluna | o que é | formato | obrigatória |
|---|---|---|---|
| `data_ref` | Data | data AAAA-MM-DD | sim |
| `ticker` | Código de negociação | texto | sim |
| `preco_brl` | Preço (R$) | reais, ponto decimal |  |
| `taxa_adm_aa` | Taxa de administração ao ano. Fração: 0.002 é 0,2% ao ano. | número |  |
| `pl_brl` | Patrimônio do fundo (R$) | reais, ponto decimal |  |
| `fonte` | Fonte. De onde veio o número. Fica preenchida sozinha se você deixar vazia. | texto |  |
| `obs` | Observação | texto |  |

```csv
data_ref,ticker,preco_brl,taxa_adm_aa,pl_brl,fonte,obs
2026-11-30,BOVA11,128.50,,,B3,
```

## Pasta de dados

```
<pasta de dados>/
├── data/
│   ├── investments/   posicoes.csv, transacoes.csv, aportes.csv, alvos.csv, vencimentos.csv
│   ├── expenses/      despesas.csv
│   └── market/        indicadores.csv, precos.csv
├── goals/  rules/  reports/  research/     notas em Markdown
└── carteira.xlsx                           opcional; só a aba Config é lida
```

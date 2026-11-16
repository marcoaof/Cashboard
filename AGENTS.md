# Cashboard: instruções para agentes de IA

O Cashboard é um painel local de finanças pessoais. Ele mostra o que está nos arquivos de uma pasta
de dados. Você pode estar aqui em um de dois papéis.

## 1. Alimentar o painel com os dados de alguém

Leia [`GUIA_IA.md`](GUIA_IA.md) antes de tudo. Ele tem as regras, o formato de cada tabela e os três
jeitos de enviar dados: editar os CSV, usar a API local ou devolver um bloco para a pessoa colar.

O essencial:

- Nunca invente valor, data, taxa ou preço. Faltou informação: pergunte.
- Só acrescente linhas. Não apague, não reordene e não mude cabeçalhos.
- Preencha `fonte` com a origem do dado.
- Você organiza dados. Não execute ordens, não movimente dinheiro e não peça senhas.

A pasta de dados da pessoa está em `data_directory`, no arquivo `config.local.json`. O padrão,
`sample_data`, é fictício e não deve receber dado real. Com o painel aberto, `GET /api/ia` devolve o
caminho da pasta em uso e `GET /api/guia.md` devolve o guia já com o endereço certo.

## 2. Mexer no código

Rodar: `iniciar_dashboard.bat` no Windows, ou
`python -m uvicorn server.main:app --host 127.0.0.1 --port 8000`.

| Arquivo | Papel |
|---|---|
| `server/store.py` | Esquema das tabelas (`TABLES`), leitura, gravação, importação e backup |
| `server/metrics.py` | Todos os cálculos que a tela mostra |
| `server/guide.py` | Gera o `GUIA_IA.md` e os pedidos prontos para IA |
| `server/main.py` | Rotas da API |
| `web/app.js` | Abas e gráficos |
| `web/forms.js` | Telas de cadastro: adicionar, atualizar valores, metas, importar, IA |
| `web/styles.css`, `web/classic.css` | Tema moderno e tema clássico |

Regras da casa:

- **Esquema em um lugar só.** Nome amigável, ajuda e opções de cada coluna ficam em `TABLES`. Mudou
  ali, rode `python -m server.guide` para regravar o `GUIA_IA.md`. Coluna nova entra só no fim;
  nunca renomeie nem reordene colunas, porque as pastas de dados das pessoas dependem disso.
- **Tela para iniciante.** Texto curto, sem jargão, sem nome de arquivo ou de coluna. Explicação
  longa vai no "?" (função `dica()` em `web/app.js`). Tela sem dado sempre diz o próximo passo
  (função `vazio()`).
- **O painel não estima.** Dado que falta vira item em `pendencias`, com o botão que resolve.
- **Nenhum dado pessoal no repositório.** Só `sample_data/`, que é inventado.
- **Sem framework e sem etapa de build** no frontend. Dependência nova só com motivo forte.
- **Textos em português do Brasil**, sem travessão.

Não há suíte de testes automática. Para testar, copie `sample_data` para uma pasta temporária,
aponte `config.local.json` para ela e exercite pela tela e pela API.

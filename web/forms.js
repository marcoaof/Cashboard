/* Cashboard - telas de cadastro. Carregado depois de app.js e usa o que esta la (S, $, api, toast).
   Ideia geral: a pessoa nunca ve nome de coluna nem de arquivo. Cada tela pergunta o minimo,
   preenche o resto sozinha e grava no mesmo formato de sempre. */
"use strict";

/* ---------------------------------------------------------------- camadas e numeros */
function abrirModal(html, largo) {
  $("modal-in").className = "modal-in" + (largo ? " largo" : "");
  $("modal-in").innerHTML = html;
  $("modal").classList.add("open");
  $("modal-in").scrollTop = 0;
}
const fecharModal = () => $("modal").classList.remove("open");
function abrirDrawer(html) {
  $("drawer-in").innerHTML = html;
  $("drawer").classList.add("open");
  $("drawer-in").scrollTop = 0;
}
const fecharDrawer = () => $("drawer").classList.remove("open");

/* Le o que a pessoa digitou: 1234,56  1.234,56  R$ 1.234,56  1234.56. Vazio vira null; lixo vira NaN.
   Em campo de dinheiro, "1.234" e mil duzentos e trinta e quatro (jeito brasileiro). */
function lerNum(s, dinheiro) {
  s = String(s ?? "").replace(/R\$|%|\s|\u00a0/g, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  else if (dinheiro && /^-?\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}
const paraArquivo = (n) => n == null ? "" : String(+n.toFixed(6));
const campoBRL = (n) => n == null || isNaN(n) ? "" : n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false });
const campoNum = (n) => n == null || isNaN(n) ? "" : n.toLocaleString("pt-BR", { maximumFractionDigits: 6, useGrouping: false });
const semAcento = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

function campo(id, rotulo, input, { ajuda = "", opcional = false, cls = "" } = {}) {
  return `<div class="field ${cls}" id="w-${id}"><label for="${id}">${esc(rotulo)}${opcional ? ' <span class="opc">opcional</span>' : ""}</label>${input}<small class="hint" id="h-${id}">${ajuda}</small></div>`;
}
function erroCampo(el, msg) {
  toast(msg, true);
  if (!el) return;
  const d = el.closest("details");
  if (d) d.open = true;
  el.classList.add("erro"); el.focus();
  el.addEventListener("input", () => el.classList.remove("erro"), { once: true });
}
const classesDaCarteira = (d) => [...new Set([...d.alocacao.linhas.map((l) => l.classe),
  ...d.posicoes.filter((p) => d.config.allocation_blocks.includes(p.bloco)).map((p) => p.classe)])].filter((c) => c && c !== d.config.cash_class);

/* ---------------------------------------------------------------- o que voce quer adicionar? */
function abrirAdicionar() {
  const op = (icone, titulo, texto, acao) => `<button class="opcao" data-acao="${acao}">${ic(icone)}<span><b>${titulo}</b><small>${texto}</small></span></button>`;
  abrirModal(`<h2>O que você quer registrar?</h2>
    <div class="opcoes">
      ${op("cartao", "Gasto ou entrada", "Uma compra, uma conta, o salário, um rendimento.", "despesas")}
      ${op("alta", "Investimento novo", "Algo que você tem e ainda não está no painel.", "posicao")}
      ${op("atualizar", "Atualizar valores", "Quanto vale hoje cada investimento.", "atualizar")}
      ${op("troca", "Compra ou venda", "Uma operação que você fez.", "transacoes")}
      ${op("porquinho", "Aporte", "Planejar ou registrar o investimento do mês.", "aportes")}
      ${op("calendario", "Data importante", "Vencimento, revisão ou lembrete.", "vencimentos")}
      ${op("alvo", "Metas", "Reserva, aporte mensal e divisão da carteira.", "metas")}
      ${op("colar", "Importar dados", "Colar o que a sua IA organizou.", "importar")}
    </div>
    <div class="row end"><button class="link" data-acao="ia">Como usar uma IA para preencher</button><span class="empurra"></span><button class="btn" id="a-fechar">Fechar</button></div>`);
  $("a-fechar").onclick = fecharModal;
}

/* ---------------------------------------------------------------- formulario geral */
const CATEGORIAS_GASTO = ["Alimentação", "Moradia", "Transporte", "Saúde", "Lazer", "Educação", "Assinaturas", "Compras", "Contas", "Outros"];
const NOTAS_FORM = {
  transacoes: "Serve para calcular o lucro das vendas. O valor da carteira não muda sozinho: depois, use Atualizar valores.",
};
async function abrirForm(nome, linha, opts = {}) {
  const sc = S.schema[nome], d = S.d;
  if (!sc) return;
  let dados = S.linhas && S.tabela === nome ? S.linhas : null;
  if (!dados) { try { dados = await api("/api/table/" + nome); } catch (e) { return toast(e.message, true); } }
  fecharModal();
  const hoje = hojeISO(), pre = opts.valores || {}, noArquivo = (c) => dados.columns.includes(c.name);
  const valorDe = (c) => {
    if (linha) return linha[c.name] ?? "";
    if (pre[c.name] != null) return pre[c.name];
    if (c.type === "date" && ["data", "data_snapshot", "data_ref", "vigencia_inicio"].includes(c.name)) return hoje;
    if (c.type === "month") return c.advanced ? "" : hoje.slice(0, 7);
    if (c.type === "select") return sc.defaults[c.name] || (sc.required.includes(c.name) ? Object.keys(c.options)[0] : "");
    return "";
  };
  const sugestoes = (c) => {
    if (["fonte", "obs", "descricao"].includes(c.name)) return [];
    const usados = [...new Set(dados.rows.map((r) => r[c.name]).filter(Boolean))];
    if (c.name === "classe") return [...new Set([...classesDaCarteira(d), ...usados])];
    if (c.name === "ativo" && nome !== "posicoes") return [...new Set([...d.posicoes.map((p) => p.ativo), ...usados])];
    return usados.length <= 60 ? usados : [];
  };
  const entrada = (c) => {
    const id = "f-" + c.name, v = valorDe(c), n = Number(v), ex = c.example ? ` placeholder="${esc("Ex.: " + c.example)}"` : "";
    if (c.type === "select") {
      // linha antiga com o campo vazio continua vazia ate a pessoa escolher (nao troca o valor sem avisar)
      const semEscolha = (linha && v === "") || !(sc.required.includes(c.name) || sc.defaults[c.name]) ? '<option value=""></option>' : "";
      return `<select id="${id}">${semEscolha}${Object.entries(c.options).map(([k, t]) => `<option value="${esc(k)}" ${k === v ? "selected" : ""}>${esc(t)}</option>`).join("")}</select>`;
    }
    if (c.name === "obs") return `<textarea id="${id}" rows="2">${esc(v)}</textarea>`;
    if (c.type === "date") return `<input id="${id}" type="date" value="${esc(v)}">`;
    if (c.type === "month") return `<input id="${id}" type="month" value="${esc(v)}">`;
    if (c.type === "money") return `<input id="${id}" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(v === "" ? "" : isNaN(n) ? v : campoBRL(n))}">`;
    if (c.type === "number") return `<input id="${id}" inputmode="decimal" autocomplete="off" value="${esc(v === "" ? "" : isNaN(n) ? v : campoNum(n))}">`;
    if (c.type === "fraction") return `<input id="${id}" inputmode="decimal" autocomplete="off" placeholder="Ex.: 25%" value="${esc(v === "" ? "" : isNaN(n) ? v : campoNum(n * 100) + "%")}">`;
    const vals = sugestoes(c);
    const dl = vals.length ? `<datalist id="dl-${c.name}">${vals.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>` : "";
    return `<input id="${id}" autocomplete="off" value="${esc(v)}"${c.name === "fonte" ? ' placeholder="Preenchida sozinha"' : ex}${dl ? ` list="dl-${c.name}"` : ""}>${dl}`;
  };
  const cols = Object.fromEntries(sc.columns.filter(noArquivo).map((c) => [c.name, c]));
  const obrigatorio = (c) => sc.required.includes(c.name) || !!sc.defaults[c.name];
  const html = (nomes) => nomes.filter((n) => cols[n]).map((n) => campo("f-" + n, cols[n].label, entrada(cols[n]), { ajuda: esc(cols[n].help), opcional: !obrigatorio(cols[n]) })).join("");
  const principais = [...sc.form, ...sc.columns.filter((c) => !c.advanced && !sc.form.includes(c.name)).map((c) => c.name)];
  const avancados = sc.columns.filter((c) => c.advanced).map((c) => c.name);
  abrirDrawer(`<h2>${linha ? "Editar: " : ""}${esc(opts.titulo || sc.title)}</h2>
    <p class="muted small">${esc(NOTAS_FORM[nome] || sc.about)}</p>
    ${html(principais)}
    ${avancados.some((n) => cols[n]) ? `<details class="mais"${linha ? " open" : ""}><summary>Mais opções</summary>${html(avancados)}</details>` : ""}
    <div class="row end botoes"><button class="btn" id="f-cancelar">Cancelar</button>${linha ? "" : '<button class="btn" id="f-outro">Salvar e adicionar outro</button>'}<button class="btn primary" id="f-salvar">Salvar</button></div>`);

  if (nome === "despesas" && $("f-tipo") && $("f-categoria")) {
    const ajusta = () => {
      const ent = $("f-tipo").value === "Entrada";
      const usadas = [...new Set(dados.rows.filter((r) => (r.tipo === "Entrada") === ent).map((r) => r.categoria).filter(Boolean))];
      const todas = [...new Set(ent ? [...d.config.income_categories, ...usadas] : [...usadas, ...CATEGORIAS_GASTO])];
      let dl = $("dl-categoria");
      if (!dl) { dl = document.createElement("datalist"); dl.id = "dl-categoria"; $("w-f-categoria").appendChild(dl); $("f-categoria").setAttribute("list", "dl-categoria"); }
      dl.innerHTML = todas.map((x) => `<option value="${esc(x)}">`).join("");
      $("h-f-categoria").textContent = ent ? `Conta como renda: ${lista(d.config.income_categories)}. Outras categorias, como reembolso, ficam fora da renda.` : "";
      $("f-categoria").placeholder = ent ? "Ex.: Salário" : "Ex.: Alimentação";
    };
    $("f-tipo").onchange = ajusta; ajusta();
    // o mes acompanha a data, tambem quando se corrige um lancamento antigo
    if ($("f-data") && $("f-mes")) $("f-data").onchange = () => { $("f-mes").value = linha ? $("f-data").value.slice(0, 7) : ""; };
  }
  if (nome === "transacoes" && $("f-ativo")) {
    $("f-ativo").onchange = () => {
      const alvo = semAcento($("f-ativo").value.trim());
      const p = d.posicoes.find((x) => semAcento(x.ativo) === alvo || (x.ticker && semAcento(x.ticker) === alvo));
      if (!p) return;
      if ($("f-ticker") && !$("f-ticker").value) $("f-ticker").value = p.ticker || "";
      if ($("f-classe") && !$("f-classe").value) $("f-classe").value = p.classe || "";
    };
  }
  const primeiro = $("drawer-in").querySelector("input:not([type=date]):not([type=month]), select");
  if (primeiro && !linha) primeiro.focus();

  const salvar = async (outro) => {
    const row = {};
    for (const c of Object.values(cols)) {
      const el = $("f-" + c.name);
      let v = el.value.trim();
      if (v && (c.type === "money" || c.type === "number")) {
        const n = lerNum(v, c.type === "money");
        if (isNaN(n)) return erroCampo(el, `${c.label}: escreva só o número, como 1234,56.`);
        v = c.type === "money" ? n.toFixed(2) : paraArquivo(n);
      }
      if (v && c.type === "fraction" && !v.includes("%") && lerNum(v) > 1) v += "%";
      row[c.name] = v;
    }
    try {
      if (linha) await api(`/api/table/${nome}/${linha._id}`, { method: "PUT", body: { hash: linha._hash, row } });
      else await api("/api/table/" + nome, { method: "POST", body: { row } });
      toast("Salvo.");
      if (!outro) fecharDrawer();
      await carregar(true);
      if (outro) abrirForm(nome, null, opts);
    } catch (e) { toast(e.message, true); }
  };
  $("f-cancelar").onclick = fecharDrawer;
  $("f-salvar").onclick = () => salvar(false);
  if ($("f-outro")) $("f-outro").onclick = () => salvar(true);
}

/* ---------------------------------------------------------------- investimento novo */
/* chave, rotulo, formato dos campos, comeco do nome, o que vai em "indexador", isento de IR, classe sugerida.
   O painel descobre o tipo pelo comeco do nome (CDB, LCI...) ou por ETF/FII/BDR no indexador:
   aqui a pessoa so escolhe o tipo numa lista e a linha sai no padrao certo. */
const TIPOS_INV = [
  ["acao", "Ação", "bolsa", "", "", "nao", "Ações"],
  ["etf", "ETF", "bolsa", "", "ETF", "nao", ""],   // ETF pode ser de qualquer classe: a pessoa escolhe
  ["fii", "FII (fundo imobiliário)", "bolsa", "", "FII", "nao", "Fundos imobiliários"],
  ["bdr", "BDR", "bolsa", "", "BDR", "nao", "Exterior"],
  ["cdb", "CDB", "titulo", "CDB", "", "nao", "Renda fixa"],
  ["lci", "LCI", "titulo", "LCI", "", "sim", "Renda fixa"],
  ["lca", "LCA", "titulo", "LCA", "", "sim", "Renda fixa"],
  ["tesouro", "Tesouro Direto", "titulo", "Tesouro", "", "nao", "Renda fixa"],
  ["cri", "CRI", "titulo", "CRI", "", "sim", "Renda fixa"],
  ["cra", "CRA", "titulo", "CRA", "", "sim", "Renda fixa"],
  ["debenture", "Debênture", "titulo", "Debênture", "", "nao", "Renda fixa"],
  ["fundo", "Fundo de investimento", "titulo", "Fundo", "", "nao", "Fundos"],
  ["poupanca", "Poupança", "simples", "Poupança", "", "sim", "Renda fixa"],
  ["conta", "Dinheiro em conta", "simples", "Conta", "", "nao", ""],
  ["outro", "Outro", "titulo", "", "", "nao", "Outros"],
];
const GRUPOS_INV = [["Bolsa", ["acao", "etf", "fii", "bdr"]], ["Renda fixa", ["cdb", "lci", "lca", "tesouro", "cri", "cra", "debenture"]], ["Outros", ["fundo", "poupanca", "conta", "outro"]]];
const CLASSES_SUGERIDAS = ["Renda fixa", "Ações", "Fundos imobiliários", "Exterior"];

function abrirInvestimento(_botao, manter = {}) {
  const d = S.d, cfg = d.config, hoje = hojeISO();
  fecharModal();
  const tipoDe = (k) => TIPOS_INV.find((t) => t[0] === k);
  let classes = classesDaCarteira(d);
  if (!classes.length) classes = CLASSES_SUGERIDAS;
  const blocoCarteira = cfg.allocation_blocks.find((x) => x !== cfg.cash_class) || "Carteira";
  const blocoCaixa = cfg.allocation_blocks.includes(cfg.cash_class) ? cfg.cash_class : cfg.allocation_blocks[0] || "Caixa";
  const inp = (id, extra = "") => `<input id="${id}" autocomplete="off" ${extra}>`;
  const din = (id) => inp(id, 'inputmode="decimal" placeholder="0,00"');
  abrirDrawer(`<h2>Novo investimento</h2>
    <p class="muted small">${d.snapshot ? `Entra na sua carteira de ${dt(d.snapshot)}.` : "O primeiro da sua carteira. Depois é só repetir para os outros."}</p>
    ${campo("f-tipo", "Que tipo de investimento é?", `<select id="f-tipo">${GRUPOS_INV.map(([g, ks]) => `<optgroup label="${g}">${ks.map((k) => `<option value="${k}" ${k === (manter.tipo || "cdb") ? "selected" : ""}>${tipoDe(k)[1]}</option>`).join("")}</optgroup>`).join("")}</select>`)}
    ${campo("f-ticker", "Código", inp("f-ticker", 'placeholder="Ex.: BOVA11" style="text-transform:uppercase"'), { ajuda: "O código que aparece na corretora." })}
    ${campo("f-nome", "Nome", inp("f-nome", 'placeholder="Ex.: Banco X 2028"'))}
    <div class="duas">
      ${campo("f-qtd", "Quantidade", inp("f-qtd", 'inputmode="decimal"'))}
      ${campo("f-pm", "Preço médio (R$)", din("f-pm"), { ajuda: "Quanto você pagou por unidade, em média.", opcional: true })}
      ${campo("f-preco", "Preço atual (R$)", din("f-preco"))}
      ${campo("f-aplicado", "Quanto você aplicou (R$)", din("f-aplicado"), { ajuda: "Sem isso o painel não calcula o lucro.", opcional: true })}
      ${campo("f-valor", "Quanto vale hoje (R$)", din("f-valor"))}
      ${campo("f-taxa", "Taxa", inp("f-taxa", 'placeholder="Ex.: 110% do CDI"'), { opcional: true })}
      ${campo("f-venc", "Vencimento", '<input id="f-venc" type="date">', { opcional: true })}
    </div>
    <p class="calc" id="f-total" hidden></p>
    ${campo("f-bloco", "Para que serve esse dinheiro?", `<select id="f-bloco">
        <option value="carteira">Investimento</option><option value="reserva">Reserva de emergência</option>
        <option value="caixa">Dinheiro esperando para ser investido</option><option value="fora">Só conta no patrimônio total</option></select>`)}
    ${campo("f-classe", "Classe", `<select id="f-classe"><option value="">Escolha...</option>${classes.map((c) => `<option>${esc(c)}</option>`).join("")}<option value="__nova">Outra...</option></select>
        <input id="f-classe-nova" placeholder="Nome da classe" autocomplete="off" hidden style="margin-top:6px">`, { ajuda: "O grupo que aparece na aba Alocação." })}
    <details class="mais"><summary>Mais opções</summary>
      ${campo("f-data", "Data", `<input id="f-data" type="date" value="${d.snapshot || hoje}">`, { ajuda: d.snapshot ? "Mantenha a data da última atualização para ele entrar na carteira atual." : "" })}
      ${campo("f-isento", "Isento de imposto de renda", '<select id="f-isento"><option value="nao">Não</option><option value="sim">Sim</option></select>')}
      ${campo("f-fonte", "Fonte", inp("f-fonte", 'placeholder="Preenchida sozinha"'), { ajuda: "De onde veio o número. Ex.: extrato do banco de 11/2026.", opcional: true })}
      ${campo("f-obs", "Observação", '<textarea id="f-obs" rows="2"></textarea>', { opcional: true })}
    </details>
    <div class="row end botoes"><button class="btn" id="f-cancelar">Cancelar</button><button class="btn" id="f-outro">Salvar e adicionar outro</button><button class="btn primary" id="f-salvar">Salvar</button></div>`);
  if (manter.bloco) $("f-bloco").value = manter.bloco;

  let mexeuClasse = false, mexeuBloco = !!manter.bloco;
  const mostra = (id, sim) => ($("w-" + id).hidden = !sim);
  const total = () => { const q = lerNum($("f-qtd").value), p = lerNum($("f-preco").value, true); return q > 0 && p > 0 ? q * p : null; };
  const ajusta = () => {
    const t = tipoDe($("f-tipo").value), fmt = t[2], bolsa = fmt === "bolsa";
    ["f-ticker", "f-qtd", "f-pm", "f-preco"].forEach((id) => mostra(id, bolsa));
    mostra("f-nome", !bolsa); mostra("f-valor", !bolsa);
    ["f-aplicado", "f-taxa", "f-venc"].forEach((id) => mostra(id, fmt === "titulo"));
    if (!mexeuBloco) $("f-bloco").value = t[0] === "conta" ? "caixa" : "carteira";
    $("f-isento").value = t[5];
    // sugere a classe pelo tipo so quando ha uma com nome parecido; senao a pessoa escolhe (nada de palpite errado)
    if (!mexeuClasse) { const s = semAcento(t[6]); $("f-classe").value = (s && classes.find((c) => semAcento(c) === s || semAcento(c).includes(s) || s.includes(semAcento(c)))) || ""; }
    mostra("f-classe", $("f-bloco").value === "carteira");
    $("f-classe-nova").hidden = $("f-classe").value !== "__nova";
    const nome = $("f-nome").value.trim();
    $("h-f-nome").textContent = t[3] && nome && !semAcento(nome).startsWith(semAcento(t[3])) ? `Vai aparecer como "${t[3]} ${nome}".` : "";
    $("f-nome").placeholder = t[0] === "conta" ? "Ex.: corrente Banco X" : t[0] === "tesouro" ? "Ex.: Selic 2029" : "Ex.: Banco X 2028";
    const v = bolsa ? total() : null;
    $("f-total").hidden = v == null; $("f-total").textContent = v == null ? "" : `Valor atual: ${nf.format(v)}`;
  };
  $("f-tipo").onchange = ajusta;
  $("f-bloco").onchange = () => { mexeuBloco = true; ajusta(); };
  $("f-classe").onchange = () => { mexeuClasse = true; ajusta(); if ($("f-classe").value === "__nova") $("f-classe-nova").focus(); };
  ["f-nome", "f-qtd", "f-preco"].forEach((id) => ($(id).oninput = ajusta));
  ajusta();
  ($("f-tipo")).focus();

  const salvar = async (outro) => {
    const t = tipoDe($("f-tipo").value), fmt = t[2], data = $("f-data").value;
    const num = (id, dinheiro, rotulo, obrigatorio) => {
      const n = lerNum($(id).value, dinheiro);
      if (Number.isNaN(n)) { erroCampo($(id), `${rotulo}: escreva só o número, como 1234,56.`); throw 0; }
      if (obrigatorio && !(n > 0)) { erroCampo($(id), `Preencha: ${rotulo}.`); throw 0; }
      return n;
    };
    const row = { data_snapshot: data, ticker: "", quantidade: "", preco_medio: "", preco_mercado: "", indexador: t[4], vencimento: "",
      isento_ir: $("f-isento").value, fonte: $("f-fonte").value.trim(), obs: $("f-obs").value.trim() };
    try {
      if (!data) { erroCampo($("f-data"), "Informe a data."); throw 0; }
      if (fmt === "bolsa") {
        const tk = $("f-ticker").value.trim().toUpperCase();
        if (!tk) { erroCampo($("f-ticker"), "Informe o código, como BOVA11."); throw 0; }
        const q = num("f-qtd", false, "Quantidade", true), pm = num("f-pm", true, "Preço médio"), p = num("f-preco", true, "Preço atual", true);
        Object.assign(row, { ativo: tk, ticker: tk, quantidade: paraArquivo(q), preco_medio: paraArquivo(pm), preco_mercado: paraArquivo(p), valor_brl: (q * p).toFixed(2) });
      } else {
        let nome = $("f-nome").value.trim();
        if (!nome) { erroCampo($("f-nome"), "Dê um nome para reconhecer depois, como o banco e o ano."); throw 0; }
        if (t[3] && !semAcento(nome).startsWith(semAcento(t[3]))) nome = `${t[3]} ${nome}`;
        const v = num("f-valor", true, "Quanto vale hoje", true), ap = fmt === "titulo" ? num("f-aplicado", true, "Quanto você aplicou") : null;
        Object.assign(row, { ativo: nome, valor_brl: v.toFixed(2) });
        if (ap != null) Object.assign(row, { quantidade: "1", preco_medio: paraArquivo(ap) });
        if (fmt === "titulo") Object.assign(row, { indexador: $("f-taxa").value.trim(), vencimento: $("f-venc").value });
      }
    } catch (e) { return; }
    const uso = $("f-bloco").value;
    if (uso === "carteira") {
      const classe = $("f-classe").value === "__nova" ? $("f-classe-nova").value.trim() : $("f-classe").value;
      if (!classe) return $("f-classe").value === "__nova" ? erroCampo($("f-classe-nova"), "Dê um nome para a classe, como Renda fixa.") : erroCampo($("f-classe"), "Escolha a classe deste investimento.");
      Object.assign(row, { bloco: blocoCarteira, classe });
    } else if (uso === "reserva") Object.assign(row, { bloco: cfg.reserve_block, classe: cfg.reserve_block });
    else if (uso === "caixa") Object.assign(row, { bloco: blocoCaixa, classe: cfg.cash_class });
    else Object.assign(row, { bloco: "Fora da carteira", classe: "Outros" });
    if (d.snapshot && data > d.snapshot && !confirm(`Com a data ${dt(data)}, este investimento vira uma atualização nova da carteira e os outros somem da tela até serem atualizados também.\n\nPara só acrescentar, volte e deixe a data ${dt(d.snapshot)}. Continuar assim mesmo?`)) return;
    try {
      await api("/api/table/posicoes", { method: "POST", body: { row } });
      toast("Investimento adicionado.");
      if (!outro) fecharDrawer();
      await carregar(true);
      if (outro) abrirInvestimento(null, { tipo: t[0], bloco: mexeuBloco ? uso : "" });
    } catch (e) { toast(e.message, true); }
  };
  $("f-cancelar").onclick = fecharDrawer;
  $("f-salvar").onclick = () => salvar(false);
  $("f-outro").onclick = () => salvar(true);
}

/* ---------------------------------------------------------------- atualizar valores */
/* A carteira e uma foto por data. Esta tela copia a ultima foto, a pessoa corrige os valores e
   tudo e gravado com a data nova, de uma vez. */
async function abrirAtualizar() {
  const d = S.d;
  if (!d.tem.posicoes) return abrirInvestimento();
  let tab;
  try { tab = await api("/api/table/posicoes"); } catch (e) { return toast(e.message, true); }
  const brutas = tab.rows.filter((r) => r.data_snapshot === d.snapshot);
  if (brutas.length !== d.posicoes.length) return toast("A carteira mudou. Recarregue a página e tente de novo.", true);
  const hoje = hojeISO();
  const itens = brutas.map((r, i) => {
    const p = d.posicoes[i], bolsa = !!(p.ticker && p.quantidade);
    return { r, p, bolsa, fora: false, comCusto: !bolsa && p.tipo !== "Conta" && p.classe !== d.config.cash_class };
  });
  const cx = (id, rot, v, extra = "") => `<label>${rot}<input id="${id}" inputmode="decimal" autocomplete="off" value="${esc(v)}" ${extra}></label>`;
  const linha = (it, i) => {
    const p = it.p;
    const campos = it.bolsa
      ? cx(`u-q-${i}`, "Quantidade", campoNum(p.quantidade)) + cx(`u-pm-${i}`, "Preço médio", campoBRL(p.preco_medio)) + cx(`u-p-${i}`, "Preço atual", campoBRL(p.preco_mercado ?? (p.quantidade ? p.valor / p.quantidade : null)))
      : (it.comCusto ? cx(`u-ap-${i}`, "Você aplicou", campoBRL(p.custo), 'placeholder="não informado"') : "") + cx(`u-v-${i}`, "Vale hoje", campoBRL(p.valor));
    return `<div class="at-linha" id="u-l-${i}">
        <div class="at-nome"><b>${esc(p.ativo)}</b><span class="muted small">${esc([p.tipo, p.classe].filter(Boolean).join(" · "))}</span></div>
        <div class="at-campos">${campos}<div class="at-total"><span>${it.bolsa ? "Valor" : it.comCusto ? "Lucro" : ""}</span><b id="u-t-${i}"></b></div></div>
        <button class="btn mini" data-rm="${i}" title="Tira este investimento da carteira a partir desta data">Não tenho mais</button></div>`;
  };
  abrirModal(`<h2>Atualizar valores</h2>
    <p class="muted small">Olhe no aplicativo do banco ou da corretora e corrija o que mudou. Última atualização: ${dt(d.snapshot)}.</p>
    <div class="field" style="max-width:220px"><label for="u-data">Data destes valores</label><input id="u-data" type="date" value="${hoje > d.snapshot ? hoje : ""}"></div>
    <div class="atualiza">${itens.map(linha).join("")}</div>
    <div class="row end botoes"><span id="u-soma" class="muted"></span><span class="empurra"></span><button class="btn" id="u-cancelar">Cancelar</button><button class="btn primary" id="u-salvar">Salvar atualização</button></div>`, true);

  const ler = (it, i) => {
    if (it.bolsa) {
      const q = lerNum($(`u-q-${i}`).value), pm = lerNum($(`u-pm-${i}`).value, true), pr = lerNum($(`u-p-${i}`).value, true);
      return { q, pm, pr, valor: q != null && pr != null ? q * pr : null };
    }
    const ap = it.comCusto ? lerNum($(`u-ap-${i}`).value, true) : null, v = lerNum($(`u-v-${i}`).value, true);
    return { ap, valor: v };
  };
  const recalcula = () => {
    let soma = 0;
    itens.forEach((it, i) => {
      const x = ler(it, i), ok = x.valor != null && !isNaN(x.valor);
      if (!it.fora && ok) soma += x.valor;
      const t = $(`u-t-${i}`);
      if (it.bolsa) t.textContent = ok ? nf.format(x.valor) : "";
      else if (it.comCusto) { const l = ok && x.ap != null && !isNaN(x.ap) ? x.valor - x.ap : null; t.textContent = l == null ? "" : (l > 0 ? "+" : "") + nf.format(l); t.className = l == null ? "" : sinal(l); }
    });
    $("u-soma").textContent = `Total: ${nf.format(soma)}. Antes: ${nf.format(d.blocos.total)}.`;
  };
  $("modal-in").querySelectorAll(".atualiza input").forEach((el) => (el.oninput = recalcula));
  $("modal-in").querySelectorAll("[data-rm]").forEach((b) => (b.onclick = () => {
    const it = itens[+b.dataset.rm];
    it.fora = !it.fora;
    $(`u-l-${b.dataset.rm}`).classList.toggle("fora", it.fora);
    b.textContent = it.fora ? "Desfazer" : "Não tenho mais";
    recalcula();
  }));
  recalcula();
  $("u-cancelar").onclick = fecharModal;
  $("u-salvar").onclick = async () => {
    const data = $("u-data").value;
    if (!data) return erroCampo($("u-data"), "Informe a data destes valores.");
    if (data > hoje) return erroCampo($("u-data"), "A data não pode ser no futuro.");
    if (data <= d.snapshot) return erroCampo($("u-data"), `Já existe uma atualização em ${dt(d.snapshot)}. Escolha uma data depois dela${d.config.append_only ? "" : ", ou corrija aquele dia em Lançamentos"}.`);
    const rows = [];
    for (let i = 0; i < itens.length; i++) {
      const it = itens[i];
      if (it.fora) continue;
      const x = ler(it, i), nova = {};
      tab.columns.forEach((c) => (nova[c] = it.r[c]));
      nova.data_snapshot = data; nova.fonte = "";
      if (it.p.alerta) nova.obs = "";   // valor conferido agora: sai a marca de estimativa
      const ruim = (id, msg) => erroCampo($(id), `${it.p.ativo}: ${msg}`);
      if (it.bolsa) {
        if (!(x.q > 0)) return ruim(`u-q-${i}`, "informe a quantidade.");
        if (Number.isNaN(x.pm)) return ruim(`u-pm-${i}`, "preço médio precisa ser um número.");
        if (!(x.pr > 0)) return ruim(`u-p-${i}`, "informe o preço atual.");
        Object.assign(nova, { quantidade: paraArquivo(x.q), preco_medio: x.pm == null ? "" : paraArquivo(x.pm), preco_mercado: paraArquivo(x.pr), valor_brl: x.valor.toFixed(2) });
      } else {
        if (x.valor == null || isNaN(x.valor) || x.valor < 0) return ruim(`u-v-${i}`, "informe quanto vale hoje.");
        if (Number.isNaN(x.ap)) return ruim(`u-ap-${i}`, "o valor aplicado precisa ser um número.");
        nova.valor_brl = x.valor.toFixed(2);
        // so reescreve o custo quando a pessoa mexeu nele
        if (x.ap != null && (it.p.custo == null || Math.abs(x.ap - it.p.custo) > 0.005)) Object.assign(nova, { quantidade: "1", preco_medio: paraArquivo(x.ap) });
      }
      rows.push(nova);
    }
    if (!rows.length) return toast("Sobrou nenhum investimento para gravar.", true);
    try {
      await api("/api/table/posicoes/rows", { method: "POST", body: { rows, fonte: `Atualização manual no Cashboard em ${dt(hoje)}` } });
      fecharModal(); toast("Carteira atualizada."); await carregar(true);
    } catch (e) { toast(e.message, true); }
  };
}

/* ---------------------------------------------------------------- metas */
const PARAM_RESERVA = "Meta da reserva de emergência", PARAM_APORTE = "Aporte mensal";
async function abrirMetas() {
  const d = S.d, hoje = hojeISO();
  let alvos;
  try { alvos = await api("/api/table/alvos"); } catch (e) { return toast(e.message, true); }
  fecharModal();
  // nome do parametro em uso (pode ter outro nome em configuracoes antigas) e se da para mudar por aqui
  const param = (termos, padrao) => {
    const nome = Object.keys(d.parametros).find((n) => termos.every((t) => semAcento(n).includes(t)));
    const origem = nome ? d.parametros[nome].origem : null;
    return { nome: nome && origem === "config" ? nome : padrao, valor: nome ? d.parametros[nome].valor : null, trava: !!nome && origem !== "config", origem };
  };
  const pRes = param(["META", "RESERVA"], PARAM_RESERVA), pAp = param(["APORTE", "MENSAL"], PARAM_APORTE);
  const pc = (v) => v == null ? "" : campoNum(+(v * 100).toFixed(4));
  let linhas = d.alocacao.linhas.filter((l) => l.classe !== d.config.cash_class).map((l) => ({ classe: l.classe, alvo: d.tem.metas ? pc(l.alvo) : "", min: d.tem.metas ? pc(l.min) : "", max: d.tem.metas ? pc(l.max) : "", como: l.instrumento || "" }));
  if (!linhas.length) linhas = [{ classe: "", alvo: "", min: "", max: "", como: "" }, { classe: "", alvo: "", min: "", max: "", como: "" }];
  const antes = JSON.stringify(linhas);
  const dinheiro = (id, p) => `<input id="${id}" inputmode="decimal" autocomplete="off" placeholder="0,00" value="${esc(campoBRL(p.valor))}" ${p.trava ? "disabled" : ""}>`;
  const trava = (p) => p.trava ? `Vem de ${esc(p.origem)}. Mude por lá.` : "";
  const gasto = d.reserva.gasto_medio ? `Seus gastos: em média ${nf.format(d.reserva.gasto_medio)} por mês.` : "";
  abrirModal(`<h2>Metas</h2>
    <h3>Reserva e aporte</h3>
    <div class="duas">
      ${campo("m-reserva", "Quanto quer ter na reserva de emergência (R$)", dinheiro("m-reserva", pRes), { ajuda: trava(pRes) || gasto, opcional: true })}
      ${campo("m-aporte", "Quanto pretende investir por mês (R$)", dinheiro("m-aporte", pAp), { ajuda: trava(pAp), opcional: true })}
    </div>
    <h3>Divisão dos investimentos</h3>
    <p class="muted small">Quanto da carteira você quer em cada classe. A soma precisa dar 100%. A faixa é o quanto pode variar sem preocupar: vazia, vale 5 pontos para cada lado.</p>
    <div class="metas"><div class="meta-cab small muted"><span>Classe</span><span>Meta %</span><span>Mínimo %</span><span>Máximo %</span><span>Como investir (opcional)</span><span></span></div><div id="m-linhas"></div></div>
    <div class="row"><button class="btn mini" id="m-add">Adicionar classe</button><span id="m-soma" class="small"></span></div>
    <div class="row end botoes"><button class="btn" id="m-cancelar">Cancelar</button><button class="btn primary" id="m-salvar">Salvar metas</button></div>`, true);

  const linhasNaTela = () => [...$("m-linhas").querySelectorAll(".meta-linha")];
  const colher = () => linhasNaTela().map((el) => Object.fromEntries(["classe", "alvo", "min", "max", "como"].map((k) => [k, el.querySelector(`[data-k=${k}]`).value.trim()])));
  const soma = () => {
    const s = colher().reduce((t, l) => t + (lerNum(l.alvo) || 0), 0), dif = +(100 - s).toFixed(2), el = $("m-soma");
    el.textContent = !s ? "" : Math.abs(dif) < 0.05 ? "Soma: 100%" : dif > 0 ? `Soma: ${campoNum(+s.toFixed(2))}%. Faltam ${campoNum(dif)}%.` : `Soma: ${campoNum(+s.toFixed(2))}%. Passou ${campoNum(-dif)}%.`;
    el.className = "small " + (!s ? "" : Math.abs(dif) < 0.05 ? "pos" : "neg");
  };
  const desenha = () => {
    $("m-linhas").innerHTML = linhas.map((l) => `<div class="meta-linha">
        <input data-k="classe" aria-label="Classe" placeholder="Ex.: Renda fixa" value="${esc(l.classe)}" list="dl-m-classes">
        <input data-k="alvo" aria-label="Meta %" inputmode="decimal" placeholder="Ex.: 70" value="${esc(l.alvo)}">
        <input data-k="min" aria-label="Mínimo %" inputmode="decimal" value="${esc(l.min)}">
        <input data-k="max" aria-label="Máximo %" inputmode="decimal" value="${esc(l.max)}">
        <input data-k="como" aria-label="Como investir" placeholder="Ex.: CDB e Tesouro" value="${esc(l.como)}">
        <button class="btn mini" data-tira title="Remover esta classe">Remover</button></div>`).join("")
      + `<datalist id="dl-m-classes">${CLASSES_SUGERIDAS.map((c) => `<option value="${c}">`).join("")}</datalist>`;
    $("m-linhas").querySelectorAll("input").forEach((el) => (el.oninput = soma));
    $("m-linhas").querySelectorAll("[data-tira]").forEach((b, i) => (b.onclick = () => { linhas = colher(); linhas.splice(i, 1); desenha(); }));
    soma();
  };
  desenha();
  $("m-add").onclick = () => { linhas = colher(); linhas.push({ classe: "", alvo: "", min: "", max: "", como: "" }); desenha(); linhasNaTela().pop().querySelector("input").focus(); };
  $("m-cancelar").onclick = fecharModal;
  $("m-salvar").onclick = async () => {
    // 1) reserva e aporte
    const params = {};
    for (const [id, p] of [["m-reserva", pRes], ["m-aporte", pAp]]) {
      if (p.trava) continue;
      const n = lerNum($(id).value, true);
      if (Number.isNaN(n) || n < 0) return erroCampo($(id), "Escreva só o número, como 9000.");
      if ((n ?? null) !== (p.valor ?? null)) params[p.nome] = n == null ? "" : n;
    }
    // 2) divisao da carteira (so grava se mudou)
    const atuais = colher().filter((l) => l.classe || l.alvo);
    let rows = null;
    if (JSON.stringify(colher()) !== antes && atuais.length) {
      const nomes = new Set();
      rows = [];
      let total = 0;
      const els = linhasNaTela();
      for (const [i, l] of colher().entries()) {
        if (!l.classe && !l.alvo) continue;
        const el = (k) => els[i].querySelector(`[data-k=${k}]`);
        if (!l.classe) return erroCampo(el("classe"), "Dê um nome para a classe.");
        if (nomes.has(semAcento(l.classe))) return erroCampo(el("classe"), `A classe ${l.classe} aparece duas vezes.`);
        nomes.add(semAcento(l.classe));
        const a = lerNum(l.alvo);
        if (a == null || isNaN(a) || a < 0 || a > 100) return erroCampo(el("alvo"), `${l.classe}: a meta fica entre 0 e 100.`);
        let mi = lerNum(l.min), ma = lerNum(l.max);
        if (Number.isNaN(mi) || Number.isNaN(ma)) return erroCampo(el(Number.isNaN(mi) ? "min" : "max"), `${l.classe}: a faixa precisa ser um número.`);
        if (mi == null) mi = Math.max(0, a - 5);
        if (ma == null) ma = Math.min(100, a + 5);
        if (mi > a || ma < a) return erroCampo(el(mi > a ? "min" : "max"), `${l.classe}: a meta de ${campoNum(a)}% precisa ficar entre o mínimo e o máximo.`);
        total += a;
        rows.push({ classe: l.classe, alvo: a + "%", banda_min: mi + "%", banda_max: ma + "%", instrumento: l.como });
      }
      if (Math.abs(total - 100) >= 0.05) return toast(`As metas somam ${campoNum(+total.toFixed(2))}%. Ajuste para dar 100%.`, true);
      const usadas = new Set(alvos.rows.map((r) => r.versao_politica));
      let versao = "v" + hoje;
      for (let k = 2; usadas.has(versao); k++) versao = `v${hoje}-${k}`;
      rows.forEach((r) => Object.assign(r, { versao_politica: versao, vigencia_inicio: hoje }));
    }
    if (!rows && !Object.keys(params).length) return fecharModal();
    try {
      if (Object.keys(params).length) await api("/api/config", { method: "PUT", body: { parameters: params } });
      if (rows) await api("/api/table/alvos/rows", { method: "POST", body: { rows, fonte: `Metas definidas no Cashboard em ${dt(hoje)}` } });
      fecharModal(); S.aporte = null; S.sim = null; toast("Metas salvas."); await carregar(true);
    } catch (e) { toast(e.message, true); }
  };
}

/* ---------------------------------------------------------------- importar (colar o que a IA devolveu) */
function abrirImportar(texto = "") {
  abrirModal(`<h2>Importar dados</h2>
    <p class="muted small">Cole aqui o bloco que a sua IA devolveu. O painel confere tudo antes de gravar. <button class="link" data-acao="ia">Como pedir para a IA</button></p>
    <textarea id="imp-txt" class="editor curto" spellcheck="false" aria-label="Dados para importar" placeholder="# despesas&#10;data,descricao,categoria,tipo,valor_brl&#10;2026-11-03,Supermercado,Alimentação,Variável,231.90">${esc(texto)}</textarea>
    <div id="imp-res"></div>
    <div class="row end botoes"><button class="btn" id="imp-cancelar">Cancelar</button><button class="btn primary" id="imp-ok">Conferir</button></div>`, true);
  let conferido = false;
  const reinicia = () => { conferido = false; $("imp-ok").textContent = "Conferir"; $("imp-res").innerHTML = ""; };
  $("imp-txt").oninput = reinicia;
  $("imp-cancelar").onclick = fecharModal;
  $("imp-txt").focus();
  $("imp-ok").onclick = async () => {
    const text = $("imp-txt").value;
    try {
      const r = await api("/api/import", { method: "POST", body: { text, dry_run: !conferido } });
      if (r.gravado) { fecharModal(); toast(`${plural(r.total, "linha importada", "linhas importadas")}.`); S.mes = null; return carregar(true); }
      const erros = r.erros.length ? `<div class="banner aberto"><b>${plural(r.erros.length, "linha precisa", "linhas precisam")} de ajuste. Nada foi gravado.</b><ul>${r.erros.map((e) => `<li>Linha ${e.linha}${e.tabela ? ` (${esc(e.tabela)})` : ""}: ${esc(e.erro)}</li>`).join("")}</ul><p class="small">Corrija no texto acima ou mande estas mensagens para a IA arrumar.</p></div>` : "";
      const avisos = r.avisos.map((a) => `<p class="note">${esc(a)}</p>`).join("");
      const tabs = r.tabelas.map((t) => `<h3>${esc(t.label)}: ${plural(t.novas, "linha nova", "linhas novas")}${t.repetidas ? `, ${plural(t.repetidas, "repetida ignorada", "repetidas ignoradas")}` : ""}</h3>
        ${t.amostra.length ? tabela(t.colunas.map((c) => ({ t: esc(t.rotulos[c] || c) })), t.amostra.map((l) => t.colunas.map((c) => esc(l[c])))) + (t.novas > t.amostra.length ? `<p class="muted small">e mais ${t.novas - t.amostra.length}.</p>` : "") : ""}`).join("");
      $("imp-res").innerHTML = erros + avisos + tabs + (!r.erros.length && !r.total ? '<p class="note">Nada novo para importar: tudo isso já está no painel.</p>' : "");
      conferido = !r.erros.length && r.total > 0;
      $("imp-ok").textContent = conferido ? `Importar ${plural(r.total, "linha", "linhas")}` : "Conferir";
    } catch (e) { toast(e.message, true); }
  };
}

/* ---------------------------------------------------------------- conectar com IA */
async function abrirIA() {
  let ia;
  try { ia = await api("/api/ia"); } catch (e) { return toast(e.message, true); }
  const modo = ls("wd.ia") === "arquivos" ? "arquivos" : "chat";
  const desenha = (m) => {
    ls("wd.ia", m);
    const chat = m === "chat";
    abrirModal(`<h2>Conectar com IA</h2>
      <p>Qualquer IA consegue preencher o painel para você. Como você usa a sua?</p>
      <div class="seg dois" role="radiogroup" aria-label="Tipo de IA">
        <button role="radio" aria-checked="${chat}" data-ia="chat">Converso com ela<small>ChatGPT, Claude, Gemini</small></button>
        <button role="radio" aria-checked="${!chat}" data-ia="arquivos">Ela mexe nos meus arquivos<small>Claude Code, Codex, Cursor</small></button>
      </div>
      <ol class="como">${chat
    ? "<li>Copie o pedido abaixo e cole na conversa com a IA.</li><li>Mande seus extratos, prints ou conte o que você fez.</li><li>Copie a resposta dela e cole em <b>Importar dados</b>.</li>"
    : "<li>Abra a IA na pasta de dados (ou na pasta do Cashboard).</li><li>Cole o pedido abaixo e mande seus extratos.</li><li>Ela grava os arquivos e o painel se atualiza sozinho.</li>"}</ol>
      <textarea id="ia-txt" class="editor curto" readonly aria-label="Pedido para a IA">${esc(chat ? ia.prompt_chat : ia.prompt_arquivos)}</textarea>
      <p class="muted small">Pasta de dados: <code>${esc(ia.pasta)}</code><br>Guia completo para a IA: <code>${esc(ia.guia_arquivo)}</code></p>
      <div class="row end botoes"><button class="btn" id="ia-fechar">Fechar</button>${chat ? '<button class="btn" data-acao="importar">Abrir Importar dados</button>' : ""}<button class="btn primary" id="ia-copiar">Copiar pedido</button></div>`, true);
    $("modal-in").querySelectorAll("[data-ia]").forEach((b) => (b.onclick = () => desenha(b.dataset.ia)));
    $("ia-fechar").onclick = fecharModal;
    $("ia-copiar").onclick = async () => {
      const el = $("ia-txt");
      try { await navigator.clipboard.writeText(el.value); } catch (e) { el.select(); document.execCommand("copy"); }
      toast("Pedido copiado. Agora cole na sua IA.");
    };
  };
  desenha(modo);
}

/* ---------------------------------------------------------------- pasta de dados */
async function trocarPasta(pasta, criar) {
  await api("/api/config", { method: "PUT", body: { data_directory: pasta, create: !!criar } });
  fecharModal();
  Object.assign(S, { sim: null, aporte: null, doc: null, classe: "", tipo: "", mes: null, busca: "" });
  await carregar();
}
async function abrirComecar() {
  let c;
  try { c = await api("/api/config"); } catch (e) { return toast(e.message, true); }
  abrirModal(`<h2>Começar com meus dados</h2>
    <p>O painel cria uma pasta vazia para os seus dados. Tudo fica neste computador e nada é enviado para fora.</p>
    ${campo("c-nova", "Nome da pasta", `<input id="c-nova" autocomplete="off" value="${esc(c.sample ? c.new_directory : c.data_directory)}">`, { ajuda: "Fica dentro da pasta do Cashboard. Se preferir outro lugar, escreva o caminho completo, como C:\\Users\\voce\\Documents\\Financas." })}
    <div class="row end botoes"><button class="btn" id="c-cancelar">Cancelar</button><button class="btn primary" id="c-criar">Criar e começar</button></div>`);
  $("c-cancelar").onclick = fecharModal;
  $("c-criar").onclick = async () => {
    try { await trocarPasta($("c-nova").value.trim(), true); S.tab = "geral"; desenhar(); } catch (e) { toast(e.message, true); }
  };
}
async function usarExemplo() {
  try { await trocarPasta("sample_data"); toast("Mostrando os dados de exemplo."); } catch (e) { toast(e.message, true); }
}
async function abrirConfig() {
  let c;
  try { c = await api("/api/config"); } catch (e) { return toast(e.message, true); }
  const achadas = c.tables_found.map((n) => S.schema[n] ? S.schema[n].label.toLowerCase() : n);
  abrirModal(`<h2>Pasta de dados</h2>
    <p class="muted small">É onde o painel lê e grava. Pode ser a mesma pasta em que a sua IA trabalha.</p>
    ${campo("c-dir", "Pasta", `<input id="c-dir" autocomplete="off" value="${esc(c.data_directory)}">`, { ajuda: "Caminho completo ou nome de uma pasta dentro do Cashboard." })}
    <p class="small">Em uso: <code>${esc(c.resolved)}</code><br>${achadas.length ? `Já tem: ${esc(lista(achadas))}.` : "Ainda sem dados."}${c.append_only ? "<br>Esta pasta só aceita inclusão: o painel não edita nem apaga linhas." : ""}</p>
    <div class="row end botoes"><button class="btn" id="c-exemplo">Ver dados de exemplo</button><span class="empurra"></span><button class="btn" id="c-fechar">Fechar</button><button class="btn primary" id="c-salvar">Salvar</button></div>`);
  $("c-fechar").onclick = fecharModal;
  $("c-exemplo").onclick = usarExemplo;
  $("c-salvar").onclick = async () => {
    const pasta = $("c-dir").value.trim();
    try { await trocarPasta(pasta); toast("Pasta de dados alterada."); } catch (e) {
      if (!/não encontrada/i.test(e.message)) return toast(e.message, true);
      if (!confirm("Essa pasta ainda não existe. Criar agora?")) return;
      try { await trocarPasta(pasta, true); toast("Pasta criada."); } catch (e2) { toast(e2.message, true); }
    }
  };
}

/* ---------------------------------------------------------------- acoes dos botoes (data-acao) */
const ACOES = {
  adicionar: () => abrirAdicionar(),
  posicao: () => abrirInvestimento(),
  atualizar: () => abrirAtualizar(),
  despesas: () => abrirForm("despesas"),
  transacoes: () => abrirForm("transacoes"),
  aportes: () => abrirForm("aportes"),
  vencimentos: () => abrirForm("vencimentos"),
  metas: () => abrirMetas(),
  importar: () => abrirImportar(),
  ia: () => abrirIA(),
  meusdados: () => abrirComecar(),
  exemplo: () => usarExemplo(),
  pasta: () => abrirConfig(),
};

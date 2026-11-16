/* Cashboard - frontend. Sem framework: estado em S, uma funcao de desenho por aba.
   As telas de cadastro (adicionar, atualizar valores, metas, importar, IA) ficam em forms.js. */
"use strict";

const TABS = [["geral", "Resumo", "painel"], ["resultado", "Investimentos", "alta"], ["alocacao", "Alocação", "pizza"],
  ["gastos", "Gastos", "cartao"], ["evolucao", "Evolução", "barras"], ["gestao", "Lançamentos", "lapis"]];
/* Icones proprios, em traco, que herdam a cor do texto. */
const ICONES = {
  painel: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  pizza: '<path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5v10z"/><path d="M14 3.2A8.5 8.5 0 0 1 20.8 10H14z"/>',
  alta: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
  cartao: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h3"/>',
  barras: '<path d="M5 20V11M11 20V5M17 20v-7M3 20h18"/>',
  lapis: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  olho: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  olhoFechado: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/><path d="M4 4l16 16"/>',
  sol: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  lua: '<path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/>',
  engrenagem: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  baixar: '<path d="M12 4v11M7 11l5 5 5-5M4 20h16"/>',
  imprimir: '<path d="M7 9V4h10v5"/><rect x="4" y="9" width="16" height="8" rx="2"/><path d="M7 14h10v6H7z"/>',
  pasta: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
  mais: '<path d="M12 5v14M5 12h14"/>',
  atualizar: '<path d="M20 11a8 8 0 0 0-14.3-4.3L4 8.5"/><path d="M4 4v4.5h4.5"/><path d="M4 13a8 8 0 0 0 14.3 4.3l1.7-1.8"/><path d="M20 20v-4.5h-4.5"/>',
  troca: '<path d="M4 8h14M14 4l4 4-4 4"/><path d="M20 16H6M10 12l-4 4 4 4"/>',
  alvo: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  calendario: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  colar: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4a3 3 0 0 1 6 0v1H9zM9 11h6M9 15h4"/>',
  ia: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z"/>',
  porquinho: '<path d="M4 12a7 6 0 0 1 7-6h3a6 6 0 0 1 5.5 3.6L21 10v4l-1.6.5A6 6 0 0 1 17 17v2.5h-3V18h-3v1.5H8V17a7 6 0 0 1-4-5z"/><path d="M9 6.2V4"/><circle cx="16" cy="11" r=".6"/>',
};
const ic = (nome) => `<svg class="ic" viewBox="0 0 24 24" aria-hidden="true">${ICONES[nome] || ""}</svg>`;
/* Cores e fontes vem do CSS (styles.css e classic.css), para os graficos acompanharem tema e modo. */
let SERIES = [], INK, INK2, MUTED, GRID, SURFACE, SURFACE2, FONTE, POS, NEG, CLASSICO = false, ESCURO = false;
function lerTema() {
  const css = getComputedStyle(document.documentElement), v = (n) => css.getPropertyValue(n).trim();
  SERIES = [1, 2, 3, 4, 5, 6].map((i) => v("--s" + i));
  INK = v("--ink"); INK2 = v("--ink-2"); MUTED = v("--muted"); GRID = v("--line");
  SURFACE = v("--surface"); SURFACE2 = v("--surface-2"); FONTE = v("--font-ui"); POS = v("--pos"); NEG = v("--neg");
  CLASSICO = document.documentElement.dataset.skin === "classico";
  ESCURO = document.documentElement.dataset.theme === "dark";
}
/* Tema (moderno ou classico) e modo (claro, escuro ou automatico), guardados no navegador. */
const temaDoSistema = window.matchMedia ? matchMedia("(prefers-color-scheme: dark)") : null;
function aparencia() {
  const skin = ls("wd.skin") === "classico" ? "classico" : "moderno";
  let modo = ls("wd.modo") || ls("wd.tema") || "auto";
  if (modo !== "light" && modo !== "dark") modo = "auto";
  return { skin, modo, tema: modo === "auto" ? (temaDoSistema && temaDoSistema.matches ? "dark" : "light") : modo };
}
function aplicarAparencia() {
  const a = aparencia(), raiz = document.documentElement;
  raiz.dataset.skin = a.skin; raiz.dataset.theme = a.tema;
  document.querySelectorAll("[data-skin]").forEach((b) => b !== raiz && b.setAttribute("aria-checked", b.dataset.skin === a.skin));
  document.querySelectorAll("[data-modo]").forEach((b) => b.setAttribute("aria-checked", b.dataset.modo === a.modo));
  if (a.skin === "classico" && !$("fonte-classica")) {
    const l = document.createElement("link");
    l.rel = "stylesheet"; l.id = "fonte-classica";
    l.href = "https://fonts.googleapis.com/css2?family=VT323&display=swap";
    document.head.appendChild(l);
  }
}
const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } };

const S = {
  d: null, schema: null, tab: ls("wd.tab") || "geral", priv: ls("wd.priv") === "1",
  classe: "", tipo: "", mes: null, gestao: "lancamentos", tabela: "despesas", busca: "",
  linhas: null, docs: null, doc: null, editando: false, aporte: null, sim: null, charts: [],
};
const $ = (id) => document.getElementById(id);

/* ---------------------------------------------------------------- formatacao */
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const nf = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const brl = (v) => v == null ? "n/d" : S.priv ? "R$ •••••" : nf.format(v);
const brlAbbr = (v) => {
  if (S.priv) return "•••";
  const a = Math.abs(v), f = (x, casas) => x.toLocaleString("pt-BR", { maximumFractionDigits: casas });
  if (a >= 1e6) return f(v / 1e6, 1) + " mi";
  if (a >= 1e3) return f(v / 1e3, 1) + " mil";
  return f(v, a < 10 ? 2 : a < 100 ? 1 : 0);   // valores pequenos mantem as casas, senao o eixo repete "1, 1, 2, 2"
};
const pct = (v, casas = 2) => v == null ? "n/d" : (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) + "%";
const pctSinal = (v, casas = 2) => v == null ? "n/d" : (v > 0 ? "+" : "") + pct(v, casas);
const qtd = (v) => v == null ? "" : S.priv ? "•••" : v.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
const dt = (s) => s && /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : /^\d{4}-\d{2}$/.test(s || "") ? `${s.slice(5)}/${s.slice(0, 4)}` : (s || "");
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mes = (s) => s && /^\d{4}-\d{2}$/.test(s) ? `${MESES[+s.slice(5) - 1]}/${s.slice(0, 4)}` : (s || "");
const sinal = (v) => v == null || Math.abs(v) < 0.005 ? "" : v > 0 ? "pos" : "neg";
const comSinal = (v) => v == null ? "n/d" : (v > 0 && !S.priv ? "+" : "") + brl(v);
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
const hojeISO = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

/* ---------------------------------------------------------------- API */
async function api(path, opt = {}) {
  const r = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opt, body: opt.body ? JSON.stringify(opt.body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.erro || j.detail || `Erro ${r.status}`);
  return j;
}
function toast(msg, err) {
  const t = $("toast");
  t.textContent = msg;
  t.className = "toast show" + (err ? " err" : "");
  clearTimeout(toast.t);
  toast.t = setTimeout(() => (t.className = "toast"), err ? 6000 : 2600);
}

function conexao(ok) {
  $("sync").className = "sync " + (ok ? "ok" : "err");
  if (!ok) $("sub").textContent = "Painel desligado";
  else if (S.d) $("sub").textContent = S.d.exemplo ? "Dados de exemplo" : S.d.snapshot ? `Carteira de ${dt(S.d.snapshot)}` : "Tudo salvo";
  $("b-sync").title = ok ? "O painel acompanha a sua pasta de dados. Clique para recarregar agora." : "O painel não respondeu. Confira se a janela do Cashboard continua aberta e clique para tentar de novo.";
}
async function carregar(silencioso) {
  try {
    S.d = await api("/api/dashboard");
    if (!S.schema) S.schema = await api("/api/schema");
    S.linhas = null; S.docs = null;
    conexao(true);
    if (!silencioso) S.mes = null;
    desenhar();
  } catch (e) {
    conexao(false);
    toast(e.message, true);
  }
}
const camadaAberta = () => $("drawer").classList.contains("open") || $("modal").classList.contains("open");
async function vigiar() {
  if (document.hidden) return;   // aba em segundo plano: confere quando voltar
  try {
    const s = await api("/api/state");
    conexao(true);
    if (S.d && s.fingerprint !== S.d.fingerprint) {
      if (camadaAberta() || S.editando) return;   // nao atropela quem digita
      const y = window.scrollY;
      await carregar(true);
      window.scrollTo(0, y);
      toast("Chegaram dados novos. Painel atualizado.");
    }
  } catch (e) { conexao(false); }
}

/* ---------------------------------------------------------------- graficos */
const corDe = {};
function cor(nome, grupo) {
  const k = grupo + "|" + nome;   // guarda a posicao na paleta, nao a cor: a cor muda com o tema
  if (corDe[k] === undefined) corDe[k] = Object.keys(corDe).filter((x) => x.startsWith(grupo + "|")).length;
  return corDe[k] < SERIES.length ? SERIES[corDe[k]] : MUTED;
}
/* Quantas linhas a legenda ocupa na largura do grafico, para o grafico comecar logo abaixo dela. */
const medidor = document.createElement("canvas").getContext("2d");
function linhasDaLegenda(option, largura) {
  medidor.font = `12px ${FONTE}`;
  const itens = (option.series || []).filter((s) => s.name).map((s) => 10 + 5 + medidor.measureText(s.name).width + 10);
  let linhas = 1, x = 0;
  itens.forEach((w) => { if (x > 0 && x + w > largura) { linhas++; x = w; } else x += w; });
  return linhas;
}
function chart(id, option) {
  const el = $(id);
  if (!el) return;
  if (!window.echarts) { el.innerHTML = '<p class="muted small">Sem internet, os gráficos não aparecem. Os números e as tabelas continuam certos.</p>'; return; }
  const c = echarts.init(el, null, { renderer: "svg" });
  const eixo = { axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false }, axisLabel: { color: MUTED }, splitLine: { lineStyle: { color: GRID } } };
  const base = {
    backgroundColor: "transparent", color: SERIES, textStyle: { color: INK2, fontFamily: FONTE }, animation: false,
    grid: { left: 4, right: 16, top: option.legend ? 14 + 24 * linhasDaLegenda(option, el.clientWidth) : 14, bottom: 4, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: GRID, opacity: .35 } }, backgroundColor: SURFACE2, borderColor: GRID, textStyle: { color: INK, fontFamily: FONTE }, valueFormatter: (v) => brl(v) },
  };
  if (option.legend) option.legend = { top: 0, left: 0, textStyle: { color: INK2 }, icon: "roundRect", itemWidth: 10, itemHeight: 10, ...option.legend };
  for (const k of ["xAxis", "yAxis"]) if (option[k]) option[k] = { ...eixo, ...option[k], axisLabel: { ...eixo.axisLabel, ...(option[k].axisLabel || {}) } };
  if (CLASSICO) classico(option, base);
  c.setOption({ ...base, ...option, tooltip: { ...base.tooltip, ...(option.tooltip || {}) }, grid: { ...base.grid, ...(option.grid || {}) } });
  S.charts.push(c);
}
/* Tema classico: barras com brilho de vidro e contorno, dica no estilo da epoca. */
function misturar(hex, alvo, t) {
  const n = parseInt(hex.slice(1), 16), a = alvo === "branco" ? 255 : 0;
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((x) => Math.round(x + (a - x) * t));
  return "#" + c.map((x) => x.toString(16).padStart(2, "0")).join("");
}
function brilho(cor, deitada) {
  if (typeof cor !== "string" || cor[0] !== "#") return cor;
  return new echarts.graphic.LinearGradient(0, 0, deitada ? 0 : 1, deitada ? 1 : 0, [
    { offset: 0, color: misturar(cor, "branco", .5) }, { offset: .48, color: misturar(cor, "branco", .18) },
    { offset: .5, color: cor }, { offset: 1, color: misturar(cor, "preto", .12) }]);
}
function classico(option, base) {
  const deitada = option.yAxis && option.yAxis.type === "category";
  const vidro = (st) => {
    if (!st || typeof st.color !== "string") return st;
    return { ...st, borderColor: misturar(st.color, "preto", .35), borderWidth: 1, borderRadius: 1, color: brilho(st.color, deitada) };
  };
  (option.series || []).forEach((sr) => {
    if (sr.type === "bar") {
      sr.itemStyle = vidro(sr.itemStyle);
      if (Array.isArray(sr.data)) sr.data = sr.data.map((x) => (x && x.itemStyle ? { ...x, itemStyle: vidro(x.itemStyle) } : x));
    }
  });
  if (option.legend) option.legend.icon = "rect";
  base.tooltip.extraCssText = ESCURO
    ? "border-radius:0;box-shadow:2px 2px 0 #000;font-family:VT323,monospace;font-size:17px"
    : "border-radius:4px;box-shadow:2px 2px 4px rgba(0,0,0,.3);background:linear-gradient(#fff,#e4e5f0)";
  base.tooltip.backgroundColor = ESCURO ? "#000" : "#ffffff";
  base.tooltip.borderColor = ESCURO ? "#6e6e8c" : "#767676";
  base.tooltip.textStyle = { color: ESCURO ? "#3cff3c" : "#000", fontFamily: ESCURO ? "VT323, monospace" : FONTE, fontSize: ESCURO ? 17 : 13 };
}
/* Ao redimensionar, redesenha uma vez por quadro e refaz a tela se a legenda mudar de altura. */
let quadro = 0;
window.addEventListener("resize", () => {
  if (quadro) return;
  quadro = requestAnimationFrame(() => { quadro = 0; S.charts.forEach((c) => c.resize()); });
});
let largura = window.innerWidth, espera = 0;
window.addEventListener("resize", () => {
  clearTimeout(espera);
  espera = setTimeout(() => { if (Math.abs(window.innerWidth - largura) > 80) { largura = window.innerWidth; if (!camadaAberta()) desenhar(); } }, 250);
});
const eixoBRL = { type: "value", axisLabel: { formatter: (v) => brlAbbr(v) } };
const barra = (extra) => ({ type: "bar", barMaxWidth: 24, itemStyle: { borderRadius: [3, 3, 0, 0], borderColor: SURFACE, borderWidth: 1 }, ...extra });

/* ---------------------------------------------------------------- pecas */
/* dica(): o "?" ao lado de um termo. A explicacao fica fora da tela ate a pessoa pedir. */
const dica = (t) => t ? `<button type="button" class="q" data-q="${esc(t)}" aria-label="O que é isso?">?</button>` : "";
const kpi = (rotulo, valor, sub, cls = "", ajuda = "") => `<div class="kpi"><span>${rotulo}${dica(ajuda)}</span><b class="${cls}">${valor}</b><small>${sub || ""}</small></div>`;
const card = (titulo, sub, corpo, cls = "", topo = "") => `<div class="card ${cls}"><h2>${titulo}</h2>${topo ? `<div class="card-acao noprint">${topo}</div>` : ""}${sub ? `<p class="sub">${sub}</p>` : '<div class="sem-sub"></div>'}${corpo}</div>`;
const botao = (texto, acao, primario, mini) => `<button class="btn ${primario ? "primary" : ""} ${mini ? "mini" : ""}" data-acao="${acao}">${texto}</button>`;
/* vazio(): o que mostrar quando ainda nao ha dado. Sempre diz o proximo passo. */
const vazio = (titulo, texto, botoes = []) => `<div class="vazio"><h3>${titulo}</h3><p>${texto}</p><div class="row noprint">${botoes.map(([t, a, p]) => botao(t, a, p)).join("")}</div></div>`;
function tabela(cab, linhas, pe, semDados = "Nada por aqui ainda.") {
  const th = cab.map((c) => `<th class="${c.n ? "n" : ""}"${c.d ? ` title="${esc(c.d)}"` : ""}>${c.t}</th>`).join("");
  const tr = linhas.map((l) => `<tr>${l.map((v, i) => `<td class="${cab[i].n ? "n" : ""}">${v ?? ""}</td>`).join("")}</tr>`).join("");
  const tf = pe ? `<tfoot><tr>${pe.map((v, i) => `<td class="${cab[i].n ? "n" : ""}">${v ?? ""}</td>`).join("")}</tr></tfoot>` : "";
  return `<div class="scroll"><table><thead><tr>${th}</tr></thead><tbody>${tr || `<tr><td colspan="${cab.length}" class="muted">${semDados}</td></tr>`}</tbody>${tf}</table></div>`;
}
const filtradas = () => S.d.posicoes.filter((p) => (!S.classe || p.classe === S.classe) && (!S.tipo || p.tipo === S.tipo));
/* Soma os investimentos por tipo de produto. Usada na aba Investimentos, que respeita o filtro. */
function porTipo(ps) {
  const m = {};
  ps.forEach((p) => {
    const t = (m[p.tipo] ||= { tipo: p.tipo, valor: 0, custo: 0, sobre_custo: 0, observado: 0, n: 0, n_custo: 0, n_observado: 0, n_sem_dado: 0 });
    t.valor += p.valor; t.n++;
    if (p.metodo === "custo") { t.sobre_custo += p.resultado; t.custo += p.custo; t.n_custo++; }
    else if (p.metodo === "observado") { t.observado += p.resultado; t.n_observado++; }
    else t.n_sem_dado++;
  });
  return Object.values(m).sort((a, b) => b.valor - a.valor);
}
const lista = (xs) => xs.length > 1 ? xs.slice(0, -1).join(", ") + " e " + xs[xs.length - 1] : xs.join("");
const parcial = (d, m) => m === d.hoje.slice(0, 7);
const pintado = (v, texto) => `<span class="${sinal(v)}">${texto}</span>`;
const DICAS = {
  lucro: "Valor de hoje menos o que você pagou. Só vira dinheiro no bolso quando você vende ou resgata.",
  rendeu: "O painel não sabe quanto você aplicou nestes títulos. Então mostra quanto o valor subiu desde a primeira vez que eles apareceram aqui.",
  vendas: "O que você recebeu nas vendas menos o que tinha pago.",
  guardei: "Parte da renda do mês que não foi gasta.",
  investimentos: "Tudo o que está investido, mais o dinheiro em conta separado para investir. A reserva de emergência fica de fora.",
};

/* Faixa do topo: aviso de dados de exemplo ou a lista do que falta completar. */
function topo(d) {
  if (d.exemplo) return `<div class="note exemplo noprint"><span>Você está vendo <b>dados de exemplo</b>, inventados para mostrar como o painel funciona.</span>${botao("Começar com meus dados", "meusdados", 1)}</div>`;
  const p = d.pendencias;
  return p.length ? `<details class="banner"><summary>${plural(p.length, "item", "itens")} para completar o painel</summary><ul>${p.map((x) => `<li>${esc(x.texto)} <button class="btn mini noprint" data-acao="${esc(x.acao)}">${esc(x.botao)}</button></li>`).join("")}</ul></details>` : "";
}
const semInvestimentos = () => vazio("Você ainda não tem investimentos aqui", "Adicione o que você tem hoje. O painel calcula o total, o lucro e a divisão da carteira.", [["Adicionar investimento", "posicao", 1], ["Deixar uma IA preencher", "ia"]]);

/* ---------------------------------------------------------------- aba: resumo */
function vGeral(d) {
  const b = d.blocos, r = d.resultado, ev = d.evolucao, ant = ev.length > 1 ? ev[ev.length - 2] : null;
  const g = d.gastos[d.gastos.length - 1], res = d.reserva;
  const tCusto = lista(r.por_tipo.filter((t) => t.n_custo).map((t) => t.tipo)), tObs = lista(r.por_tipo.filter((t) => t.n_observado).map((t) => t.tipo));
  const kGastos = !g ? "" : kpi(`Gastos de ${mes(g.mes)}`, brl(g.gastos),
    parcial(d, g.mes) ? "Mês em andamento" : g.taxa == null ? "Sem renda lançada no mês" : g.taxa < 0 ? "Você gastou mais do que ganhou" : `Você guardou ${pct(g.taxa, 0)} da renda`);
  if (!d.tem.posicoes) {
    return { html: `${topo(d)}${card("Resumo", "", semInvestimentos())}${kGastos ? `<section class="kpis">${kGastos}</section>` : ""}` };
  }
  const delta = ant ? `<b>${comSinal(b.total - ant.total)}</b> desde ${dt(ant.data)}${dica("Soma o que rendeu e o dinheiro novo que você colocou.")}` : "Primeira atualização da carteira.";
  // Faixa de composicao: mesmas partes e mesmas cores do grafico de evolucao.
  const partes = PARTES.map(([nome, k], i) => ({ nome, v: b[k], cor: SERIES[i] })).filter((p) => p.v > 0.005);
  const hero = `<section class="hero">
      <div><div class="hero-head"><span class="hero-label">Patrimônio total</span><span class="hero-date">Atualizado em ${dt(d.snapshot)} <button class="btn mini noprint" data-acao="atualizar">Atualizar valores</button></span></div>
        <div class="hero-num">${brl(b.total)}</div><p class="hero-sub">${delta}</p></div>
      <div><div class="strip" role="img" aria-label="Divisão do patrimônio">${partes.map((p) => `<i style="flex:${p.v};background-color:${p.cor}" title="${p.nome}: ${pct(p.v / b.total, 1)}"></i>`).join("")}</div>
        <ul class="legend">${partes.map((p) => `<li><span class="dot" style="background-color:${p.cor};margin:0"></span><span class="nome">${p.nome}</span><span class="v">${brl(p.v)}</span><span class="p">${pct(p.v / b.total, 1)}</span></li>`).join("")}</ul></div>
    </section>`;
  const reserva = !res.meta ? `<button class="link noprint" data-acao="metas">Definir uma meta</button>`
    : `<div class="prog"><i style="width:${Math.min(100, res.atual / res.meta * 100)}%"></i></div>`
      + (res.atual >= res.meta ? "Meta atingida" : `${pct(res.atual / res.meta, 0)} da meta${S.priv ? "" : ` de ${brl(res.meta)}`}`)
      + (res.meses ? `. Cobre ${res.meses.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} meses de gastos` : "");
  const kp = [
    kpi("Investimentos", brl(b.base), b.caixa > 0.005 ? (S.priv ? "Parte ainda está em conta, sem investir" : `${brl(b.caixa)} ainda em conta, sem investir`) : "Sem contar a reserva de emergência", "", DICAS.investimentos),
    tCusto ? kpi("Lucro até agora", comSinal(r.sobre_custo), `${pctSinal(r.custo_total ? r.sobre_custo / r.custo_total : null)} sobre o que você investiu`, sinal(r.sobre_custo), `${DICAS.lucro} Entram na conta: ${tCusto}.`)
      : kpi("Lucro até agora", "n/d", "Informe quanto você investiu para ver o lucro", "", DICAS.lucro),
    !tObs ? "" : kpi(`Rendeu desde ${dt(r.observado_desde)}`, comSinal(r.observado), esc(tObs), sinal(r.observado), DICAS.rendeu),
    kpi("Rendimentos recebidos", brl(d.passiva.total_12m), d.passiva.total_12m ? `Dividendos e juros ${d.passiva.n_meses === 1 ? "no último mês" : `nos últimos ${d.passiva.n_meses} meses`}` : "Nenhum rendimento lançado", "", "Entradas lançadas na aba Gastos com a categoria Rendimentos."),
    kGastos,
    kpi("Reserva de emergência", brl(res.atual), reserva, "", res.meses ? `Meses de gastos: a reserva dividida pela média dos seus gastos nos últimos ${plural(res.n_meses_media, "mês fechado", "meses fechados")}.` : ""),
  ].join("");
  const so = (cond, x) => (cond ? [x] : []);
  const faltam = r.por_tipo.some((t) => t.n_sem_dado && t.tipo !== "Conta");
  const tipos = tabela([{ t: "Tipo" }, { t: "Valor", n: 1 }, { t: "Lucro", n: 1, d: DICAS.lucro }, ...so(tObs, { t: "Rendeu", n: 1, d: DICAS.rendeu }), ...so(faltam, { t: "" })],
    r.por_tipo.map((t) => [esc(t.tipo), brl(t.valor), t.n_custo ? pintado(t.sobre_custo, comSinal(t.sobre_custo)) : "",
      ...so(tObs, t.n_observado ? pintado(t.observado, comSinal(t.observado)) : ""),
      ...so(faltam, t.n_sem_dado && t.tipo !== "Conta" ? `<span class="small muted">${t.n_sem_dado} sem valor investido</span>` : "")]),
    ["Total", brl(b.total), tCusto ? comSinal(r.sobre_custo) : "", ...so(tObs, comSinal(r.observado)), ...so(faltam, "")]);
  const ordem = d.ordem ? tabela([{ t: "Classe" }, { t: "Onde investir" }, { t: "Valor", n: 1 }], d.ordem.itens.map((i) => [esc(i.classe), esc(i.instrumento), brl(i.valor)]), ["Total", "", brl(d.ordem.total)])
    : vazio("Nenhum aporte planejado", "Planeje quanto investir no mês e em quê.", [["Planejar aporte", "aportes"]]);
  const eventos = d.eventos.length ? tabela([{ t: "Data" }, { t: "O quê" }, { t: "Valor", n: 1 }, { t: "O que fazer" }],
    d.eventos.slice(0, 6).map((e) => [`<span class="num">${dt(e.data)}</span>`, `${esc(e.ativo)} <span class="tag">${esc(e.evento)}</span>`, e.valor ? brl(e.valor) : "", `<span class="small muted">${esc(e.acao)}</span>`]))
    : vazio("Nenhuma data marcada", "Anote vencimentos e lembretes para não perder o prazo.", [["Adicionar data", "vencimentos"]]);
  const ind = !d.indicadores.length ? "" : card("Indicadores do mercado", "Último valor lançado de cada um.", tabela([{ t: "Indicador" }, { t: "Valor", n: 1 }, { t: "Data", n: 1 }],
    d.indicadores.map((i) => [`<span title="Fonte: ${esc(i.fonte)}">${esc(NOMES_IND[i.indicador] || i.indicador)}</span>`, `${i.valor == null ? "n/d" : i.valor.toLocaleString("pt-BR")} ${esc(i.unidade)}`, dt(i.data)])));
  return {
    html: `${topo(d)}${hero}<section class="kpis">${kp}</section>
      <section class="grid cols">
        ${card("Evolução do patrimônio", "", '<div id="c-evo" class="chart"></div>')}
        ${card("Onde está o dinheiro", "", '<div id="c-tipo" class="chart"></div>')}
        ${card("Lucro por tipo de investimento", "", tipos)}
        ${card(d.ordem ? `Plano de aporte de ${mes(d.ordem.mes)}` : "Plano de aporte", "", ordem)}
        ${card("Próximas datas", "", eventos)}
        ${ind}
      </section>`,
    depois() { gEvolucao("c-evo", d); gTipos("c-tipo", d); },
  };
}
const NOMES_IND = { cdi: "CDI", selic_meta: "Selic meta", selic_over: "Selic over", ipca_12m: "IPCA em 12 meses", ibovespa: "Ibovespa", ptax_dolar_venda: "Dólar (PTAX venda)" };
const PARTES = [["Investido", "investido"], ["Em conta, a investir", "caixa"], ["Reserva de emergência", "reserva"], ["Fora da carteira", "fora"]];
function gEvolucao(id, d) {
  chart(id, {
    legend: {}, xAxis: { type: "category", data: d.evolucao.map((e) => dt(e.data).slice(0, 5)) }, yAxis: eixoBRL,
    series: PARTES.filter(([, k]) => d.evolucao.some((e) => e[k] > 0.005)).map(([nome, k]) => barra({ name: nome, stack: "t", data: d.evolucao.map((e) => +e[k].toFixed(2)), itemStyle: { color: SERIES[PARTES.findIndex((p) => p[1] === k)], borderColor: SURFACE, borderWidth: 1 } })),
  });
}
function gTipos(id, d) {
  const t = [...d.resultado.por_tipo].reverse();
  chart(id, {
    grid: { right: 70 }, xAxis: eixoBRL, yAxis: { type: "category", data: t.map((x) => x.tipo), axisLabel: { color: INK2 } },
    series: [barra({ data: t.map((x) => +x.valor.toFixed(2)), itemStyle: { color: SERIES[0], borderRadius: [0, 4, 4, 0] },
      label: { show: true, position: "right", color: INK2, formatter: (p) => pct(d.blocos.total ? p.value / d.blocos.total : 0, 1) } })],
  });
}

/* ---------------------------------------------------------------- aba: investimentos */
function vResultado(d) {
  if (!d.tem.posicoes) return { html: topo(d) + card("Investimentos", "", semInvestimentos()) };
  const r = d.resultado, todas = d.posicoes.filter((p) => p.valor), ps = filtradas().filter((p) => p.valor);
  const filtrando = !!(S.classe || S.tipo), rotulo = [S.tipo, S.classe].filter(Boolean).join(", ");
  const tipos = porTipo(ps), soma = (k) => tipos.reduce((t, x) => t + x[k], 0);
  const custo = soma("custo"), sobre = soma("sobre_custo"), obs = soma("observado"), temCusto = soma("n_custo") > 0, temObs = soma("n_observado") > 0;
  const com = ps.filter((p) => p.resultado != null).sort((a, b) => a.resultado - b.resultado);
  const lucro = (p) => p.resultado == null ? '<span class="muted small">falta o valor investido</span>'
    : pintado(p.resultado, comSinal(p.resultado)) + (p.metodo === "observado" ? `<br><span class="muted small">desde ${dt(p.desde)}</span>` : "");
  const linhas = [...ps].sort((a, b) => b.valor - a.valor).map((p) => [
    `${esc(p.ativo)}${p.alerta ? ` <span class="tag warn" title="${esc(p.obs)}">estimado</span>` : ""}<br><span class="muted small">${esc([p.indexador, p.vencimento ? `vence em ${dt(p.vencimento)}` : ""].filter(Boolean).join(", "))}</span>`,
    esc(p.tipo), esc(p.classe), qtd(p.quantidade), p.preco_medio == null ? "" : brl(p.preco_medio), p.preco_mercado == null ? "" : brl(p.preco_mercado),
    brl(p.valor), lucro(p), p.resultado_pct == null ? "" : pintado(p.resultado_pct, pctSinal(p.resultado_pct))]);
  const unicos = (k) => [...new Set(d.posicoes.map((p) => p[k]))].sort();
  const sel = (id, vals, atual, rot) => `<select id="${id}" aria-label="${rot}"><option value="">${rot}</option>${vals.map((v) => `<option ${v === atual ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`;
  const filtros = `<div class="filters noprint">${sel("f-classe", unicos("classe"), S.classe, "Todas as classes")}${sel("f-tipo", unicos("tipo"), S.tipo, "Todos os tipos")}
    ${filtrando ? `<button class="btn" id="f-limpar">Limpar filtro</button><span class="muted small">${ps.length} de ${todas.length}</span>` : ""}
    <span class="empurra"></span>${botao("Atualizar valores", "atualizar")}${botao("Novo investimento", "posicao", 1)}</div>`;
  const real = r.realizado, temVendas = real.itens.length || real.sem_custo.length;
  const realTab = tabela([{ t: "Data" }, { t: "Investimento" }, { t: "Quantidade", n: 1 }, { t: "Vendeu por", n: 1 }, { t: "Tinha pago", n: 1 }, { t: "Lucro", n: 1 }],
    real.itens.map((i) => [dt(i.data), esc(i.ticker) + (i.base === "posicao" ? ` <span class="tag" title="A compra não foi lançada. O painel usou o preço médio de ${brl(i.pm)} que estava na carteira em ${dt(i.base_data)}.">pelo preço médio</span>` : ""), qtd(i.quantidade), brl(i.venda), brl(i.custo), pintado(i.resultado, comSinal(i.resultado))]),
    ["Total", "", "", "", "", comSinal(real.total)]);
  const semCusto = real.sem_custo.length ? `<p class="small muted">Ficou de fora, por faltar a compra: ${real.sem_custo.map((s) => `${esc(s.ativo)} em ${dt(s.data)}`).join("; ")}. <button class="link noprint" data-acao="transacoes">Registrar a compra</button></p>` : "";
  return {
    html: `${topo(d)}${filtros}<section class="kpis">
        ${kpi(filtrando ? `Valor: ${esc(rotulo)}` : "Valor atual", brl(soma("valor")), `${plural(ps.length, "investimento", "investimentos")} em ${dt(d.snapshot)}`)}
        ${kpi("Lucro até agora", temCusto ? comSinal(sobre) : "n/d", temCusto ? `${pctSinal(custo ? sobre / custo : null)} sobre ${S.priv ? "o que você investiu" : brl(custo) + " investidos"}` : "Falta informar quanto você investiu", temCusto ? sinal(sobre) : "", DICAS.lucro)}
        ${!temObs ? "" : kpi(`Rendeu desde ${dt(r.observado_desde)}`, comSinal(obs), esc(lista(tipos.filter((t) => t.n_observado).map((t) => t.tipo))), sinal(obs), DICAS.rendeu)}
        ${filtrando || !temVendas ? "" : kpi("Lucro de vendas", real.itens.length ? comSinal(real.total) : "n/d", real.itens.length ? plural(real.itens.length, "venda", "vendas") : "Falta registrar a compra", real.itens.length ? sinal(real.total) : "", DICAS.vendas)}
        ${filtrando || !real.ir_pago ? "" : kpi("Imposto retido", brl(real.ir_pago), "Somando compras e vendas lançadas")}
      </section>
      <section class="grid cols">
        ${card("Lucro por investimento", "", com.length ? `<div id="c-res" class="chart" style="height:${Math.max(180, com.length * 38 + 50)}px"></div>` : vazio("Sem lucro para mostrar", "Falta informar quanto você investiu em cada um.", [["Informar valores", "atualizar"]]))}
        ${card("Lucro por tipo", "",
          tabela([{ t: "Tipo" }, { t: "Valor", n: 1 }, { t: "Investido", n: 1 }, { t: "Lucro", n: 1, d: DICAS.lucro }, { t: "%", n: 1 }, ...(temObs ? [{ t: "Rendeu", n: 1, d: DICAS.rendeu }] : [])],
            tipos.map((t) => [esc(t.tipo), brl(t.valor), t.n_custo ? brl(t.custo) : "", t.n_custo ? pintado(t.sobre_custo, comSinal(t.sobre_custo)) : "",
              t.n_custo && t.custo ? pctSinal(t.sobre_custo / t.custo) : "", ...(temObs ? [t.n_observado ? pintado(t.observado, comSinal(t.observado)) : ""] : [])])))}
        ${card(filtrando ? `Investimentos: ${esc(rotulo)}` : "Meus investimentos", d.alertas_posicao ? 'Etiqueta "estimado": valor ainda não conferido com o extrato.' : "",
          tabela([{ t: "Investimento" }, { t: "Tipo" }, { t: "Classe" }, { t: "Quantidade", n: 1 }, { t: "Preço médio", n: 1 }, { t: "Preço atual", n: 1 }, { t: "Valor", n: 1 }, { t: "Lucro", n: 1 }, { t: "%", n: 1 }], linhas,
            ["Total", "", "", "", "", "", brl(soma("valor")), temCusto ? comSinal(sobre) : "", ""]), "wide")}
        ${!temVendas ? "" : card("Vendas", filtrando ? "Mostra todas as vendas, sem o filtro." : "", realTab + semCusto, "wide", botao("Registrar compra ou venda", "transacoes", 0, 1))}
      </section>`,
    depois() {
      $("f-classe").onchange = (e) => { S.classe = e.target.value; desenhar(); };
      $("f-tipo").onchange = (e) => { S.tipo = e.target.value; desenhar(); };
      if ($("f-limpar")) $("f-limpar").onclick = () => { S.classe = ""; S.tipo = ""; desenhar(); };
      if (com.length) chart("c-res", {
        grid: { right: 24 }, xAxis: eixoBRL, yAxis: { type: "category", data: com.map((p) => p.ticker || p.ativo.slice(0, 26)), axisLabel: { color: INK2 } },
        tooltip: { formatter: (a) => { const p = com[a[0].dataIndex]; return `${esc(p.ativo)}<br><b>${comSinal(p.resultado)}</b> (${pctSinal(p.resultado_pct)})${p.metodo === "observado" ? `<br>desde ${dt(p.desde)}` : ""}`; } },
        series: [barra({ data: com.map((p) => ({ value: +p.resultado.toFixed(2), itemStyle: { color: p.resultado >= 0 ? POS : NEG, borderRadius: p.resultado >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] } })) })],
      });
    },
  };
}

/* ---------------------------------------------------------------- aba: alocacao */
function sugestao(d, x) {
  const linhas = d.alocacao.linhas.filter((l) => l.classe !== d.config.cash_class && l.alvo != null);
  const final = linhas.reduce((s, l) => s + l.valor, 0) + x;
  const gaps = linhas.map((l) => ({ classe: l.classe, instrumento: l.instrumento, gap: Math.max(0, l.alvo * final - l.valor) }));
  const soma = gaps.reduce((s, g) => s + g.gap, 0), k = soma > x && soma > 0 ? x / soma : 1;
  return gaps.filter((g) => g.gap > 0.005).map((g) => ({ ...g, valor: g.gap * k }));
}
function vAlocacao(d) {
  if (!d.tem.posicoes) return { html: topo(d) + card("Alocação", "", semInvestimentos()) };
  const a = d.alocacao, temMetas = d.tem.metas, escala = Math.max(0.5, ...a.linhas.map((l) => Math.max(l.pct, l.max || 0))) * 1.08;
  const w = (v) => `${Math.min(100, v / escala * 100)}%`;
  const ehCaixa = (l) => l.classe === d.config.cash_class;
  const tag = { ok: '<span class="tag ok">dentro da faixa</span>', abaixo: '<span class="tag warn">abaixo da meta</span>', acima: '<span class="tag crit">acima da meta</span>' };
  const barras = a.linhas.map((l) => `<div class="aloc">
      <div><span class="dot" style="background-color:${cor(l.classe, "classe")}"></span>${esc(ehCaixa(l) ? "Em conta, a investir" : l.classe)}</div>
      <div class="track" title="Hoje ${pct(l.pct)}${l.alvo != null && !ehCaixa(l) ? `, meta ${pct(l.alvo)}, faixa de ${pct(l.min)} a ${pct(l.max)}` : ""}">
        ${l.alvo != null && l.max > 0 ? `<div class="band" style="left:${w(l.min)};width:calc(${w(l.max)} - ${w(l.min)})"></div>` : ""}
        <div class="bar" style="width:${w(l.pct)};background-color:${cor(l.classe, "classe")}"></div>
        ${l.alvo != null && !ehCaixa(l) ? `<div class="alvo" style="left:${w(l.alvo)}"></div>` : ""}
      </div>
      <div class="num small">${pct(l.pct, 1)} ${ehCaixa(l) || l.alvo == null ? "" : `<span class="muted">meta ${pct(l.alvo, 0)}</span>`}<br>${ehCaixa(l) ? "" : tag[l.situacao] || ""}</div></div>`).join("");
  const legenda = temMetas ? '<p class="leg-aloc small muted"><span><i class="l-bar"></i>quanto você tem</span><span><i class="l-alvo"></i>meta</span><span><i class="l-band"></i>faixa aceitável</span></p>' : "";
  const distancia = (l) => l.falta == null ? "" : ehCaixa(l) ? "" : Math.abs(l.falta) < 0.005 ? "na meta" : l.falta > 0 ? `faltam ${brl(l.falta)}` : `<span class="muted">${brl(-l.falta)} a mais</span>`;
  const temComo = a.linhas.some((l) => l.instrumento);
  const tab = tabela([{ t: "Classe" }, { t: "Valor", n: 1 }, { t: "Hoje", n: 1 }, { t: "Meta", n: 1 }, { t: "Faixa aceitável", n: 1 }, { t: "Diferença", n: 1, d: "Hoje menos a meta, em pontos percentuais." }, { t: "Para chegar na meta", n: 1 }, ...(temComo ? [{ t: "Como investir" }] : [])],
    a.linhas.map((l) => [esc(ehCaixa(l) ? "Em conta, a investir" : l.classe), brl(l.valor), pct(l.pct), ehCaixa(l) ? "" : pct(l.alvo), l.alvo == null || ehCaixa(l) ? "" : `${pct(l.min, 0)} a ${pct(l.max, 0)}`,
      l.alvo == null || !l.situacao ? "" : `<span class="${l.situacao === "ok" ? "" : "neg"}">${((l.pct - l.alvo) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 1, signDisplay: "always" })} p.p.</span>`,
      distancia(l), ...(temComo ? [`<span class="small muted">${esc(l.instrumento)}</span>`] : [])]),
    ["Total", brl(d.blocos.base), pct(a.soma_pct), temMetas ? pct(a.soma_alvo) : "", "", "", "", ...(temComo ? [""] : [])]);
  if (S.aporte == null) S.aporte = +(Math.max(0, d.blocos.caixa - d.reserva.para_reserva) || d.aporte_mensal || 0).toFixed(2);
  const sug = sugestao(d, S.aporte), tot = sug.reduce((s, g) => s + g.valor, 0);
  const sugTab = tabela([{ t: "Classe" }, ...(temComo ? [{ t: "Como investir" }] : []), { t: "Valor", n: 1 }, { t: "Parte", n: 1 }],
    sug.map((g) => [esc(g.classe), ...(temComo ? [`<span class="small">${esc(g.instrumento)}</span>`] : []), brl(g.valor), pct(S.aporte ? g.valor / S.aporte : 0, 0)]),
    ["Total", ...(temComo ? [""] : []), brl(tot), S.aporte - tot > 0.005 ? `sobram ${brl(S.aporte - tot)}` : ""], "Nenhuma classe abaixo da meta.");
  const semMetas = temMetas ? "" : `<div class="card wide">${vazio("Como você quer dividir seus investimentos?", "Defina uma meta para cada classe, como 70% em renda fixa e 30% em ações. O painel mostra o que está acima e o que está abaixo.", [["Definir metas", "metas", 1]])}</div>`;
  return {
    html: `${topo(d)}<section class="grid cols">${semMetas}
      ${card(temMetas ? "Sua carteira e a meta" : "Sua carteira hoje", `Divisão ${S.priv ? "dos investimentos" : `de ${brl(d.blocos.base)} em investimentos`}, sem a reserva de emergência.`, barras + legenda, "wide", temMetas ? botao("Editar metas", "metas", 0, 1) : "")}
      ${!temMetas ? "" : card("Detalhe por classe", d.reserva.para_reserva && !S.priv ? `Já descontados ${brl(d.reserva.para_reserva)} em conta que vão completar a reserva.` : "", tab, "wide")}
      ${!temMetas ? "" : card("Onde colocar o próximo aporte", "Divide o valor entre as classes que estão abaixo da meta. É uma conta, não uma recomendação.",
        `<div class="form noprint" style="margin-bottom:12px"><div><label for="i-aporte">Quanto você vai investir (R$)</label><input id="i-aporte" type="number" step="0.01" min="0" value="${S.aporte}"></div></div>${sugTab}`)}
      ${!d.escada.length ? "" : card("Vencimentos", "Quando cada título de renda fixa vence.", tabela([{ t: "Vence em" }, { t: "Investimento" }, { t: "Taxa" }, { t: "Valor", n: 1 }],
        d.escada.map((e) => [dt(e.data), esc(e.ativo), esc(e.indexador), brl(e.valor)])))}
    </section>`,
    depois() { if ($("i-aporte")) $("i-aporte").onchange = (e) => { S.aporte = Math.max(0, +e.target.value || 0); desenhar(); }; },
  };
}

/* ---------------------------------------------------------------- aba: gastos */
function vGastos(d) {
  if (!d.gastos.length) return { html: topo(d) + card("Gastos", "", vazio("Nenhum gasto ou entrada ainda", "Registre o que entra e o que sai para ver quanto sobra no mês.", [["Registrar gasto ou entrada", "despesas", 1], ["Deixar uma IA preencher", "ia"]])) };
  if (!S.mes || !d.gastos.some((g) => g.mes === S.mes)) S.mes = d.gastos[d.gastos.length - 1].mes;
  const g = d.gastos.find((x) => x.mes === S.mes);
  const itens = tabela([{ t: "Data" }, { t: "Descrição" }, { t: "Categoria" }, { t: "Tipo" }, { t: "Valor", n: 1 }],
    g.itens.map((i) => [dt(i.data), `${esc(i.descricao)}${i.obs ? `<br><span class="muted small">${esc(i.obs)}</span>` : ""}`, esc(i.categoria),
      `<span class="tag ${i.tipo === "Entrada" ? "ok" : ""}">${esc(i.tipo)}</span>`, brl(i.valor)]));
  return {
    html: `${topo(d)}<div class="filters noprint"><label for="s-mes" class="muted">Mês</label>
        <select id="s-mes">${d.gastos.map((x) => `<option value="${x.mes}" ${x.mes === S.mes ? "selected" : ""}>${mes(x.mes)}</option>`).join("")}</select>
        <span class="empurra"></span>${botao("Novo gasto ou entrada", "despesas", 1)}</div>
      <section class="kpis">
        ${kpi(`Renda de ${mes(g.mes)}`, brl(g.renda), g.outras_entradas && !S.priv ? `Mais ${brl(g.outras_entradas)} de outras entradas` : "", "", `Entradas com a categoria ${lista(d.config.income_categories)}. Outras entradas, como reembolso, não contam como renda.`)}
        ${kpi("Gastos", brl(g.gastos), S.priv ? "Fixos e variáveis" : `${brl(g.fixo)} fixos e ${brl(g.variavel)} variáveis`)}
        ${kpi("Sobrou", comSinal(g.sobra), "Renda menos gastos", sinal(g.sobra))}
        ${kpi("Quanto guardei", pct(g.taxa, 0), g.taxa == null ? "Sem renda lançada no mês" : "da renda do mês", sinal(g.taxa), DICAS.guardei)}
      </section>
      ${parcial(d, g.mes) ? `<p class="note">${mes(g.mes)} ainda não fechou. Os números vão até ${dt(g.itens[g.itens.length - 1].data)}.</p>` : ""}
      <section class="grid cols">
        ${card("Renda e gastos por mês", "", '<div id="c-meses" class="chart"></div>')}
        ${card(`Para onde foi o dinheiro em ${mes(g.mes)}`, "", g.cats.length ? `<div id="c-cats" class="chart" style="height:${Math.max(200, g.cats.length * 34 + 40)}px"></div>` : '<p class="muted">Nenhum gasto neste mês.</p>')}
        ${card(`Lançamentos de ${mes(g.mes)}`, "", itens, "wide")}
      </section>`,
    depois() {
      $("s-mes").onchange = (e) => { S.mes = e.target.value; desenhar(); };
      chart("c-meses", {
        legend: {}, xAxis: { type: "category", data: d.gastos.map((x) => mes(x.mes)) }, yAxis: eixoBRL,
        series: [barra({ name: "Renda", data: d.gastos.map((x) => +x.renda.toFixed(2)), itemStyle: { color: SERIES[0], borderRadius: [4, 4, 0, 0] } }),
          barra({ name: "Gasto fixo", stack: "g", data: d.gastos.map((x) => +x.fixo.toFixed(2)), itemStyle: { color: SERIES[2], borderColor: SURFACE, borderWidth: 1 } }),
          barra({ name: "Gasto variável", stack: "g", data: d.gastos.map((x) => +x.variavel.toFixed(2)), itemStyle: { color: SERIES[1], borderRadius: [4, 4, 0, 0], borderColor: SURFACE, borderWidth: 1 } })],
      });
      const c = [...g.cats].reverse();
      if (c.length) chart("c-cats", {
        grid: { right: 70 }, xAxis: eixoBRL, yAxis: { type: "category", data: c.map((x) => x[0]), axisLabel: { color: INK2 } },
        series: [barra({ data: c.map((x) => +x[1].toFixed(2)), itemStyle: { color: SERIES[0], borderRadius: [0, 4, 4, 0] },
          label: { show: true, position: "right", color: INK2, formatter: (p) => pct(g.gastos ? p.value / g.gastos : 0, 0) } })],
      });
    },
  };
}

/* ---------------------------------------------------------------- aba: evolucao e simulador */
function simular(s) {
  const n = s.anos * 12, pontos = [];
  for (let m = 0; m <= n; m += 12) pontos.push(m);
  const cen = s.taxas.map((t) => { const i = Math.pow(1 + t, 1 / 12) - 1; let v = s.saldo; const out = [v]; for (let m = 1; m <= n; m++) { v = v * (1 + i) + s.aporte; if (m % 12 === 0) out.push(v); } return out; });
  return { anos: pontos.map((m) => m / 12), cen, aportado: pontos.map((m) => s.saldo + s.aporte * m) };
}
function vEvolucao(d) {
  const cfg = d.config.simulator || {};
  if (!S.sim) S.sim = { saldo: +d.blocos.base.toFixed(2), aporte: d.aporte_mensal || 0, anos: cfg.years || 20, taxas: (cfg.real_rates || [0.03, 0.05, 0.07]).slice(0, 3) };
  const s = S.sim, r = simular(s), nomes = ["Pessimista", "Provável", "Otimista"];
  const fim = tabela([{ t: "Cenário" }, { t: "Rendimento ao ano", n: 1 }, { t: `Em ${plural(s.anos, "ano", "anos")}`, n: 1 }, { t: "Você terá colocado", n: 1 }, { t: "Ganho", n: 1 }],
    r.cen.map((c, i) => [nomes[i], pct(s.taxas[i], 1), brl(c[c.length - 1]), brl(r.aportado[r.aportado.length - 1]), comSinal(c[c.length - 1] - r.aportado[r.aportado.length - 1])]));
  const campo = (id, rot, v, step) => `<div><label for="${id}">${rot}</label><input id="${id}" type="number" step="${step}" value="${v}"></div>`;
  const evoTab = tabela([{ t: "Data" }, { t: "Patrimônio", n: 1 }, { t: "Investimentos", n: 1 }, { t: "Em conta", n: 1 }, { t: "Reserva", n: 1 }, { t: "Lucro até ali", n: 1 }],
    [...d.evolucao].reverse().map((e) => [dt(e.data), brl(e.total), brl(e.base), brl(e.caixa), brl(e.reserva), comSinal(e.sobre_custo)]));
  const tem = d.tem.posicoes, temAportes = d.aportes.length, temPassiva = d.passiva.meses.some((m) => m.valor);
  return {
    html: `${topo(d)}<section class="grid cols">
      ${!tem ? "" : card("Evolução do patrimônio", "Cada barra é uma atualização da carteira.", '<div id="c-evo2" class="chart tall"></div>')}
      ${!temAportes ? "" : card("Aportes por mês", "O que você planejou e o que fez.", '<div id="c-ap" class="chart tall"></div>')}
      ${!temPassiva ? "" : card("Rendimentos recebidos", "Dividendos e juros lançados, por mês.", '<div id="c-pass" class="chart"></div>')}
      ${!tem ? "" : card("Histórico", "", evoTab)}
      ${card("Simulador", "E se você continuar investindo? Valores em reais de hoje, já descontada a inflação. É uma simulação, não uma previsão.",
        `<div class="form noprint" style="margin-bottom:14px">${campo("sim-saldo", "Quanto você tem hoje (R$)", s.saldo, "0.01")}${campo("sim-aporte", "Aporte por mês (R$)", s.aporte, "0.01")}${campo("sim-anos", "Por quantos anos", s.anos, "1")}
          ${s.taxas.map((t, i) => campo("sim-t" + i, `${nomes[i]} (% ao ano)`, +(t * 100).toFixed(2), "0.1")).join("")}</div>
         <div id="c-sim" class="chart tall"></div>${fim}`, "wide")}
    </section>`,
    depois() {
      if (tem) gEvolucao("c-evo2", d);
      if (temAportes) chart("c-ap", {
        legend: {}, xAxis: { type: "category", data: d.aportes.map((a) => mes(a.mes)) }, yAxis: eixoBRL,
        series: [barra({ name: "Feito", data: d.aportes.map((a) => +a.executado.toFixed(2)), itemStyle: { color: SERIES[0], borderRadius: [4, 4, 0, 0] } }),
          barra({ name: "Planejado", data: d.aportes.map((a) => +a.planejado.toFixed(2)), itemStyle: { color: SERIES[1], borderRadius: [4, 4, 0, 0] } })],
      });
      if (temPassiva) chart("c-pass", {
        xAxis: { type: "category", data: d.passiva.meses.map((m) => mes(m.mes)) }, yAxis: eixoBRL,
        series: [barra({ name: "Rendimentos", data: d.passiva.meses.map((m) => +m.valor.toFixed(2)), itemStyle: { color: SERIES[0], borderRadius: [4, 4, 0, 0] } })],
      });
      chart("c-sim", {
        legend: {}, tooltip: { axisPointer: { type: "line" } }, xAxis: { type: "category", data: r.anos.map((a) => `${a} a`), boundaryGap: false }, yAxis: eixoBRL,
        series: [...r.cen.map((c, i) => ({ name: `${nomes[i]} (${pct(s.taxas[i], 1)})`, type: "line", symbol: "none", lineStyle: { width: 2 }, data: c.map((v) => +v.toFixed(2)), endLabel: { show: true, color: INK2, formatter: (p) => brlAbbr(p.value) } })),
          { name: "Você terá colocado", type: "line", symbol: "none", lineStyle: { width: 2, type: "dashed", color: MUTED }, itemStyle: { color: MUTED }, data: r.aportado.map((v) => +v.toFixed(2)) }],
        grid: { right: 64 },
      });
      const ler = () => {
        S.sim = { saldo: +$("sim-saldo").value || 0, aporte: +$("sim-aporte").value || 0, anos: Math.min(60, Math.max(1, Math.round(+$("sim-anos").value || 1))),
          taxas: s.taxas.map((_, i) => (+$("sim-t" + i).value || 0) / 100) };
        desenhar();
      };
      ["sim-saldo", "sim-aporte", "sim-anos", ...s.taxas.map((_, i) => "sim-t" + i)].forEach((id) => ($(id).onchange = ler));
    },
  };
}

/* ---------------------------------------------------------------- aba: lancamentos */
const colDe = (tabela) => Object.fromEntries(S.schema[tabela].columns.map((c) => [c.name, c]));
const semParenteses = (t) => String(t).replace(/\s*\(.*\)$/, "");
/* Mostra o valor de uma celula do arquivo do jeito que a pessoa le: data, reais, porcentagem. */
function celula(c, v) {
  if (v === "" || v == null) return "";
  const n = Number(v);
  if (c.type === "date") return dt(v);
  if (c.type === "month") return mes(v);
  if (c.type === "money") return isNaN(n) ? esc(v) : brl(n);
  if (c.type === "fraction") return isNaN(n) ? esc(v) : pct(n, 0);
  if (c.type === "number") return isNaN(n) ? esc(v) : c.name === "quantidade" ? qtd(n) : n.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
  if (c.type === "select") return esc(semParenteses(c.options[v] || v));
  const t = String(v);
  return t.length > 70 ? `<span title="${esc(t)}">${esc(t.slice(0, 70))}…</span>` : esc(t);
}
function vGestao(d) {
  const sub = `<div class="subtabs noprint">${[["lancamentos", "Lançamentos"], ["notas", "Notas"]].map(([k, t]) => `<button class="btn ${S.gestao === k ? "on" : ""}" data-sub="${k}">${t}</button>`).join("")}</div>`;
  const liga = () => document.querySelectorAll("[data-sub]").forEach((b) => (b.onclick = () => { S.gestao = b.dataset.sub; desenhar(); }));
  if (S.gestao === "notas") return vNotas(d, sub, liga);
  if (!S.schema[S.tabela]) S.tabela = "despesas";
  const sc = S.schema[S.tabela], ro = d.config.append_only, cols = colDe(S.tabela);
  if (!S.linhas) { api("/api/table/" + S.tabela).then((t) => { S.linhas = t; desenhar(); }).catch((e) => toast(e.message, true)); }
  const t = S.linhas || { columns: [], rows: [] };
  const busca = S.busca.toLowerCase();
  // mais recente primeiro: pela data do lancamento e, no empate, pela ordem em que foi gravado
  const colData = (sc.columns.find((c) => c.type === "date" || c.type === "month") || {}).name;
  const rows = [...t.rows].reverse().sort((a, b) => (colData ? String(b[colData]).localeCompare(String(a[colData])) : 0))
    .filter((r) => !busca || t.columns.some((c) => String(r[c]).toLowerCase().includes(busca)));
  // so aparecem as colunas que tem algum valor, para a tabela nao ficar cheia de vazios
  const visiveis = t.columns.filter((c) => sc.required.includes(c) || t.rows.some((r) => r[c]));
  const col = (c) => cols[c] || { name: c, type: "text", label: c, options: {} };
  const numerica = (c) => ["number", "money", "fraction"].includes(col(c).type);
  const corpo = tabela([...visiveis.map((c) => ({ t: esc(col(c).label), n: numerica(c), d: `Coluna ${c} do arquivo` })), { t: "" }],
    rows.slice(0, 300).map((r) => [...visiveis.map((c) => celula(col(c), r[c])),
      ro ? "" : `<span class="row noprint" style="flex-wrap:nowrap"><button class="btn mini" data-ed="${r._id}">Editar</button><button class="btn mini danger" data-del="${r._id}">Excluir</button></span>`]),
    null, busca ? "Nada encontrado com essa busca." : "Nada lançado ainda.");
  return {
    html: `${sub}${card(esc(sc.label), `${esc(sc.about)}${ro ? " Esta pasta só aceita inclusão: não dá para editar nem apagar." : ""}`,
      `<div class="filters noprint">
         <select id="s-tab" aria-label="O que mostrar">${Object.entries(S.schema).map(([k, v]) => `<option value="${k}" ${k === S.tabela ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select>
         <input id="i-busca" placeholder="Buscar" aria-label="Buscar" value="${esc(S.busca)}">
         <span class="muted small">${plural(rows.length, "linha", "linhas")}${rows.length > 300 ? ", mostrando as 300 mais recentes" : ""}</span>
         <span class="empurra"></span><button class="btn primary" id="b-novo">Adicionar</button></div>${corpo}
       <p class="muted small arquivo">Arquivo: <code>${esc(sc.path)}</code></p>`, "wide")}`,
    depois() {
      liga();
      $("s-tab").onchange = (e) => { S.tabela = e.target.value; S.linhas = null; S.busca = ""; desenhar(); };
      $("i-busca").onchange = (e) => { S.busca = e.target.value; desenhar(); };
      $("b-novo").onclick = () => (S.tabela === "posicoes" ? abrirInvestimento() : abrirForm(S.tabela, null));
      document.querySelectorAll("[data-ed]").forEach((b) => (b.onclick = () => abrirForm(S.tabela, t.rows[+b.dataset.ed])));
      document.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
        const r = t.rows[+b.dataset.del];
        if (!confirm("Excluir esta linha? Uma cópia de segurança fica guardada.")) return;
        try { await api(`/api/table/${S.tabela}/${r._id}?hash=${r._hash}`, { method: "DELETE" }); toast("Linha excluída."); await carregar(true); } catch (e) { toast(e.message, true); }
      }));
    },
  };
}

/* Markdown enxuto: titulos, listas, tabelas, citacao, codigo, negrito, italico e links. Escapa HTML antes. */
function md(src) {
  const inl = (t) => esc(t).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\((https?:[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  const out = [], L = src.replace(/\r/g, "").split("\n");
  let i = 0;
  const cel = (l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => c.trim());
  while (i < L.length) {
    const l = L[i];
    if (/^```/.test(l)) { const b = []; i++; while (i < L.length && !/^```/.test(L[i])) b.push(L[i++]); i++; out.push(`<pre><code>${esc(b.join("\n"))}</code></pre>`); continue; }
    const h = l.match(/^(#{1,6})\s+(.*)/);
    if (h) { out.push(`<h${h[1].length}>${inl(h[2])}</h${h[1].length}>`); i++; continue; }
    if (/^\s*\|/.test(l) && i + 1 < L.length && /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(L[i + 1])) {
      const cab = cel(l), al = cel(L[i + 1]).map((c) => /:$/.test(c) ? ' class="n"' : ""); i += 2; const rows = [];
      while (i < L.length && /^\s*\|/.test(L[i])) rows.push(cel(L[i++]));
      out.push(`<div class="scroll"><table><thead><tr>${cab.map((c, k) => `<th${al[k] || ""}>${inl(c)}</th>`).join("")}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, k) => `<td${al[k] || ""}>${inl(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`);
      continue;
    }
    if (/^\s*([-*]|\d+\.)\s+/.test(l)) {
      const ord = /^\s*\d+\./.test(l), it = [];
      while (i < L.length && (/^\s*([-*]|\d+\.)\s+/.test(L[i]) || (/^\s{2,}\S/.test(L[i]) && it.length))) {
        if (/^\s*([-*]|\d+\.)\s+/.test(L[i])) it.push(L[i].replace(/^\s*([-*]|\d+\.)\s+/, "")); else it[it.length - 1] += " " + L[i].trim();
        i++;
      }
      out.push(`<${ord ? "ol" : "ul"}>${it.map((x) => `<li>${inl(x)}</li>`).join("")}</${ord ? "ol" : "ul"}>`); continue;
    }
    if (/^>\s?/.test(l)) { const b = []; while (i < L.length && /^>\s?/.test(L[i])) b.push(L[i++].replace(/^>\s?/, "")); out.push(`<blockquote>${inl(b.join(" "))}</blockquote>`); continue; }
    if (/^\s*(---+|\*\*\*+)\s*$/.test(l)) { out.push("<hr>"); i++; continue; }
    if (!l.trim()) { i++; continue; }
    const p = [];
    while (i < L.length && L[i].trim() && !/^(#{1,6}\s|```|>|\s*\||\s*([-*]|\d+\.)\s+)/.test(L[i])) p.push(L[i++]);
    out.push(`<p>${inl(p.join(" "))}</p>`);
  }
  return out.join("\n");
}

const PASTAS_NOTAS = { goals: "Metas", rules: "Regras", reports: "Relatórios", research: "Estudos" };
function vNotas(d, sub, liga) {
  if (!S.docs) { api("/api/docs").then((x) => { S.docs = x; desenhar(); }).catch((e) => toast(e.message, true)); }
  const grupos = {};
  (S.docs || []).forEach((x) => (grupos[x.path.split("/").slice(0, -1).join("/")] ||= []).push(x));
  const nomeGrupo = (g) => { const [p, ...resto] = g.split("/"); return [PASTAS_NOTAS[p] || p, ...resto].join(" / "); };
  const lista = Object.keys(grupos).sort().map((g) => `<h3 title="${esc(g)}/">${esc(nomeGrupo(g))}</h3>${grupos[g].map((x) => `<button data-doc="${esc(x.path)}" class="${S.doc && S.doc.path === x.path ? "on" : ""}">${esc(x.path.split("/").pop())}</button>`).join("")}`).join("");
  let painel = '<p class="muted">Escolha uma nota ao lado ou crie uma nova. Bom lugar para planos, relatórios e resumos da sua IA.</p>';
  if (S.doc && S.editando) {
    painel = `<div class="field"><label for="d-path">Onde salvar</label><input id="d-path" value="${esc(S.doc.path)}" ${S.doc.novo ? "" : "readonly"}><small class="hint">Pasta goals, rules, reports ou research. O nome termina em .md.</small></div>
      <textarea id="d-txt" class="editor" aria-label="Texto da nota">${esc(S.doc.content)}</textarea>
      <div class="row end" style="margin-top:10px"><button class="btn" id="d-cancelar">Cancelar</button><button class="btn primary" id="d-salvar">Salvar</button></div>`;
  } else if (S.doc) {
    painel = `<div class="row noprint" style="justify-content:space-between;margin-bottom:8px"><code>${esc(S.doc.path)}</code>
      ${S.doc.frozen ? '<span class="tag">somente leitura</span>' : '<button class="btn" id="d-editar">Editar</button>'}</div><div class="md">${md(S.doc.content)}</div>`;
  }
  return {
    html: `${sub}<section class="docs"><div class="card"><h2>Notas</h2><div class="card-acao noprint"><button class="btn primary mini" id="d-novo">Nova nota</button></div><div class="sem-sub"></div>
      <div class="doclist">${lista || '<p class="muted small">Nenhuma nota ainda.</p>'}</div></div><div class="card">${painel}</div></section>`,
    depois() {
      liga();
      document.querySelectorAll("[data-doc]").forEach((b) => (b.onclick = async () => {
        try { S.doc = await api("/api/doc?path=" + encodeURIComponent(b.dataset.doc)); S.editando = false; desenhar(); } catch (e) { toast(e.message, true); }
      }));
      $("d-novo").onclick = () => { S.doc = { path: `research/${hojeISO()}-nova-nota.md`, content: "# Título\n\n", novo: true }; S.editando = true; desenhar(); };
      if ($("d-editar")) $("d-editar").onclick = () => { S.editando = true; desenhar(); };
      if ($("d-cancelar")) $("d-cancelar").onclick = () => { S.editando = false; if (S.doc.novo) S.doc = null; desenhar(); };
      if ($("d-salvar")) $("d-salvar").onclick = async () => {
        try {
          const r = await api("/api/doc", { method: "PUT", body: { path: $("d-path").value.trim(), content: $("d-txt").value } });
          S.doc = await api("/api/doc?path=" + encodeURIComponent(r.path)); S.editando = false; S.docs = null;
          toast("Nota salva."); await carregar(true);
        } catch (e) { toast(e.message, true); }
      };
    },
  };
}

/* ---------------------------------------------------------------- primeiros passos (pasta vazia) */
function vInicio() {
  const passo = (n, titulo, texto, rotulo, acao, primario) => `<div class="passo"><span class="n">${n}</span><h3>${titulo}</h3><p>${texto}</p>${botao(rotulo, acao, primario)}</div>`;
  return `<section class="inicio">
      <h1>Vamos começar</h1>
      <p class="lead">O Cashboard mostra o que você registrar aqui ou o que a sua IA organizar. Seus dados ficam só neste computador.</p>
      <div class="passos">
        ${passo(1, "Seus investimentos", "Adicione o que você tem hoje, um de cada vez.", "Adicionar investimento", "posicao", 1)}
        ${passo(2, "Gastos e entradas", "Registre o salário e os gastos do mês.", "Registrar", "despesas")}
        ${passo(3, "Suas metas", "Reserva de emergência e divisão da carteira.", "Definir metas", "metas")}
      </div>
      <div class="card ia-card"><div>${ic("ia")}</div><div><h3>Prefere não digitar?</h3><p>Mande seus extratos para uma IA (ChatGPT, Claude, Gemini ou outra) e ela preenche o painel para você.</p>
        <div class="row">${botao("Conectar com IA", "ia")}${botao("Importar dados", "importar")}</div></div></div>
      <p class="muted small">Quer só ver como fica? <button class="link" data-acao="exemplo">Abrir os dados de exemplo</button></p>
    </section>`;
}

/* ---------------------------------------------------------------- desenho */
const VIEWS = { geral: vGeral, alocacao: vAlocacao, resultado: vResultado, gastos: vGastos, evolucao: vEvolucao, gestao: vGestao };
function desenhar() {
  const d = S.d;
  if (!d) return;
  aplicarAparencia();
  lerTema();
  $("b-priv").innerHTML = `${ic(S.priv ? "olhoFechado" : "olho")}<span class="lbl">${S.priv ? "Valores ocultos" : "Ocultar valores"}</span>`;
  $("b-priv").title = S.priv ? "Mostrar os valores em reais" : "Esconder os valores em reais (os percentuais continuam)";
  $("b-priv").setAttribute("aria-label", $("b-priv").title);
  $("b-priv").setAttribute("aria-pressed", S.priv);
  S.charts.forEach((c) => c.dispose()); S.charts = [];
  if (!VIEWS[S.tab]) S.tab = "geral";
  $("tabs").innerHTML = TABS.map(([k, t, i]) => `<button role="tab" id="tab-${k}" aria-selected="${S.tab === k}" tabindex="${S.tab === k ? 0 : -1}" data-tab="${k}">${ic(i)}<span>${t}</span></button>`).join("");
  document.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => irPara(b.dataset.tab)));
  const ativa = $("tab-" + S.tab);
  if (ativa) $("tabs").scrollLeft = Math.max(0, ativa.offsetLeft - ($("tabs").clientWidth - ativa.offsetWidth) / 2);
  conexao(true);
  $("foot").textContent = d.config.disclaimer || "";
  if (d.vazio && S.tab !== "gestao") { $("view").innerHTML = vInicio(); return; }
  d.alocacao.linhas.forEach((l) => cor(l.classe, "classe"));
  const v = VIEWS[S.tab](d);
  $("view").innerHTML = v.html;
  if (v.depois) v.depois();
}

function irPara(tab, focar) {
  S.tab = tab; ls("wd.tab", tab); desenhar(); window.scrollTo(0, 0);
  if (focar && $("tab-" + tab)) $("tab-" + tab).focus();
}
/* Teclado nas abas: setas, Home e End, como num controle de abas nativo. */
$("tabs").onkeydown = (e) => {
  const i = TABS.findIndex((t) => t[0] === S.tab), n = TABS.length;
  const j = e.key === "ArrowRight" ? (i + 1) % n : e.key === "ArrowLeft" ? (i + n - 1) % n : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
  if (j < 0) return;
  e.preventDefault();
  irPara(TABS[j][0], true);
};
$("b-home").onclick = () => irPara("geral");
$("b-sync").onclick = async () => { await carregar(true); if ($("sync").classList.contains("ok")) toast("Painel recarregado."); };
const menu = (abrir) => { $("menu").hidden = !abrir; $("b-menu").setAttribute("aria-expanded", abrir); };
$("b-menu").innerHTML = `${ic("engrenagem")}<span class="lbl">Opções</span>`;
$("b-add").innerHTML = `${ic("mais")}<span>Adicionar</span>`;
$("b-menu").onclick = (e) => { e.stopPropagation(); menu($("menu").hidden); if (!$("menu").hidden) $("menu").querySelector("[aria-checked=true]").focus(); };
document.querySelectorAll(".skin").forEach((b) => (b.onclick = () => { ls("wd.skin", b.dataset.skin); desenhar(); }));
document.querySelectorAll("[data-modo]").forEach((b) => (b.onclick = () => { ls("wd.modo", b.dataset.modo); desenhar(); }));
if (temaDoSistema) temaDoSistema.addEventListener("change", () => { if (aparencia().modo === "auto") desenhar(); });
document.querySelectorAll("[data-ic]").forEach((el) => (el.outerHTML = ic(el.dataset.ic)));
document.addEventListener("click", (e) => { if (!e.target.closest(".menu-wrap")) menu(false); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  esconderDica();
  if (!$("menu").hidden) { menu(false); $("b-menu").focus(); }
  $("drawer").classList.remove("open"); $("modal").classList.remove("open");
});
$("menu").onclick = (e) => { if (e.target.closest(".opt-item")) menu(false); };
let rolou = false;
window.addEventListener("scroll", () => { esconderDica(); const r = window.scrollY > 4; if (r !== rolou) { rolou = r; $("top").classList.toggle("rolou", r); } }, { passive: true });
$("b-priv").onclick = () => { S.priv = !S.priv; ls("wd.priv", S.priv ? "1" : "0"); desenhar(); };
$("b-xlsx").onclick = () => (window.location.href = "/api/export.xlsx");
$("b-print").onclick = () => window.print();
$("drawer").onclick = (e) => { if (e.target.id === "drawer") $("drawer").classList.remove("open"); };
$("modal").onclick = (e) => { if (e.target.id === "modal") $("modal").classList.remove("open"); };

/* Explicacao do "?": um balao so, posicionado perto do botao e preso dentro da tela. */
function mostrarDica(b) {
  const el = $("dica"), r = b.getBoundingClientRect();
  el.textContent = b.dataset.q; el.hidden = false;
  const w = el.offsetWidth, h = el.offsetHeight;
  el.style.left = Math.max(8, Math.min(window.innerWidth - w - 8, r.left + r.width / 2 - w / 2)) + "px";
  el.style.top = (r.bottom + h + 12 > window.innerHeight ? r.top - h - 8 : r.bottom + 8) + "px";
  mostrarDica.de = b;
}
function esconderDica() { $("dica").hidden = true; mostrarDica.de = null; }
document.addEventListener("mouseover", (e) => { const b = e.target.closest && e.target.closest(".q"); if (b) mostrarDica(b); else if (mostrarDica.de && !mostrarDica.fixa) esconderDica(); });
document.addEventListener("focusin", (e) => { const b = e.target.closest && e.target.closest(".q"); if (b) mostrarDica(b); else esconderDica(); });
/* Um clique em qualquer lugar: fixa ou solta o "?", e dispara os botoes com data-acao. */
document.addEventListener("click", (e) => {
  const q = e.target.closest(".q");
  if (q) { e.preventDefault(); mostrarDica.fixa = mostrarDica.de === q && mostrarDica.fixa ? false : true; if (mostrarDica.fixa) mostrarDica(q); else esconderDica(); return; }
  mostrarDica.fixa = false; esconderDica();
  const b = e.target.closest("[data-acao]");
  if (b && ACOES[b.dataset.acao]) { e.preventDefault(); menu(false); ACOES[b.dataset.acao](b); }
});

carregar();
setInterval(vigiar, 4000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) vigiar(); });

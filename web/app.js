/* Dashboard Financeiro - frontend. Sem framework: estado em S, uma funcao de desenho por aba. */
"use strict";

const TABS = [["geral", "Visão geral", "painel"], ["alocacao", "Alocação", "pizza"], ["resultado", "Lucros", "alta"],
  ["gastos", "Gastos", "cartao"], ["evolucao", "Evolução e simulador", "barras"], ["gestao", "Gestão", "lapis"]];
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
  classe: "", tipo: "", mes: null, gestao: "lancamentos", tabela: "transacoes", busca: "",
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
const qtd = (v) => v == null ? "" : S.priv ? "•••" : v.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
const dt = (s) => s && /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : /^\d{4}-\d{2}$/.test(s || "") ? `${s.slice(5)}/${s.slice(0, 4)}` : (s || "");
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mes = (s) => s && /^\d{4}-\d{2}$/.test(s) ? `${MESES[+s.slice(5) - 1]}/${s.slice(0, 4)}` : (s || "");
const sinal = (v) => v == null || Math.abs(v) < 0.005 ? "" : v > 0 ? "pos" : "neg";
const comSinal = (v) => v == null ? "n/d" : (v > 0 && !S.priv ? "+" : "") + brl(v);

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
  if (!ok) $("sub").textContent = "Sem conexão com o servidor";
  else if (S.d) $("sub").textContent = S.d.vazio ? "Sem dados" : `Posição de ${dt(S.d.snapshot)}`;
  $("b-sync").title = ok ? "Sincronizado com a pasta de dados. Clique para recarregar agora." : "O servidor local não respondeu. Clique para tentar de novo.";
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
async function vigiar() {
  if (document.hidden) return;   // aba em segundo plano: confere quando voltar
  try {
    const s = await api("/api/state");
    conexao(true);
    if (S.d && s.fingerprint !== S.d.fingerprint) {
      if ($("drawer").classList.contains("open") || S.editando) return;   // nao atropela quem digita
      const y = window.scrollY;
      await carregar(true);
      window.scrollTo(0, y);
      toast("Arquivos alterados na pasta de dados. Painel atualizado.");
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
  if (!window.echarts) { el.innerHTML = '<p class="muted small">Gráfico indisponível: a biblioteca ECharts não carregou (sem internet?). As tabelas continuam valendo.</p>'; return; }
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
  espera = setTimeout(() => { if (Math.abs(window.innerWidth - largura) > 80) { largura = window.innerWidth; desenhar(); } }, 250);
});
const eixoBRL = { type: "value", axisLabel: { formatter: (v) => brlAbbr(v) } };
const barra = (extra) => ({ type: "bar", barMaxWidth: 24, itemStyle: { borderRadius: [3, 3, 0, 0], borderColor: SURFACE, borderWidth: 1 }, ...extra });

/* ---------------------------------------------------------------- pecas */
const kpi = (rotulo, valor, sub, cls = "") => `<div class="kpi"><span>${rotulo}</span><b class="${cls}">${valor}</b><small>${sub || ""}</small></div>`;
const card = (titulo, sub, corpo, cls = "") => `<div class="card ${cls}"><h2>${titulo}</h2><p class="sub">${sub || ""}</p>${corpo}</div>`;
function tabela(cab, linhas, pe) {
  const th = cab.map((c) => `<th class="${c.n ? "n" : ""}">${c.t}</th>`).join("");
  const tr = linhas.map((l) => `<tr>${l.map((v, i) => `<td class="${cab[i].n ? "n" : ""}">${v ?? ""}</td>`).join("")}</tr>`).join("");
  const tf = pe ? `<tfoot><tr>${pe.map((v, i) => `<td class="${cab[i].n ? "n" : ""}">${v ?? ""}</td>`).join("")}</tr></tfoot>` : "";
  return `<div class="scroll"><table><thead><tr>${th}</tr></thead><tbody>${tr || `<tr><td colspan="${cab.length}" class="muted">Sem dados.</td></tr>`}</tbody>${tf}</table></div>`;
}
const filtradas = () => S.d.posicoes.filter((p) => (!S.classe || p.classe === S.classe) && (!S.tipo || p.tipo === S.tipo));
/* Soma as posicoes por tipo de produto. Usada na aba Lucros, que respeita o filtro. */
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
const semCalculo = (t) => !t.n_sem_dado ? "" : t.tipo === "Conta" ? '<span class="muted">não se aplica</span>' : `${t.n_sem_dado} de ${t.n} sem custo`;
const parcial = (d, m) => m === d.hoje.slice(0, 7);
const metodo = (p) => p.metodo === "custo" ? "sobre o custo" : p.metodo === "observado" ? `rendimento desde ${dt(p.desde)}` : "sem custo no arquivo";

/* ---------------------------------------------------------------- aba: visao geral */
function vGeral(d) {
  const b = d.blocos, r = d.resultado, ev = d.evolucao, ant = ev.length > 1 ? ev[ev.length - 2] : null;
  const g = d.gastos[d.gastos.length - 1];
  const delta = ant ? `Variação de <b>${comSinal(b.total - ant.total)}</b> desde a posição de ${dt(ant.data)}. Inclui dinheiro novo, não é só rendimento.` : "Primeira posição registrada.";
  const tCusto = lista(r.por_tipo.filter((t) => t.n_custo).map((t) => t.tipo)), tObs = lista(r.por_tipo.filter((t) => t.n_observado).map((t) => t.tipo));
  const res = d.reserva;
  // Faixa de composicao: mesmas partes e mesmas cores do grafico de evolucao.
  const partes = PARTES.map(([nome, k], i) => ({ nome, v: b[k], cor: SERIES[i] })).filter((p) => p.v > 0);
  const hero = `<section class="hero">
      <div><div class="hero-head"><span class="hero-label">Patrimônio total</span><span class="hero-date">Posição em ${dt(d.snapshot)}</span></div>
        <div class="hero-num">${brl(b.total)}</div><p class="hero-sub">${delta}</p></div>
      <div><div class="strip" role="img" aria-label="Composição do patrimônio por bloco">${partes.map((p) => `<i style="flex:${p.v};background-color:${p.cor}" title="${p.nome}: ${pct(p.v / b.total, 1)}"></i>`).join("")}</div>
        <ul class="legend">${partes.map((p) => `<li><span class="dot" style="background-color:${p.cor};margin:0"></span><span class="nome">${p.nome}</span><span class="v">${brl(p.v)}</span><span class="p">${pct(p.v / b.total, 1)}</span></li>`).join("")}</ul></div>
    </section>`;
  const kp = [
    kpi("Carteira de investimento", brl(b.base), `Base da alocação. Caixa ainda não investido: ${pct(b.base ? b.caixa / b.base : 0)}`),
    kpi(tCusto ? `Lucro não realizado: ${esc(tCusto)}` : "Lucro não realizado", tCusto ? comSinal(r.sobre_custo) : "n/d",
      tCusto ? `${pct(r.sobre_custo / r.custo_total)} sobre o custo de ${brl(r.custo_total)}. Só entra quem tem preço médio.` : "Nenhuma posição com custo no arquivo", tCusto ? sinal(r.sobre_custo) : ""),
    !tObs ? "" : kpi(`Rendimento: ${esc(tObs)}`, tObs ? comSinal(r.observado) : "n/d",
      tObs ? `Variação desde ${dt(r.observado_desde)}, primeira posição no arquivo. Não é o lucro desde a aplicação.` : "Sem títulos nessa condição", tObs ? sinal(r.observado) : ""),
    kpi("Renda passiva recebida", brl(d.passiva.total_12m), `Rendimentos lançados nos últimos ${d.passiva.n_meses} meses`),
    g ? kpi(`Gastos de ${mes(g.mes)}${parcial(d, g.mes) ? " (parcial)" : ""}`, brl(g.gastos), parcial(d, g.mes) ? `Mês em andamento. Renda até aqui: ${brl(g.renda)}` : `Renda de ${brl(g.renda)}, poupança de ${pct(g.taxa)}`) : kpi("Gastos do mês", "n/d", "Sem lançamentos"),
    kpi("Reserva de emergência", brl(res.atual), !res.meta ? "Meta não cadastrada" : `<div class="prog"><i style="width:${Math.min(100, res.atual / res.meta * 100)}%"></i></div>`
      + (res.atual >= res.meta ? `Meta de ${brl(res.meta)} atingida, com ${brl(res.atual - res.meta)} a mais` : `${pct(res.atual / res.meta, 0)} da meta de ${brl(res.meta)}. Faltam ${brl(res.meta - res.atual)}`)),
  ].join("");
  const avisos = [];
  if (d.alertas_posicao) avisos.push(`${d.alertas_posicao} de ${d.posicoes.length} posições têm valor estimado, carregado ou por premissa. Em Lucros, a etiqueta "estimado" mostra a observação ao passar o mouse. Como resolver: atualizar a posição com o extrato mais recente.`);
  d.faltando.forEach((f) => avisos.push(f));
  const banner = avisos.length ? `<details class="banner"><summary>${avisos.length} ponto(s) de atenção nos dados</summary><ul>${avisos.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></details>` : "";
  const so = (cond, x) => (cond ? [x] : []);
  const tipos = tabela([{ t: "Tipo" }, { t: "Valor", n: 1 }, { t: "Lucro sobre custo", n: 1 }, ...so(tObs, { t: "Rendimento observado", n: 1 }), { t: "Sem cálculo" }],
    r.por_tipo.map((t) => [esc(t.tipo), brl(t.valor), t.n_custo ? `<span class="${sinal(t.sobre_custo)}">${comSinal(t.sobre_custo)}</span>` : "",
      ...so(tObs, t.n_observado ? `<span class="${sinal(t.observado)}">${comSinal(t.observado)}</span>` : ""), `<span class="small">${semCalculo(t)}</span>`]),
    ["Total", brl(b.total), comSinal(r.sobre_custo), ...so(tObs, comSinal(r.observado)), ""]);
  const ordem = d.ordem ? tabela([{ t: "Classe" }, { t: "Instrumento" }, { t: "Valor", n: 1 }], d.ordem.itens.map((i) => [esc(i.classe), esc(i.instrumento), brl(i.valor)]), ["Total", "", brl(d.ordem.total)])
    + `<p class="muted small">Fonte: ${esc(d.ordem.fonte)}</p>` : '<p class="muted">Nenhum aporte planejado em aportes.csv.</p>';
  const eventos = tabela([{ t: "Data" }, { t: "Evento" }, { t: "Valor", n: 1 }, { t: "Ação" }],
    d.eventos.slice(0, 6).map((e) => [`<span class="num">${dt(e.data)}</span>`, `${esc(e.ativo)} <span class="tag">${esc(e.evento)}</span>`, e.valor ? brl(e.valor) : "", `<span class="small muted">${esc(e.acao)}</span>`]));
  const ind = tabela([{ t: "Indicador" }, { t: "Valor", n: 1 }, { t: "Data", n: 1 }],
    d.indicadores.map((i) => [`<span title="Fonte: ${esc(i.fonte)}">${esc(NOMES_IND[i.indicador] || i.indicador)}</span>`, `${i.valor == null ? "n/d" : i.valor.toLocaleString("pt-BR")} ${esc(i.unidade)}`, dt(i.data)]));
  return {
    html: `${banner}${hero}<section class="kpis">${kp}</section>
      <section class="grid cols">
        ${card("Evolução do patrimônio", "Uma barra por posição registrada (snapshot), dividida por bloco.", '<div id="c-evo" class="chart"></div>')}
        ${card("Patrimônio por tipo de produto", "Valor de cada tipo na posição atual.", '<div id="c-tipo" class="chart"></div>')}
        ${card("Lucros por tipo de produto", tObs ? "Duas medidas que não se somam. Sobre custo: valor menos o custo de aquisição. Observado: variação desde a primeira posição do título no arquivo." : "Valor da posição menos o custo de aquisição. Conta corrente não tem lucro a medir.", tipos)}
        ${card(d.ordem ? `Ordem planejada de ${mes(d.ordem.mes)}` : "Ordem do mês", "Último plano registrado em aportes.csv. Planejado não é executado.", ordem)}
        ${card("Próximos eventos", "Vencimentos e datas em aberto, de hoje em diante.", eventos)}
        ${card("Indicadores de referência", "Último valor registrado em indicadores.csv (passe o mouse no nome para ver a fonte). Períodos diferentes do da carteira: não compare direto.", ind)}
      </section>`,
    depois() { gEvolucao("c-evo", d); gTipos("c-tipo", d); },
  };
}
const NOMES_IND = { cdi: "CDI", selic_meta: "Selic meta", selic_over: "Selic over", ipca_12m: "IPCA em 12 meses", ibovespa: "Ibovespa", ptax_dolar_venda: "Dólar (PTAX venda)" };
const PARTES = [["Investido", "investido"], ["Caixa", "caixa"], ["Reserva", "reserva"], ["Fora da carteira", "fora"]];
function gEvolucao(id, d) {
  const partes = PARTES;
  chart(id, {
    legend: {}, xAxis: { type: "category", data: d.evolucao.map((e) => dt(e.data).slice(0, 5)) }, yAxis: eixoBRL,
    series: partes.map(([nome, k], i) => barra({ name: nome, stack: "t", data: d.evolucao.map((e) => +e[k].toFixed(2)), itemStyle: { color: SERIES[i], borderColor: SURFACE, borderWidth: 1 } })),
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

/* ---------------------------------------------------------------- aba: alocacao */
function sugestao(d, x) {
  const linhas = d.alocacao.linhas.filter((l) => l.classe !== d.config.cash_class && l.alvo != null);
  const final = linhas.reduce((s, l) => s + l.valor, 0) + x;
  const gaps = linhas.map((l) => ({ classe: l.classe, instrumento: l.instrumento, gap: Math.max(0, l.alvo * final - l.valor) }));
  const soma = gaps.reduce((s, g) => s + g.gap, 0), k = soma > x && soma > 0 ? x / soma : 1;
  return gaps.filter((g) => g.gap > 0.005).map((g) => ({ ...g, valor: g.gap * k }));
}
function vAlocacao(d) {
  const a = d.alocacao, escala = Math.max(0.5, ...a.linhas.map((l) => Math.max(l.pct, l.max || 0))) * 1.08;
  const w = (v) => `${Math.min(100, v / escala * 100)}%`;
  const tag = { ok: '<span class="tag ok">dentro da banda</span>', abaixo: '<span class="tag warn">abaixo da banda</span>', acima: '<span class="tag crit">acima da banda</span>' };
  const barras = a.linhas.map((l) => `<div class="aloc">
      <div><span class="dot" style="background-color:${cor(l.classe, "classe")}"></span>${esc(l.classe)}</div>
      <div class="track" title="Atual ${pct(l.pct)}, alvo ${pct(l.alvo)}, banda de ${pct(l.min)} a ${pct(l.max)}">
        ${l.alvo != null && l.max > 0 ? `<div class="band" style="left:${w(l.min)};width:calc(${w(l.max)} - ${w(l.min)})"></div>` : ""}
        <div class="bar" style="width:${w(l.pct)};background-color:${cor(l.classe, "classe")}"></div>
        ${l.alvo != null && l.classe !== d.config.cash_class ? `<div class="alvo" style="left:${w(l.alvo)}"></div>` : ""}
      </div>
      <div class="num small">${pct(l.pct)} ${l.classe === d.config.cash_class ? "" : `<span class="muted">alvo ${pct(l.alvo, 0)}</span>`}<br>${l.classe === d.config.cash_class ? '<span class="tag">dinheiro a investir</span>' : tag[l.situacao] || ""}</div></div>`).join("");
  const ehCaixa = (l) => l.classe === d.config.cash_class;
  const distancia = (l) => l.falta == null ? "" : ehCaixa(l) ? '<span class="muted">a investir</span>' : Math.abs(l.falta) < 0.005 ? "no alvo" : l.falta > 0 ? `faltam ${brl(l.falta)}` : `<span class="muted">${brl(-l.falta)} acima</span>`;
  const tab = tabela([{ t: "Classe" }, { t: "Valor", n: 1 }, { t: "Atual", n: 1 }, { t: "Alvo", n: 1 }, { t: "Banda", n: 1 }, { t: "Desvio", n: 1 }, { t: "Distância do alvo", n: 1 }, { t: "Instrumento" }],
    a.linhas.map((l) => [esc(l.classe), brl(l.valor), pct(l.pct), ehCaixa(l) ? "" : pct(l.alvo), l.alvo == null || ehCaixa(l) ? "" : `${pct(l.min, 0)} a ${pct(l.max, 0)}`,
      l.alvo == null || !l.situacao ? "" : `<span class="${l.situacao === "ok" ? "" : "neg"}">${((l.pct - l.alvo) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2, signDisplay: "always" })} p.p.</span>`,
      distancia(l), `<span class="small muted">${esc(l.instrumento)}</span>`]),
    ["Total", brl(d.blocos.base), pct(a.soma_pct), pct(a.soma_alvo), "", "", "", ""]);
  if (S.aporte == null) S.aporte = +(Math.max(0, d.blocos.caixa - d.reserva.para_reserva) || d.aporte_mensal || 0).toFixed(2);
  const sug = sugestao(d, S.aporte), tot = sug.reduce((s, g) => s + g.valor, 0);
  const sugTab = tabela([{ t: "Classe" }, { t: "Instrumento da política" }, { t: "Valor", n: 1 }, { t: "Parte", n: 1 }],
    sug.map((g) => [esc(g.classe), `<span class="small">${esc(g.instrumento)}</span>`, brl(g.valor), pct(S.aporte ? g.valor / S.aporte : 0, 1)]),
    ["Total distribuído", "", brl(tot), S.aporte - tot > 0.005 ? `sobra ${brl(S.aporte - tot)}` : ""]);
  return {
    html: `<section class="grid cols">
      ${card("Alocação atual contra a meta", `Metas ${a.versao ? `versão ${esc(a.versao)}, vigente desde ${dt(a.vigencia)}` : "não cadastradas"}. Percentuais sobre a carteira de investimento (${brl(d.blocos.base)}), sem reserva. Faixa clara: banda. Traço: alvo.`, barras, "wide")}
      ${card("Detalhe por classe", `Desvio: atual menos alvo, em pontos percentuais. Distância do alvo: quanto falta ou sobra em reais${d.reserva.para_reserva ? `, já sem os ${brl(d.reserva.para_reserva)} do caixa que vão completar a reserva` : ""}.`, tab, "wide")}
      ${card("Simulação: onde aportar", `Conta mecânica: distribui o valor pelas classes abaixo do alvo, na proporção da distância. Não é ordem nem recomendação${d.ordem ? `, e pode diferir da ordem planejada de ${mes(d.ordem.mes)} (Visão geral), que segue as regras da política` : ""}.`,
        `<div class="form noprint" style="margin-bottom:12px"><div><label for="i-aporte">Valor a aportar (R$)</label><input id="i-aporte" type="number" step="0.01" min="0" value="${S.aporte}"></div></div>${sugTab}`)}
      ${card("Vencimentos da renda fixa", "Títulos da posição atual com data de vencimento.", tabela([{ t: "Vencimento" }, { t: "Ativo" }, { t: "Taxa" }, { t: "Valor", n: 1 }],
        d.escada.map((e) => [dt(e.data), esc(e.ativo), esc(e.indexador), brl(e.valor)])))}
    </section>`,
    depois() { $("i-aporte").onchange = (e) => { S.aporte = Math.max(0, +e.target.value || 0); desenhar(); }; },
  };
}

/* ---------------------------------------------------------------- aba: lucros */
function vResultado(d) {
  const r = d.resultado, todas = d.posicoes.filter((p) => p.valor), ps = filtradas().filter((p) => p.valor);
  const filtrando = !!(S.classe || S.tipo), rotulo = [S.tipo, S.classe].filter(Boolean).join(", ");
  const tipos = porTipo(ps), soma = (k) => tipos.reduce((t, x) => t + x[k], 0);
  const custo = soma("custo"), sobre = soma("sobre_custo"), obs = soma("observado"), temCusto = soma("n_custo") > 0, temObs = soma("n_observado") > 0;
  const com = ps.filter((p) => p.resultado != null).sort((a, b) => a.resultado - b.resultado);
  const linhas = [...ps].sort((a, b) => b.valor - a.valor).map((p) => [
    `${esc(p.ativo)}${p.alerta ? ` <span class="tag warn" title="${esc(p.obs)}">estimado</span>` : ""}<br><span class="muted small">${esc(p.indexador)}${p.vencimento ? `, vence em ${dt(p.vencimento)}` : ""}</span>`,
    esc(p.tipo), esc(p.classe), qtd(p.quantidade), p.preco_medio == null ? "" : brl(p.preco_medio), p.preco_mercado == null ? "" : brl(p.preco_mercado),
    brl(p.valor), p.resultado == null ? '<span class="muted">n/d</span>' : `<span class="${sinal(p.resultado)}">${comSinal(p.resultado)}</span>`,
    p.resultado_pct == null ? "" : `<span class="${sinal(p.resultado_pct)}">${pct(p.resultado_pct)}</span>`, `<span class="small muted">${metodo(p)}</span>`]);
  const unicos = (k) => [...new Set(d.posicoes.map((p) => p[k]))].sort();
  const sel = (id, vals, atual, rot) => `<select id="${id}" aria-label="${rot}"><option value="">${rot}</option>${vals.map((v) => `<option ${v === atual ? "selected" : ""}>${esc(v)}</option>`).join("")}</select>`;
  const filtros = `<div class="filters noprint"><span class="eyebrow">Filtrar a aba</span>${sel("f-classe", unicos("classe"), S.classe, "Todas as classes")}${sel("f-tipo", unicos("tipo"), S.tipo, "Todos os tipos")}
    ${filtrando ? `<button class="btn" id="f-limpar">Limpar filtros</button><span class="muted small">Mostrando ${ps.length} de ${todas.length} posições. Totais, gráfico e tabelas abaixo seguem o filtro.</span>` : `<span class="muted small">${todas.length} posições</span>`}</div>`;
  const real = r.realizado;
  const realTab = tabela([{ t: "Data" }, { t: "Ticker" }, { t: "Qtd", n: 1 }, { t: "Venda", n: 1 }, { t: "Custo", n: 1 }, { t: "Resultado", n: 1 }],
    real.itens.map((i) => [dt(i.data), esc(i.ticker) + (i.base === "posicao" ? ` <span class="tag" title="Sem compra em transacoes.csv: custo = quantidade vezes o preço médio de ${brl(i.pm)} registrado em posicoes.csv (posição de ${dt(i.base_data)})">preço médio</span>` : ""), qtd(i.quantidade), brl(i.venda), brl(i.custo), `<span class="${sinal(i.resultado)}">${comSinal(i.resultado)}</span>`]),
    ["Total", "", "", "", "", comSinal(real.total)]);
  const semCusto = real.sem_custo.length ? `<p class="small muted">Fora do total, por falta de custo: ${real.sem_custo.map((s) => `${esc(s.ativo)} em ${dt(s.data)}, vendido por ${brl(s.venda)}`).join("; ")}. Lance a compra em transacoes.csv para entrar na conta.</p>` : "";
  return {
    html: `${filtros}<section class="kpis">
        ${kpi(filtrando ? `Valor: ${esc(rotulo)}` : "Valor das posições", brl(soma("valor")), `${ps.length} posição(ões) em ${dt(d.snapshot)}`)}
        ${kpi("Lucro não realizado sobre custo", temCusto ? comSinal(sobre) : "n/d", temCusto ? `${custo ? pct(sobre / custo) : ""} sobre o custo de ${brl(custo)} (${esc(lista(tipos.filter((t) => t.n_custo).map((t) => t.tipo)))})` : `Nenhuma posição com preço médio ${filtrando ? "neste filtro" : "no arquivo"}`, temCusto ? sinal(sobre) : "")}
        ${!temObs && !filtrando ? "" : kpi("Rendimento observado", temObs ? comSinal(obs) : "n/d", temObs ? `Desde ${dt(r.observado_desde)} (${esc(lista(tipos.filter((t) => t.n_observado).map((t) => t.tipo)))}). Não é o lucro desde a aplicação.` : `Nenhum título nessa condição ${filtrando ? "neste filtro" : ""}`, temObs ? sinal(obs) : "")}
        ${filtrando ? "" : kpi("Resultado realizado", real.itens.length ? comSinal(real.total) : "n/d", real.itens.length ? `${real.itens.length} venda(s) com custo${real.sem_custo.length ? `; ${real.sem_custo.length} sem custo ficam fora da soma` : ""}` : `${real.sem_custo.length} venda(s) sem custo: não dá para calcular`, real.itens.length ? sinal(real.total) : "")}
        ${filtrando ? "" : kpi("IR retido registrado", brl(real.ir_pago), "Soma de ir_brl em transacoes.csv")}
      </section>
      <section class="grid cols">
        ${card("Resultado por posição", "Só posições com resultado calculável. À direita do zero, ganho; à esquerda, perda.", com.length ? `<div id="c-res" class="chart" style="height:${Math.max(180, com.length * 38 + 50)}px"></div>` : `<p class="muted">Nenhuma posição ${filtrando ? "deste filtro " : ""}tem resultado calculável: falta o custo de aquisição no arquivo.</p>`)}
        ${card("Resultado por tipo de produto", temObs ? "Soma das posições de cada tipo. As duas medidas não se somam: cobrem períodos diferentes." : "Soma das posições de cada tipo: valor menos o custo de aquisição.",
          tabela([{ t: "Tipo" }, { t: "Valor", n: 1 }, { t: "Custo", n: 1 }, { t: "Lucro sobre custo", n: 1 }, { t: "%", n: 1 }, ...(temObs ? [{ t: "Rendimento observado", n: 1 }] : []), { t: "Sem cálculo" }],
            tipos.map((t) => [esc(t.tipo), brl(t.valor), t.n_custo ? brl(t.custo) : "", t.n_custo ? `<span class="${sinal(t.sobre_custo)}">${comSinal(t.sobre_custo)}</span>` : "",
              t.n_custo && t.custo ? pct(t.sobre_custo / t.custo) : "", ...(temObs ? [t.n_observado ? `<span class="${sinal(t.observado)}">${comSinal(t.observado)}</span>` : ""] : []), `<span class="small">${semCalculo(t)}</span>`])))}
        ${card(filtrando ? `Posições: ${esc(rotulo)}` : "Posições", `Posição de ${dt(d.snapshot)}. Etiqueta "estimado": valor carregado, estimado ou por premissa (passe o mouse para ler a observação).`,
          tabela([{ t: "Ativo" }, { t: "Tipo" }, { t: "Classe" }, { t: "Qtd", n: 1 }, { t: "Preço médio", n: 1 }, { t: "Preço atual", n: 1 }, { t: "Valor", n: 1 }, { t: "Resultado", n: 1 }, { t: "%", n: 1 }, { t: "Método" }], linhas,
            ["Total", "", "", "", "", "", brl(soma("valor")), "", "", ""]), "wide")}
        ${card("Resultado realizado", `Venda menos o custo. Custo: média das compras em transacoes.csv; sem compra lá, o preço médio da posição em posicoes.csv (etiqueta "preço médio").${filtrando ? " Este quadro não segue o filtro: mostra todas as vendas." : ""}`, realTab + semCusto, "wide")}
      </section>`,
    depois() {
      $("f-classe").onchange = (e) => { S.classe = e.target.value; desenhar(); };
      $("f-tipo").onchange = (e) => { S.tipo = e.target.value; desenhar(); };
      if ($("f-limpar")) $("f-limpar").onclick = () => { S.classe = ""; S.tipo = ""; desenhar(); };
      if (com.length) chart("c-res", {
        grid: { right: 24 }, xAxis: eixoBRL, yAxis: { type: "category", data: com.map((p) => p.ticker || p.ativo.slice(0, 26)), axisLabel: { color: INK2 } },
        tooltip: { formatter: (a) => { const p = com[a[0].dataIndex]; return `${esc(p.ativo)}<br><b>${comSinal(p.resultado)}</b> (${pct(p.resultado_pct)})<br>${metodo(p)}`; } },
        series: [barra({ data: com.map((p) => ({ value: +p.resultado.toFixed(2), itemStyle: { color: p.resultado >= 0 ? POS : NEG, borderRadius: p.resultado >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] } })) })],
      });
    },
  };
}

/* ---------------------------------------------------------------- aba: gastos */
function vGastos(d) {
  if (!d.gastos.length) return { html: card("Gastos", "", '<p class="muted">Sem lançamentos em data/expenses/despesas.csv.</p>') };
  if (!S.mes || !d.gastos.some((g) => g.mes === S.mes)) S.mes = d.gastos[d.gastos.length - 1].mes;
  const g = d.gastos.find((x) => x.mes === S.mes);
  const itens = tabela([{ t: "Data" }, { t: "Descrição" }, { t: "Categoria" }, { t: "Tipo" }, { t: "Valor", n: 1 }],
    g.itens.map((i) => [dt(i.data), `${esc(i.descricao)}${i.obs ? `<br><span class="muted small">${esc(i.obs)}</span>` : ""}`, esc(i.categoria),
      `<span class="tag ${i.tipo === "Entrada" ? "ok" : ""}">${esc(i.tipo)}</span>`, brl(i.valor)]));
  return {
    html: `<div class="row noprint" style="margin-bottom:14px"><label for="s-mes" class="muted">Mês</label>
        <select id="s-mes">${d.gastos.map((x) => `<option value="${x.mes}" ${x.mes === S.mes ? "selected" : ""}>${mes(x.mes)}</option>`).join("")}</select>
        <button class="btn" id="b-novo-gasto">Novo lançamento</button></div>
      <section class="kpis">
        ${kpi(`Renda de ${mes(g.mes)}`, brl(g.renda), g.outras_entradas ? `Outras entradas que não são renda: ${brl(g.outras_entradas)}` : "Salário e rendimentos")}
        ${kpi("Gastos", brl(g.gastos), `Fixo de ${brl(g.fixo)} e variável de ${brl(g.variavel)}`)}
        ${kpi("Sobra", comSinal(g.sobra), "Renda menos gastos", sinal(g.sobra))}
        ${kpi("Taxa de poupança", pct(g.taxa), "(renda − gastos) ÷ renda, no mês", sinal(g.taxa))}
      </section>
      ${parcial(d, g.mes) ? `<p class="note">${mes(g.mes)} ainda está em andamento: os números vão só até o último lançamento (${dt(g.itens[g.itens.length - 1].data)}). Sobra e taxa de poupança mudam quando entrarem os gastos que faltam.</p>` : ""}
      <section class="grid cols">
        ${card("Renda e gastos por mês", "Gastos empilhados em fixo e variável, ao lado da renda.", '<div id="c-meses" class="chart"></div>')}
        ${card(`Gastos de ${mes(g.mes)} por categoria`, "Só saídas. Entradas ficam de fora.", `<div id="c-cats" class="chart" style="height:${Math.max(200, g.cats.length * 34 + 40)}px"></div>`)}
        ${card(`Lançamentos de ${mes(g.mes)}`, `${g.itens.length} lançamento(s) em despesas.csv.`, itens, "wide")}
      </section>`,
    depois() {
      $("s-mes").onchange = (e) => { S.mes = e.target.value; desenhar(); };
      $("b-novo-gasto").onclick = () => abrirForm("despesas", null);
      chart("c-meses", {
        legend: {}, xAxis: { type: "category", data: d.gastos.map((x) => mes(x.mes)) }, yAxis: eixoBRL,
        series: [barra({ name: "Renda", data: d.gastos.map((x) => +x.renda.toFixed(2)), itemStyle: { color: SERIES[0], borderRadius: [4, 4, 0, 0] } }),
          barra({ name: "Gasto fixo", stack: "g", data: d.gastos.map((x) => +x.fixo.toFixed(2)), itemStyle: { color: SERIES[2], borderColor: SURFACE, borderWidth: 1 } }),
          barra({ name: "Gasto variável", stack: "g", data: d.gastos.map((x) => +x.variavel.toFixed(2)), itemStyle: { color: SERIES[1], borderRadius: [4, 4, 0, 0], borderColor: SURFACE, borderWidth: 1 } })],
      });
      const c = [...g.cats].reverse();
      chart("c-cats", {
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
  const s = S.sim, r = simular(s), nomes = ["Cenário baixo", "Cenário médio", "Cenário alto"];
  const fim = tabela([{ t: "Cenário" }, { t: "Taxa real a.a.", n: 1 }, { t: `Patrimônio em ${s.anos} anos`, n: 1 }, { t: "Total aportado", n: 1 }, { t: "Ganho", n: 1 }],
    r.cen.map((c, i) => [nomes[i], pct(s.taxas[i]), brl(c[c.length - 1]), brl(r.aportado[r.aportado.length - 1]), comSinal(c[c.length - 1] - r.aportado[r.aportado.length - 1])]));
  const campo = (id, rot, v, step) => `<div><label for="${id}">${rot}</label><input id="${id}" type="number" step="${step}" value="${v}"></div>`;
  const evoTab = tabela([{ t: "Posição" }, { t: "Patrimônio", n: 1 }, { t: "Carteira", n: 1 }, { t: "Caixa", n: 1 }, { t: "Reserva", n: 1 }, { t: "Lucro sobre custo", n: 1 }],
    [...d.evolucao].reverse().map((e) => [dt(e.data), brl(e.total), brl(e.base), brl(e.caixa), brl(e.reserva), comSinal(e.sobre_custo)]));
  return {
    html: `<section class="grid cols">
      ${card("Evolução do patrimônio", "Uma barra por posição registrada, dividida por bloco.", '<div id="c-evo2" class="chart tall"></div>')}
      ${card("Aportes por mês", "Executado só conta com comprovante. Planejado é o último plano do mês.", '<div id="c-ap" class="chart tall"></div>')}
      ${card("Renda passiva recebida", "Entradas das categorias de rendimento em despesas.csv, por mês.", '<div id="c-pass" class="chart"></div>')}
      ${card("Posições registradas", "Histórico dos snapshots, do mais recente para o mais antigo.", evoTab)}
      ${card("Simulador de projeção", "Premissa, não previsão. Valores em reais de hoje (taxa real, já sem a inflação). Aporte no fim de cada mês. Mude as taxas e veja o quanto o resultado depende delas.",
        `<div class="form noprint" style="margin-bottom:14px">${campo("sim-saldo", "Saldo inicial (R$)", s.saldo, "0.01")}${campo("sim-aporte", "Aporte mensal (R$)", s.aporte, "0.01")}${campo("sim-anos", "Prazo (anos)", s.anos, "1")}
          ${s.taxas.map((t, i) => campo("sim-t" + i, `${nomes[i]} (% real a.a.)`, +(t * 100).toFixed(2), "0.1")).join("")}</div>
         <div id="c-sim" class="chart tall"></div>${fim}`, "wide")}
    </section>`,
    depois() {
      gEvolucao("c-evo2", d);
      chart("c-ap", {
        legend: {}, xAxis: { type: "category", data: d.aportes.map((a) => mes(a.mes)) }, yAxis: eixoBRL,
        series: [barra({ name: "Executado", data: d.aportes.map((a) => +a.executado.toFixed(2)), itemStyle: { color: SERIES[0], borderRadius: [4, 4, 0, 0] } }),
          barra({ name: "Planejado", data: d.aportes.map((a) => +a.planejado.toFixed(2)), itemStyle: { color: SERIES[1], borderRadius: [4, 4, 0, 0] } })],
      });
      chart("c-pass", {
        xAxis: { type: "category", data: d.passiva.meses.map((m) => mes(m.mes)) }, yAxis: eixoBRL,
        series: [barra({ name: "Renda passiva", data: d.passiva.meses.map((m) => +m.valor.toFixed(2)), itemStyle: { color: SERIES[0], borderRadius: [4, 4, 0, 0] } })],
      });
      chart("c-sim", {
        legend: {}, tooltip: { axisPointer: { type: "line" } }, xAxis: { type: "category", data: r.anos.map((a) => `${a} a`), boundaryGap: false }, yAxis: eixoBRL,
        series: [...r.cen.map((c, i) => ({ name: `${nomes[i]} (${pct(s.taxas[i], 1)})`, type: "line", symbol: "none", lineStyle: { width: 2 }, data: c.map((v) => +v.toFixed(2)), endLabel: { show: true, color: INK2, formatter: (p) => brlAbbr(p.value) } })),
          { name: "Total aportado", type: "line", symbol: "none", lineStyle: { width: 2, type: "dashed", color: MUTED }, itemStyle: { color: MUTED }, data: r.aportado.map((v) => +v.toFixed(2)) }],
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

/* ---------------------------------------------------------------- aba: gestao */
function vGestao(d) {
  const sub = `<div class="subtabs noprint">${[["lancamentos", "Lançamentos"], ["notas", "Notas e relatórios"]].map(([k, t]) => `<button class="btn ${S.gestao === k ? "on" : ""}" data-sub="${k}">${t}</button>`).join("")}</div>`;
  const liga = () => document.querySelectorAll("[data-sub]").forEach((b) => (b.onclick = () => { S.gestao = b.dataset.sub; desenhar(); }));
  if (S.gestao === "notas") return vNotas(d, sub, liga);
  const sc = S.schema[S.tabela], ro = d.config.append_only;
  if (!S.linhas) { api("/api/table/" + S.tabela).then((t) => { S.linhas = t; desenhar(); }).catch((e) => toast(e.message, true)); }
  const t = S.linhas || { columns: [], rows: [] };
  const busca = S.busca.toLowerCase();
  const rows = [...t.rows].reverse().filter((r) => !busca || t.columns.some((c) => String(r[c]).toLowerCase().includes(busca)));
  const tipos = Object.fromEntries(sc.columns.map((c) => [c.name, c.type]));
  const corpo = tabela([...t.columns.map((c) => ({ t: c, n: tipos[c] === "number" })), { t: "" }],
    rows.slice(0, 300).map((r) => [...t.columns.map((c) => { const v = esc(r[c]); return v.length > 90 ? `<span title="${v}">${v.slice(0, 90)}…</span>` : v; }),
      ro ? "" : `<span class="row noprint" style="flex-wrap:nowrap"><button class="btn mini" data-ed="${r._id}">Editar</button><button class="btn mini danger" data-del="${r._id}">Excluir</button></span>`]));
  return {
    html: `${sub}${card("Lançamentos", `Arquivo: <code>${esc(sc.path)}</code>. ${ro ? "Pasta em modo somente acréscimo: dá para incluir linha, não editar nem apagar." : "Toda gravação gera cópia em .backups/ antes."}`,
      `<div class="row noprint" style="margin-bottom:12px">
         <select id="s-tab">${Object.entries(S.schema).map(([k, v]) => `<option value="${k}" ${k === S.tabela ? "selected" : ""}>${esc(v.label)}</option>`).join("")}</select>
         <input id="i-busca" placeholder="Filtrar linhas" value="${esc(S.busca)}">
         <button class="btn primary" id="b-novo">Nova linha</button>
         <span class="muted small">${rows.length} linha(s)${rows.length > 300 ? ", mostrando 300" : ""}, da mais recente para a mais antiga</span></div>${corpo}`, "wide")}`,
    depois() {
      liga();
      $("s-tab").onchange = (e) => { S.tabela = e.target.value; S.linhas = null; S.busca = ""; desenhar(); };
      $("i-busca").onchange = (e) => { S.busca = e.target.value; desenhar(); };
      $("b-novo").onclick = () => abrirForm(S.tabela, null);
      document.querySelectorAll("[data-ed]").forEach((b) => (b.onclick = () => abrirForm(S.tabela, t.rows[+b.dataset.ed])));
      document.querySelectorAll("[data-del]").forEach((b) => (b.onclick = async () => {
        const r = t.rows[+b.dataset.del];
        if (!confirm("Excluir esta linha do arquivo? Uma cópia fica em .backups/.")) return;
        try { await api(`/api/table/${S.tabela}/${r._id}?hash=${r._hash}`, { method: "DELETE" }); toast("Linha excluída."); await carregar(true); } catch (e) { toast(e.message, true); }
      }));
    },
  };
}

async function abrirForm(nome, linha) {
  const sc = S.schema[nome];
  let dados = S.linhas && S.tabela === nome ? S.linhas : null;
  if (!dados) { try { dados = await api("/api/table/" + nome); } catch (e) { return toast(e.message, true); } }
  const hoje = new Date().toISOString().slice(0, 10);
  const padrao = (c) => linha ? linha[c.name] : c.type === "date" && ["data", "data_snapshot", "data_ref"].includes(c.name) ? hoje : c.type === "month" ? hoje.slice(0, 7)
    : c.name === "fonte" ? `Lançamento manual no Dashboard Financeiro em ${dt(hoje)}` : c.name === "status" && c.type.includes("liquidado") ? "liquidado" : "";
  const campos = sc.columns.map((c) => {
    const req = sc.required.includes(c.name) ? " *" : "", id = "f-" + c.name, v = esc(padrao(c));
    let inp;
    if (c.type.startsWith("select:")) inp = `<select id="${id}"><option value=""></option>${c.type.slice(7).split(",").map((o) => `<option ${o === padrao(c) ? "selected" : ""}>${o}</option>`).join("")}</select>`;
    else if (c.name === "obs") inp = `<textarea id="${id}" rows="2">${v}</textarea>`;
    else if (c.type === "number") inp = `<input id="${id}" inputmode="decimal" value="${v}" placeholder="1234.56">`;
    else if (c.type === "date") inp = `<input id="${id}" type="date" value="${v}">`;
    else if (c.type === "month") inp = `<input id="${id}" type="month" value="${v}">`;
    else {
      const vals = [...new Set(dados.rows.map((r) => r[c.name]).filter(Boolean))];
      const lista = vals.length && vals.length <= 60 && c.name !== "fonte" ? `<datalist id="dl-${c.name}">${vals.map((x) => `<option value="${esc(x)}">`).join("")}</datalist>` : "";
      inp = `<input id="${id}" value="${v}" ${lista ? `list="dl-${c.name}"` : ""}>${lista}`;
    }
    return `<div class="field"><label for="${id}">${c.name}${req}</label>${inp}</div>`;
  }).join("");
  $("drawer-in").innerHTML = `<h2 style="margin-top:0">${linha ? "Editar linha" : "Nova linha"}: ${esc(sc.label)}</h2>
    <p class="muted small">Grava em <code>${esc(sc.path)}</code>. Número com ponto decimal, data AAAA-MM-DD. Campos com * são obrigatórios; a fonte diz de onde o número veio.</p>
    ${campos}<div class="row end"><button class="btn" id="f-cancelar">Cancelar</button><button class="btn primary" id="f-salvar">Salvar no arquivo</button></div>`;
  $("drawer").classList.add("open");
  const fechar = () => $("drawer").classList.remove("open");
  $("f-cancelar").onclick = fechar;
  $("f-salvar").onclick = async () => {
    const row = Object.fromEntries(sc.columns.map((c) => [c.name, $("f-" + c.name).value]));
    try {
      if (linha) await api(`/api/table/${nome}/${linha._id}`, { method: "PUT", body: { hash: linha._hash, row } });
      else await api("/api/table/" + nome, { method: "POST", body: { row } });
      fechar(); toast("Gravado em " + sc.path); await carregar(true);
    } catch (e) { toast(e.message, true); }
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

function vNotas(d, sub, liga) {
  if (!S.docs) { api("/api/docs").then((x) => { S.docs = x; desenhar(); }).catch((e) => toast(e.message, true)); }
  const grupos = {};
  (S.docs || []).forEach((x) => (grupos[x.path.split("/").slice(0, -1).join("/")] ||= []).push(x));
  const lista = Object.keys(grupos).sort().map((g) => `<h3>${esc(g)}</h3>${grupos[g].map((x) => `<button data-doc="${esc(x.path)}" class="${S.doc && S.doc.path === x.path ? "on" : ""}">${esc(x.path.split("/").pop())}</button>`).join("")}`).join("");
  let painel = '<p class="muted">Escolha um arquivo à esquerda ou crie uma nota nova.</p>';
  if (S.doc && S.editando) {
    painel = `<div class="field"><label for="d-path">Caminho (goals/, rules/, reports/ ou research/, terminando em .md)</label><input id="d-path" value="${esc(S.doc.path)}" ${S.doc.novo ? "" : "readonly"}></div>
      <textarea id="d-txt" class="editor">${esc(S.doc.content)}</textarea>
      <div class="row end" style="margin-top:10px"><button class="btn" id="d-cancelar">Cancelar</button><button class="btn primary" id="d-salvar">Salvar arquivo</button></div>`;
  } else if (S.doc) {
    painel = `<div class="row noprint" style="justify-content:space-between;margin-bottom:8px"><code>${esc(S.doc.path)}</code>
      ${S.doc.frozen ? '<span class="tag">arquivo congelado: somente leitura</span>' : '<button class="btn" id="d-editar">Editar</button>'}</div><div class="md">${md(S.doc.content)}</div>`;
  }
  return {
    html: `${sub}<section class="docs"><div class="card"><div class="row noprint" style="justify-content:space-between"><h2>Arquivos</h2><button class="btn primary mini" id="d-novo">Nova nota</button></div>
      <div class="doclist">${lista || '<p class="muted small">Nenhum .md em goals/, rules/, reports/ ou research/.</p>'}</div></div><div class="card">${painel}</div></section>`,
    depois() {
      liga();
      document.querySelectorAll("[data-doc]").forEach((b) => (b.onclick = async () => {
        try { S.doc = await api("/api/doc?path=" + encodeURIComponent(b.dataset.doc)); S.editando = false; desenhar(); } catch (e) { toast(e.message, true); }
      }));
      $("d-novo").onclick = () => { S.doc = { path: `research/${new Date().toISOString().slice(0, 10)}-nova-nota.md`, content: "# Título\n\n", novo: true }; S.editando = true; desenhar(); };
      if ($("d-editar")) $("d-editar").onclick = () => { S.editando = true; desenhar(); };
      if ($("d-cancelar")) $("d-cancelar").onclick = () => { S.editando = false; if (S.doc.novo) S.doc = null; desenhar(); };
      if ($("d-salvar")) $("d-salvar").onclick = async () => {
        try {
          const r = await api("/api/doc", { method: "PUT", body: { path: $("d-path").value.trim(), content: $("d-txt").value } });
          S.doc = await api("/api/doc?path=" + encodeURIComponent(r.path)); S.editando = false; S.docs = null;
          toast("Gravado em " + r.path); await carregar(true);
        } catch (e) { toast(e.message, true); }
      };
    },
  };
}

/* ---------------------------------------------------------------- configuracoes */
async function abrirConfig() {
  let c;
  try { c = await api("/api/config"); } catch (e) { return toast(e.message, true); }
  $("modal-in").innerHTML = `<h2 style="margin-top:0">Configurações: pasta de dados</h2>
    <p class="muted small">O painel lê e grava nesta pasta. Caminho absoluto ou relativo à pasta do painel. Fica salvo em <code>config.local.json</code>, que não vai para o Git.</p>
    <div class="field"><label for="c-dir">Pasta de dados</label><input id="c-dir" value="${esc(c.data_directory)}"></div>
    <p class="small">Pasta em uso: <code>${esc(c.resolved)}</code><br>Tabelas encontradas: ${c.tables_found.length ? esc(c.tables_found.join(", ")) : "nenhuma"}<br>Planilha carteira.xlsx: ${c.workbook ? "encontrada" : "não encontrada"}<br>Modo somente acréscimo: ${c.append_only ? "ligado" : "desligado"}</p>
    <div class="row end"><button class="btn" id="c-exemplo">Usar dados de exemplo</button><button class="btn" id="c-fechar">Fechar</button><button class="btn primary" id="c-salvar">Salvar e recarregar</button></div>`;
  $("modal").classList.add("open");
  const fechar = () => $("modal").classList.remove("open");
  $("c-fechar").onclick = fechar;
  $("c-exemplo").onclick = () => ($("c-dir").value = "sample_data");
  $("c-salvar").onclick = async () => {
    try { await api("/api/config", { method: "PUT", body: { data_directory: $("c-dir").value } }); fechar(); S.sim = null; S.aporte = null; S.doc = null; await carregar(); toast("Pasta de dados alterada."); } catch (e) { toast(e.message, true); }
  };
}

/* ---------------------------------------------------------------- desenho */
const VIEWS = { geral: vGeral, alocacao: vAlocacao, resultado: vResultado, gastos: vGastos, evolucao: vEvolucao, gestao: vGestao };
function desenhar() {
  const d = S.d;
  if (!d) return;
  aplicarAparencia();
  lerTema();
  $("b-priv").innerHTML = `${ic(S.priv ? "olhoFechado" : "olho")}<span class="lbl">${S.priv ? "Valores ocultos" : "Ocultar valores"}</span>`;
  $("b-priv").title = S.priv ? "Mostrar os valores em reais" : "Ocultar os valores em reais e manter os percentuais";
  $("b-priv").setAttribute("aria-label", $("b-priv").title);
  $("b-priv").setAttribute("aria-pressed", S.priv);
  S.charts.forEach((c) => c.dispose()); S.charts = [];
  $("tabs").innerHTML = TABS.map(([k, t, i]) => `<button role="tab" id="tab-${k}" aria-selected="${S.tab === k}" tabindex="${S.tab === k ? 0 : -1}" data-tab="${k}">${ic(i)}<span>${t}</span></button>`).join("");
  document.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => irPara(b.dataset.tab)));
  const ativa = $("tab-" + S.tab);
  if (ativa) $("tabs").scrollLeft = Math.max(0, ativa.offsetLeft - ($("tabs").clientWidth - ativa.offsetWidth) / 2);
  conexao(true);
  $("foot").textContent = d.config.disclaimer || "";
  if (d.vazio) {
    $("view").innerHTML = card("Pasta de dados sem posições", "", `<p>${esc(d.faltando.join(" "))}</p><p class="muted">Abra Configurações e aponte para uma pasta com a estrutura esperada, ou use os dados de exemplo.</p>`);
    return;
  }
  d.alocacao.linhas.forEach((l) => cor(l.classe, "classe"));
  const v = (VIEWS[S.tab] || vGeral)(d);
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
$("b-sync").onclick = async () => { await carregar(true); if ($("sync").classList.contains("ok")) toast("Dados recarregados da pasta."); };
const menu = (abrir) => { $("menu").hidden = !abrir; $("b-menu").setAttribute("aria-expanded", abrir); };
$("b-menu").innerHTML = `${ic("engrenagem")}<span class="lbl">Opções</span>`;
$("b-menu").onclick = (e) => { e.stopPropagation(); menu($("menu").hidden); if (!$("menu").hidden) $("menu").querySelector("[aria-checked=true]").focus(); };
document.querySelectorAll(".skin").forEach((b) => (b.onclick = () => { ls("wd.skin", b.dataset.skin); desenhar(); }));
document.querySelectorAll("[data-modo]").forEach((b) => (b.onclick = () => { ls("wd.modo", b.dataset.modo); desenhar(); }));
if (temaDoSistema) temaDoSistema.addEventListener("change", () => { if (aparencia().modo === "auto") desenhar(); });
document.querySelectorAll("[data-ic]").forEach((el) => (el.outerHTML = ic(el.dataset.ic)));
document.addEventListener("click", (e) => { if (!e.target.closest(".menu-wrap")) menu(false); });
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape") return;
  if (!$("menu").hidden) { menu(false); $("b-menu").focus(); }
  $("drawer").classList.remove("open"); $("modal").classList.remove("open");
});
$("menu").onclick = (e) => { if (e.target.closest(".opt-item")) menu(false); };
let rolou = false;
window.addEventListener("scroll", () => { const r = window.scrollY > 4; if (r !== rolou) { rolou = r; $("top").classList.toggle("rolou", r); } }, { passive: true });
$("b-priv").onclick = () => { S.priv = !S.priv; ls("wd.priv", S.priv ? "1" : "0"); desenhar(); };
$("b-xlsx").onclick = () => (window.location.href = "/api/export.xlsx");
$("b-print").onclick = () => window.print();
$("b-cfg").onclick = abrirConfig;
$("drawer").onclick = (e) => { if (e.target.id === "drawer") $("drawer").classList.remove("open"); };
$("modal").onclick = (e) => { if (e.target.id === "modal") $("modal").classList.remove("open"); };

carregar();
setInterval(vigiar, 4000);
document.addEventListener("visibilitychange", () => { if (!document.hidden) vigiar(); });

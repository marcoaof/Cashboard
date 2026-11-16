/* Dashboard Financeiro - frontend. Sem framework: estado em S, uma funcao de desenho por aba. */
"use strict";

const TABS = [["geral", "Visão geral"], ["alocacao", "Alocação"], ["resultado", "Lucros"],
  ["gastos", "Gastos"], ["evolucao", "Evolução e simulador"], ["gestao", "Gestão"]];
/* Cores e fontes vem do CSS (styles.css), para os graficos acompanharem o tema claro ou escuro. */
let SERIES = [], INK, INK2, MUTED, GRID, SURFACE, SURFACE2, FONTE;
function lerTema() {
  const css = getComputedStyle(document.documentElement), v = (n) => css.getPropertyValue(n).trim();
  SERIES = [1, 2, 3, 4, 5, 6].map((i) => v("--s" + i));
  INK = v("--ink"); INK2 = v("--ink-2"); MUTED = v("--muted"); GRID = v("--line");
  SURFACE = v("--surface"); SURFACE2 = v("--surface-2"); FONTE = v("--font-ui");
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
const brlAbbr = (v) => S.priv ? "•••" : Math.abs(v) >= 1e6 ? (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi"
  : Math.abs(v) >= 1e3 ? (v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil" : v.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
const pct = (v, casas = 2) => v == null ? "n/d" : (v * 100).toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas }) + "%";
const qtd = (v) => v == null ? "" : S.priv ? "•••" : v.toLocaleString("pt-BR", { maximumFractionDigits: 6 });
const dt = (s) => s && /^\d{4}-\d{2}-\d{2}/.test(s) ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : /^\d{4}-\d{2}$/.test(s || "") ? `${s.slice(5)}/${s.slice(0, 4)}` : (s || "");
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const mes = (s) => s && /^\d{4}-\d{2}$/.test(s) ? `${MESES[+s.slice(5) - 1]}/${s.slice(0, 4)}` : (s || "");
const sinal = (v) => v == null ? "" : v >= 0 ? "pos" : "neg";
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

async function carregar(silencioso) {
  try {
    S.d = await api("/api/dashboard");
    if (!S.schema) S.schema = await api("/api/schema");
    S.linhas = null; S.docs = null;
    $("sync").className = "sync ok";
    if (!silencioso) S.mes = null;
    desenhar();
  } catch (e) {
    $("sync").className = "sync err";
    toast(e.message, true);
  }
}
async function vigiar() {
  try {
    const s = await api("/api/state");
    $("sync").className = "sync ok";
    if (S.d && s.fingerprint !== S.d.fingerprint) {
      if ($("drawer").classList.contains("open") || S.editando) return;   // nao atropela quem digita
      const y = window.scrollY;
      await carregar(true);
      window.scrollTo(0, y);
      toast("Arquivos alterados na pasta de dados. Painel atualizado.");
    }
  } catch (e) { $("sync").className = "sync err"; }
}

/* ---------------------------------------------------------------- graficos */
const corDe = {};
function cor(nome, grupo) {
  const k = grupo + "|" + nome;   // guarda a posicao na paleta, nao a cor: a cor muda com o tema
  if (corDe[k] === undefined) corDe[k] = Object.keys(corDe).filter((x) => x.startsWith(grupo + "|")).length;
  return corDe[k] < SERIES.length ? SERIES[corDe[k]] : MUTED;
}
function chart(id, option) {
  const el = $(id);
  if (!el) return;
  if (!window.echarts) { el.innerHTML = '<p class="muted small">Gráfico indisponível: a biblioteca ECharts não carregou (sem internet?). As tabelas continuam valendo.</p>'; return; }
  const c = echarts.init(el, null, { renderer: "svg" });
  const eixo = { axisLine: { lineStyle: { color: GRID } }, axisTick: { show: false }, axisLabel: { color: MUTED }, splitLine: { lineStyle: { color: GRID } } };
  const base = {
    backgroundColor: "transparent", color: SERIES, textStyle: { color: INK2, fontFamily: FONTE },
    grid: { left: 4, right: 16, top: option.legend ? 38 : 14, bottom: 4, containLabel: true },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow", shadowStyle: { color: GRID, opacity: .35 } }, backgroundColor: SURFACE2, borderColor: GRID, textStyle: { color: INK, fontFamily: FONTE }, valueFormatter: (v) => brl(v) },
  };
  if (option.legend) option.legend = { top: 0, left: 0, textStyle: { color: INK2 }, icon: "roundRect", itemWidth: 10, itemHeight: 10, ...option.legend };
  for (const k of ["xAxis", "yAxis"]) if (option[k]) option[k] = { ...eixo, ...option[k], axisLabel: { ...eixo.axisLabel, ...(option[k].axisLabel || {}) } };
  c.setOption({ ...base, ...option, tooltip: { ...base.tooltip, ...(option.tooltip || {}) }, grid: { ...base.grid, ...(option.grid || {}) } });
  S.charts.push(c);
}
window.addEventListener("resize", () => S.charts.forEach((c) => c.resize()));
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
const metodo = (p) => p.metodo === "custo" ? "sobre o custo" : p.metodo === "observado" ? `rendimento desde ${dt(p.desde)}` : "sem custo no arquivo";

/* ---------------------------------------------------------------- aba: visao geral */
function vGeral(d) {
  const b = d.blocos, r = d.resultado, ev = d.evolucao, ant = ev.length > 1 ? ev[ev.length - 2] : null;
  const g = d.gastos[d.gastos.length - 1];
  const delta = ant ? `<span class="${sinal(b.total - ant.total)}">${comSinal(b.total - ant.total)}</span> desde a posição de ${dt(ant.data)}` : "Primeira posição registrada";
  const res = d.reserva;
  // Faixa de composicao: mesmas partes e mesmas cores do grafico de evolucao.
  const partes = PARTES.map(([nome, k], i) => ({ nome, v: b[k], cor: SERIES[i] })).filter((p) => p.v > 0);
  const hero = `<section class="hero">
      <div><span class="eyebrow">Patrimônio total · posição de ${dt(d.snapshot)}</span>
        <div class="hero-num">${brl(b.total)}</div><p class="hero-sub">${delta}</p></div>
      <div><div class="strip" role="img" aria-label="Composição do patrimônio por bloco">${partes.map((p) => `<i style="flex:${p.v};background:${p.cor}" title="${p.nome}: ${pct(p.v / b.total, 1)}"></i>`).join("")}</div>
        <ul class="legend">${partes.map((p) => `<li><span class="dot" style="background:${p.cor};margin:0"></span><span class="nome">${p.nome}</span><span class="v">${brl(p.v)}</span><span class="p">${pct(p.v / b.total, 1)}</span></li>`).join("")}</ul></div>
    </section>`;
  const kp = [
    kpi("Carteira de investimento", brl(b.base), `Base da alocação. Caixa ainda não investido: ${pct(b.base ? b.caixa / b.base : 0)}`),
    kpi("Lucro não realizado", comSinal(r.sobre_custo), r.custo_total ? `${pct(r.sobre_custo / r.custo_total)} sobre custo de ${brl(r.custo_total)}` : "Nenhuma posição com custo no arquivo", sinal(r.sobre_custo)),
    kpi("Rendimento observado", comSinal(r.observado), r.observado_desde ? `Títulos sem custo no arquivo, desde ${dt(r.observado_desde)}` : "Sem títulos nessa condição", sinal(r.observado)),
    kpi("Renda passiva", brl(d.passiva.total_12m), `Recebida nos últimos ${d.passiva.n_meses} meses com lançamento`),
    g ? kpi(`Gastos de ${mes(g.mes)}`, brl(g.gastos), `Renda ${brl(g.renda)} · poupança ${pct(g.taxa)}`) : kpi("Gastos do mês", "n/d", "Sem lançamentos"),
    kpi("Reserva", brl(res.atual), res.meta ? `<div class="prog"><i style="width:${Math.min(100, res.atual / res.meta * 100)}%"></i></div>${pct(res.atual / res.meta, 0)} da meta de ${brl(res.meta)}` : "Meta não cadastrada"),
  ].join("");
  const avisos = [];
  if (d.alertas_posicao) avisos.push(`${d.alertas_posicao} de ${d.posicoes.length} posições têm valor estimado, carregado ou por premissa (veja a coluna Obs em Lucros).`);
  d.faltando.forEach((f) => avisos.push(f));
  const banner = avisos.length ? `<details class="banner"><summary>${avisos.length} ponto(s) de atenção nos dados</summary><ul>${avisos.map((a) => `<li>${esc(a)}</li>`).join("")}</ul></details>` : "";
  const tipos = tabela([{ t: "Tipo" }, { t: "Valor", n: 1 }, { t: "Lucro sobre custo", n: 1 }, { t: "Rendimento observado", n: 1 }, { t: "Sem dado" }],
    r.por_tipo.map((t) => [esc(t.tipo), brl(t.valor), t.n_custo ? `<span class="${sinal(t.sobre_custo)}">${comSinal(t.sobre_custo)}</span>` : '<span class="muted">n/d</span>',
      t.n_observado ? `<span class="${sinal(t.observado)}">${comSinal(t.observado)}</span>` : '<span class="muted">n/d</span>', t.n_sem_dado ? `${t.n_sem_dado} de ${t.n}` : ""]),
    ["Total", brl(b.total), comSinal(r.sobre_custo), comSinal(r.observado), ""]);
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
        ${card("Lucros por tipo de produto", "Sobre custo: valor menos quantidade vezes preço médio. Observado: variação desde a primeira posição do título.", tipos)}
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
      <div><span class="dot" style="background:${cor(l.classe, "classe")}"></span>${esc(l.classe)}</div>
      <div class="track" title="Atual ${pct(l.pct)} · alvo ${pct(l.alvo)} · banda ${pct(l.min)} a ${pct(l.max)}">
        ${l.alvo != null && l.max > 0 ? `<div class="band" style="left:${w(l.min)};width:calc(${w(l.max)} - ${w(l.min)})"></div>` : ""}
        <div class="bar" style="width:${w(l.pct)};background:${cor(l.classe, "classe")}"></div>
        ${l.alvo != null && l.classe !== d.config.cash_class ? `<div class="alvo" style="left:${w(l.alvo)}"></div>` : ""}
      </div>
      <div class="num small">${pct(l.pct)} <span class="muted">alvo ${pct(l.alvo, 0)}</span><br>${tag[l.situacao] || ""}</div></div>`).join("");
  const tab = tabela([{ t: "Classe" }, { t: "Valor", n: 1 }, { t: "Atual", n: 1 }, { t: "Alvo", n: 1 }, { t: "Banda", n: 1 }, { t: "Desvio", n: 1 }, { t: "Falta para o alvo", n: 1 }, { t: "Instrumento" }],
    a.linhas.map((l) => [esc(l.classe), brl(l.valor), pct(l.pct), pct(l.alvo), l.alvo == null ? "" : `${pct(l.min, 0)} a ${pct(l.max, 0)}`,
      l.alvo == null || !l.situacao ? "" : `<span class="${l.situacao === "ok" ? "" : "neg"}">${((l.pct - l.alvo) * 100).toLocaleString("pt-BR", { maximumFractionDigits: 2, signDisplay: "always" })} p.p.</span>`,
      l.falta == null ? "" : comSinal(l.falta), `<span class="small muted">${esc(l.instrumento)}</span>`]),
    ["Total", brl(d.blocos.base), pct(a.soma_pct), pct(a.soma_alvo), "", "", "", ""]);
  if (S.aporte == null) S.aporte = +(Math.max(0, d.blocos.caixa - d.reserva.para_reserva) || d.aporte_mensal || 0).toFixed(2);
  const sug = sugestao(d, S.aporte), tot = sug.reduce((s, g) => s + g.valor, 0);
  const sugTab = tabela([{ t: "Classe" }, { t: "Instrumento da política" }, { t: "Valor", n: 1 }, { t: "Parte", n: 1 }],
    sug.map((g) => [esc(g.classe), `<span class="small">${esc(g.instrumento)}</span>`, brl(g.valor), pct(S.aporte ? g.valor / S.aporte : 0, 1)]),
    ["Total distribuído", "", brl(tot), S.aporte - tot > 0.005 ? `sobra ${brl(S.aporte - tot)}` : ""]);
  return {
    html: `<section class="grid cols">
      ${card("Alocação atual contra a meta", `Metas ${a.versao ? `versão ${esc(a.versao)}, vigente desde ${dt(a.vigencia)}` : "não cadastradas"}. Percentuais sobre a carteira de investimento (${brl(d.blocos.base)}), sem reserva. Faixa clara: banda. Traço: alvo.`, barras, "wide")}
      ${card("Detalhe por classe", `"Falta para o alvo" usa a base sem o caixa destinado à reserva (${brl(d.reserva.para_reserva)}).`, tab, "wide")}
      ${card("Onde aportar", "Cálculo mecânico: distribui o valor pelas classes abaixo do alvo, na proporção da distância. Não é ordem nem recomendação.",
        `<div class="form noprint" style="margin-bottom:12px"><div><label for="i-aporte">Valor a aportar (R$)</label><input id="i-aporte" type="number" step="0.01" min="0" value="${S.aporte}"></div></div>${sugTab}`)}
      ${card("Vencimentos da renda fixa", "Títulos da posição atual com data de vencimento.", tabela([{ t: "Vencimento" }, { t: "Ativo" }, { t: "Taxa" }, { t: "Valor", n: 1 }],
        d.escada.map((e) => [dt(e.data), esc(e.ativo), esc(e.indexador), brl(e.valor)])))}
    </section>`,
    depois() { $("i-aporte").onchange = (e) => { S.aporte = Math.max(0, +e.target.value || 0); desenhar(); }; },
  };
}

/* ---------------------------------------------------------------- aba: lucros */
function vResultado(d) {
  const r = d.resultado, ps = filtradas().filter((p) => p.valor);
  const com = ps.filter((p) => p.resultado != null).sort((a, b) => a.resultado - b.resultado);
  const linhas = [...ps].sort((a, b) => b.valor - a.valor).map((p) => [
    `${esc(p.ativo)}${p.alerta ? ` <span class="tag warn" title="${esc(p.obs)}">estimado</span>` : ""}<br><span class="muted small">${esc(p.indexador)}${p.vencimento ? ` · vence ${dt(p.vencimento)}` : ""}</span>`,
    esc(p.tipo), esc(p.classe), qtd(p.quantidade), p.preco_medio == null ? "" : brl(p.preco_medio), p.preco_mercado == null ? "" : brl(p.preco_mercado),
    brl(p.valor), p.resultado == null ? '<span class="muted">n/d</span>' : `<span class="${sinal(p.resultado)}">${comSinal(p.resultado)}</span>`,
    p.resultado_pct == null ? "" : `<span class="${sinal(p.resultado_pct)}">${pct(p.resultado_pct)}</span>`, `<span class="small muted">${metodo(p)}</span>`]);
  const real = r.realizado;
  const realTab = tabela([{ t: "Data" }, { t: "Ticker" }, { t: "Qtd", n: 1 }, { t: "Venda", n: 1 }, { t: "Custo", n: 1 }, { t: "Resultado", n: 1 }],
    real.itens.map((i) => [dt(i.data), esc(i.ticker), qtd(i.quantidade), brl(i.venda), brl(i.custo), `<span class="${sinal(i.resultado)}">${comSinal(i.resultado)}</span>`]),
    ["Total", "", "", "", "", comSinal(real.total)]);
  const semCusto = real.sem_custo.length ? `<p class="small muted">Vendas sem compra registrada (resultado não calculado): ${real.sem_custo.map((s) => `${esc(s.ativo)} em ${dt(s.data)}, ${brl(s.venda)}`).join("; ")}.</p>` : "";
  return {
    html: `<section class="kpis">
        ${kpi("Lucro não realizado sobre custo", comSinal(r.sobre_custo), r.custo_total ? `${pct(r.sobre_custo / r.custo_total)} sobre ${brl(r.custo_total)}` : "", sinal(r.sobre_custo))}
        ${kpi("Rendimento observado", comSinal(r.observado), r.observado_desde ? `desde ${dt(r.observado_desde)}; não é o lucro desde a aplicação` : "", sinal(r.observado))}
        ${kpi("Resultado realizado", comSinal(real.total), `${real.itens.length} venda(s) com custo · ${real.sem_custo.length} sem custo`, sinal(real.total))}
        ${kpi("IR retido registrado", brl(real.ir_pago), "Soma de ir_brl em transacoes.csv")}
      </section>
      <section class="grid cols">
        ${card("Resultado por posição", "Só posições com resultado calculável. Verde: ganho. Terracota: perda.", `<div id="c-res" class="chart" style="height:${Math.max(220, com.length * 34 + 40)}px"></div>`)}
        ${card("Resultado por tipo de produto", "Soma das posições de cada tipo. Os dois métodos não se somam: medem períodos diferentes.",
          tabela([{ t: "Tipo" }, { t: "Valor", n: 1 }, { t: "Custo", n: 1 }, { t: "Lucro sobre custo", n: 1 }, { t: "%", n: 1 }, { t: "Rendimento observado", n: 1 }],
            r.por_tipo.map((t) => [esc(t.tipo), brl(t.valor), t.n_custo ? brl(t.custo) : "", t.n_custo ? `<span class="${sinal(t.sobre_custo)}">${comSinal(t.sobre_custo)}</span>` : '<span class="muted">n/d</span>',
              t.n_custo && t.custo ? pct(t.sobre_custo / t.custo) : "", t.n_observado ? `<span class="${sinal(t.observado)}">${comSinal(t.observado)}</span>` : '<span class="muted">n/d</span>'])))}
        ${card("Posições", `Posição de ${dt(d.snapshot)}${S.classe || S.tipo ? ", com filtro aplicado" : ""}. Etiqueta "estimado": valor carregado, estimado ou por premissa (passe o mouse para ler a observação).`,
          tabela([{ t: "Ativo" }, { t: "Tipo" }, { t: "Classe" }, { t: "Qtd", n: 1 }, { t: "Preço médio", n: 1 }, { t: "Preço atual", n: 1 }, { t: "Valor", n: 1 }, { t: "Resultado", n: 1 }, { t: "%", n: 1 }, { t: "Método" }], linhas,
            ["Total", "", "", "", "", "", brl(ps.reduce((s, p) => s + p.valor, 0)), "", "", ""]), "wide")}
        ${card("Resultado realizado", "Venda menos custo médio das compras registradas em transacoes.csv.", realTab + semCusto, "wide")}
      </section>`,
    depois() {
      chart("c-res", {
        grid: { right: 24 }, xAxis: eixoBRL, yAxis: { type: "category", data: com.map((p) => p.ticker || p.ativo.slice(0, 26)), axisLabel: { color: INK2 } },
        tooltip: { formatter: (a) => { const p = com[a[0].dataIndex]; return `${esc(p.ativo)}<br><b>${comSinal(p.resultado)}</b> (${pct(p.resultado_pct)})<br>${metodo(p)}`; } },
        series: [barra({ data: com.map((p) => ({ value: +p.resultado.toFixed(2), itemStyle: { color: p.resultado >= 0 ? SERIES[0] : SERIES[3], borderRadius: p.resultado >= 0 ? [0, 4, 4, 0] : [4, 0, 0, 4] } })) })],
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
        ${kpi("Gastos", brl(g.gastos), `Fixo ${brl(g.fixo)} · variável ${brl(g.variavel)}`)}
        ${kpi("Sobra", comSinal(g.sobra), "Renda menos gastos", sinal(g.sobra))}
        ${kpi("Taxa de poupança", pct(g.taxa), "(renda − gastos) ÷ renda, no mês", sinal(g.taxa))}
      </section>
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
    <p class="small">Pasta em uso: <code>${esc(c.resolved)}</code><br>Tabelas encontradas: ${c.tables_found.length ? esc(c.tables_found.join(", ")) : "nenhuma"} · planilha carteira.xlsx: ${c.workbook ? "sim" : "não"} · modo somente acréscimo: ${c.append_only ? "ligado" : "desligado"}</p>
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
  lerTema();
  const escuro = document.documentElement.getAttribute("data-theme") === "dark";
  $("b-tema").textContent = escuro ? "Modo claro" : "Modo escuro";
  S.charts.forEach((c) => c.dispose()); S.charts = [];
  $("tabs").innerHTML = TABS.map(([k, t]) => `<button role="tab" aria-selected="${S.tab === k}" data-tab="${k}">${t}</button>`).join("");
  document.querySelectorAll("[data-tab]").forEach((b) => (b.onclick = () => { S.tab = b.dataset.tab; ls("wd.tab", S.tab); desenhar(); window.scrollTo(0, 0); }));
  $("b-priv").className = "ghost" + (S.priv ? " on" : "");
  $("sub").textContent = d.vazio ? "sem dados" : `posição de ${dt(d.snapshot)}`;
  $("foot").textContent = d.config.disclaimer || "";
  if (d.vazio) {
    $("view").innerHTML = card("Pasta de dados sem posições", "", `<p>${esc(d.faltando.join(" "))}</p><p class="muted">Abra Configurações e aponte para uma pasta com a estrutura esperada, ou use os dados de exemplo.</p>`);
    return;
  }
  const opcoes = (el, vals, atual, rot) => (el.innerHTML = `<option value="">${rot}</option>` + vals.map((v) => `<option ${v === atual ? "selected" : ""}>${esc(v)}</option>`).join(""));
  opcoes($("f-classe"), [...new Set(d.posicoes.map((p) => p.classe))].sort(), S.classe, "Todas as classes");
  opcoes($("f-tipo"), [...new Set(d.posicoes.map((p) => p.tipo))].sort(), S.tipo, "Todos os tipos");
  d.alocacao.linhas.forEach((l) => cor(l.classe, "classe"));
  const v = (VIEWS[S.tab] || vGeral)(d);
  $("view").innerHTML = v.html;
  if (v.depois) v.depois();
}

$("f-classe").onchange = (e) => { S.classe = e.target.value; if (S.tab !== "resultado") S.tab = "resultado"; desenhar(); };
$("f-tipo").onchange = (e) => { S.tipo = e.target.value; if (S.tab !== "resultado") S.tab = "resultado"; desenhar(); };
$("b-priv").onclick = () => { S.priv = !S.priv; ls("wd.priv", S.priv ? "1" : "0"); desenhar(); };
$("b-tema").onclick = () => {
  const novo = document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", novo);
  ls("wd.tema", novo);
  desenhar();
};
$("b-xlsx").onclick = () => (window.location.href = "/api/export.xlsx");
$("b-print").onclick = () => window.print();
$("b-cfg").onclick = abrirConfig;
$("drawer").onclick = (e) => { if (e.target.id === "drawer") $("drawer").classList.remove("open"); };
$("modal").onclick = (e) => { if (e.target.id === "modal") $("modal").classList.remove("open"); };

carregar();
setInterval(vigiar, 4000);

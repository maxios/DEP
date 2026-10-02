/**
 * The console, as one page. It is served as a string so the compiled binary
 * carries it with no asset loading of any kind, and it talks to nothing but
 * the local server that served it.
 *
 * Deliberately free of backticks and backslashes: this file is a template
 * literal, and an escape sequence here would arrive at the browser changed.
 */
export function consolePage(project: string): string {
  const name = project.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return PAGE.split('__PROJECT__').join(name)
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__PROJECT__ — dep console</title>
<style>
  :root {
    --bg: #000000;
    --panel: rgba(255,255,255,0.045);
    --panel-solid: #0e0e10;
    --line: rgba(255,255,255,0.09);
    --line-soft: rgba(255,255,255,0.055);
    --ink: #f5f5f7;
    --dim: #86868b;
    --dimmer: #5c5c61;
    --accent: #0a84ff;
    --fresh: #30d158;
    --aging: #ffd60a;
    --stale: #ff453a;
    --tutorial: #30d158;
    --howto: #ff9f0a;
    --reference: #0a84ff;
    --explanation: #bf5af0;
    --decision: #ff375f;
    --radius: 14px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: var(--bg);
    color: var(--ink);
    font: 13px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .mono { font-family: "SF Mono", ui-monospace, "JetBrains Mono", Menlo, monospace; font-size: 11.5px; }

  header {
    display: flex; align-items: center; gap: 16px;
    padding: 0 16px; height: 46px; flex: 0 0 46px;
    border-bottom: 1px solid var(--line);
    background: rgba(20,20,22,0.72);
    backdrop-filter: saturate(180%) blur(20px);
    position: relative; z-index: 20;
  }
  .brand { display: flex; align-items: center; gap: 9px; font-weight: 590; letter-spacing: -0.01em; }
  .mark {
    width: 19px; height: 19px; border-radius: 6px;
    background: linear-gradient(145deg, #0a84ff, #bf5af0);
    box-shadow: 0 0 14px rgba(10,132,255,0.35);
  }
  nav { display: flex; gap: 2px; margin: 0 auto; background: rgba(255,255,255,0.055); padding: 3px; border-radius: 9px; }
  nav button {
    appearance: none; border: 0; background: transparent; color: var(--dim);
    font: inherit; font-size: 12px; font-weight: 510;
    padding: 4px 13px; border-radius: 7px; cursor: pointer; transition: color .15s, background .15s;
  }
  nav button:hover { color: var(--ink); }
  nav button[aria-selected="true"] { background: rgba(255,255,255,0.12); color: var(--ink); }
  .live { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--dim);
          border: 1px solid var(--line); border-radius: 999px; padding: 4px 11px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--fresh); box-shadow: 0 0 8px var(--fresh); }
  .dot.cold { background: var(--dimmer); box-shadow: none; }

  main { flex: 1; min-height: 0; position: relative; }
  section.screen { position: absolute; inset: 0; display: none; }
  section.screen.on { display: flex; }

  /* ── graph ─────────────────────────────────────────── */
  #canvas-wrap { flex: 1; position: relative; min-width: 0; }
  canvas { display: block; width: 100%; height: 100%; cursor: grab; }
  canvas.dragging { cursor: grabbing; }
  .float { position: absolute; background: rgba(22,22,24,0.78); backdrop-filter: blur(18px) saturate(180%);
           border: 1px solid var(--line); border-radius: var(--radius); }
  #stats { top: 16px; left: 16px; display: flex; align-items: stretch; }
  #stats .stat { padding: 11px 16px; border-right: 1px solid var(--line-soft); }
  #stats .stat:last-child { border-right: 0; }
  .stat b { display: block; font-size: 21px; font-weight: 580; letter-spacing: -0.02em; line-height: 1.15; }
  .stat span { font-size: 10.5px; color: var(--dim); text-transform: lowercase; }
  .verdict { display: flex; gap: 12px; align-items: center; font-size: 12px; }
  .verdict em { font-style: normal; font-weight: 560; }

  #legend { bottom: 16px; left: 16px; padding: 12px 14px; display: grid; gap: 9px; max-width: 460px; }
  .legend-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
  .legend-row > .label { width: 62px; font-size: 10px; letter-spacing: .07em; text-transform: uppercase; color: var(--dimmer); }
  .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dim);
          border: 1px solid transparent; border-radius: 7px; padding: 2px 8px; cursor: pointer; user-select: none; }
  .chip:hover { color: var(--ink); background: rgba(255,255,255,0.05); }
  .chip.off { opacity: .34; }
  .chip i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .chip o { width: 9px; height: 9px; border-radius: 50%; display: inline-block; border: 1.5px solid currentColor; }
  .chip b { font-weight: 500; color: var(--dimmer); font-variant-numeric: tabular-nums; }
  .chip.rel { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 10px; letter-spacing: .04em;
              border-color: var(--line); color: var(--dim); }

  aside { width: 330px; flex: 0 0 330px; border-left: 1px solid var(--line); overflow-y: auto;
          background: var(--panel-solid); padding: 18px; }
  aside h2 { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; margin: 9px 0 3px; }
  aside .path { color: var(--dim); word-break: break-all; margin-bottom: 16px; }
  .badges { display: flex; gap: 6px; flex-wrap: wrap; }
  .badge { font-size: 10.5px; padding: 2.5px 8px; border-radius: 6px; background: rgba(255,255,255,0.08); color: var(--dim); }
  .badge.life { color: #000; font-weight: 600; }
  .group { border-top: 1px solid var(--line-soft); padding-top: 12px; margin-top: 16px; }
  .group > h3 { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--dimmer); margin-bottom: 9px; }
  .kv { display: flex; justify-content: space-between; gap: 12px; padding: 3.5px 0; font-size: 12px; }
  .kv span { color: var(--dim); }
  .kv b { font-weight: 500; text-align: right; }
  .meter { height: 4px; border-radius: 3px; background: rgba(255,255,255,0.1); overflow: hidden; margin-top: 7px; }
  .meter > i { display: block; height: 100%; border-radius: 3px; }
  .link-row { display: flex; gap: 8px; align-items: baseline; padding: 3.5px 0; font-size: 11.5px; cursor: pointer; }
  .link-row:hover b { color: var(--accent); }
  .rel { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 9.5px; letter-spacing: .05em;
         width: 74px; flex: 0 0 74px; text-align: right; }
  .link-row b { font-weight: 450; color: var(--ink); word-break: break-all; }
  .empty { color: var(--dimmer); font-size: 12px; padding: 20px 0; text-align: center; }

  /* ── lists & tables ───────────────────────────────── */
  .split { display: flex; width: 100%; min-height: 0; }
  .rail { width: 300px; flex: 0 0 300px; border-right: 1px solid var(--line); overflow-y: auto; background: var(--panel-solid); }
  .rail-head { padding: 14px 16px 10px; display: flex; align-items: baseline; justify-content: space-between;
               position: sticky; top: 0; background: var(--panel-solid); border-bottom: 1px solid var(--line-soft); }
  .rail-head h3 { font-size: 13px; font-weight: 600; }
  .rail-head span { font-size: 11px; color: var(--dimmer); }
  .call { padding: 11px 16px; border-bottom: 1px solid var(--line-soft); cursor: pointer; border-left: 2px solid transparent; }
  .call:hover { background: rgba(255,255,255,0.03); }
  .call.on { background: rgba(10,132,255,0.1); border-left-color: var(--accent); }
  .call .kind { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 10.5px; color: var(--accent); }
  .call .q { margin: 4px 0 5px; font-size: 12.5px; color: var(--ink); }
  .call .meta { font-size: 10.5px; color: var(--dimmer); display: flex; gap: 8px; }
  .pane { flex: 1; min-width: 0; overflow-y: auto; padding: 22px 26px; }
  .pane h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.025em; margin-bottom: 4px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 15px 17px; }
  .card > h3 { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--dimmer); margin-bottom: 11px; }
  .big { font-size: 30px; font-weight: 580; letter-spacing: -0.03em; line-height: 1; }
  .triple { display: flex; gap: 20px; align-items: baseline; }
  .triple div span { display: block; font-size: 10.5px; color: var(--dim); }
  .bar { display: flex; height: 6px; border-radius: 4px; overflow: hidden; margin: 13px 0 11px; background: rgba(255,255,255,0.08); }
  .bar > i { display: block; height: 100%; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--dimmer);
       font-weight: 500; padding: 0 10px 9px; border-bottom: 1px solid var(--line); }
  td { padding: 9px 10px; border-bottom: 1px solid var(--line-soft); vertical-align: middle; }
  tr.row:hover td { background: rgba(255,255,255,0.028); cursor: pointer; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; color: var(--dim); }
  .overdue { font-variant-numeric: tabular-nums; font-size: 11px; padding: 1.5px 7px; border-radius: 5px; font-weight: 600; }
  .pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--dim); }
  .pill i { width: 7px; height: 7px; border-radius: 50%; }
  .reason { font-size: 10px; padding: 2px 7px; border-radius: 5px; background: rgba(255,255,255,0.08); color: var(--dim); }
  .reason.match { background: rgba(10,132,255,0.18); color: #6cb6ff; }
  .reason.required { background: rgba(255,159,10,0.16); color: #ffb340; }
  .reason.expanded { background: rgba(191,90,240,0.16); color: #d08cf5; }
  .sig { display: inline-flex; gap: 3px; vertical-align: middle; }
  .sig i { width: 13px; height: 7px; border-radius: 2px; background: rgba(255,255,255,0.12); }
  .step { display: flex; gap: 10px; align-items: baseline; padding: 8px 10px; border-bottom: 1px solid var(--line-soft); }
  .step .glyph { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 11px; width: 20px; flex: 0 0 20px; }
  .step .id { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 11.5px; }
  .step .desc { color: var(--dim); font-size: 11.5px; flex: 1; }
  .step .to { font-size: 10.5px; color: var(--dimmer); font-family: "SF Mono", ui-monospace, Menlo, monospace; }
  .budget { display: flex; height: 9px; border-radius: 5px; overflow: hidden; background: rgba(255,255,255,0.08); margin: 12px 0 8px; }
  .budget > i { display: block; height: 100%; }
  .keys { display: flex; gap: 16px; font-size: 10.5px; color: var(--dim); }
  .keys span { display: inline-flex; align-items: center; gap: 5px; }
  .keys b { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
  .muted { color: var(--dimmer); }
  ::-webkit-scrollbar { width: 9px; height: 9px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
</style>
</head>
<body>
<header>
  <div class="brand"><div class="mark"></div><span>__PROJECT__</span></div>
  <nav>
    <button data-screen="graph" aria-selected="true">Graph</button>
    <button data-screen="traversal" aria-selected="false">Traversal</button>
    <button data-screen="decisions" aria-selected="false">Decisions</button>
    <button data-screen="health" aria-selected="false">Health</button>
  </nav>
  <div class="live"><span class="dot" id="pulse"></span><span id="live-text">connecting</span></div>
</header>

<main>
  <section class="screen on" id="screen-graph">
    <div id="canvas-wrap">
      <canvas id="graph"></canvas>
      <div class="float" id="stats"></div>
      <div class="float" id="legend"></div>
    </div>
    <aside id="inspector"><div class="empty">Select a document in the graph.</div></aside>
  </section>

  <section class="screen" id="screen-traversal">
    <div class="split">
      <div class="rail">
        <div class="rail-head"><h3>Agent calls</h3><span id="call-count"></span></div>
        <div id="calls"></div>
      </div>
      <div class="pane" id="call-detail"><div class="empty">No request selected.</div></div>
    </div>
  </section>

  <section class="screen" id="screen-decisions">
    <div class="split">
      <div class="rail">
        <div class="rail-head"><h3>Decision trees</h3><span id="tree-count"></span></div>
        <div id="trees"></div>
      </div>
      <div class="pane" id="tree-detail"><div class="empty">No procedure selected.</div></div>
    </div>
  </section>

  <section class="screen" id="screen-health">
    <div class="pane" id="health"></div>
  </section>
</main>

<script>
(function () {
  'use strict';

  var TYPE_COLOR = {
    tutorial: '#30d158', 'how-to': '#ff9f0a', reference: '#0a84ff',
    explanation: '#bf5af0', 'decision-record': '#ff375f'
  };
  var LIFE_COLOR = { FRESH: '#30d158', AGING: '#ffd60a', STALE: '#ff453a' };
  var REL_ORDER = ['TEACHES', 'USES', 'EXPLAINS', 'DECIDES', 'REQUIRES', 'NEXT', 'INLINE'];

  var state = {
    graph: null, validation: null, trace: null, procedures: null,
    selected: null, selectedCall: null, selectedTree: null,
    hiddenTypes: {}, hiddenLife: {}, hiddenRels: {},
    nodes: [], edges: [], view: { x: 0, y: 0, k: 1 }, alpha: 1
  };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  function byId(id) { return document.getElementById(id); }
  function typeColor(t) { return TYPE_COLOR[t] || '#8e8e93'; }
  function lifeColor(l) { return LIFE_COLOR[l] || '#8e8e93'; }
  function basename(p) {
    var cut = p.lastIndexOf('/');
    var file = cut < 0 ? p : p.slice(cut + 1);
    return file.slice(-3) === '.md' ? file.slice(0, -3) : file;
  }
  function num(n) { return typeof n === 'number' ? n.toLocaleString('en-US') : '-'; }
  function days(iso) {
    if (!iso) return null;
    var then = Date.parse(iso);
    if (!then) return null;
    return Math.round((Date.now() - then) / 86400000);
  }
  function when(iso) {
    var t = Date.parse(iso);
    if (!t) return '';
    var d = new Date(t);
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    var ss = String(d.getSeconds()).padStart(2, '0');
    return hh + ':' + mm + ':' + ss;
  }

  function get(path) {
    return fetch(path, { headers: { accept: 'application/json' } }).then(function (r) {
      if (!r.ok) return r.json().then(function (b) { throw new Error(b.error || r.status); });
      return r.json();
    });
  }

  // ── graph ───────────────────────────────────────────────────────────

  var canvas = byId('graph');
  var ctx = canvas.getContext('2d');
  var hover = null, dragNode = null, panning = false, last = { x: 0, y: 0 };

  function sizeCanvas() {
    var wrap = byId('canvas-wrap');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = wrap.clientWidth * dpr;
    canvas.height = wrap.clientHeight * dpr;
    canvas.style.width = wrap.clientWidth + 'px';
    canvas.style.height = wrap.clientHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function layout(graph) {
    var wrap = byId('canvas-wrap');
    var w = wrap.clientWidth || 900, h = wrap.clientHeight || 600;
    var byPath = {};
    state.nodes = graph.nodes.map(function (n, i) {
      var angle = (i / graph.nodes.length) * Math.PI * 2;
      var node = {
        path: n.path, title: basename(n.path), type: n.type, lifecycle: n.lifecycle,
        inbound: n.inbound, outbound: n.outbound, audience: n.audience, confidence: n.confidence,
        x: w / 2 + Math.cos(angle) * Math.min(w, h) * 0.38,
        y: h / 2 + Math.sin(angle) * Math.min(w, h) * 0.38,
        vx: 0, vy: 0,
        r: 5 + Math.sqrt(n.inbound) * 3.1
      };
      byPath[n.path] = node;
      return node;
    });
    state.edges = graph.edges.map(function (e) {
      return { s: byPath[e.source], t: byPath[e.target], rel: e.rel };
    }).filter(function (e) { return e.s && e.t; });
    state.alpha = 1;
  }

  function visible(node) {
    return !state.hiddenTypes[node.type] && !state.hiddenLife[node.lifecycle];
  }

  function tick() {
    if (state.alpha === 0 && !dragNode) return;
    var wrap = byId('canvas-wrap');
    var w = wrap.clientWidth || 900, h = wrap.clientHeight || 600;
    var nodes = state.nodes, i, j, a, b;
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      for (j = i + 1; j < nodes.length; j++) {
        b = nodes[j];
        var dx = b.x - a.x, dy = b.y - a.y;
        var d2 = dx * dx + dy * dy || 0.01;
        var d = Math.sqrt(d2);
        var push = 9000 / d2;
        if (d < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = 1; }
        var fx = (dx / d) * push, fy = (dy / d) * push;
        a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
      }
    }
    for (i = 0; i < state.edges.length; i++) {
      var e = state.edges[i];
      var ex = e.t.x - e.s.x, ey = e.t.y - e.s.y;
      var ed = Math.sqrt(ex * ex + ey * ey) || 0.01;
      var pull = (ed - 150) * 0.013;
      var ux = (ex / ed) * pull, uy = (ey / ed) * pull;
      e.s.vx += ux; e.s.vy += uy; e.t.vx -= ux; e.t.vy -= uy;
    }
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      a.vx += (w / 2 - a.x) * 0.0026;
      a.vy += (h / 2 - a.y) * 0.0026;
      if (a === dragNode) { a.vx = 0; a.vy = 0; continue; }
      a.vx *= 0.82; a.vy *= 0.82;
      a.x += a.vx * state.alpha;
      a.y += a.vy * state.alpha;
    }
    state.alpha *= 0.985;
    if (state.alpha < 0.004) {
      state.alpha = 0;
      for (i = 0; i < nodes.length; i++) { nodes[i].vx = 0; nodes[i].vy = 0; }
    }
  }

  function toScreen(p) { return { x: p.x * state.view.k + state.view.x, y: p.y * state.view.k + state.view.y }; }

  function draw() {
    var wrap = byId('canvas-wrap');
    var w = wrap.clientWidth, h = wrap.clientHeight;
    ctx.clearRect(0, 0, w, h);
    var sel = state.selected;
    var near = {};
    if (sel) {
      near[sel] = true;
      state.edges.forEach(function (e) {
        if (e.s.path === sel) near[e.t.path] = true;
        if (e.t.path === sel) near[e.s.path] = true;
      });
    }
    state.edges.forEach(function (e) {
      if (state.hiddenRels[e.rel] || !visible(e.s) || !visible(e.t)) return;
      var lit = sel && (e.s.path === sel || e.t.path === sel);
      var a = toScreen(e.s), b = toScreen(e.t);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = lit ? 'rgba(10,132,255,0.85)' : (sel ? 'rgba(255,255,255,0.045)' : 'rgba(255,255,255,0.085)');
      ctx.lineWidth = lit ? 1.5 : 0.8;
      ctx.stroke();
    });
    state.nodes.forEach(function (n) {
      if (!visible(n)) return;
      var p = toScreen(n);
      var r = n.r * state.view.k;
      var faded = sel && !near[n.path];
      ctx.globalAlpha = faded ? 0.3 : 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r + 3.2, 0, Math.PI * 2);
      ctx.strokeStyle = lifeColor(n.lifecycle);
      ctx.lineWidth = n.lifecycle === 'FRESH' ? 1 : 1.7;
      ctx.globalAlpha = faded ? 0.22 : (n.lifecycle === 'FRESH' ? 0.55 : 0.95);
      ctx.stroke();
      ctx.globalAlpha = faded ? 0.3 : 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
      ctx.fillStyle = typeColor(n.type);
      ctx.fill();
      ctx.globalAlpha = 1;
    });
    var drawn = [];
    state.nodes.forEach(function (n) {
      if (!visible(n)) return;
      var wanted = n.path === sel || n === hover || (!sel && n.inbound >= 6);
      if (!wanted) return;
      var p = toScreen(n);
      var r = n.r * state.view.k;
      var text = (n.path === sel || n === hover) ? n.path : n.title;
      ctx.font = (n.path === sel ? '600 ' : '400 ') + '11.5px -apple-system, system-ui, sans-serif';
      var box = { x: p.x + r + 7, y: p.y - 6, w: ctx.measureText(text).width, h: 15 };
      var clash = false;
      for (var k = 0; k < drawn.length; k++) {
        var d = drawn[k];
        if (box.x < d.x + d.w + 6 && box.x + box.w + 6 > d.x && box.y < d.y + d.h && box.y + box.h > d.y) { clash = true; break; }
      }
      if (clash) {
        box.y = p.y + r + 12;
        for (var m = 0; m < drawn.length; m++) {
          var d2 = drawn[m];
          if (box.x < d2.x + d2.w + 6 && box.x + box.w + 6 > d2.x && box.y < d2.y + d2.h && box.y + box.h > d2.y) return;
        }
      }
      ctx.fillStyle = n.path === sel ? '#ffffff' : 'rgba(245,245,247,0.78)';
      ctx.fillText(text, box.x, box.y + 10);
      drawn.push(box);
    });
  }

  function frame() { tick(); draw(); requestAnimationFrame(frame); }

  function at(ev) {
    var box = canvas.getBoundingClientRect();
    var x = ev.clientX - box.left, y = ev.clientY - box.top;
    var found = null, best = 1e9;
    state.nodes.forEach(function (n) {
      if (!visible(n)) return;
      var p = toScreen(n);
      var d = Math.hypot(p.x - x, p.y - y);
      if (d < Math.max(n.r * state.view.k + 8, 14) && d < best) { best = d; found = n; }
    });
    return { node: found, x: x, y: y };
  }

  canvas.addEventListener('mousedown', function (ev) {
    var hit = at(ev);
    last = { x: ev.clientX, y: ev.clientY };
    if (hit.node) { dragNode = hit.node; } else { panning = true; canvas.classList.add('dragging'); }
  });
  window.addEventListener('mousemove', function (ev) {
    if (dragNode) {
      var box = canvas.getBoundingClientRect();
      dragNode.x = (ev.clientX - box.left - state.view.x) / state.view.k;
      dragNode.y = (ev.clientY - box.top - state.view.y) / state.view.k;
      state.alpha = Math.max(state.alpha, 0.35);
      return;
    }
    if (panning) {
      state.view.x += ev.clientX - last.x;
      state.view.y += ev.clientY - last.y;
      last = { x: ev.clientX, y: ev.clientY };
      return;
    }
    var hit = at(ev);
    if (hit.node !== hover) { hover = hit.node; canvas.style.cursor = hover ? 'pointer' : 'grab'; }
  });
  window.addEventListener('mouseup', function (ev) {
    if (dragNode && Math.hypot(ev.clientX - last.x, ev.clientY - last.y) < 4) select(dragNode.path);
    else if (panning && Math.hypot(ev.clientX - last.x, ev.clientY - last.y) < 4) {
      var hit = at(ev);
      if (!hit.node) select(null);
    }
    dragNode = null; panning = false; canvas.classList.remove('dragging');
  });
  canvas.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    var box = canvas.getBoundingClientRect();
    var mx = ev.clientX - box.left, my = ev.clientY - box.top;
    var before = state.view.k;
    state.view.k = Math.min(3.2, Math.max(0.35, state.view.k * (ev.deltaY < 0 ? 1.08 : 0.926)));
    state.view.x = mx - (mx - state.view.x) * (state.view.k / before);
    state.view.y = my - (my - state.view.y) * (state.view.k / before);
  }, { passive: false });

  // ── stats, legend, inspector ────────────────────────────────────────

  function renderStats() {
    var g = state.graph, v = state.validation;
    var box = clear(byId('stats'));
    function stat(value, label) {
      var d = el('div', 'stat');
      d.appendChild(el('b', null, value));
      d.appendChild(el('span', null, label));
      box.appendChild(d);
    }
    stat(num(g.stats.documents), 'documents');
    stat(num(g.stats.edges), 'links');
    stat(num(g.orphans.length), 'orphans');
    stat(num(g.cycles.length), 'cycles');
    if (v) {
      var counts = { PASS: 0, WARN: 0, FAIL: 0 };
      v.documents.forEach(function (d) { counts[d.status] = (counts[d.status] || 0) + 1; });
      var d = el('div', 'stat');
      var row = el('div', 'verdict');
      [['PASS', counts.PASS, 'var(--fresh)'], ['WARN', counts.WARN, 'var(--aging)'], ['FAIL', counts.FAIL, 'var(--stale)']]
        .forEach(function (p) {
          var s = el('span', null);
          var i = el('i');
          i.style.cssText = 'display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:5px;background:' + p[2];
          s.appendChild(i);
          s.appendChild(el('em', null, p[1] + ' ' + p[0].toLowerCase()));
          row.appendChild(s);
        });
      d.appendChild(row);
      d.appendChild(el('span', null, 'dep validate'));
      box.appendChild(d);
    }
  }

  function renderLegend() {
    var g = state.graph;
    var box = clear(byId('legend'));
    var types = {}, lives = { FRESH: 0, AGING: 0, STALE: 0 }, rels = {};
    g.nodes.forEach(function (n) {
      types[n.type] = (types[n.type] || 0) + 1;
      lives[n.lifecycle] = (lives[n.lifecycle] || 0) + 1;
    });
    g.edges.forEach(function (e) { rels[e.rel] = (rels[e.rel] || 0) + 1; });

    function row(label, chips) {
      var r = el('div', 'legend-row');
      r.appendChild(el('div', 'label', label));
      chips.forEach(function (c) { r.appendChild(c); });
      box.appendChild(r);
    }
    row('type', Object.keys(types).sort().map(function (t) {
      var c = el('div', 'chip' + (state.hiddenTypes[t] ? ' off' : ''));
      var i = el('i'); i.style.background = typeColor(t);
      c.appendChild(i); c.appendChild(el('span', null, t)); c.appendChild(el('b', null, types[t]));
      c.onclick = function () { state.hiddenTypes[t] = !state.hiddenTypes[t]; state.alpha = Math.max(state.alpha, 0.3); renderLegend(); };
      return c;
    }));
    row('lifecycle', ['FRESH', 'AGING', 'STALE'].map(function (l) {
      var c = el('div', 'chip' + (state.hiddenLife[l] ? ' off' : ''));
      var o = el('o'); o.style.color = lifeColor(l);
      c.appendChild(o); c.appendChild(el('span', null, l)); c.appendChild(el('b', null, lives[l] || 0));
      c.onclick = function () { state.hiddenLife[l] = !state.hiddenLife[l]; state.alpha = Math.max(state.alpha, 0.3); renderLegend(); };
      return c;
    }));
    row('relation', REL_ORDER.filter(function (r) { return rels[r]; }).map(function (r) {
      var c = el('div', 'chip rel' + (state.hiddenRels[r] ? ' off' : ''));
      c.appendChild(el('span', null, r));
      c.appendChild(el('b', null, rels[r]));
      c.onclick = function () { state.hiddenRels[r] = !state.hiddenRels[r]; renderLegend(); };
      return c;
    }));
  }

  function select(path) {
    state.selected = path;
    if (!path) { clear(byId('inspector')).appendChild(el('div', 'empty', 'Select a document in the graph.')); return; }
    var box = clear(byId('inspector'));
    box.appendChild(el('div', 'empty', 'Loading.'));
    get('/api/document?path=' + encodeURIComponent(path)).then(function (doc) { renderInspector(doc); })
      .catch(function (err) { clear(byId('inspector')).appendChild(el('div', 'empty', String(err.message || err))); });
  }

  function renderInspector(doc) {
    var box = clear(byId('inspector'));
    var badges = el('div', 'badges');
    badges.appendChild(el('span', 'badge', doc.type));
    var life = el('span', 'badge life', doc.lifecycle);
    life.style.background = lifeColor(doc.lifecycle);
    badges.appendChild(life);
    box.appendChild(badges);
    box.appendChild(el('h2', null, doc.title || basename(doc.path)));
    box.appendChild(el('div', 'path mono', doc.path));

    var meta = el('div', 'group');
    meta.appendChild(el('h3', null, 'Metadata'));
    function kv(k, v) {
      var r = el('div', 'kv');
      r.appendChild(el('span', null, k));
      r.appendChild(el('b', null, v));
      meta.appendChild(r);
    }
    kv('Owner', doc.owner || '-');
    kv('Confidence', doc.confidence || '-');
    var age = days(doc.freshness && doc.freshness.lastVerified);
    kv('Last verified', age === null ? '-' : age + 'd ago');
    if (doc.freshness && doc.freshness.cadenceDays) {
      var r = el('div', 'kv');
      r.appendChild(el('span', null, 'Review cadence'));
      r.appendChild(el('b', null, (age === null ? '?' : age) + ' / ' + doc.freshness.cadenceDays + ' days'));
      meta.appendChild(r);
      var meter = el('div', 'meter');
      var fill = el('i');
      var frac = age === null ? 0 : Math.min(1, age / doc.freshness.cadenceDays);
      fill.style.width = (frac * 100).toFixed(0) + '%';
      fill.style.background = lifeColor(doc.lifecycle);
      meter.appendChild(fill);
      meta.appendChild(meter);
    }
    if (doc.audience && doc.audience.length) {
      var ar = el('div', 'kv');
      ar.appendChild(el('span', null, 'Audience'));
      var holder = el('div', 'badges');
      doc.audience.forEach(function (a) { holder.appendChild(el('span', 'badge', a)); });
      ar.appendChild(holder);
      meta.appendChild(ar);
    }
    box.appendChild(meta);

    if (doc.tags && doc.tags.length) {
      var tg = el('div', 'group');
      tg.appendChild(el('h3', null, 'Tags'));
      var holder2 = el('div', 'badges');
      doc.tags.forEach(function (t) { holder2.appendChild(el('span', 'badge', t)); });
      tg.appendChild(holder2);
      box.appendChild(tg);
    }

    function links(title, list, key) {
      var g = el('div', 'group');
      var h = el('h3', null, title);
      g.appendChild(h);
      if (!list.length) { g.appendChild(el('div', 'muted', 'none')); box.appendChild(g); return; }
      list.forEach(function (l) {
        var target = key === 'target' ? l.target : l.source;
        var row = el('div', 'link-row');
        var rel = el('div', 'rel mono', l.rel);
        rel.style.color = l.rel === 'INLINE' ? 'var(--dimmer)' : 'var(--accent)';
        row.appendChild(rel);
        row.appendChild(el('b', null, target));
        row.onclick = function () { select(target); };
        g.appendChild(row);
      });
      box.appendChild(g);
    }
    links('Outgoing (' + doc.forwardLinks.length + ')', doc.forwardLinks, 'target');
    links('Incoming (' + doc.backlinks.length + ')', doc.backlinks, 'source');

    var used = (state.trace ? state.trace.entries : []).filter(function (e) {
      return (e.offered || []).some(function (p) { return p.document === doc.path; });
    });
    var ug = el('div', 'group');
    ug.appendChild(el('h3', null, 'Agent usage'));
    if (!used.length) {
      ug.appendChild(el('div', 'muted', 'no agent has been offered this document yet'));
    } else {
      var offered = 0, actually = 0;
      used.forEach(function (e) {
        (e.offered || []).forEach(function (p) {
          if (p.document !== doc.path) return;
          offered++;
          if ((e.used || []).indexOf(p.id) >= 0) actually++;
        });
      });
      var t = el('div', 'triple');
      [[offered, 'offered'], [actually, 'used'], [offered ? Math.round(actually / offered * 100) + '%' : '-', 'use rate']]
        .forEach(function (p) {
          var d = el('div');
          d.appendChild(el('div', 'big', p[0]));
          d.appendChild(el('span', null, p[1]));
          t.appendChild(d);
        });
      ug.appendChild(t);
    }
    box.appendChild(ug);
  }

  // ── traversal ───────────────────────────────────────────────────────

  function renderCalls() {
    var record = state.trace;
    var list = clear(byId('calls'));
    byId('call-count').textContent = record.entries.length + (record.dropped ? ' (+' + record.dropped + ' dropped)' : '');
    if (!record.entries.length) {
      list.appendChild(el('div', 'empty', 'Nothing has asked this set for anything yet. Point an agent at it, or run dep context.'));
      return;
    }
    record.entries.slice().reverse().forEach(function (entry) {
      var row = el('div', 'call' + (state.selectedCall === entry.id ? ' on' : ''));
      var head = el('div');
      head.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline';
      head.appendChild(el('span', 'kind', 'dep_' + entry.kind));
      head.appendChild(el('span', 'meta', when(entry.at)));
      row.appendChild(head);
      row.appendChild(el('div', 'q', entry.question || '(the whole set)'));
      var meta = el('div', 'meta');
      meta.appendChild(el('span', null, entry.caller));
      if (entry.offered.length) meta.appendChild(el('span', null, entry.offered.length + ' offered'));
      if (entry.used.length) meta.appendChild(el('span', null, entry.used.length + ' used'));
      if (entry.outcome === 'refused') {
        var r = el('span', null, 'refused');
        r.style.color = 'var(--stale)';
        meta.appendChild(r);
      }
      row.appendChild(meta);
      row.onclick = function () { state.selectedCall = entry.id; renderCalls(); renderCall(entry); };
      list.appendChild(row);
    });
  }

  function renderCall(entry) {
    var pane = clear(byId('call-detail'));
    var top = el('div', 'badges');
    top.appendChild(el('span', 'badge', 'dep_' + entry.kind));
    top.appendChild(el('span', 'badge', entry.caller));
    top.appendChild(el('span', 'badge', when(entry.at)));
    pane.appendChild(top);
    pane.appendChild(el('h1', null, entry.question || '(the whole set)'));

    if (entry.outcome === 'refused') {
      var bad = el('div', 'card');
      bad.style.borderColor = 'rgba(255,69,58,0.4)';
      bad.appendChild(el('h3', null, 'Refused'));
      bad.appendChild(el('div', null, (entry.error && entry.error.message) || 'no reason recorded'));
      pane.appendChild(bad);
      return;
    }

    var cards = el('div', 'cards');
    if (entry.budget) {
      var b = el('div', 'card');
      b.appendChild(el('h3', null, 'Token budget'));
      b.appendChild(el('div', 'big', num(entry.budget.used) + ' / ' + num(entry.budget.declared)));
      var bar = el('div', 'budget');
      var usedTokens = 0, offeredTokens = entry.budget.used;
      var usedIds = {};
      entry.used.forEach(function (id) { usedIds[id] = true; });
      var share = entry.offered.length ? entry.offered.filter(function (p) { return usedIds[p.id]; }).length / entry.offered.length : 0;
      var i1 = el('i'); i1.style.cssText = 'width:' + (share * 100) + '%;background:#0a84ff';
      var i2 = el('i'); i2.style.cssText = 'width:' + ((1 - share) * 100) + '%;background:rgba(255,255,255,0.2)';
      bar.appendChild(i1); bar.appendChild(i2);
      b.appendChild(bar);
      var keys = el('div', 'keys');
      [['#0a84ff', 'used by the agent'], ['rgba(255,255,255,0.2)', 'offered, not used']].forEach(function (p) {
        var s = el('span');
        var sq = el('b'); sq.style.background = p[0];
        s.appendChild(sq); s.appendChild(document.createTextNode(p[1]));
        keys.appendChild(s);
      });
      b.appendChild(keys);
      cards.appendChild(b);
    }
    var how = el('div', 'card');
    how.appendChild(el('h3', null, 'How passages got in'));
    var reasons = {};
    entry.offered.forEach(function (p) { reasons[p.reason] = (reasons[p.reason] || 0) + 1; });
    Object.keys(reasons).forEach(function (r) {
      var row = el('div', 'kv');
      row.appendChild(el('span', null, r));
      row.appendChild(el('b', null, reasons[r]));
      how.appendChild(row);
    });
    if (!Object.keys(reasons).length) how.appendChild(el('div', 'muted', 'nothing was offered'));
    cards.appendChild(how);
    pane.appendChild(cards);

    var table = el('table');
    var thead = el('thead');
    var hr = el('tr');
    ['Passage', 'Why it got in', 'Used'].forEach(function (h) { hr.appendChild(el('th', null, h)); });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = el('tbody');
    var usedSet = {};
    entry.used.forEach(function (id) { usedSet[id] = true; });
    entry.offered.forEach(function (p) {
      var tr = el('tr', 'row');
      if (!usedSet[p.id]) tr.style.opacity = '0.5';
      var td = el('td');
      td.appendChild(el('div', 'mono', p.document));
      if (p.section) td.appendChild(el('div', 'muted', p.section));
      tr.appendChild(td);
      var rtd = el('td');
      var cls = p.reason === 'match' ? 'match' : (p.reason === 'required-by' ? 'required' : 'expanded');
      rtd.appendChild(el('span', 'reason ' + cls, p.reason));
      tr.appendChild(rtd);
      tr.appendChild(el('td', 'num', usedSet[p.id] ? 'yes' : 'no'));
      tr.onclick = function () { showScreen('graph'); select(p.document); };
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    pane.appendChild(table);
  }

  // ── decisions ───────────────────────────────────────────────────────

  var GLYPH = { observe: '[?]', decide: '[>]', act: '[!]', delegate: '[@]' };
  var GLYPH_COLOR = { observe: '#0a84ff', decide: '#bf5af0', act: '#30d158', delegate: '#ff9f0a' };

  function renderTrees() {
    var list = clear(byId('trees'));
    var trees = state.procedures.trees;
    byId('tree-count').textContent = trees.length + ' trees';
    if (!trees.length) {
      list.appendChild(el('div', 'empty', 'This project declares no decision procedures.'));
      return;
    }
    trees.forEach(function (tree) {
      var row = el('div', 'call' + (state.selectedTree === tree.id ? ' on' : ''));
      var head = el('div');
      head.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline';
      head.appendChild(el('span', 'kind mono', tree.id));
      head.appendChild(el('span', 'meta', tree.steps.length + ' nodes'));
      row.appendChild(head);
      row.appendChild(el('div', 'q', tree.trigger));
      if (tree.handsOffTo.length) {
        row.appendChild(el('div', 'meta', 'delegates to ' + tree.handsOffTo.join(', ')));
      }
      row.onclick = function () { state.selectedTree = tree.id; renderTrees(); renderTree(tree); };
      list.appendChild(row);
    });
  }

  function renderTree(tree) {
    var pane = clear(byId('tree-detail'));
    pane.appendChild(el('h1', null, tree.id));
    pane.appendChild(el('div', 'muted', tree.trigger));
    var badges = el('div', 'badges');
    badges.style.marginTop = '12px';
    badges.appendChild(el('span', 'badge', 'entry: ' + tree.entry));
    badges.appendChild(el('span', 'badge', tree.steps.length + ' steps'));
    var life = el('span', 'badge life', tree.lifecycle);
    life.style.background = lifeColor(tree.lifecycle);
    badges.appendChild(life);
    pane.appendChild(badges);

    var holder = el('div', 'card');
    holder.style.marginTop = '18px';
    holder.appendChild(el('h3', null, 'Steps'));
    tree.steps.forEach(function (step) {
      var row = el('div', 'step');
      var g = el('div', 'glyph', GLYPH[step.type] || '[.]');
      g.style.color = GLYPH_COLOR[step.type] || 'var(--dim)';
      row.appendChild(g);
      var body = el('div');
      body.style.flex = '1';
      body.appendChild(el('div', 'id', step.id));
      if (step.description) body.appendChild(el('div', 'desc', step.description));
      if (step.conditions && step.conditions.length) {
        step.conditions.forEach(function (c) {
          var cr = el('div', 'to');
          cr.textContent = c.condition + '  ->  ' + c.next;
          body.appendChild(cr);
        });
      }
      row.appendChild(body);
      var to = el('div', 'to');
      if (step.tool) to.textContent = step.tool;
      else if (step.handoff) to.textContent = 'delegates';
      else if (step.next && step.next.length) to.textContent = step.next.join(', ');
      row.appendChild(to);
      holder.appendChild(row);
    });
    pane.appendChild(holder);
  }

  // ── health ──────────────────────────────────────────────────────────

  function renderHealth() {
    var pane = clear(byId('health'));
    var g = state.graph, v = state.validation;
    var lives = { FRESH: 0, AGING: 0, STALE: 0 };
    g.nodes.forEach(function (n) { lives[n.lifecycle] = (lives[n.lifecycle] || 0) + 1; });

    var cards = el('div', 'cards');

    var c1 = el('div', 'card');
    c1.appendChild(el('h3', null, 'Lifecycle'));
    c1.appendChild(el('div', 'big', g.stats.documents));
    c1.appendChild(el('span', 'muted', 'documents'));
    var bar = el('div', 'bar');
    ['FRESH', 'AGING', 'STALE'].forEach(function (l) {
      var i = el('i');
      i.style.cssText = 'width:' + (lives[l] / g.stats.documents * 100) + '%;background:' + lifeColor(l);
      bar.appendChild(i);
    });
    c1.appendChild(bar);
    var trip = el('div', 'triple');
    ['FRESH', 'AGING', 'STALE'].forEach(function (l) {
      var d = el('div');
      var p = el('div', 'pill');
      var dot = el('i'); dot.style.background = lifeColor(l);
      p.appendChild(dot); p.appendChild(el('span', null, l));
      d.appendChild(p);
      d.appendChild(el('div', null, lives[l]));
      trip.appendChild(d);
    });
    c1.appendChild(trip);
    cards.appendChild(c1);

    if (v) {
      var counts = { PASS: 0, WARN: 0, FAIL: 0 };
      v.documents.forEach(function (d) { counts[d.status] = (counts[d.status] || 0) + 1; });
      var c2 = el('div', 'card');
      c2.appendChild(el('h3', null, 'Validation'));
      var t2 = el('div', 'triple');
      [['PASS', counts.PASS, 'var(--fresh)'], ['WARN', counts.WARN, 'var(--aging)'], ['FAIL', counts.FAIL, 'var(--stale)']]
        .forEach(function (p) {
          var d = el('div');
          var b = el('div', 'big', p[1]);
          b.style.color = p[2];
          d.appendChild(b);
          d.appendChild(el('span', null, p[0].toLowerCase()));
          t2.appendChild(d);
        });
      c2.appendChild(t2);
      var checks = el('div');
      checks.style.cssText = 'margin-top:12px;display:flex;flex-direction:column;gap:6px;align-items:flex-start';
      v.graph.forEach(function (chk) {
        var row = el('div', 'pill');
        var dot = el('i'); dot.style.background = chk.passed ? 'var(--fresh)' : 'var(--stale)';
        row.appendChild(dot);
        row.appendChild(el('span', null, chk.name));
        checks.appendChild(row);
      });
      c2.appendChild(checks);
      cards.appendChild(c2);
    }

    var c3 = el('div', 'card');
    c3.appendChild(el('h3', null, 'Review cadence'));
    Object.keys(g.cadence).forEach(function (type) {
      var row = el('div', 'kv');
      var left = el('span', null, type);
      row.appendChild(left);
      row.appendChild(el('b', null, g.cadence[type] + ' days'));
      c3.appendChild(row);
    });
    cards.appendChild(c3);
    pane.appendChild(cards);

    var usage = {};
    var reported = false;
    (state.trace ? state.trace.entries : []).forEach(function (entry) {
      var usedIds = {};
      (entry.used || []).forEach(function (id) { usedIds[id] = true; reported = true; });
      (entry.offered || []).forEach(function (p) {
        var u = usage[p.document] || (usage[p.document] = { offered: 0, used: 0 });
        u.offered++;
        if (usedIds[p.id]) u.used++;
      });
    });

    var passedOver = Object.keys(usage).map(function (doc) {
      return { document: doc, offered: usage[doc].offered, used: usage[doc].used, passedOver: usage[doc].offered - usage[doc].used };
    }).filter(function (d) { return d.passedOver > 0; })
      .sort(function (a, b) { return b.passedOver - a.passedOver; })
      .slice(0, 8);

    var rarely = el('div', 'card');
    rarely.style.marginBottom = '22px';
    rarely.appendChild(el('h3', null, 'Offered, rarely used'));
    if (!reported) {
      rarely.appendChild(el('div', 'muted', 'No consumer has reported back yet. An agent reports with dep_report_usage; from a terminal it is dep report <request-id> --used <ids>.'));
    } else if (!passedOver.length) {
      rarely.appendChild(el('div', 'muted', 'Everything offered has been used at least once.'));
    } else {
      rarely.appendChild(el('div', 'muted', 'Agents keep being handed these and leaving them. Candidates to rewrite or retire.'));
      var rt = el('table');
      rt.style.marginTop = '10px';
      var rhead = el('thead');
      var rhr = el('tr');
      ['Document', 'Offered', 'Used', 'Passed over'].forEach(function (h) { rhr.appendChild(el('th', null, h)); });
      rhead.appendChild(rhr);
      rt.appendChild(rhead);
      var rbody = el('tbody');
      passedOver.forEach(function (d) {
        var tr = el('tr', 'row');
        var td = el('td');
        td.appendChild(el('span', 'mono', d.document));
        tr.appendChild(td);
        tr.appendChild(el('td', 'num', d.offered));
        tr.appendChild(el('td', 'num', d.used));
        var pt = el('td', 'num');
        var badge = el('span', 'overdue', String(d.passedOver));
        badge.style.cssText = d.used === 0
          ? 'background:rgba(255,69,58,0.18);color:#ff6961'
          : 'background:rgba(255,214,10,0.16);color:#ffd60a';
        pt.appendChild(badge);
        tr.appendChild(pt);
        tr.onclick = function () { showScreen('graph'); select(d.document); };
        rbody.appendChild(tr);
      });
      rt.appendChild(rbody);
      rarely.appendChild(rt);
    }
    pane.appendChild(rarely);

    var needing = g.nodes.filter(function (n) { return n.lifecycle !== 'FRESH'; });
    needing.sort(function (a, b) {
      if (a.lifecycle !== b.lifecycle) return a.lifecycle === 'STALE' ? -1 : 1;
      return b.inbound - a.inbound;
    });
    var head = el('div');
    head.style.cssText = 'display:flex;align-items:baseline;gap:12px;margin:8px 0 14px';
    head.appendChild(el('h1', null, 'Needs attention'));
    head.appendChild(el('span', 'muted', needing.length + ' of ' + g.stats.documents + ', most linked-to first'));
    pane.appendChild(head);

    if (!needing.length) {
      pane.appendChild(el('div', 'empty', 'Every document is within its review cadence.'));
      return;
    }
    var table = el('table');
    var thead = el('thead');
    var hr = el('tr');
    ['Document', 'Type', 'Lifecycle', 'Inbound', 'Offered', 'Used'].forEach(function (h) { hr.appendChild(el('th', null, h)); });
    thead.appendChild(hr);
    table.appendChild(thead);
    var tbody = el('tbody');
    needing.forEach(function (n) {
      var tr = el('tr', 'row');
      var td = el('td');
      var dot = el('span', 'pill');
      var i = el('i'); i.style.background = lifeColor(n.lifecycle);
      dot.appendChild(i);
      dot.appendChild(el('span', 'mono', n.path));
      td.appendChild(dot);
      tr.appendChild(td);
      tr.appendChild(el('td', null, n.type));
      var lt = el('td');
      var badge = el('span', 'overdue', n.lifecycle);
      badge.style.cssText = 'background:' + (n.lifecycle === 'STALE' ? 'rgba(255,69,58,0.18);color:#ff6961' : 'rgba(255,214,10,0.16);color:#ffd60a');
      lt.appendChild(badge);
      tr.appendChild(lt);
      tr.appendChild(el('td', 'num', n.inbound));
      var u = usage[n.path];
      tr.appendChild(el('td', 'num', u ? u.offered : '-'));
      tr.appendChild(el('td', 'num', u ? u.used : '-'));
      tr.onclick = function () { showScreen('graph'); select(n.path); };
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    pane.appendChild(table);
  }

  // ── screens & loading ───────────────────────────────────────────────

  function showScreen(which) {
    Array.prototype.forEach.call(document.querySelectorAll('nav button'), function (b) {
      b.setAttribute('aria-selected', b.dataset.screen === which ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('section.screen'), function (s) {
      s.classList.toggle('on', s.id === 'screen-' + which);
    });
    if (which === 'graph') { sizeCanvas(); }
  }
  Array.prototype.forEach.call(document.querySelectorAll('nav button'), function (b) {
    b.onclick = function () { showScreen(b.dataset.screen); };
  });
  window.addEventListener('resize', function () { sizeCanvas(); });

  function refresh(first) {
    return Promise.all([
      get('/api/graph'),
      get('/api/validate').catch(function () { return null; }),
      get('/api/trace').catch(function () { return { entries: [], dropped: 0 }; }),
      get('/api/procedures').catch(function () { return { trees: [] }; })
    ]).then(function (all) {
      var sameShape = state.graph && state.graph.nodes.length === all[0].nodes.length;
      state.graph = all[0];
      state.validation = all[1];
      state.trace = all[2];
      state.procedures = all[3];
      if (first || !sameShape) layout(state.graph);
      renderStats();
      renderLegend();
      renderCalls();
      renderTrees();
      renderHealth();
      if (first && state.procedures.trees.length) {
        state.selectedTree = state.procedures.trees[0].id;
        renderTrees();
        renderTree(state.procedures.trees[0]);
      }
      byId('pulse').classList.remove('cold');
      byId('live-text').textContent = 'live · ' + state.graph.stats.documents + ' documents';
    }).catch(function (err) {
      byId('pulse').classList.add('cold');
      byId('live-text').textContent = 'offline';
      throw err;
    });
  }

  sizeCanvas();
  refresh(true).then(function () { requestAnimationFrame(frame); }).catch(function () { requestAnimationFrame(frame); });
  setInterval(function () { refresh(false).catch(function () {}); }, 4000);
})();
</script>
</body>
</html>
`

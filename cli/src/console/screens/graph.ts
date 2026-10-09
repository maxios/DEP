/**
 * The console's Graph screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 *
 * Laid out as the "Console — Graph" frame of designs/dep-console-game.pen.
 */
export const css = `  /* graph: every value is from the Console — Graph frame */
  #screen-graph { background: #07080A; }
  #canvas-wrap { flex: 1; position: relative; min-width: 0;
    background: radial-gradient(ellipse 110% 110% at 45% 50%, #0A84FF14 0%, #07080A00 100%), #07080A; }
  #canvas-wrap canvas { display: block; width: 100%; height: 100%; cursor: grab; }
  #canvas-wrap canvas.dragging { cursor: grabbing; }
  #screen-graph .gr-float { position: absolute; background: #121317D9; border: 1px solid #FFFFFF12;
    backdrop-filter: blur(24px); -webkit-backdrop-filter: blur(24px); font-family: var(--ui); line-height: normal; }
  #screen-graph .gr-row { display: flex; align-items: center; }
  #screen-graph .gr-col { display: flex; flex-direction: column; }
  #screen-graph .gr-cap { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; color: #6B6B73; text-transform: uppercase; }
  #screen-graph .gr-m { font-family: var(--mono); }

  #gr-stats { top: 24px; left: 24px; border-radius: 12px; padding: 14px 20px; gap: 28px; }
  #gr-stats .gr-stat { gap: 2px; }
  #gr-stats .gr-stat .gr-row { gap: 6px; }
  #gr-stats .gr-stat b { font-size: 22px; font-weight: 600; letter-spacing: -0.5px; color: #F5F5F7; line-height: 27px; }
  #gr-stats .gr-stat span { font-size: 11px; color: #A1A1A8; }
  #gr-stats .gr-stat svg.ok { color: #32D74B; } #gr-stats .gr-stat svg.warn { color: #FFD60A; }
  #gr-stats .gr-div { width: 1px; height: 34px; background: #FFFFFF24; }
  #gr-stats .gr-val { gap: 5px; }
  #gr-stats .gr-counts { gap: 10px; }
  #gr-stats .gr-counts .gr-row { gap: 5px; font-size: 13px; font-weight: 600; }
  #gr-stats .gr-counts i { width: 6px; height: 6px; border-radius: 50%; display: block; box-sizing: border-box; }
  #gr-stats .gr-val > span { font-size: 11px; color: #A1A1A8; }

  #gr-legend { left: 24px; bottom: 43px; border-radius: 12px; padding: 14px 18px; gap: 12px; max-width: calc(100% - 120px); }
  #gr-legend .gr-lrow { gap: 14px; flex-wrap: wrap; row-gap: 8px; }
  #gr-legend .gr-lab { width: 74px; flex: 0 0 74px; }
  #gr-legend .gr-it { gap: 6px; font-size: 12px; color: #A1A1A8; cursor: pointer; user-select: none; }
  #gr-legend .gr-it b { font-weight: 400; color: #6B6B73; }
  #gr-legend .gr-it.off { opacity: .35; }
  #gr-legend .gr-it .gr-dot { width: 8px; height: 8px; border-radius: 50%; }
  #gr-legend .gr-it .gr-ring { width: 9px; height: 9px; border-radius: 50%; border: 1.5px solid; box-sizing: border-box; }
  #gr-legend .gr-it .gr-life { font-size: 11px; font-weight: 500; letter-spacing: .6px; }
  #gr-legend .gr-rel { gap: 6px; padding: 3px 8px; border-radius: 6px; background: #FFFFFF0F; border: 1px solid transparent;
    font-family: var(--mono); font-size: 10px; color: #A1A1A8; cursor: pointer; user-select: none; line-height: 13px; }
  #gr-legend .gr-rel b { font-weight: 400; color: #6B6B73; }
  #gr-legend .gr-rel.inline { background: transparent; border-color: #FFFFFF24; color: #6B6B73; }
  #gr-legend .gr-rel.off { opacity: .35; }

  #gr-zoom { right: 16px; bottom: 14px; border-radius: 10px; padding: 6px; gap: 2px; }
  #gr-zoom button { appearance: none; border: 0; background: transparent; width: 28px; height: 28px; border-radius: 7px;
    display: flex; align-items: center; justify-content: center; color: #A1A1A8; cursor: pointer; }
  #gr-zoom button:hover { background: #FFFFFF14; color: #F5F5F7; }
  #gr-zoom button:disabled { opacity: .35; cursor: default; background: transparent; }

  #inspector { width: 360px; flex: 0 0 360px; padding: 0; overflow: hidden; background: #0F1013; border-left: 1px solid #FFFFFF12; display: flex; flex-direction: column;
    min-height: 0; font-family: var(--ui); line-height: normal; color: #F5F5F7; position: relative; }
  #inspector .gr-sec { padding: 20px 24px; gap: 11px; border-bottom: 1px solid #FFFFFF12; flex: 0 0 auto; }
  #inspector .gr-head { padding: 24px 24px 20px; gap: 12px; }
  #inspector .gr-chips { gap: 6px; }
  #inspector .gr-chip { gap: 5px; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; line-height: 13px; }
  #inspector .gr-chip i { width: 6px; height: 6px; border-radius: 50%; display: block; }
  #inspector h2 { font-size: 22px; font-weight: 600; letter-spacing: -0.4px; line-height: 27px; margin: 0; }
  #inspector .gr-path { font-family: var(--mono); font-size: 11px; color: #A1A1A8; word-break: break-all; }
  #inspector .gr-caprow { justify-content: space-between; gap: 10px; }
  #inspector .gr-hint { gap: 5px; font-size: 11px; color: #6B6B73; }
  #inspector .gr-hint.m { font-family: var(--mono); }
  #inspector .gr-kv { justify-content: space-between; gap: 12px; min-height: 15px; }
  #inspector .gr-kv > .gr-k { font-size: 12px; color: #A1A1A8; flex: 0 0 auto; }
  #inspector .gr-kv > .gr-v { gap: 8px; font-size: 12px; color: #F5F5F7; justify-content: flex-end; min-width: 0; }
  #inspector .gr-seg { background: #1E1F24; padding: 2px; gap: 2px; border-radius: 7px; }
  #inspector .gr-seg button { appearance: none; border: 0; background: transparent; padding: 3px 8px; border-radius: 5px;
    font: inherit; font-size: 11px; font-weight: 500; color: #6B6B73; line-height: 13px; cursor: pointer; }
  #inspector .gr-seg button:hover { color: #A1A1A8; }
  #inspector .gr-seg button.on { background: #0A84FF33; color: #8CC4FF; font-weight: 600; }
  #inspector .gr-bump { appearance: none; display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px;
    background: #0A84FF26; border: 1px solid #0A84FF55; color: #8CC4FF; font: inherit; font-size: 11px; font-weight: 600; line-height: 13px; cursor: pointer; }
  #inspector .gr-bump:hover { background: #0A84FF40; }
  #inspector .gr-track { width: 64px; height: 4px; border-radius: 2px; background: #1E1F24; overflow: hidden; }
  #inspector .gr-track i { display: block; height: 4px; border-radius: 2px; }
  #inspector .gr-aud { gap: 4px; flex-wrap: wrap; justify-content: flex-end; }
  #inspector .gr-aud span { padding: 3px 6px; border-radius: 6px; background: #1E1F24; font-family: var(--mono); font-size: 10px; font-weight: 500; color: #A1A1A8; line-height: 13px; }
  #inspector .gr-tags-sec { padding: 14px 24px; gap: 10px; }
  #inspector .gr-tags { gap: 6px; flex-wrap: wrap; }
  #inspector .gr-tag { gap: 5px; padding: 3px 6px 3px 8px; border-radius: 6px; background: #1E1F24; font-family: var(--mono); font-size: 11px; font-weight: 500; color: #A1A1A8; line-height: 15px; }
  #inspector .gr-tag svg { color: #6B6B73; cursor: pointer; } #inspector .gr-tag svg:hover { color: #FF453A; }
  #inspector .gr-addtag { appearance: none; display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; border-radius: 6px; background: transparent;
    border: 1px solid #FFFFFF24; color: #A1A1A8; font: inherit; font-size: 11px; font-weight: 500; line-height: 13px; cursor: pointer; }
  #inspector .gr-addtag:hover { color: #F5F5F7; }
  #inspector .gr-tagin { width: 120px; background: #16171B; border: 1px solid #FFFFFF24; border-radius: 6px; color: #F5F5F7; font-family: var(--mono);
    font-size: 11px; padding: 2px 8px; outline: 0; }
  #inspector .gr-usage { gap: 12px; }
  #inspector .gr-urow { justify-content: space-between; align-items: flex-end; }
  #inspector .gr-nums { gap: 20px; }
  #inspector .gr-nums .gr-col { gap: 2px; }
  #inspector .gr-nums b { font-size: 18px; font-weight: 600; line-height: 22px; }
  #inspector .gr-nums span { font-size: 11px; color: #A1A1A8; }
  #inspector .gr-spark { height: 32px; gap: 3px; align-items: flex-end; }
  #inspector .gr-spark i { width: 4px; border-radius: 1px; background: #0A84FF59; display: block; }
  #inspector .gr-spark i.hot { background: #0A84FF; }
  #inspector .gr-links { padding: 16px 24px 12px; gap: 4px; flex: 1 1 auto; overflow-y: auto; min-height: 0; border-bottom: 0; }
  #inspector .gr-link { gap: 10px; padding: 5px 0; cursor: pointer; }
  #inspector .gr-link svg { color: #6B6B73; }
  #inspector .gr-link .gr-rel { width: 72px; flex: 0 0 72px; font-family: var(--mono); font-size: 10px; font-weight: 500; }
  #inspector .gr-link .gr-to { font-family: var(--mono); font-size: 11px; color: #F5F5F7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1; }
  #inspector .gr-link:hover .gr-to { color: #0A84FF; }
  #inspector .gr-none { font-size: 11px; color: #6B6B73; padding: 5px 0; }
  #inspector .gr-addlink { gap: 6px; padding-top: 4px; }
  #inspector .gr-relpick { position: relative; gap: 4px; padding: 5px 8px; border-radius: 6px; background: #1E1F24; font-family: var(--mono); font-size: 10px; font-weight: 500; line-height: 13px; }
  #inspector .gr-relpick svg { color: #6B6B73; }
  #inspector .gr-relpick select { position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; }
  #inspector .gr-target { flex: 1; min-width: 0; background: #16171B; border: 1px solid #FFFFFF24; border-radius: 6px; color: #F5F5F7;
    font-family: var(--mono); font-size: 11px; padding: 4px 8px; outline: 0; line-height: 15px; }
  #inspector .gr-target::placeholder { color: #6B6B73; }
  #inspector .gr-linkbtn { appearance: none; display: inline-flex; align-items: center; gap: 4px; padding: 5px 9px; border: 0; border-radius: 6px;
    background: #1E1F24; color: #F5F5F7; font: inherit; font-size: 11px; font-weight: 600; line-height: 13px; cursor: pointer; }
  #inspector .gr-linkbtn:hover { background: #2A2B31; }
  #inspector .gr-spacer { height: 4px; flex: 0 0 4px; }
  #inspector .gr-actions { padding: 16px 24px; gap: 8px; border-top: 1px solid #FFFFFF12; flex: 0 0 auto; }
  #inspector .gr-btn { appearance: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px; padding: 9px 14px; border: 0;
    border-radius: 8px; font: inherit; font-size: 12px; line-height: 15px; cursor: pointer; }
  #inspector .gr-btn.primary { flex: 1; background: #0A84FF; color: #FFFFFF; font-weight: 600; }
  #inspector .gr-btn.secondary { background: #1E1F24; color: #F5F5F7; font-weight: 500; }
  #inspector .gr-btn:hover { filter: brightness(1.12); }
  #inspector .gr-btn:disabled { opacity: .45; cursor: default; filter: none; }
  #inspector .gr-said { position: absolute; left: 24px; right: 24px; bottom: 74px; padding: 7px 10px; border-radius: 8px; font-size: 11px; }
  #inspector .gr-said.good { background: #32D74B26; color: #9BF0AA; border: 1px solid #32D74B40; }
  #inspector .gr-said.bad { background: #FF453A26; color: #FF9A93; border: 1px solid #FF453A40; }
  #inspector .gr-empty { color: #6B6B73; font-size: 12px; padding: 40px 24px; text-align: center; }`

export const html = `  <section class="screen on" id="screen-graph">
    <div id="canvas-wrap">
      <canvas id="graph"></canvas>
      <div class="gr-float gr-row" id="gr-stats"></div>
      <div class="gr-float gr-col" id="gr-legend"></div>
      <div class="gr-float gr-col" id="gr-zoom"></div>
    </div>
    <aside id="inspector"><div class="gr-empty">Select a document in the graph.</div></aside>
  </section>
`

export const js = `  // ── graph ───────────────────────────────────────────────────────────

  var canvas = byId('graph');
  var ctx = canvas.getContext('2d');
  var hover = null, dragNode = null, panning = false, last = { x: 0, y: 0 };
  var MONO = '"JetBrains Mono", "JetBrainsMonoNL Nerd Font", "SF Mono", ui-monospace, Menlo, monospace';
  var UI = '"Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif';
  var TYPE_ORDER = ['tutorial', 'how-to', 'reference', 'explanation', 'decision-record'];
  var CLUSTER_NAME = { tutorial: 'TUTORIALS', 'how-to': 'HOW-TO', reference: 'REFERENCE', explanation: 'EXPLANATION', 'decision-record': 'DECISIONS' };
  // where each type gathers, as fractions of the canvas: the design's arrangement
  var CLUSTER_AT = { explanation: [0.27, 0.3], 'decision-record': [0.6, 0.27], reference: [0.72, 0.5], tutorial: [0.15, 0.48], 'how-to': [0.38, 0.66] };
  var TYPE_TEXT = { tutorial: '#9BF0AA', 'how-to': '#FFC56B', reference: '#A6E3FF', explanation: '#D9A6F7', 'decision-record': '#FFB0C0' };
  var LIFE_CHIP = { FRESH: ['#32D74B1A', '#9BF0AA'], AGING: ['#FFD60A1A', '#FFE680'], STALE: ['#FF453A1F', '#FF9A93'] };
  var REL_COLOR = { TEACHES: '#32D74B', USES: '#FF9F0A', EXPLAINS: '#BF5AF2', DECIDES: '#FF6482', REQUIRES: '#0A84FF', NEXT: '#64D2FF', INLINE: '#6B6B73' };
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function sizeCanvas() {
    var wrap = byId('canvas-wrap');
    var dpr = window.devicePixelRatio || 1;
    canvas.width = wrap.clientWidth * dpr;
    canvas.height = wrap.clientHeight * dpr;
    canvas.style.width = wrap.clientWidth + 'px';
    canvas.style.height = wrap.clientHeight + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function anchorOf(type, w, h) {
    var a = CLUSTER_AT[type] || [0.5, 0.5];
    return { x: a[0] * w, y: a[1] * h };
  }

  function layout(graph) {
    var wrap = byId('canvas-wrap');
    var w = wrap.clientWidth || 900, h = wrap.clientHeight || 600;
    var byPath = {};
    state.nodes = graph.nodes.map(function (n, i) {
      var home = anchorOf(n.type, w, h);
      var angle = (i / graph.nodes.length) * Math.PI * 2;
      var node = {
        path: n.path, title: basename(n.path), type: n.type, lifecycle: n.lifecycle,
        inbound: n.inbound, outbound: n.outbound, audience: n.audience, confidence: n.confidence,
        x: home.x + Math.cos(angle) * 60,
        y: home.y + Math.sin(angle) * 60,
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
        var push = 7000 / d2;
        if (d < 1) { dx = Math.random() - 0.5; dy = Math.random() - 0.5; d = 1; }
        var fx = (dx / d) * push, fy = (dy / d) * push;
        a.vx -= fx; a.vy -= fy; b.vx += fx; b.vy += fy;
      }
    }
    for (i = 0; i < state.edges.length; i++) {
      var e = state.edges[i];
      var ex = e.t.x - e.s.x, ey = e.t.y - e.s.y;
      var ed = Math.sqrt(ex * ex + ey * ey) || 0.01;
      var pull = (ed - 150) * 0.006;
      var ux = (ex / ed) * pull, uy = (ey / ed) * pull;
      e.s.vx += ux; e.s.vy += uy; e.t.vx -= ux; e.t.vy -= uy;
    }
    for (i = 0; i < nodes.length; i++) {
      a = nodes[i];
      // each type gathers around its own place, so the clusters read as the design's regions
      var home = anchorOf(a.type, w, h);
      a.vx += (home.x - a.x) * 0.012;
      a.vy += (home.y - a.y) * 0.012;
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

  function circle(x, y, r) { ctx.beginPath(); ctx.arc(x, y, Math.max(0.5, r), 0, Math.PI * 2); }

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
    var k = state.view.k;

    // edges: inline faint, typed a little brighter, the selection's own lit blue with a glow
    var lit = [];
    ctx.lineWidth = 1;
    state.edges.forEach(function (e) {
      if (state.hiddenRels[e.rel] || !visible(e.s) || !visible(e.t)) return;
      if (sel && (e.s.path === sel || e.t.path === sel)) { lit.push(e); return; }
      var a = toScreen(e.s), b = toScreen(e.t);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = e.rel === 'INLINE' ? '#FFFFFF0A' : '#FFFFFF17';
      ctx.stroke();
    });
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = '#0A84FFB3';
    ctx.shadowColor = '#0A84FF66';
    ctx.shadowBlur = 6;
    lit.forEach(function (e) {
      var a = toScreen(e.s), b = toScreen(e.t);
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    });
    ctx.restore();

    // nodes: a filled circle in its type's colour, a lifecycle ring around it with a gap
    state.nodes.forEach(function (n) {
      if (!visible(n)) return;
      var p = toScreen(n);
      var r = n.r * k;
      var faded = sel && !near[n.path];
      if (n.path === sel) {
        circle(p.x, p.y, r + 14 * Math.min(1, k));
        ctx.fillStyle = '#0A84FF1F'; ctx.fill();
        ctx.lineWidth = 1.5; ctx.strokeStyle = '#0A84FF'; ctx.stroke();
      }
      circle(p.x, p.y, r + 6 * Math.min(1, k));
      ctx.lineWidth = n.lifecycle === 'STALE' ? 1.5 : 1.25;
      ctx.strokeStyle = lifeColor(n.lifecycle);
      ctx.globalAlpha = faded ? 0.6 : 1;
      ctx.stroke();
      ctx.globalAlpha = faded ? 0.42 : 1;
      ctx.save();
      if (n.path === sel) { ctx.shadowColor = typeColor(n.type) + '66'; ctx.shadowBlur = 12; }
      circle(p.x, p.y, r);
      ctx.fillStyle = typeColor(n.type);
      ctx.fill();
      ctx.restore();
      ctx.globalAlpha = 1;
    });

    // cluster names, just outside each type's group, never under the cards
    var cx = w / 2, cy = h / 2;
    var wrapBox = byId('canvas-wrap').getBoundingClientRect();
    var cards = ['gr-stats', 'gr-legend', 'gr-zoom'].map(function (id) {
      var b = byId(id).getBoundingClientRect();
      return { x: b.left - wrapBox.left - 8, y: b.top - wrapBox.top - 8, w: b.width + 16, h: b.height + 16 };
    });
    function clearOf(x, y, tw) {
      if (x < 12 || x + tw > w - 12 || y < 20 || y > h - 12) return false;
      return cards.every(function (c) { return x + tw < c.x || x > c.x + c.w || y < c.y || y - 12 > c.y + c.h; });
    }
    TYPE_ORDER.forEach(function (t) {
      if (state.hiddenTypes[t]) return;
      var members = state.nodes.filter(function (n) { return n.type === t && visible(n); });
      if (!members.length) return;
      var mx = 0, my = 0;
      members.forEach(function (n) { var p = toScreen(n); mx += p.x; my += p.y; });
      mx /= members.length; my /= members.length;
      var reach = 0;
      members.forEach(function (n) { var p = toScreen(n); reach = Math.max(reach, Math.hypot(p.x - mx, p.y - my) + n.r * k); });
      var dx = mx - cx, dy = my - cy, dl = Math.hypot(dx, dy) || 1;
      var name = CLUSTER_NAME[t] || t.toUpperCase();
      ctx.font = '600 10px ' + UI;
      if ('letterSpacing' in ctx) ctx.letterSpacing = '2px';
      var tw = ctx.measureText(name).width;
      // outward from the middle first, then beside the group, then above it
      var tries = [
        [mx + (dx / dl) * (reach + 22) - tw / 2, my + (dy / dl) * (reach + 22)],
        [dx < 0 ? mx - reach - 16 - tw : mx + reach + 16, my + 4],
        [mx - tw / 2, my - reach - 14],
        [mx - tw / 2, my + reach + 22]
      ];
      var spot = tries.filter(function (c) { return clearOf(c[0], c[1], tw); })[0] || tries[0];
      var lx = Math.max(12, Math.min(w - tw - 12, spot[0])), ly = Math.max(20, Math.min(h - 12, spot[1]));
      ctx.fillStyle = typeColor(t) + '8C';
      ctx.fillText(name, lx, ly);
      if ('letterSpacing' in ctx) ctx.letterSpacing = '0px';
    });

    // labels: the selection, its neighbours, what is hovered, and the hubs
    var drawn = [];
    var order = state.nodes.slice().sort(function (a, b) {
      return (b.path === sel) - (a.path === sel) || (near[b.path] ? 1 : 0) - (near[a.path] ? 1 : 0) || b.inbound - a.inbound;
    });
    order.forEach(function (n) {
      if (!visible(n)) return;
      var isSel = n.path === sel;
      var wanted = isSel || n === hover || near[n.path] || n.inbound >= 6;
      if (!wanted) return;
      var p = toScreen(n);
      var r = n.r * k;
      ctx.font = isSel ? '600 13px ' + MONO : '400 11px ' + MONO;
      var gap = isSel ? 14 * Math.min(1, k) + 2 : 6 * Math.min(1, k) + 6;
      var box = { x: p.x + r + gap, y: p.y - 7, w: ctx.measureText(n.path).width, h: 15 };
      for (var i = 0; i < drawn.length; i++) {
        var d = drawn[i];
        if (!isSel && box.x < d.x + d.w + 6 && box.x + box.w + 6 > d.x && box.y < d.y + d.h && box.y + box.h > d.y) return;
      }
      ctx.fillStyle = isSel ? '#F5F5F7' : (sel && !near[n.path] && n !== hover ? '#6B6B73' : '#A1A1A8');
      ctx.fillText(n.path, box.x, p.y + 4);
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
    // a press that barely moved is a click, not a drag — allow for a shaky hand
    if (dragNode && Math.hypot(ev.clientX - last.x, ev.clientY - last.y) < 9) select(dragNode.path);
    else if (panning && Math.hypot(ev.clientX - last.x, ev.clientY - last.y) < 9) {
      var hit = at(ev);
      if (!hit.node) select(null);
    }
    dragNode = null; panning = false; canvas.classList.remove('dragging');
  });

  function zoomAt(mx, my, factor) {
    var before = state.view.k;
    state.view.k = Math.min(3.2, Math.max(0.35, state.view.k * factor));
    state.view.x = mx - (mx - state.view.x) * (state.view.k / before);
    state.view.y = my - (my - state.view.y) * (state.view.k / before);
  }
  canvas.addEventListener('wheel', function (ev) {
    ev.preventDefault();
    var box = canvas.getBoundingClientRect();
    zoomAt(ev.clientX - box.left, ev.clientY - box.top, ev.deltaY < 0 ? 1.08 : 0.926);
  }, { passive: false });

  /** Frame every visible document in the canvas. */
  function fitView() {
    var wrap = byId('canvas-wrap');
    var w = wrap.clientWidth, h = wrap.clientHeight;
    var shown = state.nodes.filter(visible);
    if (!shown.length) return;
    var x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    shown.forEach(function (n) { x0 = Math.min(x0, n.x - n.r); y0 = Math.min(y0, n.y - n.r); x1 = Math.max(x1, n.x + n.r); y1 = Math.max(y1, n.y + n.r); });
    var k = Math.min(3.2, Math.max(0.35, Math.min((w - 160) / Math.max(1, x1 - x0), (h - 260) / Math.max(1, y1 - y0))));
    state.view.k = k;
    state.view.x = w / 2 - ((x0 + x1) / 2) * k;
    state.view.y = (h - 40) / 2 - ((y0 + y1) / 2) * k;
  }
  /** Bring the selected document to the middle of the canvas. */
  function locateSelected() {
    var n = state.nodes.filter(function (m) { return m.path === state.selected; })[0];
    if (!n) return;
    var wrap = byId('canvas-wrap');
    state.view.x = wrap.clientWidth / 2 - n.x * state.view.k;
    state.view.y = wrap.clientHeight / 2 - n.y * state.view.k;
  }

  (function zoomControls() {
    var box = byId('gr-zoom');
    [['plus', 'Zoom in', function () { var b = byId('canvas-wrap'); zoomAt(b.clientWidth / 2, b.clientHeight / 2, 1.2); }],
     ['minus', 'Zoom out', function () { var b = byId('canvas-wrap'); zoomAt(b.clientWidth / 2, b.clientHeight / 2, 1 / 1.2); }],
     ['scan', 'Fit every document', fitView],
     ['locate-fixed', 'Center the selected document', locateSelected]].forEach(function (z) {
      var b = el('button');
      b.title = z[1];
      b.setAttribute('aria-label', z[1]);
      b.id = 'gr-zoom-' + z[0];
      b.appendChild(icon(z[0], 15));
      b.onclick = z[2];
      box.appendChild(b);
    });
  })();

  // ── stats, legend, inspector ────────────────────────────────────────

  function renderStats() {
    var g = state.graph, v = state.validation;
    var box = clear(byId('gr-stats'));
    function stat(value, label, check) {
      var d = el('div', 'gr-col gr-stat');
      var row = el('div', 'gr-row');
      row.appendChild(el('b', null, num(value)));
      if (check) {
        var ok = value === 0;
        var mark = icon(ok ? 'circle-check' : 'triangle-alert', 14);
        mark.setAttribute('class', ok ? 'ok' : 'warn');
        row.appendChild(mark);
      }
      d.appendChild(row);
      d.appendChild(el('span', null, label));
      box.appendChild(d);
    }
    stat(g.stats.documents, 'documents');
    stat(g.stats.edges, 'links');
    stat(g.orphans.length, 'orphans', true);
    stat(g.cycles.length, 'cycles', true);
    if (!v) return;
    box.appendChild(el('div', 'gr-div'));
    var counts = { PASS: 0, WARN: 0, FAIL: 0 };
    v.documents.forEach(function (d) { counts[d.status] = (counts[d.status] || 0) + 1; });
    var val = el('div', 'gr-col gr-val');
    var row = el('div', 'gr-row gr-counts');
    [['PASS', 'pass', '#32D74B', '#9BF0AA'], ['WARN', 'warn', '#FFD60A', '#FFE680'], ['FAIL', 'fail', '#FF453A', '#FF9A93']].forEach(function (p) {
      var n = counts[p[0]] || 0;
      var item = el('div', 'gr-row');
      var dot = el('i');
      // nothing counted reads as an empty ring, in grey
      if (n) dot.style.background = p[2]; else dot.style.border = '1.25px solid #6B6B73';
      item.appendChild(dot);
      var t = el('span', null, n + ' ' + p[1]);
      t.style.color = n ? p[3] : '#6B6B73';
      item.appendChild(t);
      row.appendChild(item);
    });
    val.appendChild(row);
    var graphOk = (v.graph || []).every(function (c) { return c.passed; });
    val.appendChild(el('span', null, 'dep validate ' + String.fromCharCode(183) + ' ' + (graphOk ? 'graph checks pass' : (v.graph || []).filter(function (c) { return !c.passed; }).length + ' graph checks fail')));
    box.appendChild(val);
  }

  function renderLegend() {
    var g = state.graph;
    var box = clear(byId('gr-legend'));
    var types = {}, lives = { FRESH: 0, AGING: 0, STALE: 0 }, rels = {};
    g.nodes.forEach(function (n) {
      types[n.type] = (types[n.type] || 0) + 1;
      lives[n.lifecycle] = (lives[n.lifecycle] || 0) + 1;
    });
    g.edges.forEach(function (e) { rels[e.rel] = (rels[e.rel] || 0) + 1; });
    function row(label, items) {
      var r = el('div', 'gr-row gr-lrow');
      r.appendChild(el('div', 'gr-cap gr-lab', label));
      items.forEach(function (c) { r.appendChild(c); });
      box.appendChild(r);
    }
    var typeList = TYPE_ORDER.filter(function (t) { return types[t]; }).concat(Object.keys(types).filter(function (t) { return TYPE_ORDER.indexOf(t) < 0; }));
    row('type', typeList.map(function (t) {
      var c = el('div', 'gr-row gr-it' + (state.hiddenTypes[t] ? ' off' : ''));
      var i = el('i', 'gr-dot'); i.style.background = typeColor(t);
      c.appendChild(i); c.appendChild(el('span', null, t)); c.appendChild(el('b', null, types[t]));
      c.onclick = function () { state.hiddenTypes[t] = !state.hiddenTypes[t]; state.alpha = Math.max(state.alpha, 0.3); renderLegend(); };
      return c;
    }));
    row('lifecycle', ['FRESH', 'AGING', 'STALE'].map(function (l) {
      var c = el('div', 'gr-row gr-it' + (state.hiddenLife[l] ? ' off' : ''));
      var o = el('i', 'gr-ring'); o.style.borderColor = lifeColor(l);
      c.appendChild(o); c.appendChild(el('span', 'gr-life', l)); c.appendChild(el('b', null, lives[l] || 0));
      c.onclick = function () { state.hiddenLife[l] = !state.hiddenLife[l]; state.alpha = Math.max(state.alpha, 0.3); renderLegend(); };
      return c;
    }));
    row('relation', REL_ORDER.filter(function (r) { return rels[r]; }).map(function (r) {
      var c = el('div', 'gr-row gr-rel' + (r === 'INLINE' ? ' inline' : '') + (state.hiddenRels[r] ? ' off' : ''));
      c.appendChild(el('span', null, r));
      c.appendChild(el('b', null, rels[r]));
      c.onclick = function () { state.hiddenRels[r] = !state.hiddenRels[r]; renderLegend(); };
      return c;
    }));
  }

  function amend(path, change) {
    var body = { document: path };
    Object.keys(change).forEach(function (k) { body[k] = change[k]; });
    fetch('/api/amend', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (data) { return { ok: r.ok, data: data }; });
    }).then(function (answer) {
      if (!answer.ok) {
        said(answer.data.error || 'the change was refused', false);
        return;
      }
      var note = answer.data.changes.map(function (c) { return c.field; }).join(', ') + ' updated';
      refresh(false).then(function () { select(path, note); }).catch(function () { select(path, note); });
    }).catch(function (err) {
      said(String(err.message || err), false);
    });
  }

  function said(message, good) {
    var box = byId('inspector');
    var note = el('div', 'gr-said ' + (good ? 'good' : 'bad'), message);
    box.appendChild(note);
    setTimeout(function () { if (note.parentNode) note.parentNode.removeChild(note); }, 4000);
  }

  function select(path, note) {
    state.selected = path;
    if (!path) { clear(byId('inspector')).appendChild(el('div', 'gr-empty', 'Select a document in the graph.')); return; }
    get('/api/document?path=' + encodeURIComponent(path)).then(function (doc) {
      if (state.selected !== path) return;
      renderInspector(doc);
      if (note) said(note, true);
    }).catch(function (err) { clear(byId('inspector')).appendChild(el('div', 'gr-empty', String(err.message || err))); });
  }

  function dateText(iso) {
    var t = Date.parse(iso);
    if (!t) return '-';
    var d = new Date(t);
    return d.getDate() + ' ' + MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }

  /** The calls that offered this document, newest first. */
  function callsOffering(path) {
    return (state.trace ? state.trace.entries : []).filter(function (e) {
      return (e.offered || []).some(function (p) { return p.document === path; });
    }).sort(function (a, b) { return Date.parse(b.at) - Date.parse(a.at); });
  }

  function traceUse(path) {
    var calls = callsOffering(path);
    if (!calls.length) return;
    state.selectedCall = calls[0].id;
    showScreen('traversal');
    if (typeof renderCalls === 'function') renderCalls();
    if (typeof renderCall === 'function') renderCall(calls[0]);
  }

  function section(cls) { return el('div', 'gr-col gr-sec' + (cls ? ' ' + cls : '')); }
  function captionRow(caption, extra) {
    var r = el('div', 'gr-row gr-caprow');
    r.appendChild(el('span', 'gr-cap', caption));
    if (extra) r.appendChild(extra);
    return r;
  }
  function kvRow(key, value) {
    var r = el('div', 'gr-row gr-kv');
    r.appendChild(el('span', 'gr-k', key));
    var v = el('div', 'gr-row gr-v');
    if (typeof value === 'string') v.appendChild(document.createTextNode(value)); else v.appendChild(value);
    r.appendChild(v);
    return r;
  }

  function renderInspector(doc) {
    var box = clear(byId('inspector'));

    // header: type and lifecycle, title, path
    var head = section('gr-head');
    var chips = el('div', 'gr-row gr-chips');
    var type = el('span', 'gr-row gr-chip', doc.type);
    type.style.background = typeColor(doc.type) + '1F';
    type.style.color = TYPE_TEXT[doc.type] || '#A1A1A8';
    chips.appendChild(type);
    var lc = LIFE_CHIP[doc.lifecycle] || ['#FFFFFF14', '#A1A1A8'];
    var life = el('span', 'gr-row gr-chip');
    life.style.background = lc[0]; life.style.color = lc[1];
    var ld = el('i'); ld.style.background = lifeColor(doc.lifecycle);
    life.appendChild(ld); life.appendChild(document.createTextNode(doc.lifecycle));
    chips.appendChild(life);
    head.appendChild(chips);
    head.appendChild(el('h2', null, doc.title || basename(doc.path)));
    head.appendChild(el('div', 'gr-path', doc.path));
    box.appendChild(head);

    // metadata, written to the document's frontmatter
    var meta = section();
    var hint = el('div', 'gr-row gr-hint');
    hint.appendChild(icon('pencil-line', 11));
    hint.appendChild(el('span', null, 'writes to frontmatter'));
    meta.appendChild(captionRow('Metadata', hint));
    var owner = el('span', 'gr-m', doc.owner || '-');
    meta.appendChild(kvRow('Owner', owner));
    var seg = el('div', 'gr-row gr-seg');
    ['low', 'medium', 'high'].forEach(function (level) {
      var b = el('button', doc.confidence === level ? 'on' : null, level);
      b.onclick = function () { if (doc.confidence !== level) amend(doc.path, { set: { confidence: level } }); };
      seg.appendChild(b);
    });
    meta.appendChild(kvRow('Confidence', seg));
    var lastVerified = doc.freshness && doc.freshness.lastVerified;
    var age = days(lastVerified);
    var verified = el('div', 'gr-row');
    verified.style.gap = '8px';
    verified.appendChild(el('span', null, lastVerified ? dateText(lastVerified) + ' ' + String.fromCharCode(183) + ' ' + age + 'd ago' : 'never'));
    var bump = el('button', 'gr-bump');
    bump.appendChild(icon('refresh-cw', 11));
    bump.appendChild(document.createTextNode('Bump'));
    bump.title = 'Mark it verified now';
    bump.onclick = function () { amend(doc.path, { bump: true }); };
    verified.appendChild(bump);
    meta.appendChild(kvRow('Last verified', verified));
    if (doc.freshness && doc.freshness.cadenceDays) {
      var cad = el('div', 'gr-row');
      cad.style.gap = '8px';
      var track = el('div', 'gr-track');
      var fill = el('i');
      var frac = age === null ? 0 : Math.min(1, age / doc.freshness.cadenceDays);
      fill.style.width = Math.max(frac * 100, age ? 4 : 0).toFixed(0) + '%';
      fill.style.background = lifeColor(doc.lifecycle);
      track.appendChild(fill);
      cad.appendChild(track);
      cad.appendChild(el('span', null, (age === null ? '?' : age) + ' / ' + doc.freshness.cadenceDays + ' days'));
      meta.appendChild(kvRow('Review cadence', cad));
    }
    var aud = el('div', 'gr-row gr-aud');
    (doc.audience || []).forEach(function (a) { aud.appendChild(el('span', null, a)); });
    if (!(doc.audience || []).length) aud.appendChild(el('span', null, 'none'));
    meta.appendChild(kvRow('Audience', aud));
    box.appendChild(meta);

    // tags
    var tg = section('gr-tags-sec');
    tg.appendChild(captionRow('Tags', el('span', 'gr-hint m', 'dep tag')));
    var tags = el('div', 'gr-row gr-tags');
    (doc.tags || []).forEach(function (name) {
      var chip = el('span', 'gr-row gr-tag');
      chip.appendChild(el('span', null, name));
      var x = icon('x', 11);
      x.setAttribute('aria-label', 'Remove ' + name);
      x.onclick = function () { amend(doc.path, { tags: { remove: [name] } }); };
      chip.appendChild(x);
      tags.appendChild(chip);
    });
    var add = el('button', 'gr-addtag');
    add.appendChild(icon('plus', 11));
    add.appendChild(document.createTextNode('tag'));
    add.onclick = function () {
      var input = el('input', 'gr-tagin');
      input.placeholder = 'new tag';
      input.onkeydown = function (ev) {
        if (ev.key === 'Enter' && input.value.trim()) amend(doc.path, { tags: { add: [input.value.trim()] } });
        if (ev.key === 'Escape') tags.replaceChild(add, input);
      };
      input.onblur = function () { if (!input.value.trim() && input.parentNode) tags.replaceChild(add, input); };
      tags.replaceChild(input, add);
      input.focus();
    };
    tags.appendChild(add);
    tg.appendChild(tags);
    box.appendChild(tg);

    // agent usage over the last day: what was offered, what the agent said it used
    var usage = section('gr-usage');
    usage.appendChild(captionRow('Agent usage', el('span', 'gr-hint', 'last 24h')));
    var now = Date.now(), dayAgo = now - 86400000;
    var offered = 0, usedCount = 0;
    var buckets = [], hot = [];
    for (var bi = 0; bi < 12; bi++) { buckets.push(0); hot.push(false); }
    callsOffering(doc.path).forEach(function (e) {
      var t = Date.parse(e.at);
      if (!t || t < dayAgo) return;
      var slot = Math.min(11, Math.floor((t - dayAgo) / 7200000));
      (e.offered || []).forEach(function (p) {
        if (p.document !== doc.path) return;
        offered++;
        buckets[slot]++;
        if ((e.used || []).indexOf(p.id) >= 0) { usedCount++; hot[slot] = true; }
      });
    });
    var urow = el('div', 'gr-row gr-urow');
    var nums = el('div', 'gr-row gr-nums');
    [[offered, 'offered'], [usedCount, 'used'], [offered ? Math.round(usedCount / offered * 100) + '%' : '0%', 'use rate']].forEach(function (p) {
      var c = el('div', 'gr-col');
      c.appendChild(el('b', null, p[0]));
      c.appendChild(el('span', null, p[1]));
      nums.appendChild(c);
    });
    urow.appendChild(nums);
    var spark = el('div', 'gr-row gr-spark');
    spark.title = 'offers in two-hour slots; bright where the agent used it';
    var top = Math.max.apply(null, buckets) || 1;
    buckets.forEach(function (n, i) {
      var bar = el('i', hot[i] ? 'hot' : null);
      bar.style.height = (n ? Math.max(4, Math.round(n / top * 32)) : 2) + 'px';
      if (!n) bar.style.background = '#FFFFFF14';
      spark.appendChild(bar);
    });
    urow.appendChild(spark);
    usage.appendChild(urow);
    box.appendChild(usage);

    // links, both ways, and a new one
    var lk = el('div', 'gr-col gr-sec gr-links');
    function linkRows(caption, list, out) {
      lk.appendChild(captionRow(caption, el('span', 'gr-hint', String(list.length))));
      if (!list.length) lk.appendChild(el('div', 'gr-none', 'none'));
      list.forEach(function (l) {
        var other = out ? l.target : l.source;
        var row = el('div', 'gr-row gr-link');
        row.title = other;
        row.appendChild(icon(out ? 'arrow-up-right' : 'arrow-down-left', 13));
        var rel = el('span', 'gr-rel', l.rel);
        rel.style.color = REL_COLOR[l.rel] || '#A1A1A8';
        row.appendChild(rel);
        var name = other.split('/').pop();
        row.appendChild(el('span', 'gr-to', name));
        row.onclick = function () { select(other); };
        lk.appendChild(row);
      });
    }
    linkRows('Outgoing', doc.forwardLinks, true);

    var addRow = el('div', 'gr-row gr-addlink');
    var relWrap = el('div', 'gr-row gr-relpick');
    var relText = el('span', null, 'USES');
    relText.style.color = REL_COLOR.USES;
    var relPick = el('select');
    relPick.setAttribute('aria-label', 'Relation');
    ['TEACHES', 'USES', 'EXPLAINS', 'DECIDES', 'REQUIRES', 'NEXT'].forEach(function (r) {
      var o = el('option', null, r);
      o.value = r;
      relPick.appendChild(o);
    });
    relPick.value = 'USES';
    relPick.onchange = function () { relText.textContent = relPick.value; relText.style.color = REL_COLOR[relPick.value]; };
    relWrap.appendChild(relText);
    relWrap.appendChild(icon('chevron-down', 11));
    relWrap.appendChild(relPick);
    addRow.appendChild(relWrap);
    var target = el('input', 'gr-target');
    target.placeholder = 'target document' + String.fromCharCode(8230);
    target.setAttribute('list', 'gr-targets');
    var list = el('datalist');
    list.id = 'gr-targets';
    (state.graph ? state.graph.nodes : []).forEach(function (n) {
      if (n.path === doc.path) return;
      var o = el('option');
      o.value = n.path;
      list.appendChild(o);
    });
    addRow.appendChild(target);
    addRow.appendChild(list);
    var linkBtn = el('button', 'gr-linkbtn');
    linkBtn.appendChild(icon('link-2', 12));
    linkBtn.appendChild(document.createTextNode('Link'));
    var sendLink = function () {
      var to = target.value.trim();
      if (!to) return;
      amend(doc.path, { link: { target: to, rel: relPick.value } });
    };
    linkBtn.onclick = sendLink;
    target.onkeydown = function (ev) { if (ev.key === 'Enter') sendLink(); };
    addRow.appendChild(linkBtn);
    lk.appendChild(addRow);
    lk.appendChild(el('div', 'gr-spacer'));
    linkRows('Incoming', doc.backlinks, false);
    box.appendChild(lk);

    // what to do with it
    var actions = el('div', 'gr-row gr-actions');
    var trace = el('button', 'gr-btn primary');
    trace.appendChild(icon('activity', 14));
    trace.appendChild(document.createTextNode('Trace agent use'));
    var calls = callsOffering(doc.path);
    if (!calls.length) { trace.disabled = true; trace.title = 'No agent has been offered this document yet'; }
    else trace.title = 'Open the latest of ' + calls.length + ' calls that offered it';
    trace.onclick = function () { traceUse(doc.path); };
    actions.appendChild(trace);
    var open = el('button', 'gr-btn secondary');
    open.appendChild(icon('file-text', 14));
    open.appendChild(document.createTextNode('Open'));
    open.onclick = function () { openReader(doc.path); };
    actions.appendChild(open);
    box.appendChild(actions);
  }
`

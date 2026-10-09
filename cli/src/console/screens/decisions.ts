/**
 * The console's Decisions screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 *
 * Laid out as designs/dep-console-game.pen, frame "Console — Decisions": the
 * trees and dap_resolve on the left, the selected tree drawn as a diagram in
 * the middle with the walk an agent took through it, and the selected node on
 * the right. A walk is only ever what the record of requests holds: the
 * procedure steps one consumer asked for, in order.
 */
export const css = `
  #screen-decisions { background: #07080A; }
  #screen-decisions .dc-wrap { display: flex; width: 100%; min-height: 0; font-family: var(--ui); line-height: normal; color: #F5F5F7; }
  #screen-decisions .dc-m { font-family: var(--mono); }
  #screen-decisions .dc-cap { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; color: #6B6B73; text-transform: uppercase; }
  #screen-decisions .dc-capx { font-size: 11px; color: #6B6B73; }
  #screen-decisions .dc-caprow { display: flex; justify-content: space-between; align-items: center; gap: 10px; }

  #screen-decisions .dc-rail { width: 280px; flex: 0 0 280px; display: flex; flex-direction: column; background: #0F1013; border-right: 1px solid #FFFFFF12; min-height: 0; }
  #screen-decisions .dc-rhead { padding: 20px 20px 18px; display: flex; flex-direction: column; gap: 16px; border-bottom: 1px solid #FFFFFF12; flex: 0 0 auto; }
  #screen-decisions .dc-rhead h3 { font-size: 15px; font-weight: 600; }
  #screen-decisions .dc-rhead .dc-dir { font-family: var(--mono); font-size: 11px; color: #6B6B73; }
  #screen-decisions .dc-stats { display: flex; gap: 26px; }
  #screen-decisions .dc-stat b { display: flex; align-items: center; gap: 6px; font-size: 22px; font-weight: 600; letter-spacing: -0.5px; line-height: 27px; }
  #screen-decisions .dc-stat span { display: block; font-size: 11px; color: #A1A1A8; margin-top: 2px; }
  #screen-decisions .dc-resolve { padding: 18px 20px; display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid #FFFFFF12; flex: 0 0 auto; }
  #screen-decisions .dc-query { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #1E1F24; border-radius: 8px; color: #6B6B73; }
  #screen-decisions .dc-query input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; color: #F5F5F7; font-family: var(--mono); font-size: 12px; line-height: 16px; padding: 0; }
  #screen-decisions .dc-query input::placeholder { color: #6B6B73; }
  #screen-decisions .dc-scores { display: flex; flex-direction: column; gap: 9px; }
  #screen-decisions .dc-score { display: flex; flex-direction: column; gap: 5px; cursor: pointer; }
  #screen-decisions .dc-score .dc-caprow span { font-family: var(--mono); font-size: 11.5px; color: #A1A1A8; }
  #screen-decisions .dc-score .dc-caprow b { font-size: 12px; font-weight: 600; color: #6B6B73; }
  #screen-decisions .dc-score.dc-first .dc-caprow span { color: #F5F5F7; } #screen-decisions .dc-score.dc-first .dc-caprow b { color: #8CC4FF; }
  #screen-decisions .dc-track { height: 3px; background: #1E1F24; border-radius: 2px; } #screen-decisions .dc-track i { display: block; height: 3px; border-radius: 2px; background: #FFFFFF33; }
  #screen-decisions .dc-score.dc-first .dc-track i { background: #0A84FF; }
  #screen-decisions .dc-hint { font-size: 11px; color: #6B6B73; line-height: 1.45; }
  #screen-decisions .dc-trees { padding: 18px 10px; display: flex; flex-direction: column; gap: 2px; overflow-y: auto; flex: 1 1 auto; min-height: 0; }
  #screen-decisions .dc-trees > .dc-caprow { padding: 0 10px 8px; }
  #screen-decisions .dc-tree { padding: 8px 10px; border-radius: 8px; border: 1px solid transparent; display: flex; flex-direction: column; gap: 5px; cursor: pointer; }
  #screen-decisions .dc-tree:hover { background: #FFFFFF08; }
  #screen-decisions .dc-tree.dc-on { background: #0A84FF14; border-color: #0A84FF4D; }
  #screen-decisions .dc-tree .dc-row { display: flex; align-items: center; gap: 8px; color: #6B6B73; }
  #screen-decisions .dc-tree.dc-on .dc-row svg { color: #8CC4FF; }
  #screen-decisions .dc-tree .dc-name { flex: 1; min-width: 0; font-family: var(--mono); font-size: 12px; color: #A1A1A8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #screen-decisions .dc-tree.dc-on .dc-name { color: #F5F5F7; }
  #screen-decisions .dc-tree .dc-count { font-size: 12px; color: #6B6B73; }
  #screen-decisions .dc-note { display: flex; align-items: center; gap: 6px; padding-left: 21px; font-size: 11px; color: #6B6B73; }
  #screen-decisions .dc-note svg, #screen-decisions .dc-note .dc-g { color: #FF9F0A; }
  #screen-decisions .dc-g { font-family: var(--mono); font-size: 10px; font-weight: 600; }

  #screen-decisions .dc-centre { flex: 1 1 auto; min-width: 0; display: flex; flex-direction: column; }
  #screen-decisions .dc-thead { padding: 20px 24px 16px; display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid #FFFFFF12; flex: 0 0 auto; }
  #screen-decisions .dc-top { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
  #screen-decisions .dc-tname { display: flex; align-items: center; gap: 10px; min-width: 0; }
  #screen-decisions .dc-tname h2 { font-family: var(--mono); font-size: 19px; font-weight: 600; letter-spacing: -0.3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #screen-decisions .dc-chip { display: inline-flex; align-items: center; padding: 3px 8px; border-radius: 6px; background: #1E1F24; font-family: var(--mono); font-size: 11px; font-weight: 500; color: #6B6B73; white-space: nowrap; }
  #screen-decisions .dc-right { display: flex; align-items: center; gap: 14px; flex: 0 0 auto; }
  #screen-decisions .dc-vis { display: flex; align-items: center; gap: 6px; font-size: 11px; color: #A1A1A8; white-space: nowrap; }
  #screen-decisions .dc-vis.dc-un { color: #6B6B73; }
  #screen-decisions .dc-vis i { width: 7px; height: 7px; border-radius: 50%; background: #0A84FF; }
  #screen-decisions .dc-vis.dc-un i { background: transparent; border: 1.25px solid #6B6B73; }
  #screen-decisions .dc-toggle { display: flex; gap: 2px; padding: 2px; background: #1E1F24; border-radius: 8px; }
  #screen-decisions .dc-toggle button { appearance: none; border: 0; background: transparent; color: #6B6B73; font: inherit; font-size: 11px; font-weight: 500; padding: 4px 10px; border-radius: 6px; cursor: pointer; line-height: 13px; }
  #screen-decisions .dc-toggle button.dc-on { background: #FFFFFF1F; color: #F5F5F7; }
  #screen-decisions .dc-sub { display: flex; justify-content: space-between; align-items: center; gap: 14px; }
  #screen-decisions .dc-trig { display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 12px; color: #A1A1A8; white-space: nowrap; }
  #screen-decisions .dc-trig .dc-k { font-size: 11px; color: #6B6B73; }
  #screen-decisions .dc-trig .dc-v { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  #screen-decisions .dc-legend { display: flex; align-items: center; gap: 12px; flex: 0 0 auto; }
  #screen-decisions .dc-legend span { display: flex; align-items: center; gap: 4px; font-size: 11px; color: #6B6B73; }
  #screen-decisions .dc-legend b { font-family: var(--mono); font-size: 11px; font-weight: 700; }
  #screen-decisions .dc-canvas { flex: 1 1 auto; min-height: 0; overflow: auto; position: relative;
    background: radial-gradient(ellipse 140% 140% at 30% 30%, #0A84FF0A 0%, #00000000 100%); }
  #screen-decisions .dc-plane { position: relative; }
  #screen-decisions .dc-plane svg.dc-edges { position: absolute; left: 0; top: 0; pointer-events: none; overflow: visible; }
  #screen-decisions .dc-node { position: absolute; width: 186px; height: 32px; padding: 0 8px; display: flex; align-items: center; gap: 6px;
    background: #0F1013; border: 1px solid #FFFFFF24; border-radius: 8px; cursor: pointer; font-family: var(--mono); font-size: 10.5px; }
  #screen-decisions .dc-node:hover { border-color: #FFFFFF55; }
  #screen-decisions .dc-node .dc-glyph { font-weight: 700; flex: 0 0 auto; }
  #screen-decisions .dc-node .dc-id { flex: 1; min-width: 0; color: #F5F5F7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #screen-decisions .dc-node .dc-gate { color: #64D2FF; display: flex; }
  #screen-decisions .dc-node.dc-dim { opacity: 0.5; } #screen-decisions .dc-node.dc-dim .dc-id { color: #A1A1A8; }
  #screen-decisions .dc-node.dc-walked { background: #0B1A2C; border-color: #0A84FF66; }
  #screen-decisions .dc-node.dc-sel { background: #0A3A6E; border-color: #0A84FF; opacity: 1; }
  #screen-decisions .dc-node.dc-sel .dc-id { color: #F5F5F7; }
  #screen-decisions .dc-step { position: absolute; right: -6px; top: -7px; width: 17px; height: 17px; border-radius: 9px; background: #0A84FF; border: 2px solid #07080A;
    display: flex; align-items: center; justify-content: center; font-family: var(--ui); font-size: 9px; font-weight: 700; color: #FFFFFF; }
  #screen-decisions .dc-blabel { position: absolute; font-family: var(--mono); font-size: 9.5px; color: #6B6B73; white-space: pre; line-height: 13px; pointer-events: none; }
  #screen-decisions .dc-blabel.dc-taken { color: #8CC4FF; }
  #screen-decisions .dc-loop { position: absolute; display: flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 5px; background: #0A84FF26; color: #8CC4FF; font-size: 10px; font-weight: 600; white-space: nowrap; }
  #screen-decisions .dc-cyc { position: absolute; font-family: var(--mono); font-size: 9.5px; color: #6B6B73; line-height: 13px; }
  #screen-decisions .dc-walk { padding: 14px 24px 18px; display: flex; flex-direction: column; gap: 10px; background: #0F1013; border-top: 1px solid #FFFFFF12; flex: 0 0 auto; max-height: 220px; overflow-y: auto; }
  #screen-decisions .dc-cards { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
  #screen-decisions .dc-card { padding: 9px 11px; display: flex; flex-direction: column; gap: 5px; background: #0F1013; border: 1px solid #FFFFFF12; border-radius: 9px; cursor: pointer; min-width: 0; }
  #screen-decisions .dc-card.dc-on { background: #0A84FF1F; border-color: #0A84FF66; }
  #screen-decisions .dc-card .dc-head { display: flex; align-items: center; gap: 7px; min-width: 0; }
  #screen-decisions .dc-num { width: 16px; height: 16px; flex: 0 0 16px; border-radius: 8px; background: #0A84FF; color: #FFFFFF; font-size: 9px; font-weight: 700; display: flex; align-items: center; justify-content: center; }
  #screen-decisions .dc-num.dc-again { background: #0A84FF55; }
  #screen-decisions .dc-card .dc-head .dc-glyph { font-family: var(--mono); font-size: 10.5px; font-weight: 700; }
  #screen-decisions .dc-card .dc-head .dc-id { font-family: var(--mono); font-size: 11px; color: #F5F5F7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #screen-decisions .dc-card .dc-out { font-size: 11px; color: #6B6B73; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  #screen-decisions .dc-card .dc-out.dc-m { font-size: 10.5px; }
  #screen-decisions .dc-card .dc-out.dc-now { color: #8CC4FF; }

  #screen-decisions .dc-insp { width: 340px; flex: 0 0 340px; display: flex; flex-direction: column; background: #0F1013; border-left: 1px solid #FFFFFF12; min-height: 0; overflow-y: auto; }
  #screen-decisions .dc-ihead { padding: 22px 22px 18px; display: flex; flex-direction: column; gap: 12px; border-bottom: 1px solid #FFFFFF12; }
  #screen-decisions .dc-chips { display: flex; gap: 6px; flex-wrap: wrap; }
  #screen-decisions .dc-tchip { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 500; }
  #screen-decisions .dc-tchip .dc-glyph { font-family: var(--mono); font-size: 10.5px; font-weight: 700; }
  #screen-decisions .dc-ihead h2 { font-family: var(--mono); font-size: 20px; font-weight: 600; letter-spacing: -0.3px; overflow-wrap: anywhere; line-height: 1.3; }
  #screen-decisions .dc-uri { font-family: var(--mono); font-size: 11px; color: #6B6B73; word-break: break-all; }
  #screen-decisions .dc-sec { padding: 16px 22px; display: flex; flex-direction: column; gap: 8px; border-bottom: 1px solid #FFFFFF12; }
  #screen-decisions .dc-sec.dc-grow { flex: 1 0 auto; border-bottom: 0; }
  #screen-decisions .dc-kv { display: flex; justify-content: space-between; gap: 12px; font-family: var(--mono); font-size: 11px; }
  #screen-decisions .dc-kv span { color: #A1A1A8; flex: 0 0 auto; } #screen-decisions .dc-kv b { font-weight: 400; color: #F5F5F7; text-align: right; word-break: break-all; }
  #screen-decisions .dc-kv b.dc-quiet { color: #6B6B73; }
  #screen-decisions .dc-desc { font-size: 12px; color: #A1A1A8; line-height: 1.45; margin-top: 6px; }
  #screen-decisions .dc-cond { padding: 9px 11px; display: flex; flex-direction: column; gap: 6px; background: #16171B; border: 1px solid #FFFFFF12; border-radius: 8px; cursor: pointer; }
  #screen-decisions .dc-cond.dc-taken { background: #0A84FF1A; border-color: #0A84FF66; }
  #screen-decisions .dc-cond .dc-c { font-family: var(--mono); font-size: 10.5px; color: #A1A1A8; word-break: break-word; }
  #screen-decisions .dc-cond.dc-taken .dc-c { color: #F5F5F7; }
  #screen-decisions .dc-cond .dc-next { display: flex; align-items: center; gap: 6px; color: #6B6B73; }
  #screen-decisions .dc-cond .dc-next b { flex: 1; min-width: 0; font-family: var(--mono); font-size: 11px; font-weight: 400; color: #A1A1A8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #screen-decisions .dc-cond.dc-taken .dc-next, #screen-decisions .dc-cond.dc-taken .dc-next b { color: #8CC4FF; }
  #screen-decisions .dc-cond .dc-l { font-size: 10px; color: #6B6B73; }
  #screen-decisions .dc-takenchip { padding: 1px 6px; border-radius: 4px; background: #0A84FF; color: #FFFFFF; font-size: 9px; font-weight: 700; letter-spacing: 0.6px; }
  #screen-decisions .dc-cmd { padding: 14px 22px; border-top: 1px solid #FFFFFF12; flex: 0 0 auto; }
  #screen-decisions .dc-box { display: flex; align-items: center; gap: 8px; padding: 8px 10px; background: #16171B; border-radius: 8px; font-family: var(--mono); color: #6B6B73; }
  #screen-decisions .dc-box span { font-size: 11px; } #screen-decisions .dc-box code { flex: 1; min-width: 0; font-family: var(--mono); font-size: 10.5px; color: #A1A1A8; word-break: break-all; line-height: 14px; }
  #screen-decisions .dc-box button { appearance: none; border: 0; background: transparent; color: #6B6B73; cursor: pointer; display: flex; padding: 2px; }
  #screen-decisions .dc-box button:hover { color: #F5F5F7; }
  #screen-decisions .dc-empty { font-size: 12px; color: #6B6B73; line-height: 1.45; }
`

export const html = `  <section class="screen" id="screen-decisions">
    <div class="dc-wrap">
      <div class="dc-rail">
        <div class="dc-rhead">
          <div class="dc-caprow"><h3>Decision trees</h3><span class="dc-dir">dap/trees</span></div>
          <div class="dc-stats" id="dc-stats"></div>
        </div>
        <div class="dc-resolve">
          <div class="dc-caprow"><span class="dc-cap">Resolve</span><span class="dc-capx">dap_resolve</span></div>
          <label class="dc-query"><span id="dc-query-icon" style="display:flex"></span><input id="dc-query" placeholder="a request, e.g. validate documentation" autocomplete="off" spellcheck="false"></label>
          <div class="dc-scores" id="dc-scores"></div>
        </div>
        <div class="dc-trees" id="trees"></div>
      </div>
      <div class="dc-centre" id="tree-detail"></div>
      <div class="dc-insp" id="dc-insp"></div>
    </div>
  </section>
`

export const js = `  // ── decisions ───────────────────────────────────────────────────────

  var GLYPH = { observe: '[?]', decide: '[>]', act: '[!]', delegate: '[@]' };
  var GLYPH_COLOR = { observe: '#64D2FF', decide: '#BF5AF2', act: '#32D74B', delegate: '#FF9F0A' };
  var GLYPH_CHIP = { observe: ['#64D2FF1F', '#9BE2FF'], decide: ['#BF5AF21F', '#D9A6F7'], act: ['#32D74B1F', '#9BF0AA'], delegate: ['#FF9F0A1F', '#FFC56B'] };
  var DC_COL = 200, DC_ROW = 80, DC_W = 186, DC_H = 32, DC_X0 = 24, DC_Y0 = 20;
  var dc = { node: null, walkedOnly: false, resolveTimer: null, resolved: null };

  function dcEl(tag, cls, text) {
    return el(tag, cls ? cls.split(' ').map(function (c) { return 'dc-' + c; }).join(' ') : cls, text);
  }
  function dcPut(parent, kids) { kids.forEach(function (k) { if (k) parent.appendChild(typeof k === 'string' ? document.createTextNode(k) : k); }); return parent; }
  function dcGlyph(type) { var g = dcEl('span', 'glyph', GLYPH[type] || '[.]'); g.style.color = GLYPH_COLOR[type] || '#A1A1A8'; return g; }
  function dcSvg(tag, attrs) {
    var n = document.createElementNS('http://www.w3.org/2000/svg', tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
    return n;
  }
  function dcClock(at) { var d = new Date(at); return [d.getHours(), d.getMinutes(), d.getSeconds()].map(function (n) { return (n < 10 ? '0' : '') + n; }).join(':'); }
  function selectedTreeData() {
    var trees = (state.procedures && state.procedures.trees) || [];
    for (var i = 0; i < trees.length; i++) if (trees[i].id === state.selectedTree) return trees[i];
    return trees[0] || null;
  }

  /**
   * The latest walk through a tree: the procedure steps one consumer asked for,
   * in order, while no more than half an hour passes between them.
   */
  function walkOf(tree) {
    var entries = ((state.trace && state.trace.entries) || []).filter(function (e) {
      return e.kind === 'procedure' && e.outcome === 'answered' && e.question.indexOf(tree.id + '/') === 0;
    }).sort(function (a, b) { return a.at < b.at ? -1 : a.at > b.at ? 1 : 0; });
    if (!entries.length) return [];
    var caller = entries[entries.length - 1].caller;
    var mine = entries.filter(function (e) { return e.caller === caller; });
    var walk = [mine[mine.length - 1]];
    for (var i = mine.length - 2; i >= 0; i--) {
      if (Date.parse(walk[0].at) - Date.parse(mine[i].at) > 30 * 60 * 1000) break;
      walk.unshift(mine[i]);
    }
    var known = {};
    tree.steps.forEach(function (s) { known[s.id] = true; });
    return walk.map(function (e) { return { node: e.question.slice(tree.id.length + 1), at: e.at, caller: e.caller }; })
      .filter(function (s) { return known[s.node]; });
  }

  /** Every edge a step declares: its conditions, its next steps, its delegation. */
  function edgesOf(step) {
    var out = [];
    (step.conditions || []).forEach(function (c) { out.push({ to: c.next, label: c.condition }); });
    (step.next || []).forEach(function (n) { if (!out.some(function (o) { return o.to === n; })) out.push({ to: n, label: '' }); });
    return out;
  }

  /** A layered layout: rows by first reach from the entry, columns by the leaves under each step. */
  function layoutTree(tree) {
    var byId = {};
    tree.steps.forEach(function (s) { byId[s.id] = s; });
    var parent = {}, depth = {}, kids = {}, order = [];
    var queue = [tree.entry];
    if (!byId[tree.entry] && tree.steps.length) queue = [tree.steps[0].id];
    depth[queue[0]] = 0;
    while (queue.length) {
      var id = queue.shift();
      order.push(id);
      kids[id] = [];
      edgesOf(byId[id]).forEach(function (e) {
        if (!byId[e.to] || depth[e.to] !== undefined) return;
        depth[e.to] = depth[id] + 1; parent[e.to] = id; kids[id].push(e.to); queue.push(e.to);
      });
    }
    // steps nothing reaches still belong to the tree: put them under the last row
    tree.steps.forEach(function (s) {
      if (depth[s.id] !== undefined) return;
      var deepest = Math.max.apply(null, Object.keys(depth).map(function (k) { return depth[k]; }));
      depth[s.id] = deepest + 1; kids[s.id] = []; order.push(s.id); parent[s.id] = null;
    });
    var col = {}, next = 0;
    function place(id) {
      if (!kids[id].length) { col[id] = next++; return; }
      kids[id].forEach(place);
      col[id] = (col[kids[id][0]] + col[kids[id][kids[id].length - 1]]) / 2;
    }
    order.filter(function (id) { return parent[id] === undefined || parent[id] === null; }).forEach(place);
    var pos = {};
    order.forEach(function (id) { pos[id] = { x: DC_X0 + col[id] * DC_COL, y: DC_Y0 + depth[id] * DC_ROW }; });
    var extra = [];
    order.forEach(function (id) {
      edgesOf(byId[id]).forEach(function (e) {
        if (byId[e.to] && parent[e.to] !== id) extra.push({ from: id, to: e.to, label: e.label });
      });
    });
    var maxCol = Math.max.apply(null, order.map(function (id) { return col[id]; }));
    var maxRow = Math.max.apply(null, order.map(function (id) { return depth[id]; }));
    return { pos: pos, parent: parent, kids: kids, extra: extra, byId: byId,
      width: DC_X0 * 2 + maxCol * DC_COL + DC_W, height: DC_Y0 + maxRow * DC_ROW + DC_H + 56 };
  }

  function renderTrees() {
    var procs = state.procedures || { trees: [] };
    var trees = procs.trees;
    if (!state.selectedTree && trees.length) state.selectedTree = trees[0].id;

    var stats = clear(byId('dc-stats'));
    [[trees.length, 'trees'], [procs.delegations || 0, 'delegations'], [procs.cycles || 0, 'cycles']].forEach(function (s, i) {
      var b = dcEl('b', null, s[0]);
      if (i === 2) { var ok = icon(s[0] ? 'triangle-alert' : 'circle-check', 14); ok.style.color = s[0] ? '#FF453A' : '#32D74B'; b.appendChild(ok); }
      stats.appendChild(dcPut(dcEl('div', 'stat'), [b, dcEl('span', null, s[1])]));
    });

    var list = clear(byId('trees'));
    list.appendChild(dcPut(dcEl('div', 'caprow'), [dcEl('span', 'cap', 'All trees'), dcEl('span', 'capx', 'nodes')]));
    if (!trees.length) list.appendChild(dcEl('div', 'empty', 'This project declares no decision procedures.'));
    trees.forEach(function (tree) {
      var row = dcEl('div', 'tree' + (state.selectedTree === tree.id ? ' on' : ''));
      row.appendChild(dcPut(dcEl('div', 'row'), [icon('git-fork', 13), dcEl('span', 'name', tree.id), dcEl('span', 'count', tree.steps.length)]));
      var from = tree.delegatedFrom || [];
      if (from.length) row.appendChild(dcPut(dcEl('div', 'note'), [icon('arrow-down-left', 11), from.length + (from.length === 1 ? ' tree delegates' : ' trees delegate') + ' here']));
      if (tree.handsOffTo.length) row.appendChild(dcPut(dcEl('div', 'note'), [dcEl('span', 'g', '[@]'), 'delegates to ' + tree.handsOffTo.join(', ')]));
      row.onclick = function () { state.selectedTree = tree.id; dc.node = null; renderTrees(); };
      list.appendChild(row);
    });
    renderResolve();
    var tree = selectedTreeData();
    if (tree) renderTree(tree);
    else { clear(byId('tree-detail')).appendChild(dcEl('div', 'empty', 'No procedure selected.')); clear(byId('dc-insp')); }
  }

  function renderResolve() {
    var box = clear(byId('dc-scores'));
    var r = dc.resolved;
    if (!r || !r.query) { box.appendChild(dcEl('div', 'hint', 'Type a request to see which tree an agent would be handed, and how strongly each one matches.')); return; }
    if (!r.matches.length) { box.appendChild(dcEl('div', 'hint', 'No tree covers that request.')); return; }
    r.matches.slice(0, 4).forEach(function (m, i) {
      var fill = dcEl('i'); fill.style.width = Math.min(100, m.score) + '%';
      var row = dcPut(dcEl('div', 'score' + (i === 0 ? ' first' : '')), [dcPut(dcEl('div', 'caprow'), [dcEl('span', null, m.id), dcEl('b', null, m.score)]), dcPut(dcEl('div', 'track'), [fill])]);
      row.onclick = function () { state.selectedTree = m.id; dc.node = null; renderTrees(); };
      box.appendChild(row);
    });
  }

  byId('dc-query-icon').appendChild(icon('corner-down-right', 13));
  byId('dc-query').addEventListener('input', function () {
    var q = byId('dc-query').value;
    clearTimeout(dc.resolveTimer);
    dc.resolveTimer = setTimeout(function () {
      if (!q.trim()) { dc.resolved = null; renderResolve(); return; }
      get('/api/procedures/resolve?q=' + encodeURIComponent(q)).then(function (r) {
        if (byId('dc-query').value !== q) return;
        dc.resolved = r; renderResolve();
      }).catch(function () {});
    }, 180);
  });

  function renderTree(tree) {
    var walk = walkOf(tree);
    var stepOf = {}, visited = {};
    walk.forEach(function (s, i) { if (stepOf[s.node] === undefined) stepOf[s.node] = i + 1; visited[s.node] = true; });
    // a branch was taken when the next step walked is where it leads
    var taken = {};
    walk.forEach(function (s, i) { if (walk[i + 1]) taken[s.node + '>' + walk[i + 1].node] = true; });
    var visitedCount = Object.keys(visited).length;
    if (!dc.node || !tree.steps.some(function (s) { return s.id === dc.node; })) dc.node = walk.length ? walk[walk.length - 1].node : tree.entry;

    var pane = byId('tree-detail');
    var oldCanvas = pane.querySelector('.dc-canvas');
    var scroll = oldCanvas ? [oldCanvas.scrollLeft, oldCanvas.scrollTop] : null;
    clear(pane);

    var head = dcEl('div', 'thead');
    var toggle = dcEl('div', 'toggle');
    [['Whole tree', false], ['Walked only', true]].forEach(function (t) {
      var b = el('button', dc.walkedOnly === t[1] ? 'dc-on' : null, t[0]);
      b.onclick = function () { dc.walkedOnly = t[1]; renderTree(tree); };
      toggle.appendChild(b);
    });
    head.appendChild(dcPut(dcEl('div', 'top'), [
      dcPut(dcEl('div', 'tname'), [dcEl('h2', null, tree.id), dcEl('span', 'chip', 'v' + (tree.version || 1)), dcEl('span', 'chip', tree.steps.length + ' nodes')]),
      dcPut(dcEl('div', 'right'), [dcPut(dcEl('div', 'vis'), [dcEl('i'), visitedCount + ' visited']),
        dcPut(dcEl('div', 'vis un'), [dcEl('i'), (tree.steps.length - visitedCount) + ' never visited']), toggle])
    ]));
    var legend = dcEl('div', 'legend');
    ['observe', 'decide', 'act', 'delegate'].forEach(function (t) { var g = dcEl('b', null, GLYPH[t]); g.style.color = GLYPH_COLOR[t]; legend.appendChild(dcPut(el('span'), [g, t])); });
    head.appendChild(dcPut(dcEl('div', 'sub'), [
      dcPut(dcEl('div', 'trig'), [dcEl('span', 'k', 'trigger'), dcEl('span', 'v', '“' + tree.trigger + '”'), dcEl('span', 'k', '·'), dcEl('span', 'k', 'entry'), dcEl('span', 'v m', tree.entry)]),
      legend
    ]));
    pane.appendChild(head);

    var canvas = dcEl('div', 'canvas');
    var L = layoutTree(tree);
    var show = function (id) { return !dc.walkedOnly || visited[id]; };
    var plane = dcEl('div', 'plane');
    var notes = [];
    var loopBack = null;
    L.extra.forEach(function (e) {
      if (visited[e.from] && taken[e.from + '>' + e.to] && L.pos[e.to].y <= L.pos[e.from].y) loopBack = loopBack || e;
      else notes.push(e);
    });
    var height = L.height + (notes.length ? 26 : 0);
    plane.style.width = L.width + 'px'; plane.style.height = height + 'px';
    var svg = dcSvg('svg', { 'class': 'dc-edges', width: L.width, height: height });
    var cx = function (id) { return L.pos[id].x + DC_W / 2; };
    function edgePath(from, to) {
      var y1 = L.pos[from].y + DC_H, y2 = L.pos[to].y, mid = y1 + (y2 - y1 - 0) / 2;
      if (L.pos[to].y - L.pos[from].y > DC_ROW) mid = y1 + 24;
      return 'M' + cx(from) + ' ' + y1 + ' V' + mid + ' H' + cx(to) + ' V' + y2;
    }
    Object.keys(L.parent).forEach(function (to) {
      var from = L.parent[to];
      if (!from || !show(to) || !show(from)) return;
      var walked = taken[from + '>' + to];
      svg.appendChild(dcSvg('path', { d: edgePath(from, to), fill: 'none', stroke: walked ? '#0A84FF' : '#FFFFFF26', 'stroke-width': walked ? 2 : 1.25 }));
    });
    // walked edges again on top, so a dim edge never crosses them
    Object.keys(L.parent).forEach(function (to) {
      var from = L.parent[to];
      if (from && taken[from + '>' + to]) {
        var p = dcSvg('path', { d: edgePath(from, to), fill: 'none', stroke: '#0A84FF', 'stroke-width': 2 });
        p.style.filter = 'drop-shadow(0 0 4px #0A84FF88)';
        svg.appendChild(p);
      }
    });
    if (loopBack) {
      var f = L.pos[loopBack.from], t = L.pos[loopBack.to], lx = 8;
      svg.appendChild(dcSvg('path', { d: 'M' + f.x + ' ' + (f.y + DC_H / 2) + ' H' + lx + ' V' + (t.y + DC_H / 2) + ' H' + (t.x - 2), fill: 'none', stroke: '#0A84FFAA', 'stroke-width': 1.5 }));
      svg.appendChild(dcSvg('path', { d: 'M' + (t.x - 10) + ' ' + (t.y + DC_H / 2 - 5) + ' L' + t.x + ' ' + (t.y + DC_H / 2) + ' L' + (t.x - 10) + ' ' + (t.y + DC_H / 2 + 5) + ' Z', fill: '#0A84FF' }));
    }
    plane.appendChild(svg);
    if (loopBack) {
      var back = walk.map(function (s, i) { return i; }).filter(function (i) { return walk[i].node === loopBack.to && i > 0; });
      var lab = dcPut(dcEl('div', 'loop'), [icon('rotate-ccw', 10), (back.length ? 'step ' + (back[back.length - 1] + 1) + ' · ' : '') + 'back to ' + loopBack.to]);
      lab.style.left = '18px'; lab.style.top = (L.pos[loopBack.to].y + DC_H + 8) + 'px';
      plane.appendChild(lab);
    }
    // condition labels, above the step they lead to
    Object.keys(L.parent).forEach(function (to) {
      var from = L.parent[to];
      if (!from || !show(to) || !show(from)) return;
      var labels = (L.byId[from].conditions || []).filter(function (c) { return c.next === to; }).map(function (c) { return c.condition; });
      if (!labels.length) return;
      var b = dcEl('div', 'blabel' + (taken[from + '>' + to] ? ' taken' : ''), labels.join('  ·  '));
      b.style.left = (cx(to) + 6) + 'px'; b.style.top = (L.pos[to].y - 16) + 'px';
      b.style.maxWidth = (DC_COL - 10) + 'px'; b.style.overflow = 'hidden'; b.style.textOverflow = 'ellipsis';
      b.title = labels.join('  ·  ');
      plane.appendChild(b);
    });
    tree.steps.forEach(function (step) {
      if (!show(step.id) || !L.pos[step.id]) return;
      var cls = 'node' + (step.id === dc.node ? ' sel' : visited[step.id] ? ' walked' : walk.length ? ' dim' : '');
      var n = dcPut(dcEl('div', cls), [dcGlyph(step.type), dcEl('span', 'id', step.id)]);
      if (step.method === 'gate') n.appendChild(dcPut(dcEl('span', 'gate'), [icon('user-round', 12)]));
      if (stepOf[step.id]) n.appendChild(dcEl('span', 'step', stepOf[step.id]));
      n.style.left = L.pos[step.id].x + 'px'; n.style.top = L.pos[step.id].y + 'px';
      n.title = step.description || step.id;
      n.onclick = function () { dc.node = step.id; renderTree(tree); };
      plane.appendChild(n);
    });
    if (notes.length && !dc.walkedOnly) {
      var byTarget = {};
      notes.forEach(function (e) { (byTarget[e.to] = byTarget[e.to] || []).push(e.from + (e.label ? ' ' + e.label : '')); });
      var c = dcEl('div', 'cyc', '↺ ' + Object.keys(byTarget).map(function (to) { return byTarget[to].join(', ') + ' → ' + to; }).join('  ·  '));
      c.style.left = DC_X0 + 'px'; c.style.top = (L.height - 14) + 'px'; c.style.width = Math.max(300, Math.min(L.width, 772) - DC_X0 * 2) + 'px';
      c.title = c.textContent;
      plane.appendChild(c);
    }
    canvas.appendChild(plane);
    pane.appendChild(canvas);
    if (scroll) { canvas.scrollLeft = scroll[0]; canvas.scrollTop = scroll[1]; }

    var path = dcEl('div', 'walk');
    path.appendChild(dcPut(dcEl('div', 'caprow'), [dcEl('span', 'cap', 'Walked path'),
      dcEl('span', 'capx', walk.length ? walk[0].caller + ' ' + dcClock(walk[0].at) + ' · dap_node × ' + walk.length : 'no agent has walked this tree')]));
    if (!walk.length) {
      path.appendChild(dcEl('div', 'empty', 'When an agent follows this tree one step at a time (dap_node, or procedureStep), each step it takes appears here, numbered, and is lit on the diagram.'));
    } else {
      var cards = dcEl('div', 'cards');
      var seen = {};
      walk.forEach(function (s, i) {
        var step = L.byId[s.node];
        var again = seen[s.node]; seen[s.node] = true;
        var nextStep = walk[i + 1];
        var out, mono = false, now = false;
        var cond = nextStep && (step.conditions || []).filter(function (c) { return c.next === nextStep.node; })[0];
        if (cond) { out = cond.condition; mono = true; }
        else if (!nextStep) { out = 'latest step · ' + dcClock(s.at); now = true; }
        else out = stepSummary(step);
        var card = dcPut(dcEl('div', 'card' + (s.node === dc.node ? ' on' : '')), [
          dcPut(dcEl('div', 'head'), [dcEl('span', 'num' + (again ? ' again' : ''), i + 1), dcGlyph(step.type), dcEl('span', 'id', s.node)]),
          dcEl('div', 'out' + (mono ? ' m' : '') + (now ? ' now' : ''), out)
        ]);
        card.onclick = function () { dc.node = s.node; renderTree(tree); };
        cards.appendChild(card);
      });
      path.appendChild(cards);
    }
    pane.appendChild(path);
    renderNode(tree, L, walk, stepOf, taken);
  }

  function stepSummary(step) {
    if (step.type === 'observe') return step.method === 'gate' ? 'gate · ' + (step.prompt || 'asks the person') : (step.tool || step.method || step.description);
    if (step.type === 'act') return [step.actionType, step.tool || step.ref || step.intent].filter(Boolean).join(' · ') || step.description;
    if (step.type === 'delegate') return 'hands off to ' + (step.handoff || '').replace('dap://', '');
    return step.description;
  }

  function renderNode(tree, L, walk, stepOf, taken) {
    var insp = clear(byId('dc-insp'));
    var step = L.byId[dc.node];
    if (!step) { insp.appendChild(dcEl('div', 'empty', 'Select a step in the tree.')); return; }
    var chip = GLYPH_CHIP[step.type] || ['#FFFFFF14', '#A1A1A8'];
    var tchip = dcPut(dcEl('span', 'tchip'), [dcGlyph(step.type), step.type]); tchip.style.background = chip[0]; tchip.style.color = chip[1];
    var visits = walk.filter(function (s) { return s.node === step.id; }).length;
    var vchip = dcEl('span', 'tchip', stepOf[step.id] ? 'visited · step ' + stepOf[step.id] + (visits > 1 ? ' (' + visits + '×)' : '') : 'never visited');
    vchip.style.background = stepOf[step.id] ? '#0A84FF1F' : '#FFFFFF0D'; vchip.style.color = stepOf[step.id] ? '#8CC4FF' : '#6B6B73';
    insp.appendChild(dcPut(dcEl('div', 'ihead'), [dcPut(dcEl('div', 'chips'), [tchip, vchip]), dcEl('h2', null, step.id), dcEl('div', 'uri', 'dap://' + tree.id + '/' + step.id)]));

    var from = Object.keys(L.byId).filter(function (id) { return edgesOf(L.byId[id]).some(function (e) { return e.to === step.id; }); });
    var fields = dcPut(dcEl('div', 'sec'), [dcPut(dcEl('div', 'caprow'), [dcEl('span', 'cap', 'Fields'), dcEl('span', 'capx', step.id === tree.entry ? 'entry node' : 'open node')])]);
    function kv(parent, k, v, quiet) { parent.appendChild(dcPut(dcEl('div', 'kv'), [dcEl('span', null, k), dcEl('b', quiet ? 'quiet' : null, v)])); }
    kv(fields, 'id', step.id);
    kv(fields, 'type', step.type);
    kv(fields, 'tree', tree.id + ' · v' + (tree.version || 1));
    kv(fields, 'from', from.length ? from.join(', ') : '(entry)', !from.length);
    if (step.method) kv(fields, 'method', step.method);
    if (step.tool) kv(fields, 'tool', step.tool);
    if (step.actionType) kv(fields, 'action', step.actionType);
    if (step.ref) kv(fields, 'ref', step.ref);
    if (step.intent) kv(fields, 'intent', step.intent);
    if (step.handoff) kv(fields, 'delegates to', step.handoff);
    if (step.terminal) kv(fields, 'terminal', 'yes');
    if (step.description) fields.appendChild(dcEl('div', 'desc', step.description));
    insp.appendChild(fields);

    // what this step works from: the outputs the steps before it declare, or its own inputs
    var inputs = [], inputsFrom = '';
    var feeders = from.filter(function (id) { return (L.byId[id].outputs || []).length; });
    if (step.type === 'decide' && feeders.length) { inputsFrom = 'outputs of ' + feeders.join(', '); feeders.forEach(function (id) { L.byId[id].outputs.forEach(function (o) { inputs.push([o, 'not recorded']); }); }); }
    else if (step.args && typeof step.args === 'object') { inputsFrom = 'arguments'; Object.keys(step.args).forEach(function (k) { inputs.push([k, JSON.stringify(step.args[k])]); }); }
    if (step.type === 'observe' && (step.outputs || []).length) { inputsFrom = inputsFrom ? inputsFrom + ' · outputs' : 'outputs'; step.outputs.forEach(function (o) { inputs.push([o, 'output']); }); }
    if (step.prompt) { inputsFrom = inputsFrom || 'asks the person'; inputs.push(['prompt', step.prompt.length > 90 ? step.prompt.slice(0, 88) + '…' : step.prompt]); }
    if (inputs.length) {
      var sec = dcPut(dcEl('div', 'sec'), [dcPut(dcEl('div', 'caprow'), [dcEl('span', 'cap', step.type === 'decide' ? 'Evaluated with' : 'Works with'), dcEl('span', 'capx', inputsFrom)])]);
      inputs.forEach(function (p) { kv(sec, p[0], p[1], p[1] === 'not recorded' || p[1] === 'output'); });
      insp.appendChild(sec);
    }

    var branches = (step.conditions || []).map(function (c) { return { label: c.condition, to: c.next }; });
    if (!branches.length) branches = (step.options || []).length ? step.options.map(function (o) { return { label: o, to: (step.next || [])[0] || '' }; }) : (step.next || []).map(function (n) { return { label: 'then', to: n }; });
    // a branch counts as not taken only once the walk has moved on from this step
    var walkedHere = walk.some(function (s, i) { return s.node === step.id && walk[i + 1]; });
    var conds = dcPut(dcEl('div', 'sec grow'), [dcPut(dcEl('div', 'caprow'), [dcEl('span', 'cap', step.conditions && step.conditions.length ? 'Conditions' : 'Next'),
      dcEl('span', 'capx', branches.length ? branches.length + (branches.length === 1 ? ' branch' : ' branches') : 'ends here')])]);
    if (!branches.length) conds.appendChild(dcEl('div', 'empty', step.type === 'delegate' ? 'Control passes to ' + (step.handoff || 'another tree') + '.' : 'This step ends the procedure.'));
    branches.forEach(function (b) {
      var isTaken = b.to && taken[step.id + '>' + b.to];
      var next = dcPut(dcEl('div', 'next'), [icon('corner-down-right', 12), dcEl('b', null, b.to || '—')]);
      if (isTaken) next.appendChild(dcEl('span', 'takenchip', 'TAKEN'));
      else if (walkedHere) next.appendChild(dcEl('span', 'l', 'not taken'));
      var card = dcPut(dcEl('div', 'cond' + (isTaken ? ' taken' : '')), [dcEl('div', 'c', b.label), next]);
      if (b.to && L.byId[b.to]) card.onclick = function () { dc.node = b.to; renderTree(tree); };
      conds.appendChild(card);
    });
    insp.appendChild(conds);

    var cmd = 'dep dap node ' + tree.id + ' ' + step.id;
    var copy = el('button'); copy.title = 'Copy'; copy.appendChild(icon('copy', 13));
    copy.onclick = function () {
      if (navigator.clipboard) navigator.clipboard.writeText(cmd).then(function () { copy.style.color = '#32D74B'; setTimeout(function () { copy.style.color = ''; }, 900); }).catch(function () {});
    };
    insp.appendChild(dcPut(dcEl('div', 'cmd'), [dcPut(dcEl('div', 'box'), [el('span', null, '$'), el('code', null, cmd), copy])]));
  }
`

/**
 * The console's Health screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 *
 * Laid out as the "Console — Health" frame of designs/dep-console-game.pen:
 * lifecycle, validation and review cadence across the top; the documents past
 * their cadence, and the most-linked of them, below.
 */
export const css = `  /* health: every value is from designs/dep-console-game.pen, frame Console — Health */
  #screen-health .hl { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 18px; padding: 24px 32px;
    overflow: auto; background: var(--bg); line-height: normal; }
  #screen-health .hl-row { display: flex; align-items: center; }
  #screen-health .hl-col { display: flex; flex-direction: column; }
  #screen-health .hl-cap { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; color: var(--dimmer); text-transform: uppercase; }
  #screen-health .hl-extra { font-size: 11px; color: var(--dimmer); }
  #screen-health .hl-m { font-family: var(--mono); }
  #screen-health .hl-card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 20px; gap: 14px; min-width: 0; }
  #screen-health .hl-head { justify-content: space-between; gap: 10px; }
  #screen-health .hl-summary { display: flex; gap: 16px; height: 208px; flex: 0 0 208px; }
  #screen-health .hl-life { width: 360px; flex: 0 0 360px; }
  #screen-health .hl-valid { width: 400px; flex: 0 0 400px; }
  #screen-health .hl-cadence { flex: 1 1 0; }
  #screen-health .hl-figure { gap: 8px; align-items: flex-end; }
  #screen-health .hl-figure b { font-size: 34px; font-weight: 600; letter-spacing: -1px; line-height: 41px; color: var(--ink); }
  #screen-health .hl-figure span { font-size: 13px; color: var(--dim); line-height: 16px; padding-bottom: 6px; }
  #screen-health .hl-bar { display: flex; gap: 2px; height: 8px; flex: 0 0 8px; }
  #screen-health .hl-bar i { display: block; height: 100%; border-radius: 2px; }
  #screen-health .hl-legend { justify-content: space-between; align-items: flex-start; }
  #screen-health .hl-legend .hl-col { gap: 2px; }
  #screen-health .hl-ring { width: 9px; height: 9px; flex: 0 0 9px; border-radius: 50%; border: 1.5px solid; box-sizing: border-box; }
  #screen-health .hl-life-name { gap: 6px; font-size: 11px; font-weight: 500; letter-spacing: .6px; color: var(--dim); }
  #screen-health .hl-life-val { gap: 5px; align-items: flex-end; }
  #screen-health .hl-life-val b { font-size: 18px; font-weight: 600; line-height: 22px; }
  #screen-health .hl-life-val span { font-size: 11px; color: var(--dimmer); line-height: 13px; padding-bottom: 2px; }
  #screen-health .hl-counts { gap: 28px; }
  #screen-health .hl-counts .hl-col { gap: 2px; }
  #screen-health .hl-counts b { font-size: 34px; font-weight: 600; letter-spacing: -1px; line-height: 41px; }
  #screen-health .hl-counts span { font-size: 11px; font-weight: 500; letter-spacing: .6px; color: var(--dimmer); }
  #screen-health .hl-checks { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 7px 16px; padding-top: 12px; border-top: 1px solid var(--line); }
  #screen-health .hl-check { white-space: nowrap; gap: 7px; font-size: 12px; color: var(--dim); line-height: 15px; }
  #screen-health .hl-check.ok svg { color: var(--fresh); } #screen-health .hl-check.no svg { color: var(--stale); } #screen-health .hl-check.no { color: var(--ink); }
  #screen-health .hl-rows { gap: 9px; }
  #screen-health .hl-cad { gap: 12px; height: 15px; }
  #screen-health .hl-cad-type { width: 122px; flex: 0 0 122px; gap: 7px; font-size: 12px; color: var(--dim); }
  #screen-health .hl-dot8 { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 50%; }
  #screen-health .hl-cad-days { width: 62px; flex: 0 0 62px; font-size: 11px; color: var(--ink); }
  #screen-health .hl-states { width: 232px; flex: 0 0 232px; height: 6px; display: flex; gap: 2px; }
  #screen-health .hl-states i { display: block; height: 100%; border-radius: 2px; }
  #screen-health .hl-states.none { background: var(--surface-3); border-radius: 2px; }
  #screen-health .hl-csplit { flex: 1 1 0; min-width: 0; font-size: 10.5px; color: var(--dimmer); text-align: right; white-space: nowrap; }
  #screen-health .hl-main { display: flex; gap: 16px; flex: 1 1 auto; min-height: 320px; }
  #screen-health .hl-triage { flex: 1 1 0; min-width: 0; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; }
  #screen-health .hl-title { padding: 12px 18px; justify-content: space-between; gap: 10px; flex: 0 0 auto; min-height: 47px; }
  #screen-health .hl-title h3 { font-size: 14px; font-weight: 600; color: var(--ink); }
  #screen-health .hl-title > .hl-row { gap: 14px; }
  #screen-health .hl-title > .hl-row.end { gap: 10px; }
  #screen-health .hl-seg { display: flex; gap: 2px; padding: 2px; background: var(--surface-3); border-radius: 8px; }
  #screen-health .hl-seg button { appearance: none; border: 0; background: transparent; display: flex; gap: 5px; align-items: center; padding: 3px 9px; border-radius: 6px;
    font: inherit; font-size: 11px; line-height: 13px; color: var(--dimmer); cursor: pointer; }
  #screen-health .hl-seg button b { font-weight: 500; }
  #screen-health .hl-seg button.on { background: #FFFFFF1F; } #screen-health .hl-seg button.on b { color: var(--ink); }
  #screen-health .hl-sort { gap: 5px; font-size: 11px; color: var(--dimmer); cursor: pointer; user-select: none; }
  #screen-health .hl-sort b { color: var(--ink); font-weight: 500; }
  #screen-health .hl-primary { appearance: none; border: 0; display: flex; gap: 5px; align-items: center; padding: 5px 10px; border-radius: 7px; background: var(--accent); color: #FFFFFF;
    font: inherit; font-size: 11px; font-weight: 600; line-height: 13px; cursor: pointer; white-space: nowrap; }
  #screen-health .hl-primary:disabled { opacity: .45; cursor: default; }
  #screen-health .hl-ghost { appearance: none; border: 1px solid var(--line-strong); background: transparent; display: flex; gap: 4px; align-items: center; padding: 3px 8px; border-radius: 6px;
    font: inherit; font-size: 11px; font-weight: 500; line-height: 13px; color: var(--dim); cursor: pointer; white-space: nowrap; }
  #screen-health .hl-ghost:hover { color: var(--ink); border-color: #FFFFFF40; }
  #screen-health .hl-ghost.picked { background: #0A84FF26; border-color: #0A84FF55; color: #8CC4FF; }
  #screen-health .hl-ghost:disabled { opacity: .5; cursor: default; }
  #screen-health .hl-tr { display: flex; align-items: center; gap: 16px; padding: 8px 18px; border-bottom: 1px solid var(--line); min-height: 35px; }
  #screen-health .hl-tr.alt { background: #FFFFFF05; }
  #screen-health .hl-tr.cols { padding: 7px 18px; min-height: 26px; background: #FFFFFF05; border-top: 1px solid var(--line); flex: 0 0 auto; }
  #screen-health .hl-tr.cols .hl-c-age { font-family: var(--ui); }
  #screen-health .hl-tr.cols span { font-size: 10px; font-weight: 600; letter-spacing: 1px; color: var(--dimmer); text-transform: uppercase; }
  #screen-health .hl-tr.doc { cursor: pointer; } #screen-health .hl-tr.doc:hover { background: #FFFFFF0A; }
  #screen-health .hl-c-doc { flex: 1 1 0; min-width: 0; gap: 8px; }
  #screen-health .hl-path { font-family: var(--mono); font-size: 11.5px; line-height: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  #screen-health .hl-path span { color: var(--dimmer); } #screen-health .hl-path b { font-weight: 400; color: var(--ink); }
  #screen-health .hl-c-type { width: 90px; flex: 0 0 90px; gap: 6px; font-size: 11.5px; color: var(--dim); }
  #screen-health .hl-dot7 { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; }
  #screen-health .hl-c-date { width: 96px; flex: 0 0 96px; font-size: 11.5px; color: var(--dim); }
  #screen-health .hl-c-age { width: 150px; flex: 0 0 150px; gap: 6px; font-family: var(--mono); font-size: 11px; color: var(--dimmer); }
  #screen-health .hl-c-age .hl-stale { color: #FF9A93; } #screen-health .hl-c-age .hl-aging { color: #FFE680; }
  #screen-health .hl-over { font-family: var(--ui); font-size: 10px; font-weight: 700; padding: 1px 6px; border-radius: 4px; line-height: 12px; }
  #screen-health .hl-over.red { background: #FF453A1F; color: #FF6961; } #screen-health .hl-over.orange { background: #FF9F0A1F; color: #FFB340; }
  #screen-health .hl-over.yellow { background: #FFD60A1A; color: #FFE680; }
  #screen-health .hl-c-in { width: 72px; flex: 0 0 72px; gap: 6px; align-items: baseline; }
  #screen-health .hl-c-in b { font-size: 12px; font-weight: 600; color: var(--ink); } #screen-health .hl-c-in b.few { color: var(--dimmer); }
  #screen-health .hl-c-in span { font-size: 11px; color: var(--dimmer); }
  #screen-health .hl-c-act { width: 62px; flex: 0 0 62px; justify-content: flex-end; }
  #screen-health .hl-body { flex: 1 1 0; min-height: 0; overflow-y: auto; }
  #screen-health .hl-group { gap: 10px; padding: 10px 18px; background: #FFD60A0A; cursor: pointer; min-height: 35px; border-bottom: 1px solid var(--line); }
  #screen-health .hl-group svg { color: var(--dimmer); transition: transform .15s; } #screen-health .hl-group.open svg { transform: rotate(90deg); }
  #screen-health .hl-group b { font-size: 12px; font-weight: 600; color: #FFE680; }
  #screen-health .hl-group .hl-split { font-size: 12px; color: var(--dim); white-space: pre; }
  #screen-health .hl-group .hl-note { flex: 1 1 0; text-align: right; font-size: 11px; color: var(--dimmer); }
  #screen-health .hl-quiet { padding: 22px 18px; gap: 9px; font-size: 12px; color: var(--dim); }
  #screen-health .hl-quiet svg { color: var(--fresh); }
  #screen-health .hl-said { padding: 8px 18px; font-size: 11px; }
  #screen-health .hl-said.ok { color: #9BF0AA; } #screen-health .hl-said.no { color: #FF9A93; }
  #screen-health .hl-hubs { width: 380px; flex: 0 0 380px; background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 16px 20px; min-height: 0; overflow-y: auto; }
  #screen-health .hl-hubs-head { gap: 6px; padding-bottom: 6px; }
  #screen-health .hl-hubs-head h3 { font-size: 14px; font-weight: 600; color: var(--ink); }
  #screen-health .hl-hubs-sub { font-size: 11.5px; line-height: 1.4; color: var(--dim); }
  #screen-health .hl-hubs-legend { gap: 14px; padding: 4px 0; font-size: 10.5px; color: var(--dimmer); }
  #screen-health .hl-hubs-legend .hl-row { gap: 5px; }
  #screen-health .hl-sw { width: 10px; height: 5px; border-radius: 2px; }
  #screen-health .hl-hub { gap: 7px; padding: 11px 0; border-bottom: 1px solid var(--line); cursor: pointer; }
  #screen-health .hl-hub:last-child { border-bottom: 0; }
  #screen-health .hl-hub-head { gap: 8px; }
  #screen-health .hl-hub-path { flex: 1 1 0; min-width: 0; gap: 1px; font-family: var(--mono); }
  #screen-health .hl-hub-path span { font-size: 10.5px; color: var(--dimmer); line-height: 14px; }
  #screen-health .hl-hub-path b { font-size: 12px; font-weight: 400; color: var(--ink); line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #screen-health .hl-verdict { font-size: 9.5px; font-weight: 700; letter-spacing: .6px; padding: 2px 7px; border-radius: 5px; line-height: 11px; }
  #screen-health .hl-verdict.red { background: #FF453A1F; color: #FF6961; } #screen-health .hl-verdict.yellow { background: #FFD60A1A; color: #FFE680; }
  #screen-health .hl-usage { gap: 10px; padding-left: 17px; }
  #screen-health .hl-track { flex: 1 1 0; height: 5px; border-radius: 3px; background: #FFFFFF2E; position: relative; overflow: hidden; }
  #screen-health .hl-track i { position: absolute; left: 0; top: 0; bottom: 0; background: var(--accent); border-radius: 3px; }
  #screen-health .hl-usage .hl-ratio { font-family: var(--mono); font-size: 11px; color: var(--dim); white-space: nowrap; }
  #screen-health .hl-usage .hl-rate { width: 28px; flex: 0 0 28px; font-size: 11px; font-weight: 600; }
  #screen-health .hl-why { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; padding-left: 17px; font-size: 11.5px; line-height: 1.4; color: var(--dimmer); }
  #screen-health .hl-empty { font-size: 12px; color: var(--dimmer); padding: 14px 0; line-height: 1.45; }
`

export const html = `  <section class="screen" id="screen-health">
    <div class="hl" id="health"></div>
  </section>
`

export const js = `  // ── health ──────────────────────────────────────────────────────────

  var HL_DOT = '  ' + String.fromCharCode(183) + '  ';
  var HL_TIMES = String.fromCharCode(215);
  var HL_LIFE_INK = { FRESH: '#9BF0AA', AGING: '#FFE680', STALE: '#FF9A93' };
  var HL_VERB = { REQUIRES: 'REQUIRED by', TEACHES: 'TAUGHT by', USES: 'USED by', EXPLAINS: 'EXPLAINED by', DECIDES: 'DECIDED by', NEXT: 'NEXT from', INLINE: 'linked from' };
  var HL_SORTS = [['inbound', 'inbound links'], ['ratio', 'most overdue'], ['verified', 'last verified']];
  var HL_MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  var hl = { filter: null, sort: 0, agingOpen: false, picking: null, note: null, busy: false };

  /** Classes on this screen are prefixed hl-, except the modifiers its styles combine with them. */
  var HL_MODS = { on: 1, alt: 1, cols: 1, doc: 1, end: 1, ok: 1, no: 1, open: 1, picked: 1, few: 1, none: 1,
    red: 1, orange: 1, yellow: 1 };
  function hlEl(tag, cls, text) {
    return el(tag, cls ? cls.split(' ').filter(function (c) { return c; }).map(function (c) { return HL_MODS[c] ? c : 'hl-' + c; }).join(' ') : cls, text);
  }
  function hlKids(node, kids) {
    kids.forEach(function (k) { if (k !== null && k !== undefined && k !== false) node.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k); });
    return node;
  }
  function hlRing(lifecycle) { var r = hlEl('i', 'ring'); r.style.borderColor = lifeColor(lifecycle); return r; }
  function hlDate(iso) {
    var d = new Date(iso);
    return isNaN(d.getTime()) ? '-' : d.getDate() + ' ' + HL_MONTHS[d.getMonth()] + ' ' + d.getFullYear();
  }
  function hlTone(ratio) { return ratio >= 4 ? 'red' : ratio >= 3 ? 'orange' : 'yellow'; }

  /** How far past its review cadence each document is: what the lifecycle is computed from. */
  function hlAges(g) {
    var now = Date.now();
    return g.nodes.map(function (n) {
      var cadence = g.cadence[n.type] || 90;
      var at = n.lastVerified ? new Date(n.lastVerified).getTime() : NaN;
      var age = isNaN(at) ? null : Math.max(0, Math.floor((now - at) / 86400000));
      return { node: n, cadence: cadence, age: age, ratio: age === null ? 0 : age / cadence };
    });
  }

  /** Who links into a document, as a sentence: REQUIRED by a, b; TAUGHT by c. */
  function hlWhy(g, path) {
    var by = {};
    g.edges.forEach(function (e) {
      if (e.target !== path) return;
      var name = e.source.split('/').pop().replace(/[.]md$/, '');
      (by[e.rel] = by[e.rel] || []).indexOf(name) < 0 && by[e.rel].push(name);
    });
    var order = ['REQUIRES', 'TEACHES', 'DECIDES', 'USES', 'EXPLAINS', 'NEXT', 'INLINE'];
    var typed = order.filter(function (r) { return by[r] && r !== 'INLINE'; });
    if (!typed.length && by.INLINE) typed = ['INLINE'];
    return typed.slice(0, 2).map(function (r) {
      var names = by[r];
      var list = names.length > 2 ? names.slice(0, 2).join(', ') + ' and ' + (names.length - 2) + ' more'
        : names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0];
      return (HL_VERB[r] || r) + ' ' + list;
    }).join('; ') + '.';
  }

  function hlBump(paths) {
    if (hl.busy || !paths.length) return;
    hl.busy = true; hl.note = null;
    var done = 0, failed = [];
    var next = function () {
      if (done === paths.length) {
        hl.busy = false; hl.picking = null;
        hl.note = failed.length ? { bad: true, text: 'Not bumped: ' + failed.join('; ') } : { bad: false, text: 'Marked ' + paths.length + ' document' + (paths.length === 1 ? '' : 's') + ' verified today.' };
        refresh(false).catch(function () {}).then(renderHealth);
        return;
      }
      var path = paths[done++];
      fetch('/api/amend', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ document: path, bump: true }) })
        .then(function (r) { return r.json().then(function (b) { if (!r.ok) failed.push(path + ': ' + (b.error || r.status)); }); })
        .catch(function (e) { failed.push(path + ': ' + e.message); })
        .then(next);
    };
    renderHealth();
    next();
  }

  function hlLifecycleCard(g, lives) {
    var total = g.stats.documents || 1;
    var card = hlEl('div', 'card col life');
    card.appendChild(hlKids(hlEl('div', 'row head'), [hlEl('span', 'cap', 'Lifecycle'), hlEl('span', 'extra', 'computed from last_verified')]));
    card.appendChild(hlKids(hlEl('div', 'row figure'), [hlEl('b', null, g.stats.documents), hlEl('span', null, 'documents')]));
    var bar = hlEl('div', 'bar');
    ['FRESH', 'AGING', 'STALE'].forEach(function (l) {
      if (!lives[l]) return;
      var i = el('i'); i.style.flex = lives[l] + ' 1 0'; i.style.background = lifeColor(l); bar.appendChild(i);
    });
    card.appendChild(bar);
    var legend = hlEl('div', 'row legend');
    ['FRESH', 'AGING', 'STALE'].forEach(function (l) {
      var val = hlKids(hlEl('div', 'row life-val'), [hlEl('b', null, lives[l]), hlEl('span', null, Math.round(lives[l] / total * 100) + '%')]);
      val.firstChild.style.color = lives[l] ? HL_LIFE_INK[l] : 'var(--dimmer)';
      legend.appendChild(hlKids(hlEl('div', 'col'), [hlKids(hlEl('div', 'row life-name'), [hlRing(l), l]), val]));
    });
    card.appendChild(legend);
    return card;
  }

  function hlValidationCard(v) {
    var card = hlEl('div', 'card col valid');
    card.appendChild(hlKids(hlEl('div', 'row head'), [hlEl('span', 'cap', 'Validation'),
      hlEl('span', 'extra', 'dep validate' + String.fromCharCode(32, 183, 32) + (state.refreshedAt ? agoText(state.refreshedAt) : 'just now'))]));
    if (!v) { card.appendChild(hlEl('div', 'empty', 'The documentation set could not be validated just now.')); return card; }
    var counts = { PASS: 0, WARN: 0, FAIL: 0 };
    v.documents.forEach(function (d) { counts[d.status] = (counts[d.status] || 0) + 1; });
    var row = hlEl('div', 'row counts');
    [['PASS', '#9BF0AA'], ['WARN', '#FFE680'], ['FAIL', '#FF9A93']].forEach(function (p) {
      var b = hlEl('b', null, counts[p[0]]); b.style.color = counts[p[0]] ? p[1] : 'var(--dimmer)';
      row.appendChild(hlKids(hlEl('div', 'col'), [b, hlEl('span', null, p[0])]));
    });
    card.appendChild(row);
    var names = { 'Entry points exist': 'Every audience entry point exists' };
    var checks = hlEl('div', 'checks');
    var ORDER = ['No orphans', 'No REQUIRES cycles', 'Entry points exist'];
    v.graph.slice().sort(function (a, b) { return (ORDER.indexOf(a.name) + 1 || 9) - (ORDER.indexOf(b.name) + 1 || 9); }).forEach(function (c) {
      checks.appendChild(hlKids(hlEl('div', 'row check ' + (c.passed ? 'ok' : 'no')), [icon(c.passed ? 'circle-check' : 'circle-x', 13), names[c.name] || c.name]));
    });
    card.appendChild(checks);
    return card;
  }

  function hlCadenceCard(g, ages) {
    var card = hlEl('div', 'card col cadence');
    card.appendChild(hlKids(hlEl('div', 'row head'), [hlEl('span', 'cap', 'Review cadence'), hlEl('span', 'extra', 'per type' + String.fromCharCode(32, 183, 32) + '.docspec')]));
    var rows = hlEl('div', 'col rows');
    var types = Object.keys(g.cadence).sort(function (a, b) { return g.cadence[a] - g.cadence[b]; });
    types.forEach(function (t) {
      var by = { FRESH: 0, AGING: 0, STALE: 0 };
      ages.forEach(function (a) { if (a.node.type === t) by[a.node.lifecycle]++; });
      var states = hlEl('div', 'states' + (by.FRESH + by.AGING + by.STALE ? '' : ' none'));
      ['FRESH', 'AGING', 'STALE'].forEach(function (l) {
        if (!by[l]) return;
        var i = el('i'); i.style.flex = by[l] + ' 1 0'; i.style.background = lifeColor(l); states.appendChild(i);
      });
      var split = ['FRESH', 'AGING', 'STALE'].filter(function (l) { return by[l]; }).map(function (l) { return by[l] + ' ' + l.charAt(0); }).join(String.fromCharCode(32, 183, 32));
      var dot = hlEl('i', 'dot8'); dot.style.background = TYPE_COLOR[t] || 'var(--dim)';
      rows.appendChild(hlKids(hlEl('div', 'row cad'), [hlKids(hlEl('div', 'row cad-type'), [dot, t]), hlEl('span', 'cad-days m', g.cadence[t] + ' days'), states,
        hlEl('span', 'csplit m', split || 'no documents')]));
    });
    if (!types.length) rows.appendChild(hlEl('div', 'empty', 'No review cadence is set in .docspec; every type falls back to 90 days.'));
    card.appendChild(rows);
    return card;
  }

  function hlDocRow(a, i, g) {
    var n = a.node, picked = hl.picking && hl.picking[n.path];
    var cut = n.path.lastIndexOf('/') + 1;
    var dot = hlEl('i', 'dot7'); dot.style.background = TYPE_COLOR[n.type] || 'var(--dim)';
    var age = hlKids(hlEl('div', 'row c-age'), [hlEl('span', n.lifecycle === 'STALE' ? 'stale' : 'aging', a.age === null ? '-' : a.age + 'd'), '/ ' + a.cadence + 'd',
      a.age === null ? null : hlEl('span', 'over ' + hlTone(a.ratio), a.ratio.toFixed(1) + HL_TIMES)]);
    var act;
    if (hl.picking) {
      act = hlKids(hlEl('button', 'ghost' + (picked ? ' picked' : '')), [icon(picked ? 'check' : 'plus', 10), picked ? 'Picked' : 'Pick']);
      act.onclick = function (e) { e.stopPropagation(); if (picked) delete hl.picking[n.path]; else hl.picking[n.path] = true; renderHealth(); };
    } else {
      act = hlKids(hlEl('button', 'ghost'), [icon('refresh-cw', 10), 'Bump']);
      act.title = 'Mark ' + n.path + ' verified today';
      act.disabled = hl.busy;
      act.onclick = function (e) { e.stopPropagation(); hlBump([n.path]); };
    }
    var row = hlKids(hlEl('div', 'tr doc' + (i % 2 ? '' : ' alt')), [
      hlKids(hlEl('div', 'row c-doc'), [hlRing(n.lifecycle), hlKids(hlEl('span', 'path'), [el('span', null, n.path.slice(0, cut)), el('b', null, n.path.slice(cut))])]),
      hlKids(hlEl('div', 'row c-type'), [dot, n.type]),
      hlEl('div', 'c-date', n.lastVerified ? hlDate(n.lastVerified) : '-'),
      age,
      hlKids(hlEl('div', 'row c-in'), [hlEl('b', n.inbound < 3 ? 'few' : null, n.inbound), hlEl('span', null, n.inbound === 1 ? 'link' : 'links')]),
      hlKids(hlEl('div', 'row c-act'), [act])
    ]);
    row.onclick = function () { showScreen('graph'); select(n.path); };
    return row;
  }

  function hlTriage(g, ages) {
    var stale = ages.filter(function (a) { return a.node.lifecycle === 'STALE'; });
    var aging = ages.filter(function (a) { return a.node.lifecycle === 'AGING'; });
    if (!hl.filter) hl.filter = stale.length ? 'STALE' : 'ALL';
    var sorter = [
      function (a, b) { return b.node.inbound - a.node.inbound || b.ratio - a.ratio; },
      function (a, b) { return b.ratio - a.ratio || b.node.inbound - a.node.inbound; },
      function (a, b) { return (b.age || 0) - (a.age || 0) || b.node.inbound - a.node.inbound; }
    ][hl.sort];
    stale.sort(sorter); aging.sort(sorter);

    var panel = hlEl('div', 'col triage');
    var seg = hlEl('div', 'seg');
    [['ALL', 'All', stale.length + aging.length], ['STALE', 'STALE', stale.length], ['AGING', 'AGING', aging.length]].forEach(function (f) {
      var b = hlKids(hlEl('button', hl.filter === f[0] ? 'on' : null), [el('b', null, f[1]), el('span', null, f[2])]);
      b.onclick = function () { hl.filter = f[0]; renderHealth(); };
      seg.appendChild(b);
    });
    var sort = hlKids(hlEl('div', 'row sort'), ['Sort', el('b', null, HL_SORTS[hl.sort][1]), icon('chevron-down', 12)]);
    sort.title = 'Change the order';
    sort.onclick = function () { hl.sort = (hl.sort + 1) % HL_SORTS.length; renderHealth(); };
    var pickedPaths = hl.picking ? Object.keys(hl.picking) : [];
    var right = [sort];
    if (hl.picking) {
      var cancel = hlKids(hlEl('button', 'ghost'), ['Cancel']);
      cancel.onclick = function () { hl.picking = null; renderHealth(); };
      var go = hlKids(hlEl('button', 'primary'), [icon('refresh-cw', 11), pickedPaths.length ? 'Bump ' + pickedPaths.length + ' reviewed' : 'Pick what you reviewed']);
      go.disabled = !pickedPaths.length || hl.busy;
      go.onclick = function () { hlBump(pickedPaths); };
      right.push(cancel, go);
    } else {
      var bulk = hlKids(hlEl('button', 'primary'), [icon('refresh-cw', 11), 'Bump reviewed' + String.fromCharCode(8230)]);
      bulk.title = 'Pick the documents you have reviewed, then mark them verified together';
      bulk.disabled = !(stale.length + aging.length) || hl.busy;
      bulk.onclick = function () { hl.picking = {}; hl.note = null; renderHealth(); };
      right.push(bulk);
    }
    panel.appendChild(hlKids(hlEl('div', 'row title'), [hlKids(hlEl('div', 'row'), [el('h3', null, 'Needs attention'), seg]), hlKids(hlEl('div', 'row end'), right)]));
    var cols = hlEl('div', 'tr cols');
    [['c-doc', 'Document'], ['c-type', 'Type'], ['c-date', 'Last verified'], ['c-age', 'Age / cadence'], ['c-in', 'Inbound'], ['c-act', '']].forEach(function (c) {
      cols.appendChild(hlKids(hlEl('div', 'row ' + c[0]), [el('span', null, c[1])]));
    });
    panel.appendChild(cols);
    if (hl.note) panel.appendChild(hlEl('div', 'said ' + (hl.note.bad ? 'no' : 'ok'), hl.note.text));

    var body = hlEl('div', 'body');
    body.id = 'hl-body';
    var shown = hl.filter === 'AGING' ? aging : stale;
    shown.forEach(function (a, i) { body.appendChild(hlDocRow(a, i, g)); });
    if (hl.filter !== 'AGING' && aging.length) {
      var byType = {};
      aging.forEach(function (a) { byType[a.node.type] = (byType[a.node.type] || 0) + 1; });
      var split = Object.keys(byType).sort(function (a, b) { return byType[b] - byType[a]; }).map(function (t) { return byType[t] + ' ' + t; }).join(HL_DOT);
      if (hl.filter === 'ALL' && hl.agingOpen) {
        aging.forEach(function (a, i) { body.appendChild(hlDocRow(a, shown.length + i, g)); });
      } else {
        var group = hlKids(hlEl('div', 'row group' + (hl.agingOpen ? ' open' : '')), [icon('chevron-right', 13), hlRing('AGING'), el('b', null, aging.length + ' AGING'),
          hlEl('span', 'split', split), hlEl('span', 'note', 'past cadence, not yet twice it')]);
        group.onclick = function () { if (hl.filter === 'STALE') hl.filter = 'ALL'; hl.agingOpen = !hl.agingOpen; renderHealth(); };
        body.appendChild(group);
      }
    }
    if (!shown.length && !(hl.filter !== 'AGING' && aging.length)) {
      body.appendChild(hlKids(hlEl('div', 'row quiet'), [icon('circle-check', 14), hl.filter === 'AGING'
        ? 'No document is aging: none is past its review cadence.'
        : hl.filter === 'STALE' ? 'No document is stale: none is past twice its review cadence.' : 'Every document is within its review cadence.']));
    }
    panel.appendChild(body);
    return panel;
  }

  function hlHubs(g, ages) {
    var past = ages.filter(function (a) { return a.node.lifecycle !== 'FRESH' && a.node.inbound > 0; })
      .sort(function (a, b) { return b.node.inbound - a.node.inbound || b.ratio - a.ratio; }).slice(0, 6);
    var top = past.length ? past[0].node.inbound : 0;
    var panel = hlEl('div', 'col hubs');
    panel.appendChild(hlKids(hlEl('div', 'col hubs-head'), [
      hlKids(hlEl('div', 'row head'), [el('h3', null, 'Stale hubs'), hlEl('span', 'extra', 'dep graph' + String.fromCharCode(32, 183, 32) + 'inbound')]),
      hlEl('div', 'hubs-sub', 'The most-linked documents past their review cadence. Every link into them hands the reader stale content.')
    ]));
    if (!past.length) {
      panel.appendChild(hlEl('div', 'empty', 'No linked document is past its review cadence, so nothing that others point to is out of date.'));
      return panel;
    }
    var sw1 = hlEl('i', 'sw'); sw1.style.background = '#FFFFFF2E';
    var sw2 = hlEl('i', 'sw'); sw2.style.background = 'var(--accent)';
    panel.appendChild(hlKids(hlEl('div', 'row hubs-legend'), [hlKids(hlEl('div', 'row'), [sw1, top + ' link' + (top === 1 ? '' : 's') + ', the top hub']), hlKids(hlEl('div', 'row'), [sw2, 'inbound links'])]));
    past.forEach(function (a) {
      var n = a.node, cut = n.path.lastIndexOf('/') + 1;
      var tone = n.lifecycle === 'STALE' ? 'red' : 'yellow';
      var track = hlEl('div', 'track'), used = el('i');
      used.style.width = (top ? n.inbound / top * 100 : 0) + '%'; track.appendChild(used);
      var rate = hlEl('span', 'rate', a.ratio.toFixed(1) + HL_TIMES); rate.style.color = tone === 'red' ? '#FF6961' : '#FFE680';
      var hub = hlKids(hlEl('div', 'col hub'), [
        hlKids(hlEl('div', 'row hub-head'), [hlRing(n.lifecycle), hlKids(hlEl('div', 'col hub-path'), [el('span', null, n.path.slice(0, cut)), el('b', null, n.path.slice(cut))]), hlEl('span', 'verdict ' + tone, 'REVIEW')]),
        hlKids(hlEl('div', 'row usage'), [track, hlEl('span', 'ratio', n.inbound + ' link' + (n.inbound === 1 ? '' : 's')), rate]),
        hlEl('div', 'why', hlWhy(g, n.path))
      ]);
      hub.onclick = function () { showScreen('graph'); select(n.path); };
      panel.appendChild(hub);
    });
    return panel;
  }

  function renderHealth() {
    var pane = byId('health');
    var keep = byId('hl-body') ? byId('hl-body').scrollTop : 0;
    clear(pane);
    var g = state.graph, v = state.validation;
    if (!g) return;
    var lives = { FRESH: 0, AGING: 0, STALE: 0 };
    g.nodes.forEach(function (n) { lives[n.lifecycle] = (lives[n.lifecycle] || 0) + 1; });
    var ages = hlAges(g);
    pane.appendChild(hlKids(hlEl('div', 'summary'), [hlLifecycleCard(g, lives), hlValidationCard(v), hlCadenceCard(g, ages)]));
    pane.appendChild(hlKids(hlEl('div', 'main'), [hlTriage(g, ages), hlHubs(g, ages)]));
    if (byId('hl-body')) byId('hl-body').scrollTop = keep;
  }
`

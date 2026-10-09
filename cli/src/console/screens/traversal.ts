/**
 * The console's Traversal screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 *
 * Laid out as the "Console — Traversal" frame of designs/dep-console-game.pen.
 */
export const css = `
  /* traversal: every value is from the Traversal frame of designs/dep-console-game.pen */
  #screen-traversal .tv-rail { width: 400px; flex: 0 0 400px; display: flex; flex-direction: column; background: #0F1013; border-right: 1px solid #FFFFFF12; min-height: 0; }
  #screen-traversal .tv-head { padding: 20px 20px 14px; display: flex; flex-direction: column; gap: 14px; flex: 0 0 auto; }
  #screen-traversal .tv-title { display: flex; justify-content: space-between; align-items: center; }
  #screen-traversal .tv-title h3 { font-size: 15px; font-weight: 600; color: #F5F5F7; display: flex; align-items: center; gap: 8px; line-height: 18px; }
  #screen-traversal .tv-title h3 i { width: 7px; height: 7px; border-radius: 50%; background: #32D74B; display: inline-block; }
  #screen-traversal .tv-title h3 i.cold { background: #6B6B73; }
  #screen-traversal .tv-title span { font-size: 12px; color: #6B6B73; }
  #screen-traversal .tv-filters { display: flex; gap: 4px; flex-wrap: nowrap; margin-right: -12px; }
  #screen-traversal .tv-filters button { appearance: none; border: 0; background: transparent; color: #A1A1A8; font-family: var(--mono); font-size: 11px; line-height: 15px; padding: 4px 9px; border-radius: 6px; cursor: pointer; }
  #screen-traversal .tv-filters button.ui { font-family: var(--ui); }
  #screen-traversal .tv-filters button.on { background: #FFFFFF1A; color: #F5F5F7; }
  #screen-traversal .tv-filters button:hover { color: #F5F5F7; }
  #screen-traversal .tv-list { flex: 1 1 auto; min-height: 0; overflow-y: auto; padding: 0 10px 10px; display: flex; flex-direction: column; gap: 2px; }
  #screen-traversal .tv-call { padding: 12px; border-radius: 10px; border: 1px solid transparent; display: flex; flex-direction: column; gap: 8px; cursor: pointer; flex: 0 0 auto; }
  #screen-traversal .tv-call:hover { background: #FFFFFF06; }
  #screen-traversal .tv-call.on { background: #0A84FF14; border-color: #0A84FF4D; }
  #screen-traversal .tv-top { display: flex; justify-content: space-between; align-items: center; }
  #screen-traversal .tv-tool { display: flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 11px; font-weight: 500; line-height: 15px; }
  #screen-traversal .tv-tool b { width: 3px; height: 12px; border-radius: 2px; display: inline-block; }
  #screen-traversal .tv-time { font-family: var(--mono); font-size: 11px; color: #6B6B73; line-height: 15px; }
  #screen-traversal .tv-q { font-size: 13px; color: #D6D6DB; line-height: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #screen-traversal .tv-call.on .tv-q { color: #F5F5F7; }
  #screen-traversal .tv-meta { display: flex; align-items: center; gap: 12px; font-size: 11px; line-height: 13px; color: #6B6B73; }
  #screen-traversal .tv-meta b { font-weight: 600; color: #A1A1A8; margin-right: 4px; }
  #screen-traversal .tv-meta .tv-bad { color: #FF9A93; }
  #screen-traversal .tv-mini { margin-left: auto; display: flex; align-items: center; gap: 6px; font-family: var(--mono); font-size: 10px; }
  #screen-traversal .tv-mini span { width: 56px; height: 3px; border-radius: 2px; background: #1E1F24; display: block; overflow: hidden; }
  #screen-traversal .tv-mini span i { display: block; height: 3px; border-radius: 2px; }
  #screen-traversal .tv-empty { color: #6B6B73; font-size: 12px; padding: 20px 12px; }

  #screen-traversal .tv-detail { flex: 1 1 0; min-width: 0; min-height: 0; overflow-y: auto; padding: 28px 40px; display: flex; flex-direction: column; gap: 24px; background: #07080A; }
  #screen-traversal .tv-hd { display: flex; flex-direction: column; gap: 12px; flex: 0 0 auto; }
  #screen-traversal .tv-metarow { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
  #screen-traversal .tv-who { display: flex; align-items: center; gap: 10px; min-width: 0; font-size: 12px; color: #A1A1A8; line-height: 15px; white-space: nowrap; }
  #screen-traversal .tv-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 9px; border-radius: 6px; font-family: var(--mono); font-size: 11px; font-weight: 600; line-height: 15px; }
  #screen-traversal .tv-timing { font-family: var(--mono); font-size: 11px; color: #6B6B73; white-space: nowrap; }
  #screen-traversal .tv-question { font-size: 30px; font-weight: 500; letter-spacing: -0.8px; line-height: 36px; color: #F5F5F7; }
  #screen-traversal .tv-summary { display: flex; gap: 16px; flex: 0 0 auto; min-height: 172px; }
  #screen-traversal .tv-card { background: #0F1013; border: 1px solid #FFFFFF12; border-radius: 14px; padding: 20px; display: flex; flex-direction: column; min-width: 0; }
  #screen-traversal .tv-budget { flex: 1 1 0; gap: 14px; }
  #screen-traversal .tv-mix { flex: 0 0 340px; width: 340px; gap: 10px; }
  #screen-traversal .tv-cap { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; color: #6B6B73; text-transform: uppercase; line-height: 12px; }
  #screen-traversal .tv-btop { display: flex; justify-content: space-between; align-items: flex-end; }
  #screen-traversal .tv-fig { display: flex; flex-direction: column; gap: 6px; }
  #screen-traversal .tv-fig div { display: flex; align-items: flex-end; gap: 6px; }
  #screen-traversal .tv-fig b { font-size: 26px; font-weight: 600; letter-spacing: -0.6px; line-height: 31px; color: #F5F5F7; }
  #screen-traversal .tv-fig span { font-size: 13px; color: #A1A1A8; line-height: 22px; }
  #screen-traversal .tv-packed { font-size: 12px; color: #A1A1A8; line-height: 15px; }
  #screen-traversal .tv-bar { display: flex; gap: 2px; height: 10px; }
  #screen-traversal .tv-bar i { display: block; height: 10px; border-radius: 2px; min-width: 2px; }
  #screen-traversal .tv-legend { display: flex; align-items: center; gap: 20px; font-size: 11px; color: #A1A1A8; flex-wrap: wrap; }
  #screen-traversal .tv-legend > span { display: flex; align-items: center; gap: 6px; }
  #screen-traversal .tv-legend b { width: 10px; height: 6px; border-radius: 1px; display: inline-block; }
  #screen-traversal .tv-legend em { font-style: normal; font-family: var(--mono); color: #6B6B73; }
  #screen-traversal .tv-nobudget { font-size: 12px; color: #6B6B73; }
  #screen-traversal .tv-mixrow { display: flex; align-items: center; gap: 10px; font-size: 12px; color: #A1A1A8; line-height: 16px; }
  #screen-traversal .tv-mixrow i { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 7px; }
  #screen-traversal .tv-mixrow span { flex: 1 1 0; }
  #screen-traversal .tv-mixrow b { font-family: var(--mono); font-weight: 400; color: #F5F5F7; }
  #screen-traversal .tv-note { display: flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 8px; font-size: 11px; line-height: 13px; margin-top: auto; }
  #screen-traversal .tv-note.red { background: #FF453A14; color: #FF9A93; } #screen-traversal .tv-note.red svg { color: #FF6961; }
  #screen-traversal .tv-note.amber { background: #FFD60A14; color: #FFE680; } #screen-traversal .tv-note.amber svg { color: #FFD60A; }
  #screen-traversal .tv-note.ok { background: #32D74B14; color: #9BF0AA; } #screen-traversal .tv-note.ok svg { color: #32D74B; }
  #screen-traversal .tv-refused { background: #FF453A0F; border: 1px solid #FF453A33; border-radius: 14px; padding: 20px; color: #FF9A93; font-size: 13px; }
  #screen-traversal .tv-refused b { display: block; color: #F5F5F7; font-size: 14px; margin-bottom: 6px; }

  #screen-traversal .tv-passages { background: #0F1013; border: 1px solid #FFFFFF12; border-radius: 14px; display: flex; flex-direction: column; flex: 1 0 auto; min-height: 240px; overflow: hidden; }
  #screen-traversal .tv-ptitle { display: flex; justify-content: space-between; align-items: center; padding: 14px 20px; }
  #screen-traversal .tv-ptitle > div { display: flex; align-items: center; gap: 10px; }
  #screen-traversal .tv-ptitle h3 { font-size: 14px; font-weight: 600; color: #F5F5F7; }
  #screen-traversal .tv-ptitle span { font-size: 12px; color: #A1A1A8; }
  #screen-traversal .tv-seg { display: flex; gap: 2px; padding: 2px; background: #1E1F24; border-radius: 7px; }
  #screen-traversal .tv-seg button { appearance: none; border: 0; background: transparent; color: #A1A1A8; font: inherit; font-size: 11px; line-height: 13px; padding: 3px 10px; border-radius: 5px; cursor: pointer; }
  #screen-traversal .tv-seg button.on { background: #FFFFFF1F; color: #F5F5F7; }
  #screen-traversal .tv-row { display: flex; align-items: center; gap: 16px; padding: 11px 20px; border-bottom: 1px solid #FFFFFF12; }
  #screen-traversal .tv-row.cols { padding: 8px 20px; background: #FFFFFF05; border-top: 1px solid #FFFFFF12; }
  #screen-traversal .tv-row.cols > div { font-size: 10px; font-weight: 600; letter-spacing: 1px; color: #6B6B73; line-height: 12px; }
  #screen-traversal .tv-row.first { background: #0A84FF0A; }
  #screen-traversal .tv-row.link { cursor: pointer; } #screen-traversal .tv-row.link:hover { background: #FFFFFF06; }
  #screen-traversal .tv-c-status { width: 16px; flex: 0 0 16px; display: flex; justify-content: center; }
  #screen-traversal .tv-c-pass { flex: 1 1 0; min-width: 0; display: flex; flex-direction: column; gap: 4px; }
  #screen-traversal .tv-c-why { width: 220px; flex: 0 0 220px; display: flex; flex-direction: column; gap: 3px; align-items: flex-start; }
  #screen-traversal .tv-c-sig { width: 118px; flex: 0 0 118px; display: flex; gap: 10px; align-items: flex-end; }
  #screen-traversal .tv-c-score { width: 48px; flex: 0 0 48px; text-align: right; }
  #screen-traversal .tv-c-tok { width: 56px; flex: 0 0 56px; text-align: right; }
  #screen-traversal .tv-row.cols .tv-c-sig > div { width: 22px; text-align: center; font-size: 9px; letter-spacing: .4px; line-height: 11px; }
  #screen-traversal .tv-doc { display: flex; align-items: center; gap: 7px; min-width: 0; }
  #screen-traversal .tv-doc i { width: 6px; height: 6px; border-radius: 50%; flex: 0 0 6px; }
  #screen-traversal .tv-doc span { font-family: var(--mono); font-size: 11.5px; color: #F5F5F7; line-height: 15px; overflow-wrap: anywhere; min-width: 0; }
  #screen-traversal .tv-badge { flex: 0 0 auto; padding: 1px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; letter-spacing: .6px; line-height: 11px; }
  #screen-traversal .tv-badge.stale { background: #FF453A26; color: #FF6961; } #screen-traversal .tv-badge.aging { background: #FFD60A1F; color: #FFE680; }
  #screen-traversal .tv-sec { font-size: 12px; color: #A1A1A8; line-height: 15px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #screen-traversal .tv-why { padding: 2px 7px; border-radius: 5px; font-size: 11px; font-weight: 500; line-height: 13px; }
  #screen-traversal .tv-why.match { background: #0A84FF1A; color: #5AAEFF; }
  #screen-traversal .tv-why.required-by { background: #FF9F0A1A; color: #FFB340; }
  #screen-traversal .tv-why.expanded-from { background: #BF5AF21A; color: #D9A6F7; }
  #screen-traversal .tv-why.withheld { background: #FF453A1A; color: #FF9A93; }
  #screen-traversal .tv-from { font-family: var(--mono); font-size: 10.5px; color: #6B6B73; line-height: 14px; max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #screen-traversal .tv-sig { width: 22px; height: 20px; border-radius: 3px; background: #1E1F24; display: flex; flex-direction: column; justify-content: flex-end; overflow: hidden; }
  #screen-traversal .tv-sig i { display: block; width: 100%; }
  #screen-traversal .tv-sig.none { background: transparent; border: 1px dashed #FFFFFF1F; }
  #screen-traversal .tv-num { font-family: var(--mono); font-size: 12px; line-height: 16px; color: #F5F5F7; }
  #screen-traversal .tv-num.dim { color: #A1A1A8; }
  #screen-traversal .tv-row.unused .tv-c-pass { opacity: .5; } #screen-traversal .tv-row.unused .tv-c-why { opacity: .6; }
  #screen-traversal .tv-row.unused .tv-c-sig { opacity: .55; } #screen-traversal .tv-row.unused .tv-num { color: #6B6B73; }
  #screen-traversal .tv-kept { padding: 10px 20px 8px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #FFFFFF12; background: #FF453A08; }
  #screen-traversal .tv-kept span { font-size: 11px; color: #6B6B73; }
  #screen-traversal .tv-row.held .tv-c-pass { opacity: .7; }
  #screen-traversal .tv-held-note { font-size: 11px; color: #6B6B73; }
`

export const html = `  <section class="screen" id="screen-traversal">
    <div class="tv-rail">
      <div class="tv-head">
        <div class="tv-title"><h3>Agent calls <i id="tv-live"></i></h3><span id="call-count"></span></div>
        <div class="tv-filters" id="tv-filters"></div>
      </div>
      <div class="tv-list" id="calls"></div>
    </div>
    <div class="tv-detail" id="call-detail"><div class="tv-empty">No request selected.</div></div>
  </section>
`

export const js = `  // ── traversal ───────────────────────────────────────────────────────
  // Every call an agent made, and for the one chosen: what it asked, how the
  // budget was spent, how each passage got in, and what was kept from it.

  var TV_TOOL = {
    context: { name: 'dep_context', color: '#0A84FF', chip: '#0A84FF1F', text: '#5AAEFF', icon: 'layers' },
    search: { name: 'dep_search', color: '#64D2FF', chip: '#64D2FF1F', text: '#8FE0FF', icon: 'search' },
    procedure: { name: 'dap_node', color: '#BF5AF2', chip: '#BF5AF21F', text: '#D9A6F7', icon: 'git-fork' },
    validate: { name: 'dep_validate', color: '#32D74B', chip: '#32D74B1F', text: '#9BF0AA', icon: 'circle-check' }
  };
  var TV_FILTERS = [['all', 'All'], ['context', 'dep_context'], ['search', 'dep_search'], ['procedure', 'dap_*'], ['validate', 'dep_validate']];
  var TV_WHY = { match: 'direct match', 'required-by': 'required-by', 'expanded-from': 'expanded-from' };
  var TV_MIX = [['match', 'direct match', '#0A84FF'], ['required-by', 'required-by', '#FF9F0A'], ['expanded-from', 'expanded-from', '#BF5AF2']];
  var TV_SIG = [['semantic', '#0A84FF'], ['keyword', '#64D2FF'], ['graph', '#BF5AF2'], ['usage', '#32D74B']];
  var tvFilter = 'all', tvShow = 'all';
  var DOTC = '  ' + String.fromCharCode(183) + '  ';

  function tvTool(kind) { return TV_TOOL[kind] || { name: kind, color: '#A1A1A8', chip: '#FFFFFF14', text: '#A1A1A8', icon: 'activity' }; }
  /** A budget too large to mean anything is no budget: searches are not packed. */
  function tvBudget(entry) { return entry.budget && entry.budget.declared < 1e9 ? entry.budget : null; }
  function tvK(n) { return n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n); }
  function tvShort(n) { return n >= 1000 ? (n % 1000 === 0 ? (n / 1000) + 'k' : (n / 1000).toFixed(1) + 'k') : String(n); }
  function tvBase(path) { return String(path || '').split('/').pop(); }
  function tvAsked(entry) {
    if (entry.kind === 'validate') return 'full documentation set';
    if (entry.kind === 'procedure') return entry.question.split('/').join(' ' + String.fromCharCode(8594) + ' ');
    return entry.question || '(the whole set)';
  }
  /** Bundle ids repeat for a repeated question; a call is its id at its time. */
  function tvKey(e) { return e.id + '@' + e.at; }
  function tvIsOpen(e, list) {
    if (state.selectedCall === tvKey(e)) return true;
    // chosen elsewhere by id alone (the graph's Trace agent use): the newest call with that id
    if (state.selectedCall !== e.id) return false;
    var newest = list.filter(function (x) { return x.id === e.id; }).sort(function (a, b) { return Date.parse(b.at) - Date.parse(a.at); })[0];
    return newest === e;
  }
  function tvToday(entries) {
    var d = new Date().toDateString();
    return entries.filter(function (e) { return new Date(e.at).toDateString() === d; }).length;
  }

  function renderCalls() {
    var record = state.trace;
    var list = clear(byId('calls'));
    var today = tvToday(record.entries);
    byId('call-count').textContent = today + ' today' + (record.dropped ? ' (+' + record.dropped + ' dropped)' : '');
    byId('tv-live').className = state.loop && !state.loop.trace ? 'cold' : '';

    var filters = clear(byId('tv-filters'));
    TV_FILTERS.forEach(function (f) {
      var b = el('button', (tvFilter === f[0] ? 'on' : '') + (f[0] === 'all' ? ' ui' : ''), f[1]);
      b.onclick = function () { tvFilter = f[0]; renderCalls(); };
      filters.appendChild(b);
    });

    if (!record.entries.length) {
      list.appendChild(el('div', 'tv-empty', state.loop && !state.loop.trace
        ? 'Requests are not recorded in this project: the loop is off, or loop.trace is false in .docspec.'
        : 'Nothing has asked this set for anything yet. Point an agent at it, or run dep context.'));
      clear(byId('call-detail')).appendChild(el('div', 'tv-empty', 'No request selected.'));
      return;
    }
    var shown = record.entries.slice().reverse().filter(function (e) { return tvFilter === 'all' || e.kind === tvFilter; });
    if (!shown.length) list.appendChild(el('div', 'tv-empty', 'No ' + tvTool(tvFilter).name + ' calls are recorded.'));
    // the newest call is open until another is chosen
    if (!state.selectedCall || !record.entries.some(function (e) { return tvIsOpen(e, record.entries); })) {
      if (shown.length) { state.selectedCall = tvKey(shown[0]); renderCall(shown[0]); }
    }
    shown.forEach(function (entry) {
      var tool = tvTool(entry.kind);
      var row = el('div', 'tv-call' + (tvIsOpen(entry, record.entries) ? ' on' : ''));
      row.setAttribute('data-id', tvKey(entry));
      var top = el('div', 'tv-top');
      var name = el('span', 'tv-tool'); name.style.color = tool.color;
      var mark = el('b'); mark.style.background = tool.color;
      name.appendChild(mark); name.appendChild(document.createTextNode(tool.name));
      top.appendChild(name);
      top.appendChild(el('span', 'tv-time', when(entry.at)));
      row.appendChild(top);
      row.appendChild(el('div', 'tv-q', tvAsked(entry)));
      var meta = el('div', 'tv-meta');
      function fig(v, label) { var s = el('span'); s.appendChild(el('b', null, v)); s.appendChild(document.createTextNode(label)); meta.appendChild(s); }
      if (entry.outcome === 'refused') meta.appendChild(el('span', 'tv-bad', 'refused' + (entry.error ? ' ' + String.fromCharCode(183) + ' ' + entry.error.code : '')));
      else if (entry.kind === 'validate' && entry.result) { fig(entry.result.pass, 'pass'); fig(entry.result.warn, 'warn'); if (entry.result.fail) fig(entry.result.fail, 'fail'); }
      else if (entry.kind === 'search') { fig(entry.offered.length, 'results'); if (entry.used.length) fig(entry.used.length, 'used'); }
      else if (entry.kind === 'procedure') { fig(1, 'node'); if (entry.result && entry.result.node) fig(entry.result.node, ''); fig(entry.offered.length, 'offered'); }
      else { fig(entry.offered.length, 'offered'); if (entry.used.length) fig(entry.used.length, 'used'); }
      var budget = tvBudget(entry);
      if (budget && entry.outcome !== 'refused') {
        var mini = el('span', 'tv-mini');
        var track = el('span'); var fill = el('i');
        fill.style.cssText = 'width:' + Math.min(100, budget.used / budget.declared * 100) + '%;background:' + tool.color;
        track.appendChild(fill); mini.appendChild(track);
        mini.appendChild(document.createTextNode(tvK(budget.used) + ' / ' + tvShort(budget.declared)));
        meta.appendChild(mini);
      }
      row.appendChild(meta);
      row.onclick = function () { state.selectedCall = tvKey(entry); renderCalls(); renderCall(entry); };
      list.appendChild(row);
    });
    var open = record.entries.filter(function (e) { return tvIsOpen(e, record.entries); })[0];
    // a redraw keeps the open call current: a usage report may have arrived since
    if (open && byId('call-detail').getAttribute('data-call') !== tvKey(open) + ':' + open.used.length) renderCall(open);
  }

  function renderCall(entry) {
    var pane = clear(byId('call-detail'));
    pane.setAttribute('data-call', tvKey(entry) + ':' + entry.used.length);
    var tool = tvTool(entry.kind);

    var hd = el('div', 'tv-hd');
    var metarow = el('div', 'tv-metarow');
    var who = el('div', 'tv-who');
    var chip = el('span', 'tv-chip'); chip.style.background = tool.chip; chip.style.color = tool.text;
    chip.appendChild(icon(tool.icon, 12)); chip.appendChild(document.createTextNode(tool.name));
    who.appendChild(chip);
    var said = [entry.caller];
    if (entry.asked && entry.asked.audience) said.push('audience ' + entry.asked.audience);
    if (entry.asked && entry.asked.freshness) said.push('policy ' + entry.asked.freshness);
    who.appendChild(document.createTextNode(said.join(DOTC)));
    metarow.appendChild(who);
    var timing = [when(entry.at)];
    if (typeof entry.ms === 'number') timing.push(entry.ms + ' ms');
    timing.push('#' + entry.id.slice(0, 6));
    metarow.appendChild(el('span', 'tv-timing', timing.join(DOTC)));
    hd.appendChild(metarow);
    hd.appendChild(el('div', 'tv-question', String.fromCharCode(8220) + tvAsked(entry) + String.fromCharCode(8221)));
    pane.appendChild(hd);

    if (entry.outcome === 'refused') {
      var bad = el('div', 'tv-refused');
      bad.appendChild(el('b', null, 'Refused' + (entry.error ? ' ' + String.fromCharCode(183) + ' ' + entry.error.code : '')));
      bad.appendChild(document.createTextNode((entry.error && entry.error.message) || 'no reason recorded'));
      pane.appendChild(bad);
      return;
    }

    var usedIds = {};
    entry.used.forEach(function (id) { usedIds[id] = true; });
    var reported = entry.used.length > 0;

    var summary = el('div', 'tv-summary');
    // token budget: one segment per passage, in the order they were packed
    var card = el('div', 'tv-card tv-budget');
    var budget = tvBudget(entry);
    var btop = el('div', 'tv-btop');
    var figs = el('div', 'tv-fig');
    figs.appendChild(el('div', 'tv-cap', 'Token budget'));
    var figure = el('div');
    var passTokens = entry.offered.reduce(function (n, p) { return n + (p.tokens || 0); }, 0);
    figure.appendChild(el('b', null, num(budget ? budget.used : passTokens)));
    figure.appendChild(el('span', null, budget ? '/ ' + num(budget.declared) + ' declared' : 'tokens offered, no budget'));
    figs.appendChild(figure);
    btop.appendChild(figs);
    if (budget) btop.appendChild(el('span', 'tv-packed', Math.round(budget.used / budget.declared * 100) + '% packed' + ' ' + String.fromCharCode(183) + ' ' + num(Math.max(0, budget.declared - budget.used)) + ' left'));
    card.appendChild(btop);
    var known = entry.offered.every(function (p) { return typeof p.tokens === 'number'; });
    if (budget && known && entry.offered.length) {
      var bar = el('div', 'tv-bar');
      var usedT = 0, unusedT = 0;
      entry.offered.forEach(function (p) {
        var seg = el('i');
        var c = TYPE_COLOR[p.type] || '#A1A1A8';
        var isUsed = !reported || usedIds[p.id];
        if (reported && usedIds[p.id]) usedT += p.tokens; else unusedT += p.tokens;
        seg.style.cssText = 'flex:' + p.tokens + ' 0 0;' + (isUsed ? 'background:' + c : 'border:1px solid ' + c + '99;opacity:.9');
        seg.title = p.document + ' ' + String.fromCharCode(167) + ' ' + p.section + ' ' + String.fromCharCode(183) + ' ' + p.tokens + ' tokens';
        bar.appendChild(seg);
      });
      var prov = Math.max(0, budget.used - passTokens);
      if (prov) { var pv = el('i'); pv.style.cssText = 'flex:' + prov + ' 0 0;background:#FFFFFF59'; pv.title = 'provenance ' + prov + ' tokens'; bar.appendChild(pv); }
      var rest = el('i'); rest.style.cssText = 'flex:' + Math.max(1, budget.declared - budget.used) + ' 0 0;background:#1E1F24'; bar.appendChild(rest);
      card.appendChild(bar);
      var legend = el('div', 'tv-legend');
      function key(swatch, label, value) {
        var s = el('span'); var b = el('b'); b.style.cssText = swatch;
        s.appendChild(b); s.appendChild(document.createTextNode(label)); s.appendChild(el('em', null, num(value)));
        legend.appendChild(s);
      }
      if (reported) {
        key('background:#F5F5F7', 'used by agent', usedT);
        key('border:1px solid #F5F5F7', 'offered, not used', unusedT);
      } else key('background:#F5F5F7', 'offered ' + String.fromCharCode(183) + ' no usage reported', passTokens);
      if (prov) key('background:#FFFFFF59', 'provenance', prov);
      card.appendChild(legend);
    } else if (budget) {
      card.appendChild(el('div', 'tv-nobudget', entry.offered.length ? 'This call was recorded before passage sizes were kept.' : 'Nothing was offered.'));
    } else {
      card.appendChild(el('div', 'tv-nobudget', entry.kind === 'validate' && entry.result
        ? entry.result.pass + ' pass ' + String.fromCharCode(183) + ' ' + entry.result.warn + ' warn ' + String.fromCharCode(183) + ' ' + entry.result.fail + ' fail ' + String.fromCharCode(183) + ' no passages are offered by a validation'
        : 'Searches are ranked, not packed: there is no budget to spend.'));
    }
    summary.appendChild(card);

    // how passages got in, and how many of each were used
    var mix = el('div', 'tv-card tv-mix');
    mix.appendChild(el('div', 'tv-cap', 'How passages got in'));
    TV_MIX.forEach(function (m) {
      var of = entry.offered.filter(function (p) { return p.reason === m[0]; });
      var row = el('div', 'tv-mixrow');
      var dot = el('i'); dot.style.background = m[2];
      row.appendChild(dot); row.appendChild(el('span', null, m[1]));
      row.appendChild(el('b', null, reported ? of.filter(function (p) { return usedIds[p.id]; }).length + ' of ' + of.length + ' used' : of.length + ' offered'));
      mix.appendChild(row);
    });
    var stale = entry.offered.filter(function (p) { return p.freshness === 'stale'; }).length;
    var aging = entry.offered.filter(function (p) { return p.freshness === 'aging'; }).length;
    var held = entry.withheld || [];
    if (stale || aging) {
      var flagged = el('div', 'tv-note ' + (stale ? 'red' : 'amber'));
      flagged.appendChild(icon('triangle-alert', 13));
      flagged.appendChild(document.createTextNode([stale ? stale + ' STALE' : '', aging ? aging + ' AGING' : ''].filter(Boolean).join(' ' + String.fromCharCode(183) + ' ') + ' kept, flagged'));
      mix.appendChild(flagged);
    }
    if (held.length) {
      var docs = {};
      held.forEach(function (w) { docs[w.document] = true; });
      var kept = el('div', 'tv-note red');
      if (stale || aging) kept.style.marginTop = '0';
      kept.appendChild(icon('ban', 13));
      kept.appendChild(document.createTextNode(held.length + ' sections from ' + Object.keys(docs).length + ' documents kept from the agent'));
      mix.appendChild(kept);
    }
    var freshKnown = entry.offered.every(function (p) { return typeof p.freshness === 'string'; });
    if (!stale && !aging && !held.length && entry.offered.length && freshKnown) {
      var fresh = el('div', 'tv-note ok');
      fresh.appendChild(icon('circle-check', 13));
      fresh.appendChild(document.createTextNode('every passage offered is fresh'));
      mix.appendChild(fresh);
    }
    summary.appendChild(mix);
    pane.appendChild(summary);

    // the passages, and below them what matched but was kept back
    var box = el('div', 'tv-passages');
    var title = el('div', 'tv-ptitle');
    var tl = el('div');
    tl.appendChild(el('h3', null, 'Passages'));
    tl.appendChild(el('span', null, entry.offered.length + ' offered' + DOTC + (reported ? entry.used.length + ' used by the agent' : 'usage not reported') + (held.length ? DOTC + held.length + ' kept back' : '')));
    title.appendChild(tl);
    var seg = el('div', 'tv-seg');
    [['all', 'All'], ['used', 'Used'], ['unused', 'Not used']].forEach(function (o) {
      var b = el('button', tvShow === o[0] ? 'on' : null, o[1]);
      b.onclick = function () { tvShow = o[0]; renderCall(entry); };
      seg.appendChild(b);
    });
    title.appendChild(seg);
    box.appendChild(title);

    var cols = el('div', 'tv-row cols');
    cols.appendChild(el('div', 'tv-c-status'));
    cols.appendChild(el('div', 'tv-c-pass', 'PASSAGE'));
    cols.appendChild(el('div', 'tv-c-why', 'WHY IT GOT IN'));
    var sc = el('div', 'tv-c-sig');
    ['SEM', 'KEY', 'GRA', 'USE'].forEach(function (s) { sc.appendChild(el('div', null, s)); });
    cols.appendChild(sc);
    cols.appendChild(el('div', 'tv-c-score', 'SCORE'));
    cols.appendChild(el('div', 'tv-c-tok', 'TOKENS'));
    box.appendChild(cols);

    function docCell(path, section, fresh) {
      var cell = el('div', 'tv-c-pass');
      var doc = el('div', 'tv-doc');
      var node = state.graph && state.graph.nodes.filter(function (n) { return n.path === path; })[0];
      var dot = el('i'); dot.style.background = TYPE_COLOR[node ? node.type : ''] || '#A1A1A8';
      doc.appendChild(dot); doc.appendChild(el('span', null, path));
      if (fresh === 'stale' || fresh === 'aging') doc.appendChild(el('span', 'tv-badge ' + fresh, fresh.toUpperCase()));
      cell.appendChild(doc);
      cell.appendChild(el('div', 'tv-sec', String.fromCharCode(167) + ' ' + (section || '(top)')));
      return cell;
    }

    var shown = entry.offered.filter(function (p) {
      if (tvShow === 'all' || !reported) return true;
      return tvShow === 'used' ? !!usedIds[p.id] : !usedIds[p.id];
    });
    shown.forEach(function (p, i) {
      var isUsed = !!usedIds[p.id];
      var row = el('div', 'tv-row link' + (i === 0 ? ' first' : '') + (reported && !isUsed ? ' unused' : ''));
      var st = el('div', 'tv-c-status');
      var ic = icon(reported && isUsed ? 'circle-check' : 'circle-dashed', 15);
      ic.style.color = reported && isUsed ? '#0A84FF' : '#6B6B73';
      ic.setAttribute('aria-label', reported ? (isUsed ? 'used' : 'not used') : 'usage not reported');
      st.appendChild(ic);
      row.appendChild(st);
      row.appendChild(docCell(p.document, p.section, p.freshness));
      var why = el('div', 'tv-c-why');
      why.appendChild(el('span', 'tv-why ' + p.reason, TV_WHY[p.reason] || p.reason));
      if (p.via) why.appendChild(el('span', 'tv-from', tvBase(p.via)));
      row.appendChild(why);
      var sig = el('div', 'tv-c-sig');
      TV_SIG.forEach(function (s) {
        var v = p.signals ? p.signals[s[0]] : null;
        var b = el('div', 'tv-sig' + (v === null || v === undefined ? ' none' : ''));
        b.title = s[0] + (v === null || v === undefined ? ': not recorded' : ': ' + v.toFixed(2));
        if (v !== null && v !== undefined) { var lv = el('i'); lv.style.cssText = 'height:' + Math.max(1, Math.round(Math.min(1, v) * 20)) + 'px;background:' + s[1]; b.appendChild(lv); }
        sig.appendChild(b);
      });
      row.appendChild(sig);
      var score = el('div', 'tv-c-score'); score.appendChild(el('span', 'tv-num', typeof p.score === 'number' ? p.score.toFixed(2) : '-')); row.appendChild(score);
      var tok = el('div', 'tv-c-tok'); tok.appendChild(el('span', 'tv-num dim', typeof p.tokens === 'number' ? p.tokens : '-')); row.appendChild(tok);
      row.onclick = function () { showScreen('graph'); select(p.document); };
      box.appendChild(row);
    });
    if (!shown.length) box.appendChild(el('div', 'tv-empty', entry.offered.length ? 'No passage matches this filter.' : 'Nothing was offered.'));

    // what matched but was kept from the agent: the documents it asked about may be the ones it never saw
    if (held.length && tvShow !== 'used') {
      var byDoc = {};
      held.forEach(function (w) {
        var d = byDoc[w.document] || (byDoc[w.document] = { reason: w.reason, lastVerified: w.lastVerified, sections: [] });
        d.sections.push(w.section || '(top)');
      });
      var docs2 = Object.keys(byDoc);
      var head = el('div', 'tv-kept');
      head.appendChild(el('div', 'tv-cap', 'Kept from the agent'));
      head.appendChild(el('span', null, docs2.length + ' documents' + DOTC + held.length + ' sections matched but are past or near their review date'));
      box.appendChild(head);
      docs2.forEach(function (path) {
        var d = byDoc[path];
        var row = el('div', 'tv-row link held');
        var st = el('div', 'tv-c-status'); var ic = icon('ban', 15); ic.style.color = '#FF6961'; st.appendChild(ic); row.appendChild(st);
        var cell = docCell(path, d.sections.slice(0, 3).join(', ') + (d.sections.length > 3 ? ', ' + String.fromCharCode(8230) : ''), d.reason);
        row.appendChild(cell);
        var why = el('div', 'tv-c-why');
        why.appendChild(el('span', 'tv-why withheld', 'withheld ' + String.fromCharCode(183) + ' ' + d.reason));
        var age = d.lastVerified ? days(d.lastVerified) : null;
        why.appendChild(el('span', 'tv-from', d.sections.length + (d.sections.length === 1 ? ' section' : ' sections') + (age !== null ? ' ' + String.fromCharCode(183) + ' verified ' + age + 'd ago' : '')));
        row.appendChild(why);
        var note = el('div', 'tv-held-note'); note.style.cssText = 'flex:0 0 222px;text-align:right'; note.textContent = 'never reached the agent';
        row.appendChild(note);
        row.onclick = function () { showScreen('graph'); select(path); };
        box.appendChild(row);
      });
    }
    pane.appendChild(box);
  }
`

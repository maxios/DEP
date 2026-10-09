/**
 * The console's Traversal screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 */
export const css = ``

export const html = `  <section class="screen" id="screen-traversal">
    <div class="split">
      <div class="rail">
        <div class="rail-head"><h3>Agent calls</h3><span id="call-count"></span></div>
        <div id="calls"></div>
      </div>
      <div class="pane" id="call-detail"><div class="empty">No request selected.</div></div>
    </div>
  </section>
`

export const js = `  // ── traversal ───────────────────────────────────────────────────────

  function renderCalls() {
    var record = state.trace;
    var list = clear(byId('calls'));
    byId('call-count').textContent = record.entries.length + (record.dropped ? ' (+' + record.dropped + ' dropped)' : '');
    if (!record.entries.length) {
      list.appendChild(el('div', 'empty', state.loop && !state.loop.trace
        ? 'Requests are not recorded in this project: the loop is off, or loop.trace is false in .docspec.'
        : 'Nothing has asked this set for anything yet. Point an agent at it, or run dep context.'));
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

    // what matched but was kept from the agent: the documents it asked about may be the ones it never saw
    if (entry.withheld && entry.withheld.length) {
      var kept = el('div', 'panel');
      kept.style.marginTop = '16px';
      var head = el('div', 'panel-head');
      head.appendChild(el('h3', null, 'Kept from the agent'));
      // one row per document: which sections matched, and how long since it was verified
      var byDoc = {};
      entry.withheld.forEach(function (w) {
        var d = byDoc[w.document] || (byDoc[w.document] = { reason: w.reason, lastVerified: w.lastVerified, sections: [] });
        d.sections.push(w.section || '(top)');
      });
      var docs = Object.keys(byDoc);
      head.appendChild(el('span', null, docs.length + ' documents, ' + entry.withheld.length + ' sections matched but are past or near their review date'));
      kept.appendChild(head);
      docs.forEach(function (path) {
        var d = byDoc[path];
        var it = el('div', 'item');
        it.appendChild(el('span', 'tag ' + (d.reason === 'stale' ? 'red' : 'amber'), d.reason));
        it.appendChild(el('span', 'mono', path));
        var age = d.lastVerified ? days(d.lastVerified) : null;
        it.appendChild(el('div', 'sub', d.sections.length + (d.sections.length === 1 ? ' section' : ' sections') + (age !== null ? ' ' + String.fromCharCode(183) + ' last verified ' + age + ' days ago' : '') + ' ' + String.fromCharCode(183) + ' ' + d.sections.slice(0, 3).join(', ') + (d.sections.length > 3 ? ', ' + String.fromCharCode(8230) : '')));
        kept.appendChild(it);
      });
      pane.appendChild(kept);
    }
  }
`

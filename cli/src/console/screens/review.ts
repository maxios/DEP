/**
 * The console's Review screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 */
export const css = ``

export const html = `  <section class="screen" id="screen-review">
    <div class="split">
      <div class="rail">
        <div class="rail-head"><h3>Proposed changes</h3><span id="proposal-count"></span></div>
        <div id="proposals"></div>
      </div>
      <div class="pane" id="proposal-detail"><div class="empty">Nothing selected.</div></div>
    </div>
  </section>`

export const js = `  // ── review ──────────────────────────────────────────────────────────

  var NL = String.fromCharCode(10);

  /** Lines of the old and new text, marked kept, removed or added (longest common subsequence). */
  function lineDiff(before, after) {
    var a = before ? before.split(NL) : [], b = after.split(NL);
    var n = a.length, m = b.length, L = [], i, j;
    for (i = 0; i <= n; i++) { L.push(new Array(m + 1).fill(0)); }
    for (i = n - 1; i >= 0; i--) {
      for (j = m - 1; j >= 0; j--) {
        L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
      }
    }
    var out = [];
    i = 0; j = 0;
    while (i < n && j < m) {
      if (a[i] === b[j]) { out.push(['same', a[i]]); i++; j++; }
      else if (L[i + 1][j] >= L[i][j + 1]) { out.push(['del', a[i]]); i++; }
      else { out.push(['add', b[j]]); j++; }
    }
    while (i < n) { out.push(['del', a[i++]]); }
    while (j < m) { out.push(['add', b[j++]]); }
    return out;
  }

  function renderProposals() {
    var list = clear(byId('proposals'));
    var ps = state.proposals;
    byId('proposal-count').textContent = ps.length + ' waiting';
    var due = dueForReview();
    byId('review-count').textContent = ps.length + due.length ? String(ps.length + due.length) : '';
    if (!ps.length) {
      list.appendChild(el('div', 'empty', 'No new versions are waiting for you.'));
      clear(byId('proposal-detail')).appendChild(el('div', 'empty', due.length
        ? due.length + ' documents are past or near their review date: they are listed on the left. Select one to open it.'
        : 'Nothing selected.'));
      renderDue(list, due);
      return;
    }
    var chosen = ps.filter(function (p) { return p.document === state.selectedProposal; })[0];
    if (!chosen) { chosen = ps[0]; state.selectedProposal = chosen.document; }
    ps.forEach(function (p) {
      var row = el('div', 'call' + (p.document === state.selectedProposal ? ' on' : ''));
      row.appendChild(el('span', 'kind mono', basename(p.document)));
      row.appendChild(el('div', 'q', p.current === null ? 'new document' : 'new version'));
      row.appendChild(el('div', 'meta', p.from + ' · ' + when(p.at)));
      row.onclick = function () { state.selectedProposal = p.document; renderProposals(); };
      list.appendChild(row);
    });
    renderDue(list, due);
    renderProposal(chosen);
  }

  /** Documents past or near their review date, the stalest first: what the heartbeat calls review_due. */
  function dueForReview() {
    if (!state.graph) return [];
    var rank = { STALE: 0, AGING: 1 };
    return state.graph.nodes.filter(function (n) { return n.lifecycle === 'STALE' || n.lifecycle === 'AGING'; })
      .sort(function (a, b) { return rank[a.lifecycle] - rank[b.lifecycle] || String(a.lastVerified).localeCompare(String(b.lastVerified)); });
  }

  function renderDue(list, due) {
    if (!due.length) return;
    var head = el('div', 'rail-head');
    head.style.borderTop = '1px solid var(--line)';
    head.appendChild(el('h3', null, 'Due for review'));
    head.appendChild(el('span', null, due.length + ' documents'));
    list.appendChild(head);
    due.forEach(function (n) {
      var row = el('div', 'call');
      var top = el('div');
      top.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline';
      top.appendChild(el('span', 'kind mono', basename(n.path)));
      var life = el('span', 'tag ' + (n.lifecycle === 'STALE' ? 'red' : 'amber'), n.lifecycle.toLowerCase());
      top.appendChild(life);
      row.appendChild(top);
      var age = days(n.lastVerified);
      row.appendChild(el('div', 'meta', n.owner + ' ' + String.fromCharCode(183) + ' ' + n.type + (age !== null ? ' ' + String.fromCharCode(183) + ' verified ' + age + ' days ago' : '')));
      // opening it shows the inspector, where it can be read and, once reviewed, marked so
      row.onclick = function () { openReader(n.path); };
      list.appendChild(row);
    });
  }

  function renderProposal(p) {
    var pane = clear(byId('proposal-detail'));
    pane.appendChild(el('h1', null, basename(p.document)));
    pane.appendChild(el('div', 'muted mono', p.document));
    pane.appendChild(el('div', 'muted', 'Proposed by ' + p.from + ' at ' + when(p.at) + '. Nothing in it is served as context until you accept it.'));
    var rows = lineDiff(p.current, p.proposed);
    var added = rows.filter(function (r) { return r[0] === 'add'; }).length;
    var removed = rows.filter(function (r) { return r[0] === 'del'; }).length;
    var bar = el('div', 'decide');
    var yes = el('button', 'act on', 'Accept');
    var no = el('button', 'act', 'Reject');
    if (p.changedSince) {
      yes.disabled = true;
      bar.appendChild(yes); bar.appendChild(no);
      bar.appendChild(el('span', 'said bad', 'The document changed after this was proposed; accepting it would overwrite that.'));
    } else {
      bar.appendChild(yes); bar.appendChild(no);
      bar.appendChild(el('span', 'meta', '+' + added + ' · −' + removed + ' lines'));
    }
    yes.onclick = function () { decide(p.document, 'accept'); };
    no.onclick = function () { decide(p.document, 'reject'); };
    pane.appendChild(bar);
    var box = el('div', 'diff');
    rows.forEach(function (r) { box.appendChild(el('div', r[0], r[1] === '' ? ' ' : r[1])); });
    pane.appendChild(box);
  }

  function decide(document, decision) {
    fetch('/api/proposals', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ document: document, decision: decision })
    }).then(function (r) {
      return r.json().then(function (data) { return { ok: r.ok, data: data }; });
    }).then(function (answer) {
      var pane = byId('proposal-detail');
      if (!answer.ok) { pane.appendChild(el('div', 'said bad', answer.data.error || 'refused')); return; }
      state.selectedProposal = null;
      refresh(false).catch(function () {});
    });
  }
`

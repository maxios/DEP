/**
 * The console's Health screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 */
export const css = ``

export const html = `  <section class="screen" id="screen-health">
    <div class="pane" id="health"></div>
  </section>
`

export const js = `  // ── health ──────────────────────────────────────────────────────────

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
`

/**
 * The console's Loop screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 */
export const css = ``

export const html = `  <section class="screen" id="screen-loop">
    <div class="pane" id="loop"></div>
  </section>
`

export const js = `  // ── loop ────────────────────────────────────────────────────────────

  var STATE_COLOR = { on: 'var(--fresh)', off: 'var(--dimmer)' };

  function panel(title, note, cls) {
    var box = el('div', 'panel' + (cls ? ' ' + cls : ''));
    var head = el('div', 'panel-head');
    head.appendChild(el('h3', null, title));
    if (note) head.appendChild(el('span', null, note));
    box.appendChild(head);
    return box;
  }

  function pct(x) { return Math.round(x * 100) + '%'; }

  function renderLoop() {
    var pane = clear(byId('loop'));
    var loop = state.loop;
    if (!loop || !loop.enabled) {
      var off = el('div', 'panel');
      off.appendChild(el('h1', null, 'The loop is off'));
      off.appendChild(el('div', 'muted', 'DEP is running as pure documentation: nothing is recorded, no owner is woken, no model is asked.'));
      off.appendChild(el('div', 'mono', 'Turn it on in .docspec with   loop: { enabled: true }   · dep loop shows each part.'));
      pane.appendChild(off);
      return;
    }

    var strip = el('div', 'strip');
    (loop.parts || []).forEach(function (part) {
      var cell = el('div');
      cell.appendChild(el('div', 'k', part.part));
      var v = el('div', 'v');
      var dot = el('i'); dot.style.background = part.state === 'off' ? STATE_COLOR.off : (part.state.indexOf('acts on nothing') >= 0 || part.state === 'wait for review' ? 'var(--aging)' : STATE_COLOR.on);
      v.appendChild(dot); v.appendChild(el('span', null, part.state));
      cell.appendChild(v);
      cell.appendChild(el('div', 'w', part.why));
      strip.appendChild(cell);
    });
    var envNote = el('div');
    envNote.appendChild(el('div', 'w', 'DEP_LOOP=off in the environment switches everything off.'));
    strip.appendChild(envNote);
    pane.appendChild(strip);

    var grid = el('div', 'loop-grid');
    var left = el('div', 'loop-col');
    var right = el('div', 'loop-col');
    grid.appendChild(left); grid.appendChild(right);
    pane.appendChild(grid);

    var hb = state.heartbeat;
    if (!hb) {
      left.appendChild(panel('Heartbeat', 'off in this project'));
    } else {
      var heart = panel('Heartbeat', hb.today.beats + ' beats today · ' + hb.today.wakes + ' woke · ' + 'wake ratio ' + hb.today.wakeRatio.toFixed(2) + (hb.killSwitch ? ' · kill switch ON' : ''));
      var table = el('table');
      var hrow = el('tr');
      ['Owner', 'Last beat', 'Interval', 'Next beat', 'Woke', 'Woken for'].forEach(function (h) { hrow.appendChild(el('th', null, h)); });
      table.appendChild(hrow);
      hb.owners.forEach(function (o) {
        var tr = el('tr');
        tr.appendChild(el('td', 'mono', o.owner));
        tr.appendChild(el('td', 'mono', o.lastBeat ? when(o.lastBeat) : '-'));
        tr.appendChild(el('td', null, o.interval ? 'every ' + (o.interval >= 3600000 ? Math.round(o.interval / 3600000) + 'h' : Math.round(o.interval / 60000) + 'm') : '-'));
        tr.appendChild(el('td', 'mono', o.nextBeat ? when(o.nextBeat) : '-'));
        var woke = el('td'); woke.appendChild(el('span', 'tag ' + (o.woke ? 'green' : ''), o.woke ? 'yes' : 'no')); tr.appendChild(woke);
        var sig = el('td');
        var kinds = {};
        o.signals.forEach(function (s) { kinds[s.kind] = (kinds[s.kind] || 0) + 1; });
        Object.keys(kinds).forEach(function (k) { sig.appendChild(el('span', 'tag', kinds[k] + ' ' + k)); });
        if (!o.signals.length) sig.appendChild(el('span', 'muted', '-'));
        tr.appendChild(sig);
        table.appendChild(tr);
      });
      heart.appendChild(table);
      left.appendChild(heart);

      var row = el('div', 'loop-row');
      var signals = panel('Signals', 'most pressing first');
      var all = [];
      hb.owners.forEach(function (o) { o.signals.forEach(function (s) { all.push(s); }); });
      if (!all.length) signals.appendChild(el('div', 'muted', 'Nothing needs anyone.'));
      all.slice(0, 8).forEach(function (s) {
        var it = el('div', 'item');
        it.appendChild(el('span', 'tag ' + (s.kind === 'follow_up_due' ? 'red' : s.kind === 'review_due' || s.kind === 'task' ? 'amber' : ''), s.kind));
        it.appendChild(el('span', 'mono', s.document));
        it.appendChild(el('div', 'sub', s.why));
        signals.appendChild(it);
      });
      row.appendChild(signals);

      var acts = panel('Recent actions', hb.recent.length ? 'beat ' + hb.recent[0].agent + ' ' + String.fromCharCode(183) + ' ' + when(hb.recent[0].at) : '');
      if (!hb.recent.length) acts.appendChild(el('div', 'muted', 'No owner has acted yet.'));
      hb.recent.slice(0, 3).forEach(function (b) {
        if (b.error) {
          var e = el('div', 'item');
          e.appendChild(el('span', 'outcome', 'nothing done')).style.color = 'var(--dim)';
          e.appendChild(el('span', 'mono', b.agent));
          e.appendChild(el('div', 'sub', b.error));
          acts.appendChild(e);
        }
        b.actions.forEach(function (a) {
          var it = el('div', 'item');
          var label = a.became === 'escalate' ? 'escalated' : a.outcome;
          var out = el('span', 'outcome', label);
          out.style.color = label === 'refused' ? 'var(--stale)' : label === 'escalated' ? 'var(--aging)' : 'var(--fresh)';
          it.appendChild(out);
          var act = a.action || {};
          it.appendChild(el('span', null, (act.type || 'action') + ' ' + (act.to ? act.to + ' ' : '') + (act.document || act.re || act.message || '')));
          if (a.reason) it.appendChild(el('div', 'sub', a.reason));
          acts.appendChild(it);
        });
      });
      row.appendChild(acts);
      left.appendChild(row);

      var row2 = el('div', 'loop-row');
      var wait = panel('Waiting for you', 'a reply goes to the owner, from you', 'warm');
      if (!hb.waiting.length) wait.appendChild(el('div', 'muted', 'Nothing has been brought to you.'));
      hb.waiting.forEach(function (m) {
        var it = el('div', 'item');
        it.appendChild(el('span', 'mono', m.re || m.thread || m.id));
        it.appendChild(el('div', 'sub', m.from + ': ' + m.body));
        var form = el('div', 'reply');
        var input = el('input'); input.placeholder = 'Reply to ' + m.from;
        var send = el('button', 'act', 'Reply');
        send.onclick = function () { replyTo(m.id, input.value, it); };
        form.appendChild(input); form.appendChild(send);
        it.appendChild(form);
        wait.appendChild(it);
      });
      row2.appendChild(wait);

      var outs = panel('Follow-up outcomes', 'scored by the heartbeat, never the owner');
      var total = hb.outcomes.answered + hb.outcomes['answered-late'] + hb.outcomes.unanswered;
      var bar = el('div', 'bar');
      [['answered', 'var(--fresh)'], ['answered-late', 'var(--aging)'], ['unanswered', 'var(--stale)']].forEach(function (k) {
        var i = el('i'); i.style.cssText = 'width:' + (total ? hb.outcomes[k[0]] / total * 100 : 0) + '%;background:' + k[1]; bar.appendChild(i);
      });
      outs.appendChild(bar);
      var trip = el('div', 'triple');
      [['answered in time', 'answered', '+1.0'], ['answered late', 'answered-late', '+0.5'], ['never answered', 'unanswered', '-0.5']].forEach(function (k) {
        var d = el('div');
        d.appendChild(el('div', 'big', hb.outcomes[k[1]]));
        d.appendChild(el('span', null, k[0] + ' ' + k[2]));
        trip.appendChild(d);
      });
      outs.appendChild(trip);
      row2.appendChild(outs);
      left.appendChild(row2);
    }

    var lr = state.learned;
    var learned = panel('What the agent has learned', lr ? lr.game : '');
    if (!lr) {
      learned.appendChild(el('div', 'muted', 'The loop has written no summary yet. Its scripts write .dep-learned.json after playing.'));
    } else {
      learned.appendChild(el('div', 'mono muted', 'from the loop' + String.fromCharCode(39) + 's summary ' + String.fromCharCode(183) + ' updated ' + when(lr.updated)));
      var base = lr.runs[0], edit = lr.runs[1];
      var lastRate = base && base.passRates.length ? base.passRates[base.passRates.length - 1] : 0;
      var head = el('div', 'triple');
      var a = el('div'); a.appendChild(el('div', 'big', lastRate.toFixed(2))); a.appendChild(el('span', null, 'pass rate, last day ' + String.fromCharCode(183) + ' ' + (base ? base.label : ''))); head.appendChild(a);
      if (edit) { var b2 = el('div'); var bb = el('div', 'big', edit.passRates[edit.passRates.length - 1].toFixed(2)); bb.style.color = 'var(--accent)'; b2.appendChild(bb); b2.appendChild(el('span', null, edit.label)); head.appendChild(b2); }
      learned.appendChild(head);
      var chart = el('div', 'chart');
      var days = Math.max.apply(null, lr.runs.map(function (r) { return r.passRates.length; }));
      for (var d = 0; d < days; d++) {
        var day = el('div', 'day');
        lr.runs.forEach(function (r, ri) {
          if (r.passRates[d] === undefined) return;
          var i = el('i', ri > 0 ? 'edit' : null); i.style.height = (r.passRates[d] * 100) + '%'; i.title = r.label + ': ' + r.passRates[d];
          day.appendChild(i);
        });
        day.appendChild(el('b', null, d + 1));
        chart.appendChild(day);
      }
      learned.appendChild(chart);
      var legend = el('div', 'badges'); legend.style.marginTop = '22px';
      lr.runs.forEach(function (r, ri) { var p = el('div', 'pill'); var dot = el('i'); dot.style.background = ri ? 'var(--accent)' : 'rgba(255,255,255,0.35)'; p.appendChild(dot); p.appendChild(el('span', null, r.label)); legend.appendChild(p); });
      learned.appendChild(legend);
      function lines(title, list) {
        if (!list.length) return;
        var h = el('h3', null, title); h.style.cssText = 'font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dimmer);margin:16px 0 4px';
        learned.appendChild(h);
        list.forEach(function (x) {
          var it = el('div', 'item');
          var ev = el('span', 'outcome mono', x.passed + '/' + x.acted);
          var meter = el('span', 'evidence'); var fill = el('i'); var ratio = x.acted ? x.passed / x.acted : 0;
          fill.style.cssText = 'width:' + ratio * 100 + '%;background:' + (ratio >= 0.8 ? 'var(--fresh)' : ratio >= 0.5 ? 'var(--aging)' : 'var(--stale)');
          meter.appendChild(fill); ev.appendChild(meter);
          it.appendChild(ev);
          it.appendChild(el('span', null, x.situation + ' '));
          it.appendChild(el('span', 'tag', x.claim.replace('choose ', '')));
          learned.appendChild(it);
        });
      }
      lines('Advice it relies on', lr.advice.slice(0, 6));
      lines('Habits', lr.habits.slice(0, 4));
      lines('What you told it', lr.taught);
      lr.notes.forEach(function (n) { learned.appendChild(el('div', 'sub', n)); });
      var tot = el('div', 'muted'); tot.style.marginTop = '14px';
      tot.textContent = lr.totals.claims + ' active claims ' + String.fromCharCode(183) + ' ' + lr.totals.rules + ' rules ' + String.fromCharCode(183) + ' ' + lr.totals.habits + ' habits ' + String.fromCharCode(183) + ' nights ' + lr.totals.nightsKept + ' kept / ' + lr.totals.nightsUndone + ' undone';
      learned.appendChild(tot);
    }
    right.appendChild(learned);
  }
`

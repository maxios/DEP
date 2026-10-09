/**
 * The console's Graph screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 */
export const css = ``

export const html = `  <section class="screen on" id="screen-graph">
    <div id="canvas-wrap">
      <canvas id="graph"></canvas>
      <div class="float" id="stats"></div>
      <div class="float" id="legend"></div>
    </div>
    <aside id="inspector"><div class="empty">Select a document in the graph.</div></aside>
  </section>
`

export const js = `  // ── graph ───────────────────────────────────────────────────────────

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
    // a press that barely moved is a click, not a drag — allow for a shaky hand
    if (dragNode && Math.hypot(ev.clientX - last.x, ev.clientY - last.y) < 9) select(dragNode.path);
    else if (panning && Math.hypot(ev.clientX - last.x, ev.clientY - last.y) < 9) {
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
      said(answer.data.changes.map(function (c) { return c.field; }).join(', ') + ' updated', true);
      refresh(false).then(function () { select(path); }).catch(function () { select(path); });
    }).catch(function (err) {
      said(String(err.message || err), false);
    });
  }

  function said(message, good) {
    var box = byId('inspector');
    var note = el('div', 'said ' + (good ? 'good' : 'bad'), message);
    box.appendChild(note);
    setTimeout(function () { if (note.parentNode) note.parentNode.removeChild(note); }, 4000);
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
    var read = el('button', 'act on', 'Read document');
    read.style.marginTop = '10px';
    read.onclick = function () { openReader(doc.path); };
    box.appendChild(read);

    var meta = el('div', 'group');
    meta.appendChild(el('h3', null, 'Metadata'));
    function kv(k, v) {
      var r = el('div', 'kv');
      r.appendChild(el('span', null, k));
      r.appendChild(el('b', null, v));
      meta.appendChild(r);
    }
    kv('Owner', doc.owner || '-');

    var confRow = el('div', 'kv');
    confRow.appendChild(el('span', null, 'Confidence'));
    var seg = el('div', 'seg');
    ['low', 'medium', 'high'].forEach(function (level) {
      var b = el('button', 'act' + (doc.confidence === level ? ' on' : ''), level);
      b.onclick = function () { amend(doc.path, { set: { confidence: level } }); };
      seg.appendChild(b);
    });
    confRow.appendChild(seg);
    meta.appendChild(confRow);

    var age = days(doc.freshness && doc.freshness.lastVerified);
    var verifiedRow = el('div', 'kv');
    verifiedRow.appendChild(el('span', null, 'Last verified'));
    var right = el('div');
    right.style.cssText = 'display:flex;gap:8px;align-items:center';
    right.appendChild(el('b', null, age === null ? '-' : age + 'd ago'));
    var bump = el('button', 'act', 'Bump');
    bump.onclick = function () { amend(doc.path, { bump: true }); };
    right.appendChild(bump);
    verifiedRow.appendChild(right);
    meta.appendChild(verifiedRow);
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

    var tg = el('div', 'group');
    tg.appendChild(el('h3', null, 'Tags'));
    var holder2 = el('div', 'badges');
    (doc.tags || []).forEach(function (name) {
      var chip = el('span', 'badge tag');
      chip.appendChild(el('span', null, name));
      var x = el('x', null, '\u00d7');
      x.onclick = function () { amend(doc.path, { tags: { remove: [name] } }); };
      chip.appendChild(x);
      holder2.appendChild(chip);
    });
    tg.appendChild(holder2);
    var tagField = el('div', 'field');
    var tagInput = el('input');
    tagInput.placeholder = 'add a tag';
    var tagAdd = el('button', 'act', 'Add');
    var sendTag = function () {
      var name = tagInput.value.trim();
      if (name) amend(doc.path, { tags: { add: [name] } });
    };
    tagAdd.onclick = sendTag;
    tagInput.onkeydown = function (ev) { if (ev.key === 'Enter') sendTag(); };
    tagField.appendChild(tagInput);
    tagField.appendChild(tagAdd);
    tg.appendChild(tagField);
    box.appendChild(tg);

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

    var lg = box.lastChild;
    var linkField = el('div', 'field');
    var relPick = el('select');
    ['TEACHES', 'USES', 'EXPLAINS', 'DECIDES', 'REQUIRES', 'NEXT'].forEach(function (r) {
      var o = el('option', null, r);
      o.value = r;
      relPick.appendChild(o);
    });
    var targetPick = el('select');
    targetPick.style.flex = '1';
    var blank = el('option', null, 'link to a document...');
    blank.value = '';
    targetPick.appendChild(blank);
    (state.graph ? state.graph.nodes : []).forEach(function (n) {
      if (n.path === doc.path) return;
      var o = el('option', null, n.path);
      o.value = n.path;
      targetPick.appendChild(o);
    });
    var linkAdd = el('button', 'act', 'Link');
    linkAdd.onclick = function () {
      if (targetPick.value) amend(doc.path, { link: { target: targetPick.value, rel: relPick.value } });
    };
    linkField.appendChild(relPick);
    linkField.appendChild(targetPick);
    linkField.appendChild(linkAdd);
    lg.appendChild(linkField);
    lg.appendChild(el('div', 'writes', 'Changes are written to the document.'));

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
`

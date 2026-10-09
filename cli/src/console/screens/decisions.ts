/**
 * The console's Decisions screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 */
export const css = ``

export const html = `  <section class="screen" id="screen-decisions">
    <div class="split">
      <div class="rail">
        <div class="rail-head"><h3>Decision trees</h3><span id="tree-count"></span></div>
        <div id="trees"></div>
      </div>
      <div class="pane" id="tree-detail"><div class="empty">No procedure selected.</div></div>
    </div>
  </section>
`

export const js = `  // ── decisions ───────────────────────────────────────────────────────

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
`

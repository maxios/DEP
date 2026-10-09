/**
 * The console's document reader screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 */
export const css = ``

export const html = `  <section class="screen" id="screen-reader">
    <div class="reader">
      <aside class="reader-meta" id="reader-meta"></aside>
      <article class="prose" id="reader-body"></article>
    </div>
  </section>
`

export const js = `  // ── reader ──────────────────────────────────────────────────────────

  var readerFrom = 'graph';

  function openReader(path) {
    var current = document.querySelector('section.screen.on');
    if (current && current.id !== 'screen-reader') readerFrom = current.id.replace('screen-', '');
    showScreen('reader');
    clear(byId('reader-body')).appendChild(el('div', 'empty', 'Loading.'));
    clear(byId('reader-meta'));
    get('/api/document?path=' + encodeURIComponent(path)).then(renderReader).catch(function (err) {
      clear(byId('reader-body')).appendChild(el('div', 'empty', String(err.message || err)));
    });
  }

  function renderReader(doc) {
    var meta = clear(byId('reader-meta'));
    var back = el('button', 'act', String.fromCharCode(8592) + ' Back');
    back.onclick = function () { showScreen(readerFrom); };
    meta.appendChild(back);
    var badges = el('div', 'badges'); badges.style.margin = '14px 0 8px';
    badges.appendChild(el('span', 'badge', doc.type));
    var life = el('span', 'badge life', doc.lifecycle); life.style.background = lifeColor(doc.lifecycle);
    badges.appendChild(life);
    badges.appendChild(el('span', 'badge', 'confidence ' + doc.confidence));
    meta.appendChild(badges);
    meta.appendChild(el('div', 'mono', doc.path));
    var age = days(doc.lastVerified || (doc.declared && doc.declared.last_verified));
    if (age !== null) meta.appendChild(el('div', 'muted', 'last verified ' + age + ' days ago ' + String.fromCharCode(183) + ' owner ' + doc.owner));
    var fm = el('h3', null, 'Frontmatter'); fm.style.cssText = 'font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dimmer);margin-top:16px';
    meta.appendChild(fm);
    meta.appendChild(el('pre', null, doc.frontmatter || '(none)'));
    function links(title, list, pick) {
      var h = el('h3', null, title + ' ' + list.length); h.style.cssText = 'font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:var(--dimmer);margin:10px 0 6px';
      meta.appendChild(h);
      list.forEach(function (l) {
        var row = el('div'); row.style.cssText = 'font-size:11.5px;margin:3px 0';
        var a = el('a', 'mono', pick(l)); a.onclick = function () { openReader(pick(l)); };
        row.appendChild(el('span', 'tag', l.rel)); row.appendChild(a);
        meta.appendChild(row);
      });
    }
    links('Links out', doc.forwardLinks || [], function (l) { return l.target; });
    links('Linked from', doc.backlinks || [], function (l) { return l.source; });
    // the html is built by the server from escaped text only; it carries no markup of the document's own
    var body = byId('reader-body');
    body.innerHTML = doc.html || '';
    body.scrollTop = 0;
  }

  byId('reader-body').addEventListener('click', function (e) {
    var a = e.target.closest ? e.target.closest('a[data-doc]') : null;
    if (!a) return;
    e.preventDefault();
    openReader(a.getAttribute('data-doc'));
  });
`

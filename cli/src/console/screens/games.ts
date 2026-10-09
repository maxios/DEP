/**
 * The console's Games screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 */
export const css = `  /* games: the designer's screen; every value is from designs/dep-console-game.pen */
  .gm { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 18px; padding: 24px 32px; overflow: auto;
        font-family: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif; line-height: normal; color: #F5F5F7; background: #07080A; }
  .gm .g-m { font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace; }
  .gm svg { flex: 0 0 auto; display: block; }
  .gm .g-row { display: flex; align-items: center; }
  .gm .g-col { display: flex; flex-direction: column; }
  .gm .g-fill { flex: 1 1 0; min-width: 0; }
  .gm .g-as-is { text-transform: none; }
  .gm .g-cap { font-size: 10px; font-weight: 600; letter-spacing: 1px; color: #6B6B73; text-transform: uppercase; }
  .gm .g-chip { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 4px; font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace; font-size: 10.5px; font-weight: 500; white-space: nowrap; }
  .gm .g-stat { display: inline-flex; align-items: center; padding: 1px 7px; border-radius: 4px; font-size: 10.5px; font-weight: 700; white-space: nowrap; }
  .gm .g-c-blue { background: #0A84FF26; color: #9CCBFF; } .gm .g-c-green { background: #32D74B1F; color: #9BF0AA; }
  .gm .g-c-purple { background: #BF5AF226; color: #DDA8FF; } .gm .g-c-gray { background: #FFFFFF12; color: #A1A1A8; }
  .gm .g-c-orange { background: #FF9F0A26; color: #FFC56B; } .gm .g-c-pink { background: #FF648226; color: #FFB0C0; }
  .gm .g-c-red { background: #FF453A1F; color: #FF9A93; } .gm .g-c-red2 { background: #FF453A33; color: #FF9A93; }
  .gm .g-c-yellow { background: #FFD60A1A; color: #FFE680; } .gm .g-c-quiet { background: #FFFFFF0D; color: #6B6B73; }
  .gm .g-c-path { background: #FFFFFF0D; color: #A1A1A8; } .gm .g-c-val { background: #FFFFFF14; color: #F5F5F7; }
  .gm .g-btn { appearance: none; display: inline-flex; align-items: center; gap: 7px; padding: 7px 12px; border-radius: 8px; border: 1px solid transparent;
             background: #1E1F24; color: #F5F5F7; font: inherit; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; }
  .gm .g-btn svg { color: #A1A1A8; }
  .gm .g-btn:hover { filter: brightness(1.15); }
  .gm .g-btn.g-check { background: #0A84FF26; border-color: #0A84FF55; color: #9CCBFF; } .gm .g-btn.g-check svg { color: #6CB4FF; }
  .gm .g-btn.g-go { background: #0A84FF; color: #FFFFFF; } .gm .g-btn.g-go svg { color: #FFFFFF; }
  .gm .g-btn.g-locked { background: #FFFFFF06; border-color: #FFFFFF12; color: #6B6B73; cursor: default; filter: none; }
  .gm .g-btn.g-locked svg { color: #6B6B73; } .gm .g-btn .g-why { font-size: 10.5px; font-weight: 400; color: #6B6B73; }
  .gm .g-btn.g-ghost { background: transparent; border-color: #FFFFFF12; color: #A1A1A8; font-size: 11.5px; padding: 8px 12px; border-radius: 10px; gap: 6px; }
  .gm .g-btn.g-ghost svg { color: #6B6B73; }
  .gm .g-btn.g-small { padding: 4px 9px; border-radius: 6px; font-size: 11px; gap: 6px; color: #A1A1A8; }
  .gm .g-bar { background: #0F1013; border: 1px solid #FFFFFF12; border-radius: 14px; padding: 12px 14px 12px 20px; gap: 12px; flex: 0 0 auto; }
  .gm .g-bar-head { gap: 4px; padding-right: 12px; }
  .gm .g-bar-head .g-cap { letter-spacing: 1.2px; }
  .gm .g-bar-head .g-src { font-size: 11px; color: #A1A1A8; }
  .gm .g-card { gap: 4px; padding: 8px 14px; border: 1px solid #FFFFFF12; border-radius: 10px; cursor: pointer; min-width: 0; }
  .gm .g-card.g-on { background: #0A84FF12; border-color: #0A84FF55; }
  .gm .g-card .g-name { gap: 8px; } .gm .g-card .g-id { font-size: 12.5px; font-weight: 600; }
  .gm .g-card .g-stat { font-size: 10px; letter-spacing: .6px; padding: 1px 6px; }
  .gm .g-card .g-path { font-size: 10.5px; color: #6B6B73; } .gm .g-card .g-path:hover { color: #A1A1A8; text-decoration: underline; }
  .gm .g-card .g-meta { font-size: 10.5px; color: #6B6B73; } .gm .g-card .g-meta.g-warn { color: #FFE680; }
  .gm .g-dot { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 7px; }
  .gm .g-main { flex: 1 0 auto; gap: 18px; align-items: stretch; }
  .gm .g-left { flex: 1 1 0; min-width: 0; gap: 18px; }
  .gm .g-right { flex: 0 0 470px; width: 470px; gap: 18px; }
  .gm .g-design { gap: 18px; align-items: stretch; flex: 0 0 auto; }
  .gm .g-panel { background: #0F1013; border: 1px solid #FFFFFF12; border-radius: 14px; padding: 16px 20px; gap: 12px; min-width: 0; }
  .gm .g-title { justify-content: space-between; gap: 10px; }
  .gm .g-title > .g-row { gap: 10px; } .gm .g-title h3 { font-size: 14px; font-weight: 600; color: #F5F5F7; }
  .gm .g-title > .g-row.g-acts { gap: 8px; }
  .gm .g-sub { font-size: 11px; color: #6B6B73; }
  .gm .g-kv { gap: 12px; min-height: 16px; } .gm .g-kv .g-k { width: 84px; flex: 0 0 84px; font-size: 11.5px; color: #6B6B73; }
  .gm .g-kv .g-v { gap: 6px; min-width: 0; flex-wrap: wrap; } .gm .g-kv .g-val { font-size: 12px; color: #F5F5F7; }
  .gm .g-kv .g-val.g-lit { color: #FFE680; } .gm .g-kv .g-note { font-size: 11px; color: #6B6B73; }
  .gm .g-kv input { background: #16171B; border: 1px solid #FFFFFF24; border-radius: 6px; color: #F5F5F7; font-family: "JetBrains Mono", "SF Mono", ui-monospace, Menlo, monospace; font-size: 12px; padding: 2px 7px; width: 100%; }
  .gm .g-said { font-size: 11px; } .gm .g-said.g-ok { color: #9BF0AA; } .gm .g-said.g-no { color: #FF9A93; }
  .gm .g-judge { flex: 0 0 400px; width: 400px; }
  .gm .g-box { gap: 10px; padding: 10px 12px; border-radius: 10px; border: 1px solid; align-items: flex-start; }
  .gm .g-box.g-red { background: #FF453A0D; border-color: #FF453A40; } .gm .g-box.g-red svg { color: #FF9A93; }
  .gm .g-box.g-green { background: #32D74B0D; border-color: #32D74B40; } .gm .g-box.g-green svg { color: #9BF0AA; }
  .gm .g-box.g-amber { background: #FFD60A0F; border-color: #FFD60A33; align-items: center; } .gm .g-box.g-amber svg { color: #FFD60A; }
  .gm .g-box.g-ok { background: #32D74B0F; border-color: #32D74B33; align-items: center; } .gm .g-box.g-ok svg { color: #32D74B; }
  .gm .g-box.g-bad { background: #FF453A0F; border-color: #FF453A33; align-items: center; } .gm .g-box.g-bad svg { color: #FF453A; }
  .gm .g-box .g-col { gap: 3px; } .gm .g-box .g-p { font-size: 11.5px; color: #F5F5F7; } .gm .g-box .g-n { font-size: 11px; color: #6B6B73; line-height: 1.2; }
  .gm .g-box .g-head { font-size: 12.5px; font-weight: 600; color: #F5F5F7; } .gm .g-box .g-hs { font-size: 11px; }
  .gm .g-box.g-amber .g-hs { color: #FFE680; } .gm .g-box.g-ok .g-hs { color: #9BF0AA; } .gm .g-box.g-bad .g-hs { color: #FF9A93; }
  .gm .g-rule { gap: 8px; font-size: 12px; color: #F5F5F7; white-space: nowrap; min-width: 0; } .gm .g-rule svg { color: #A1A1A8; }
  .gm .g-rule .g-rest { color: #6B6B73; font-size: 11px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .gm .g-ground { gap: 6px; padding-top: 4px; font-size: 11px; color: #6B6B73; } .gm .g-ground svg { color: #6B6B73; }
  .gm .g-levels { flex: 1 1 auto; min-height: 240px; background: #0F1013; border: 1px solid #FFFFFF12; border-radius: 14px; overflow: hidden; }
  .gm .g-lt { padding: 12px 18px; justify-content: space-between; gap: 10px; flex: 0 0 auto; }
  .gm .g-lt > .g-row { gap: 10px; min-width: 0; } .gm .g-lt h3 { font-size: 14px; font-weight: 600; }
  .gm .g-lt .g-count { gap: 18px; } .gm .g-lt .g-count .g-row { gap: 5px; align-items: flex-end; }
  .gm .g-lt .g-count b { font-size: 13px; font-weight: 600; } .gm .g-lt .g-count span { font-size: 11px; color: #6B6B73; }
  .gm .g-lrow { display: flex; align-items: center; padding: 11px 18px; gap: 16px; border-bottom: 1px solid #FFFFFF12; }
  .gm .g-lrow.g-alt { background: #FFFFFF05; }
  .gm .g-lrow.g-cols { padding: 8px 18px; background: #FFFFFF05; border-top: 1px solid #FFFFFF12; flex: 0 0 auto; }
  .gm .g-lrow.g-cols .g-cell { flex-direction: column; align-items: flex-start; gap: 2px; }
  .gm .g-lrow.g-cols .g-n { font-size: 10px; font-weight: 600; letter-spacing: 1px; color: #6B6B73; text-transform: uppercase; }
  .gm .g-lrow.g-cols .g-s { font-size: 10px; color: #6B6B73; } .gm .g-lrow.g-cols .g-s.g-blue { color: #6CB4FF; font-family: inherit; }
  .gm .g-lrows { flex: 1 1 0; min-height: 120px; overflow-y: auto; }
  .gm .g-cell { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; min-width: 0; font-size: 12px; color: #A1A1A8; }
  .gm .g-cell.g-ex { font-size: 11px; color: #6B6B73; } .gm .g-cell.g-typed { color: #F5F5F7; }
  .gm .g-cell.g-changed { gap: 6px; color: #FFC56B; } .gm .g-cell.g-changed svg { color: #FF9F0A; } .gm .g-cell.g-none { color: #6B6B73; }
  .gm .g-cell.g-expected { flex: 1 1 0; gap: 10px; } .gm .g-cell.g-expected .g-why { font-size: 11px; color: #6B6B73; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; }
  .gm .g-situ { padding: 14px 18px; gap: 12px; border-top: 1px solid #FFFFFF12; flex: 0 0 auto; }
  .gm .g-situ .g-hd { justify-content: space-between; } .gm .g-situ .g-hd .g-note { font-size: 11px; color: #6B6B73; }
  .gm .g-dims { gap: 6px; } .gm .g-dim { gap: 12px; border-bottom: 1px solid #FFFFFF12; min-height: 16px; }
  .gm .g-dim .g-dh { width: 180px; flex: 0 0 180px; gap: 6px; } .gm .g-dim .g-dh b { font-size: 12px; font-weight: 600; }
  .gm .g-dim .g-dh span { font-size: 10.5px; color: #6B6B73; } .gm .g-dim .g-vals { gap: 4px; flex-wrap: wrap; }
  .gm .g-ck { padding: 9px 0; gap: 10px; border-bottom: 1px solid #FFFFFF12; align-items: flex-start; }
  .gm .g-ck:last-child { border-bottom: 0; }
  .gm .g-ck .g-msg { font-size: 12px; color: #A1A1A8; } .gm .g-ck .g-det { font-size: 10.5px; color: #6B6B73; margin-top: 2px; }
  .gm .g-ck .g-code { font-size: 10px; color: #6B6B73; } .gm .g-ck.g-fail .g-msg { color: #F5F5F7; font-weight: 600; }
  .gm .g-ck.g-fail .g-det { color: #FF9A93; font-family: inherit; } .gm .g-ck.g-fail .g-code { color: #FF9A93; }
  .gm .g-ck.g-ok svg { color: #32D74B; } .gm .g-ck.g-fail svg { color: #FF453A; }
  .gm .g-play { flex: 1 1 auto; }
  .gm .g-play .g-txt { font-size: 11.5px; color: #6B6B73; line-height: 1.45; }
  .gm .g-divider { height: 1px; background: #FFFFFF12; flex: 0 0 1px; }
  .gm .g-refhead { justify-content: space-between; } .gm .g-refhead .g-seed { font-size: 10.5px; color: #6B6B73; }
  .gm .g-big { font-size: 34px; font-weight: 700; letter-spacing: -1px; line-height: 1.2; color: #F5F5F7; }
  .gm .g-statrow { gap: 14px; align-items: flex-end; }
  .gm .g-statd { gap: 7px; padding-bottom: 7px; flex: 1 1 0; min-width: 0; }
  .gm .g-pbar { height: 6px; gap: 2px; border-radius: 3px; overflow: hidden; display: flex; }
  .gm .g-pbar i { display: block; height: 6px; }
  .gm .g-legend { gap: 12px; font-size: 11px; color: #A1A1A8; } .gm .g-legend .g-row { gap: 5px; }
  .gm .g-legend .g-d6 { width: 6px; height: 6px; border-radius: 50%; } .gm .g-legend .g-tot { color: #6B6B73; }
  .gm .g-learned { background: #FFFFFF05; border: 1px solid #FFFFFF12; border-radius: 10px; padding: 10px 12px; gap: 8px; }
  .gm .g-learned .g-hd { justify-content: space-between; font-size: 11px; color: #6B6B73; } .gm .g-learned .g-hd b { font-size: 11.5px; font-weight: 600; color: #F5F5F7; }
  .gm .g-learned .g-top { gap: 10px; } .gm .g-learned .g-top .g-r { font-size: 12px; color: #A1A1A8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  .gm .g-track { flex: 1 1 0; height: 4px; background: #1E1F24; border-radius: 2px; min-width: 40px; } .gm .g-track i { display: block; height: 4px; background: #32D74B; border-radius: 2px; }
  .gm .g-learned .g-top .g-n { font-size: 11px; color: #F5F5F7; }
  .gm .g-spacer { flex: 1 1 auto; }
  .gm .g-btn.g-wide { justify-content: center; width: 100%; padding: 8px 12px; }
  .gm .g-btn.g-wide .g-arrow { color: #6B6B73; }
  .gm .g-empty-g { color: #6B6B73; font-size: 12px; }`

export const html = `  <section class="screen" id="screen-games">
    <div class="gm" id="games"></div>
  </section>
`

export const js = `  // ── games ───────────────────────────────────────────────────────────
  // The designer's view of a game, laid out as designs/dep-console-game.pen.
  // What a level expects is shown here, to the person writing the game, and
  // never handed to the player.

  var DOT = ' ' + String.fromCharCode(183) + ' ';
  var MINUS = String.fromCharCode(8722);
  var TICK = String.fromCharCode(96);
  var OPTION_TONE = ['c-blue', 'c-green', 'c-purple', 'c-gray', 'c-orange', 'c-pink'];
  var TYPE_DOT = { tutorial: '#32D74B', 'how-to': '#FF9F0A', reference: '#64D2FF', explanation: '#BF5AF2', 'decision-record': '#FF6482' };
  var LIFE_TONE = { FRESH: 'c-green', AGING: 'c-yellow', STALE: 'c-red' };
  var DIM_WIDTH = { type: 130, lifecycle: 96, deps: 110, confidence: 90 };
  var CHECK_TEXT = {
    SCORER: ['The scenarios are the only judge', 'The scorer is not the scenarios'],
    JUDGE_GROUND: ['The player can' + String.fromCharCode(39) + 't write where it is judged', 'The player could write where it is judged'],
    ARENA_MISSING: ['The arena can be found', 'The arena is missing'],
    SITUATION: ['Every situation dimension can be read', 'A situation dimension cannot be read'],
    OPTIONS: ['Every option can be learned', 'An option cannot be learned'],
    JUDGE: ['The judge' + String.fromCharCode(39) + 's steps are written', 'Judge steps missing']
  };

  /** Every class on this screen is prefixed, so the rest of the page's styles never reach it. */
  function ge(tag, cls, text) {
    return el(tag, cls ? cls.split(' ').filter(function (c) { return c; }).map(function (c) { return 'g-' + c; }).join(' ') : cls, text);
  }

  function h(tag, cls, kids) {
    var node = ge(tag, cls);
    (kids || []).forEach(function (k) {
      if (k === null || k === undefined || k === false) return;
      node.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
    });
    return node;
  }

  function chip(text, tone) { return ge('span', 'chip ' + tone, text); }
  function optionChip(game, option) {
    var i = game.options.indexOf(option);
    return chip(option, i < 0 ? 'c-gray' : OPTION_TONE[i % OPTION_TONE.length]);
  }
  function btn(cls, iconName, label, onclick) {
    var b = h('button', 'btn ' + cls, [iconName ? icon(iconName, 13) : null, label]);
    if (onclick) b.onclick = onclick;
    return b;
  }
  function titleRow(title, sub, right) {
    return h('div', 'row title', [h('div', 'row', [ge('h3', null, title), sub ? ge('span', 'sub', sub) : null]), right ? h('div', 'row acts', right) : null]);
  }

  /** Whether the text has the word, not only the letters: "unchanged" does not have "changed". */
  function hasWord(text, word) {
    var t = text.toLowerCase(), w = String(word).toLowerCase(), at = t.indexOf(w);
    while (at >= 0) {
      var before = at ? t.charAt(at - 1) : ' ', after = t.charAt(at + w.length) || ' ';
      if (!/[a-z0-9]/.test(before) && !/[a-z0-9-]/.test(after)) return true;
      at = t.indexOf(w, at + 1);
    }
    return false;
  }

  /** The policy line that explains a level's expected choice: one naming the choice and the situation, else one naming the choice. */
  function whyOf(game, level) {
    var named = game.policy.filter(function (p) { return p.then.indexOf(TICK + level.expected + TICK) >= 0; });
    var values = Object.keys(level.situation).map(function (d) { return level.situation[d]; });
    for (var i = 0; i < named.length; i++) {
      if (values.some(function (v) { return hasWord(named[i].when, v); })) return named[i].when;
    }
    return named.length ? named[named.length - 1].when : '';
  }

  function arenaParts(game) {
    var a = game.arena || '';
    var cut = a.lastIndexOf('/');
    return { base: cut >= 0 ? a.slice(cut + 1) : a, dir: cut >= 0 ? a.slice(0, cut) : '' };
  }
  function inArena(game, path) {
    var a = game.arena || '', base = arenaParts(game).base;
    return a && path.indexOf(a) === 0 ? base + path.slice(a.length) : path;
  }

  function post(path, body) {
    return fetch(path, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body)
    }).then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); });
  }

  function selectedGame() {
    var list = (state.games && state.games.games) || [];
    for (var i = 0; i < list.length; i++) if (list[i].document === state.selectedGame) return list[i];
    return list[0] || null;
  }

  function loadLevels(game) {
    if (!game || !game.id || state.levels[game.document]) return;
    state.levels[game.document] = 'loading';
    get('/api/games/levels?document=' + encodeURIComponent(game.document)).then(function (r) {
      state.levels[game.document] = r.levels;
      renderGames();
    }).catch(function (err) { state.levels[game.document] = String(err.message || err); renderGames(); });
  }

  function checkGames() {
    return get('/api/games').then(function (g) { state.games = g; state.checkedAt = Date.now(); state.levels = {}; renderGames(); });
  }

  function gameBar(game, list) {
    var bar = h('div', 'row bar', [h('div', 'col bar-head', [ge('div', 'cap', 'Games'), ge('div', 'src m', 'reference docs' + DOT + 'game: block')])]);
    list.forEach(function (g) {
      var loads = !!g.id;
      var last = g.days.length ? g.days[g.days.length - 1] : null;
      var dot = ge('i', 'dot'); dot.style.background = g.playable ? '#32D74B' : '#FFD60A';
      var tone = g.playable ? 'c-green' : loads ? 'c-yellow' : 'c-red';
      var path = ge('div', 'path m', g.document);
      path.title = 'Read the game document';
      path.onclick = function (e) { e.stopPropagation(); openReader(g.document); };
      var meta = g.levels + ' levels' + DOT + (!loads ? 'does not load' : !g.playable ? 'judge steps not written'
        : last ? 'day ' + (last.day + 1) + ' at ' + last.passRate.toFixed(2) : 'never played');
      var card = h('div', 'col card' + (g.document === game.document ? ' on' : ''), [
        h('div', 'row name', [dot, ge('span', 'id m', g.id || g.document), ge('span', 'stat ' + tone, g.playable ? 'VALID' : loads ? 'DRAFT' : 'INVALID')]),
        path,
        ge('div', 'meta' + (g.playable ? '' : ' warn'), meta)
      ]);
      card.onclick = function () { state.selectedGame = g.document; state.editing = false; state.gameNote = null; renderGames(); };
      bar.appendChild(card);
    });
    bar.appendChild(btn('ghost', 'plus', 'New game', function () {
      state.gameNote = { bad: false, text: 'A game is a reference document with a game: block. Copy ' + game.document + ', give it a new id and arena, then write its judge.' };
      renderGames();
    }));
    bar.appendChild(ge('div', 'fill'));
    bar.appendChild(btn('', 'list-tree', 'Preview levels', function () {
      var rows = byId('gm-rows');
      if (rows) { rows.scrollTop = 0; rows.parentNode.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }
    }));
    bar.appendChild(btn('check', 'shield-check', 'Check', function () { state.gameNote = null; checkGames().catch(function () {}); }));
    if (game.playable) {
      bar.appendChild(btn('go', 'play', state.playing ? 'Playing' : 'Play a day', function () {
        if (state.playing) return;
        state.playing = true; renderGames();
        post('/api/games/play', { document: game.document }).then(function (answer) {
          state.playing = false;
          state.gameNote = answer.ok ? null : { bad: true, text: answer.data.error || 'refused' };
          return checkGames().then(function () { return refresh(false); });
        }).catch(function () { state.playing = false; renderGames(); });
      }));
    } else {
      var locked = btn('locked', 'lock', 'Play a day');
      locked.appendChild(ge('span', 'why', game.id ? 'needs judge' : 'does not load'));
      locked.title = game.why || '';
      bar.appendChild(locked);
    }
    return bar;
  }

  function rulesPanel(game) {
    var right = [];
    if (game.id && !state.editing) right.push(btn('small', 'pencil', 'Edit', function () { state.editing = true; state.gameNote = null; renderGames(); }));
    var panel = h('div', 'col panel fill', [titleRow('Rules', 'what the game: block declares', right)]);
    function kv(k, kids) { panel.appendChild(h('div', 'row kv', [ge('span', 'k', k), h('div', 'row v', kids)])); }
    var arena = arenaParts(game);
    kv('id', [ge('span', 'val m', game.id || '-')]);
    kv('arena', [ge('span', 'val m', arena.base || '-'), arena.dir ? ge('span', 'note m', arena.dir) : null]);
    var optionsInput = null, levelsInput = null;
    if (state.editing) {
      levelsInput = ge('input'); levelsInput.value = game.levelsExpression;
      optionsInput = ge('input'); optionsInput.value = game.options.join(', ');
      kv('levels', [levelsInput]);
      kv('options', [optionsInput]);
    } else {
      kv('levels', [ge('span', 'val lit m', '"' + game.levelsExpression + '"'), game.levelsIndependent ? ge('span', 'note', String.fromCharCode(183) + ' independent') : null]);
      kv('options', game.options.map(function (o) { return optionChip(game, o); }));
    }
    if (game.scoring) {
      var n = function (x) { return x < 0 ? MINUS + Math.abs(x) : '+' + x; };
      kv('scoring', [ge('span', 'val m', 'suite'), ge('span', 'note', String.fromCharCode(183)),
        chip('pass ' + n(game.scoring.pass), 'c-green'), chip('fail ' + n(game.scoring.fail), 'c-red'), chip('regression ' + n(game.scoring.regression), 'c-red2')]);
    }
    kv('may write', [ge('span', 'val m', game.mayWrite.map(function (p) { return inArena(game, p); }).join(', ') || 'nothing'), game.mayWrite.length ? ge('span', 'note', 'and nothing else') : null]);
    if (state.editing) {
      panel.appendChild(h('div', 'row', [
        btn('check', 'shield-check', 'Save if it still checks', function () {
          var options = optionsInput.value.split(',').map(function (o) { return o.trim(); }).filter(function (o) { return o; });
          post('/api/games/rules', { document: game.document, options: options, levels: levelsInput.value.trim() }).then(function (answer) {
            if (!answer.ok) { state.gameNote = { bad: true, text: 'Not saved: ' + (answer.data.error || 'refused') }; renderGames(); return; }
            state.editing = false;
            state.gameNote = { bad: false, text: 'Saved. The game still passes the loader' + String.fromCharCode(39) + 's checks.' };
            return checkGames();
          }).catch(function () {});
        }),
        ge('span', 'fill'),
        btn('small', null, 'Cancel', function () { state.editing = false; state.gameNote = null; renderGames(); })
      ]));
    }
    if (state.gameNote) panel.appendChild(ge('div', 'said ' + (state.gameNote.bad ? 'no' : 'ok'), state.gameNote.text));
    return panel;
  }

  function judgePanel(game) {
    var written = game.judge.length > 0;
    var panel = h('div', 'col panel judge', [titleRow('Judge', 'Cucumber is the only judge', [ge('span', 'stat ' + (written ? 'c-green' : 'c-red'), written ? 'WRITTEN' : 'NOT WRITTEN')])]);
    var files = written ? game.judge.map(function (f) { return ge('div', 'p m', inArena(game, f)); }) : [ge('div', 'p m', arenaParts(game).base + '/steps/')];
    panel.appendChild(h('div', 'row box ' + (written ? 'green' : 'red'), [icon(written ? 'file-check' : 'file-x', 16),
      h('div', 'col fill', files.concat([ge('div', 'n', written ? 'Code ' + String.fromCharCode(8212) + ' written and reviewed in the repo, not in the console.'
        : 'Nothing here yet. Code ' + String.fromCharCode(8212) + ' written and reviewed in the repo, not in the console.')]))]));
    if (game.policy.length) {
      panel.appendChild(ge('div', 'cap', 'Policy it must encode'));
      game.policy.forEach(function (p) {
        var parts = p.then.split(TICK);
        var row = h('div', 'row rule', [icon('corner-down-right', 12), ge('span', null, p.when)]);
        parts.forEach(function (part, i) {
          var t = part.replace(/^[ ,;:]+|[ ,;:]+$/g, '');
          if (!t) return;
          row.appendChild(i % 2 ? optionChip(game, t) : ge('span', 'rest', t));
        });
        panel.appendChild(row);
      });
    }
    panel.appendChild(h('div', 'row ground', [icon('lock', 11), 'never writable', chip('arena/features/', 'c-path'), chip('arena/steps/', 'c-path')]));
    return panel;
  }

  function cellFor(dim, value) {
    var w = DIM_WIDTH[dim] || 110, c;
    var v = value === undefined ? '-' : String(value);
    if (TYPE_DOT[v]) {
      var d = ge('i', 'dot'); d.style.background = TYPE_DOT[v];
      c = h('div', 'cell typed', [d, ge('span', 'm', v)]);
    } else if (LIFE_TONE[v]) c = h('div', 'cell', [ge('span', 'stat ' + LIFE_TONE[v], v)]);
    else if (v === 'changed') c = h('div', 'cell changed', [icon('git-compare-arrows', 12), v]);
    else if (v === 'none' || v === '-') c = h('div', 'cell none', [v]);
    else c = h('div', 'cell', [v]);
    c.style.width = w + 'px';
    return c;
  }

  function levelsPanel(game) {
    var levels = state.levels[game.document];
    var ready = Array.isArray(levels);
    var dims = Object.keys(game.situation);
    var combos = {}, domains = {};
    dims.forEach(function (d) { domains[d] = {}; });
    if (ready) levels.forEach(function (l) {
      combos[dims.map(function (d) { return l.situation[d]; }).join('|')] = true;
      dims.forEach(function (d) { domains[d][l.situation[d]] = true; });
    });
    var space = dims.reduce(function (n, d) { return n * Math.max(1, Object.keys(domains[d]).length); }, 1);
    var covered = Object.keys(combos).length;

    var panel = h('div', 'col levels', [h('div', 'row lt', [
      h('div', 'row', [ge('h3', null, 'Levels'), ge('span', 'sub', ready && levels.length ? 'Scenario Outline' + DOT + '"' + levels[0].name + '"' : '')]),
      ready ? h('div', 'row count', [h('div', 'row', [ge('b', null, levels.length), ge('span', null, 'levels')]),
        h('div', 'row', [ge('b', null, covered + ' / ' + space), ge('span', null, 'situations covered')])]) : null
    ])]);
    panel.id = 'gm-levels';

    var cols = h('div', 'lrow cols', [h('div', 'cell', [ge('span', 'n', '#')])]);
    cols.firstChild.style.width = '44px';
    dims.forEach(function (d) {
      var c = h('div', 'cell', [ge('span', 'n', d), ge('span', 's m', game.situation[d])]);
      c.style.width = (DIM_WIDTH[d] || 110) + 'px';
      cols.appendChild(c);
    });
    cols.appendChild(h('div', 'cell expected', [ge('span', 'n', 'expected'), ge('span', 's blue', 'the judge decides')]));
    panel.appendChild(cols);

    var rows = ge('div', 'lrows'); rows.id = 'gm-rows';
    if (!game.id) rows.appendChild(h('div', 'lrow', [ge('span', 'empty-g', 'The game does not load, so its levels cannot be read.')]));
    else if (!ready) rows.appendChild(h('div', 'lrow', [ge('span', 'empty-g', typeof levels === 'string' && levels !== 'loading' ? levels : 'Reading levels.')]));
    else levels.forEach(function (l, i) {
      var r = h('div', 'lrow' + (i % 2 ? '' : ' alt'), [h('div', 'cell ex m', ['ex ' + (i + 1)])]);
      r.firstChild.style.width = '44px';
      dims.forEach(function (d) { r.appendChild(cellFor(d, l.situation[d])); });
      r.appendChild(h('div', 'cell expected', [l.expected ? optionChip(game, l.expected) : chip('?', 'c-gray'), ge('span', 'why', whyOf(game, l))]));
      rows.appendChild(r);
    });
    panel.appendChild(rows);

    if (ready) {
      var sizes = dims.map(function (d) { return Object.keys(domains[d]).length; });
      var situ = h('div', 'col situ', [h('div', 'row hd', [ge('span', 'cap', 'How a level' + String.fromCharCode(39) + 's situation is read'),
        ge('span', 'note', sizes.join(' ' + String.fromCharCode(215) + ' ') + ' = ' + space + ' situations' + DOT + covered + ' have a level')])]);
      var list = ge('div', 'col dims');
      dims.forEach(function (d) {
        list.appendChild(h('div', 'row dim', [h('div', 'row dh', [ge('b', null, d), ge('span', 'm', game.situation[d])]),
          h('div', 'row vals', Object.keys(domains[d]).map(function (v) { return chip(v, 'c-val'); }))]));
      });
      situ.appendChild(list);
      panel.appendChild(situ);
    }
    return panel;
  }

  function checkDetail(game, code) {
    var dims = Object.keys(game.situation);
    var rows = dims.every(function (d) { return game.situation[d].indexOf('row:') === 0; });
    return {
      SCORER: 'scoring.authority: suite',
      JUDGE_GROUND: 'may write: ' + game.mayWrite.map(function (p) { return inArena(game, p); }).join(', '),
      ARENA_MISSING: arenaParts(game).base + '/features/ exists',
      SITUATION: dims.length + ' of ' + dims.length + (rows ? DOT + 'row:<column>' : ''),
      OPTIONS: game.options.join(DOT),
      JUDGE: game.judge.length + ' step file' + (game.judge.length === 1 ? '' : 's') + ' in ' + arenaParts(game).base + '/steps/'
    }[code] || '';
  }

  function checkPanel(game) {
    var failing = game.checks.filter(function (c) { return !c.passed; });
    var clear = game.checks.length - failing.length;
    var ago = state.checkedAt ? Math.round((Date.now() - state.checkedAt) / 1000) : 0;
    var panel = h('div', 'col panel', [titleRow('Check', 'the game loader' + String.fromCharCode(39) + 's verdict', [ge('span', 'sub', ago < 5 ? 'checked just now' : 'checked ' + ago + 's ago')])]);
    var tone = !failing.length ? 'ok' : game.id ? 'amber' : 'bad';
    panel.appendChild(h('div', 'row box ' + tone, [icon(tone === 'ok' ? 'circle-check' : tone === 'amber' ? 'circle-alert' : 'circle-x', 16), h('div', 'col fill', [
      ge('div', 'head', tone === 'ok' ? 'Valid and playable' : tone === 'amber' ? 'Valid, but not playable yet' : 'The game does not load'),
      ge('div', 'hs', clear + ' checks clear' + (failing.length ? DOT + failing.length + ' block' + (failing.length === 1 ? 's' : '') + ' play' : ''))
    ])]));
    var list = ge('div', 'col');
    game.checks.forEach(function (c) {
      var text = CHECK_TEXT[c.code] || [c.code, c.code];
      list.appendChild(h('div', 'row ck ' + (c.passed ? 'ok' : 'fail'), [icon(c.passed ? 'circle-check' : 'circle-x', 14),
        h('div', 'col fill', [ge('div', 'msg', c.passed ? text[0] : text[1]), ge('div', 'det m', c.passed ? checkDetail(game, c.code) : c.message || '')]),
        ge('span', 'code m', c.code)]));
    });
    panel.appendChild(list);
    return panel;
  }

  function playPanel(game) {
    var days = game.days, last = days.length ? days[days.length - 1] : null;
    var panel = h('div', 'col panel play', [titleRow('Play a day', game.perDay + ' levels, by rule',
      [ge('span', 'stat ' + (game.playable ? 'c-green' : 'c-quiet'), game.playable ? 'READY' : 'BLOCKED')])]);
    panel.appendChild(ge('div', 'txt', 'No model is called unless loop.models allows it. ' + (game.playable
      ? 'Each day carries on from the last; Play a day is in the bar above.'
      : game.id ? 'Write and review the judge steps, then Check again.' : 'Fix what the check reports, then Check again.')));
    panel.appendChild(ge('div', 'divider'));
    panel.appendChild(h('div', 'row refhead', [h('span', 'cap', ['Last day' + DOT, ge('span', 'as-is', game.id || game.document)]), last ? ge('span', 'seed m', 'seed 1' + DOT + 'day ' + (last.day + 1)) : null]));
    if (!last) panel.appendChild(ge('div', 'txt', 'Never played.'));
    else {
      var total = last.passed + last.failed + last.void;
      var bar = ge('div', 'pbar');
      [['passed', '#32D74B'], ['failed', '#FF453A'], ['void', '#FFFFFF33']].forEach(function (k) {
        if (!last[k[0]]) return;
        var i = ge('i'); i.style.cssText = 'flex:' + last[k[0]] + ' 1 0;background:' + k[1]; bar.appendChild(i);
      });
      var legend = h('div', 'row legend', [['passed', '#32D74B'], ['failed', '#FF453A'], ['void', '#FFFFFF33']].map(function (k) {
        var d = ge('i', 'd6'); d.style.background = k[1];
        return h('div', 'row', [d, last[k[0]] + ' ' + k[0]]);
      }).concat([ge('span', 'tot', 'of ' + total)]));
      panel.appendChild(h('div', 'row statrow', [ge('div', 'big', last.passRate.toFixed(2)), h('div', 'col statd', [bar, legend])]));
    }
    var lr = state.learned && state.learned.game === game.id ? state.learned : null;
    if (lr) {
      var top = lr.advice[0];
      var box = h('div', 'col learned', [h('div', 'row hd', [ge('span', null, 'learned'), ge('b', null, lr.totals.rules + ' rules' + DOT + lr.totals.habits + ' habits')])]);
      if (top) {
        var held = ge('div', 'track'), fillBar = ge('i');
        fillBar.style.width = (top.acted ? top.passed / top.acted * 100 : 0) + '%'; held.appendChild(fillBar);
        box.appendChild(h('div', 'row top', [ge('span', 'r', top.situation + ': choose'), optionChip(game, top.claim.replace('choose ', '')), held, ge('span', 'n m', top.passed + '/' + top.acted)]));
      }
      panel.appendChild(box);
    }
    panel.appendChild(ge('div', 'spacer'));
    var open = btn('wide', 'book-open', 'Open what it learned', function () { showScreen('loop'); });
    var arrow = icon('arrow-up-right', 12); arrow.setAttribute('class', 'g-arrow'); open.appendChild(arrow);
    if (!lr) { open.disabled = true; open.className = 'g-btn g-wide g-locked'; }
    panel.appendChild(open);
    return panel;
  }

  function renderGames() {
    var pane = clear(byId('games'));
    var list = (state.games && state.games.games) || [];
    if (!list.length) {
      pane.appendChild(ge('div', 'empty-g', 'No document in this project has a game: block. A game is a reference document whose frontmatter declares one.'));
      return;
    }
    var game = selectedGame();
    state.selectedGame = game.document;
    loadLevels(game);
    pane.appendChild(gameBar(game, list));
    pane.appendChild(h('div', 'row main', [
      h('div', 'col left', [h('div', 'row design', [rulesPanel(game), judgePanel(game)]), levelsPanel(game)]),
      h('div', 'col right', [checkPanel(game), playPanel(game)])
    ]));
  }


`

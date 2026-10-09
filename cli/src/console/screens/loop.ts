/**
 * The console's Loop screen: its markup, styles and script, joined into
 * the one page by ../page.ts. Like that page, free of backticks and
 * backslashes: these are template literals served as they are.
 *
 * Laid out as the "Console — Loop" frame of designs/dep-console-game.pen.
 */
export const css = `  /* loop: every value is from the Loop frame of designs/dep-console-game.pen */
  #screen-loop .lp-body { flex: 1; min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 18px; padding: 24px 32px; overflow: auto;
        font-family: var(--ui); line-height: normal; color: var(--ink); background: var(--bg); }
  #screen-loop .lp-m { font-family: var(--mono); }
  #screen-loop .lp-row { display: flex; align-items: center; }
  #screen-loop .lp-col { display: flex; flex-direction: column; }
  #screen-loop .lp-fill { flex: 1 1 0; min-width: 0; }
  #screen-loop .lp-cap { font-size: 10px; font-weight: 600; letter-spacing: 1.2px; color: var(--dimmer); text-transform: uppercase; }
  #screen-loop .lp-dim { color: var(--dimmer); } #screen-loop .lp-soft { color: var(--dim); }
  #screen-loop .lp-panel { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; min-width: 0; }
  #screen-loop .lp-pad { padding: 16px 20px; }
  #screen-loop .lp-title { font-size: 14px; font-weight: 600; color: var(--ink); white-space: nowrap; }
  #screen-loop .lp-sub { font-size: 11px; color: var(--dimmer); }
  #screen-loop .lp-dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; }
  #screen-loop .lp-pulse { background: var(--fresh); box-shadow: 0 0 8px #32D74BAA; }
  #screen-loop .lp-count { padding: 1px 7px; border-radius: 99px; background: var(--surface-3); color: var(--dim); font-size: 10.5px; font-weight: 600; }
  #screen-loop .lp-kind { padding: 1px 6px; border-radius: 4px; font-family: var(--mono); font-size: 10.5px; white-space: nowrap; }
  #screen-loop .lp-k-message { background: #0A84FF1F; color: #6CB4FF; } #screen-loop .lp-k-follow_up_due { background: #FF453A1F; color: #FF9A93; }
  #screen-loop .lp-k-task { background: #FF9F0A1F; color: #FFC266; } #screen-loop .lp-k-watched_change { background: #64D2FF1A; color: #9BE3FF; }
  #screen-loop .lp-k-review_due { background: #FFD60A1A; color: #FFE680; } #screen-loop .lp-k-other { background: #FFFFFF12; color: var(--dim); }
  #screen-loop .lp-track { height: 4px; border-radius: 2px; background: var(--surface-3); overflow: hidden; }
  #screen-loop .lp-track i { display: block; height: 4px; border-radius: 2px; }

  #screen-loop .lp-settings { padding: 14px 20px; flex: 0 0 auto; }
  #screen-loop .lp-settings .lp-head { gap: 4px; padding-right: 20px; }
  #screen-loop .lp-settings .lp-src { font-family: var(--mono); font-size: 11px; color: var(--dim); white-space: nowrap; }
  #screen-loop .lp-part { flex: 1 1 0; min-width: 0; gap: 4px; padding: 0 16px; border-left: 1px solid var(--line); }
  #screen-loop .lp-part .lp-p { font-size: 11px; color: var(--dimmer); white-space: nowrap; }
  #screen-loop .lp-part .lp-v { gap: 7px; font-size: 12.5px; font-weight: 600; color: var(--ink); white-space: nowrap; }
  #screen-loop .lp-part .lp-v.lp-off { color: var(--dim); }
  #screen-loop .lp-part .lp-w { font-size: 10.5px; color: var(--dimmer); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  #screen-loop .lp-part .lp-w.lp-set { color: #6CB4FF; }
  #screen-loop .lp-kill { width: 210px; flex: 0 0 210px; padding-left: 16px; border-left: 1px solid var(--line); font-size: 10.5px; line-height: 1.4; color: var(--dimmer); }

  #screen-loop .lp-main { flex: 1 0 auto; gap: 18px; align-items: stretch; }
  #screen-loop .lp-left { flex: 1 1 0; min-width: 0; gap: 18px; }
  #screen-loop .lp-right { flex: 0 0 470px; width: 470px; gap: 18px; }
  #screen-loop .lp-bottom { flex: 1 1 auto; gap: 18px; align-items: stretch; }
  #screen-loop .lp-stack { flex: 1 1 0; min-width: 0; gap: 18px; }

  #screen-loop .lp-hb { flex: 0 0 auto; overflow: hidden; }
  #screen-loop .lp-tt { padding: 12px 18px; justify-content: space-between; gap: 10px; }
  #screen-loop .lp-tt > .lp-row { gap: 10px; min-width: 0; }
  #screen-loop .lp-nums { gap: 18px; } #screen-loop .lp-nums .lp-row { gap: 5px; align-items: flex-end; }
  #screen-loop .lp-nums b { font-size: 13px; font-weight: 600; } #screen-loop .lp-nums span { font-size: 11px; color: var(--dimmer); }
  #screen-loop .lp-killpill { gap: 6px; padding: 3px 9px; border-radius: 99px; background: #FFFFFF0A; border: 1px solid var(--line-strong); font-size: 11px; font-weight: 500; color: var(--dim); }
  #screen-loop .lp-killpill svg { color: var(--dimmer); }
  #screen-loop .lp-killpill.lp-on { background: #FF453A1F; border-color: #FF453A55; color: #FF9A93; } #screen-loop .lp-killpill.lp-on svg { color: #FF9A93; }
  #screen-loop .lp-tr { gap: 16px; padding: 9px 18px; border-bottom: 1px solid var(--line); }
  #screen-loop .lp-tr:last-child { border-bottom: 0; } #screen-loop .lp-tr.lp-alt { background: #FFFFFF05; }
  #screen-loop .lp-tr.lp-cols { padding: 7px 18px; background: #FFFFFF05; border-top: 1px solid var(--line); }
  #screen-loop .lp-tr.lp-cols span { font-size: 10px; font-weight: 600; letter-spacing: 1px; color: var(--dimmer); text-transform: uppercase; }
  #screen-loop .lp-c-owner { width: 150px; flex: 0 0 150px; gap: 8px; font-family: var(--mono); font-size: 12px; color: var(--ink); }
  #screen-loop .lp-c-last { width: 80px; flex: 0 0 80px; font-family: var(--mono); font-size: 11.5px; color: var(--dim); }
  #screen-loop .lp-c-int { width: 70px; flex: 0 0 70px; font-size: 11.5px; color: var(--dim); white-space: nowrap; }
  #screen-loop .lp-c-next { flex: 1 1 0; min-width: 0; gap: 10px; font-family: var(--mono); font-size: 11.5px; color: var(--ink); }
  #screen-loop .lp-c-next .lp-track { flex: 1 1 0; }
  #screen-loop .lp-c-woke { width: 70px; flex: 0 0 70px; font-size: 11.5px; color: var(--dimmer); }
  #screen-loop .lp-yes { padding: 1px 7px; border-radius: 4px; background: #32D74B1F; color: #9BF0AA; font-size: 10px; font-weight: 700; }
  #screen-loop .lp-c-sig { width: 170px; flex: 0 0 170px; gap: 6px; font-size: 12px; color: var(--dimmer); }
  #screen-loop .lp-c-sig b { font-weight: 600; color: var(--ink); }

  #screen-loop .lp-list-head { justify-content: space-between; padding-bottom: 6px; gap: 8px; }
  #screen-loop .lp-list-head > .lp-row { gap: 8px; }
  #screen-loop .lp-signals { flex: 1 1 auto; }
  #screen-loop .lp-sig { gap: 5px; padding: 8px 0; border-bottom: 1px solid var(--line); }
  #screen-loop .lp-sig:last-child { border-bottom: 0; }
  #screen-loop .lp-ring { width: 9px; height: 9px; flex: 0 0 9px; border-radius: 50%; border: 1.5px solid; }
  #screen-loop .lp-path { font-family: var(--mono); font-size: 11.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
  #screen-loop .lp-path .lp-d { color: var(--dimmer); } #screen-loop .lp-path .lp-f { color: var(--ink); }
  #screen-loop .lp-sig .lp-pr { gap: 8px; } #screen-loop .lp-sig .lp-dr { gap: 8px; padding-left: 17px; }
  #screen-loop .lp-why { font-size: 11.5px; line-height: 1.4; color: var(--dim); min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #screen-loop .lp-more { font-size: 11px; color: var(--dimmer); padding-top: 8px; }
  #screen-loop .lp-empty { font-size: 12px; color: var(--dimmer); padding: 8px 0; }

  #screen-loop .lp-wait { flex: 0 0 auto; padding: 12px 20px; gap: 4px; background: linear-gradient(#FF9F0A0D, #FF9F0A0D), var(--panel); border-color: #FF9F0A40; }
  #screen-loop .lp-wait .lp-list-head { padding-bottom: 4px; } #screen-loop .lp-wait .lp-list-head svg { color: #FFC266; }
  #screen-loop .lp-wait .lp-count { background: #FF9F0A26; color: #FFC266; }
  #screen-loop .lp-wr { gap: 12px; padding: 7px 0; border-bottom: 1px solid #FF9F0A26; }
  #screen-loop .lp-wr:last-child { border-bottom: 0; }
  #screen-loop .lp-wr .lp-col { gap: 3px; } #screen-loop .lp-wr .lp-why { font-size: 11px; white-space: normal; }
  #screen-loop .lp-btn { appearance: none; display: inline-flex; align-items: center; gap: 5px; padding: 4px 9px; border-radius: 6px; border: 1px solid var(--line-strong);
                         background: transparent; color: var(--ink); font: inherit; font-size: 11px; font-weight: 500; cursor: pointer; white-space: nowrap; }
  #screen-loop .lp-btn svg { color: var(--dim); } #screen-loop .lp-btn:hover { background: #FFFFFF0D; }
  #screen-loop .lp-btn.lp-go { background: var(--accent); border-color: var(--accent); color: #FFFFFF; } #screen-loop .lp-btn.lp-go svg { color: #FFFFFF; }
  #screen-loop .lp-replyrow { gap: 6px; padding: 0 0 8px; }
  #screen-loop .lp-replyrow input { flex: 1; min-width: 0; background: var(--surface-2); border: 1px solid var(--line-strong); border-radius: 6px; color: var(--ink); font: inherit; font-size: 11.5px; padding: 4px 8px; }
  #screen-loop .lp-said { font-size: 11px; color: #FF9A93; padding-bottom: 6px; }

  #screen-loop .lp-actions { flex: 1 1 auto; }
  #screen-loop .lp-list-head.lp-ah { padding-bottom: 8px; }
  #screen-loop .lp-act { gap: 10px; padding: 9px 0; border-bottom: 1px solid var(--line); align-items: flex-start; }
  #screen-loop .lp-act:last-child { border-bottom: 0; }
  #screen-loop .lp-vi { width: 20px; height: 20px; flex: 0 0 20px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
  #screen-loop .lp-vi.lp-done { background: #32D74B1F; color: #9BF0AA; } #screen-loop .lp-vi.lp-refused { background: #FF453A1F; color: #FF9A93; }
  #screen-loop .lp-vi.lp-escalated { background: #FF9F0A1F; color: #FFC266; } #screen-loop .lp-vi.lp-nothing { background: #FFFFFF12; color: var(--dim); }
  #screen-loop .lp-act .lp-col { gap: 3px; flex: 1 1 0; min-width: 0; }
  #screen-loop .lp-act .lp-top { gap: 8px; } #screen-loop .lp-act .lp-what { flex: 1 1 0; min-width: 0; font-size: 11.5px; font-weight: 500; line-height: 1.3; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #screen-loop .lp-verdict { font-size: 10px; font-weight: 700; letter-spacing: .4px; white-space: nowrap; }
  #screen-loop .lp-verdict.lp-done { color: #9BF0AA; } #screen-loop .lp-verdict.lp-refused { color: #FF9A93; } #screen-loop .lp-verdict.lp-escalated { color: #FFC266; } #screen-loop .lp-verdict.lp-nothing { color: var(--dim); }
  #screen-loop .lp-act .lp-detail { font-size: 11px; line-height: 1.4; color: var(--dimmer); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

  #screen-loop .lp-fu { flex: 0 0 auto; gap: 12px; }
  #screen-loop .lp-caprow { justify-content: space-between; gap: 10px; } #screen-loop .lp-caprow .lp-sub { white-space: nowrap; }
  #screen-loop .lp-fubar { display: flex; gap: 2px; height: 8px; }
  #screen-loop .lp-fubar i { display: block; height: 8px; border-radius: 2px; }
  #screen-loop .lp-fubar.lp-none { background: var(--surface-3); border-radius: 2px; }
  #screen-loop .lp-legend3 { justify-content: space-between; align-items: flex-start; }
  #screen-loop .lp-legend3 .lp-col { gap: 2px; } #screen-loop .lp-legend3 .lp-top { gap: 6px; font-size: 11px; color: var(--dimmer); }
  #screen-loop .lp-sw { width: 8px; height: 8px; flex: 0 0 8px; border-radius: 2px; }
  #screen-loop .lp-legend3 .lp-val { gap: 6px; align-items: flex-end; } #screen-loop .lp-legend3 .lp-val b { font-size: 18px; font-weight: 600; line-height: 22px; }
  #screen-loop .lp-legend3 .lp-val span { font-family: var(--mono); font-size: 11px; color: var(--dim); line-height: 15px; padding-bottom: 2px; }

  #screen-loop .lp-learned { flex: 1 1 auto; gap: 18px; }
  #screen-loop .lp-lh { gap: 3px; } #screen-loop .lp-lh .lp-caprow { align-items: center; }
  #screen-loop .lp-lh .lp-srcline { font-family: var(--mono); font-size: 10.5px; color: var(--dimmer); }
  #screen-loop .lp-fig { gap: 8px; align-items: flex-end; }
  #screen-loop .lp-big { font-size: 34px; font-weight: 600; letter-spacing: -1px; line-height: 41px; color: var(--ink); }
  #screen-loop .lp-of { gap: 1px; padding-bottom: 6px; } #screen-loop .lp-of .lp-l1 { font-size: 12px; color: var(--dim); } #screen-loop .lp-of .lp-l2 { font-size: 11px; color: var(--dimmer); }
  #screen-loop .lp-editfig { flex: 1 1 0; align-items: flex-end; gap: 1px; padding: 0 0 6px 12px; }
  #screen-loop .lp-editfig .lp-row { gap: 5px; } #screen-loop .lp-editfig b { font-size: 14px; font-weight: 600; color: #6CB4FF; } #screen-loop .lp-editfig span { font-size: 11px; color: var(--dimmer); }
  #screen-loop .lp-chart { height: 154px; gap: 6px; align-items: flex-end; flex: 0 0 auto; }
  #screen-loop .lp-day { flex: 1 1 0; min-width: 0; gap: 4px; align-items: center; }
  #screen-loop .lp-bars { width: 100%; gap: 2px; align-items: flex-end; }
  #screen-loop .lp-run { flex: 1 1 0; min-width: 0; gap: 3px; align-items: center; }
  #screen-loop .lp-run b { font-family: var(--mono); font-size: 9px; font-weight: 400; color: var(--dimmer); white-space: nowrap; }
  #screen-loop .lp-run i { display: block; width: 100%; border-radius: 2px; background: #FFFFFF33; }
  #screen-loop .lp-run.lp-last b { color: var(--ink); } #screen-loop .lp-run.lp-last i { background: #FFFFFF8C; }
  #screen-loop .lp-run.lp-edit b { color: #6CB4FF; } #screen-loop .lp-run.lp-edit i { background: var(--accent); }
  #screen-loop .lp-dayn { font-size: 9.5px; color: var(--dimmer); }
  #screen-loop .lp-clegend { gap: 16px; font-size: 10.5px; color: var(--dim); } #screen-loop .lp-clegend .lp-row { gap: 6px; }
  #screen-loop .lp-rules { padding-top: 12px; border-top: 1px solid var(--line); }
  #screen-loop .lp-rule { gap: 10px; padding: 9px 0; }
  #screen-loop .lp-rule .lp-when { flex: 1 1 0; min-width: 0; font-size: 11.5px; line-height: 1.4; color: var(--dim); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  #screen-loop .lp-choose { min-width: 84px; flex: 0 0 auto; gap: 5px; } #screen-loop .lp-choose svg { color: var(--dimmer); }
  #screen-loop .lp-opt { padding: 1px 6px; border-radius: 4px; background: var(--surface-3); color: var(--ink); font-family: var(--mono); font-size: 10.5px; white-space: nowrap; }
  #screen-loop .lp-nm { min-width: 52px; flex: 0 0 auto; text-align: right; font-family: var(--mono); font-size: 11px; color: var(--ink); }
  #screen-loop .lp-rule .lp-track { width: 44px; flex: 0 0 44px; }
  #screen-loop .lp-told { padding: 10px 12px; gap: 4px; border-radius: 10px; background: #0A84FF0F; border: 1px solid #0A84FF33; }
  #screen-loop .lp-told .lp-cap { color: #6CB4FF; } #screen-loop .lp-told .lp-rule { padding: 7px 0; }
  #screen-loop .lp-told .lp-opt { background: #0A84FF26; color: #6CB4FF; }
  #screen-loop .lp-note { gap: 8px; padding-top: 6px; border-top: 1px solid #0A84FF26; font-size: 11.5px; line-height: 1.4; color: var(--ink); align-items: flex-start; }
  #screen-loop .lp-note svg { color: #6CB4FF; margin-top: 2px; }
  #screen-loop .lp-spacer { flex: 1 1 auto; }
  #screen-loop .lp-store { gap: 14px; padding-top: 10px; border-top: 1px solid var(--line); }
  #screen-loop .lp-store .lp-row { gap: 4px; align-items: flex-end; } #screen-loop .lp-store b { font-size: 12px; font-weight: 600; } #screen-loop .lp-store span { font-size: 10.5px; color: var(--dimmer); }
  #screen-loop .lp-offpanel { padding: 22px 24px; gap: 8px; } #screen-loop .lp-offpanel h1 { font-size: 20px; font-weight: 600; }
  #screen-loop .lp-offpanel .lp-m { font-size: 11.5px; color: var(--dim); }`

export const html = `  <section class="screen" id="screen-loop">
    <div class="lp-body" id="loop"></div>
  </section>
`

export const js = `  // ── loop ────────────────────────────────────────────────────────────
  // Laid out as the Loop frame of designs/dep-console-game.pen; every number
  // is the project's own, and a part with nothing to show says so.

  var LP_DOT = ' ' + String.fromCharCode(183) + ' ';
  var LP_RING = { message: '#0A84FF', follow_up_due: '#FF453A', task: '#FF9F0A', watched_change: '#64D2FF', review_due: '#FFD60A' };
  var LP_PRESSING = ['follow_up_due', 'message', 'task', 'watched_change', 'review_due'];

  /** Every class on this screen is prefixed lp-, so the rest of the page's styles never reach it. */
  function lp(tag, cls, text) {
    return el(tag, cls ? cls.split(' ').filter(function (c) { return c; }).map(function (c) { return 'lp-' + c; }).join(' ') : cls, text);
  }
  function lpH(tag, cls, kids) {
    var node = lp(tag, cls);
    (kids || []).forEach(function (k) {
      if (k === null || k === undefined || k === false) return;
      node.appendChild(typeof k === 'string' || typeof k === 'number' ? document.createTextNode(String(k)) : k);
    });
    return node;
  }
  function lpDot(color, cls) { var d = lp('i', 'dot' + (cls ? ' ' + cls : '')); if (color) d.style.background = color; return d; }
  function lpHm(iso) {
    var t = Date.parse(iso);
    if (!t) return '';
    var d = new Date(t);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }
  function lpEvery(ms) {
    if (!ms) return '';
    return 'every ' + (ms >= 3600000 ? Math.round(ms / 3600000) + 'h' : ms >= 60000 ? Math.round(ms / 60000) + 'm' : Math.round(ms / 1000) + 's');
  }
  /** A path as the design shows it: the folder dim, the file bright. */
  function lpPath(path, prefix) {
    var p = String(path || ''), cut = p.lastIndexOf('/') + 1;
    return lpH('span', 'path', [lp('span', 'd', (prefix || '') + p.slice(0, cut)), lp('span', 'f', p.slice(cut))]);
  }
  function lpKind(kind) { return lp('span', 'kind k-' + (LP_RING[kind] ? kind : 'other'), kind); }
  function lpMeter(ratio, color) {
    var t = lp('div', 'track'), f = el('i');
    f.style.width = Math.max(0, Math.min(1, ratio)) * 100 + '%';
    f.style.background = color || (ratio >= 0.8 ? 'var(--fresh)' : ratio >= 0.5 ? 'var(--aging)' : 'var(--stale)');
    t.appendChild(f);
    return t;
  }
  function lpFile(p) { var s = String(p || ''); return s.slice(s.lastIndexOf('/') + 1); }

  function lpSettings(loop) {
    var strip = lpH('div', 'panel settings row', [lpH('div', 'col head', [lp('div', 'cap', 'Loop'), lp('div', 'src', 'dep loop' + LP_DOT + '.docspec loop:')])]);
    (loop.parts || []).forEach(function (part) {
      var off = part.state === 'off';
      var waiting = part.state.indexOf('acts on nothing') >= 0 || part.state === 'wait for review';
      strip.appendChild(lpH('div', 'col part', [
        lp('div', 'p', part.part),
        lpH('div', 'row v' + (off ? ' off' : ''), [lpDot(off ? '#FFFFFF33' : waiting ? 'var(--aging)' : 'var(--fresh)'), part.state]),
        lp('div', 'w' + (part.why === 'set in .docspec' ? ' set' : ''), part.why)
      ]));
    });
    strip.appendChild(lp('div', 'kill', 'Setting DEP_LOOP=off in the environment switches everything off.'));
    return strip;
  }

  function lpHeartbeat(loop, hb) {
    var act = loop.heartbeat && loop.heartbeat.act === 'off' ? 'acts on nothing' : 'acts by ' + ((loop.heartbeat && loop.heartbeat.act) || 'rules');
    var panelEl = lp('div', 'panel hb col');
    if (!hb) {
      panelEl.appendChild(lpH('div', 'row tt', [lpH('div', 'row', [lpDot('#FFFFFF33'), lp('span', 'title', 'Heartbeat'), lp('span', 'sub', 'off in this project')])]));
      return panelEl;
    }
    var kill = lpH('div', 'row killpill' + (hb.killSwitch ? ' on' : ''), [icon('power', 10), hb.killSwitch ? 'kill switch ON' : 'kill switch off']);
    panelEl.appendChild(lpH('div', 'row tt', [
      lpH('div', 'row', [lpDot(null, hb.killSwitch ? '' : 'pulse'), lp('span', 'title', 'Heartbeat'), lp('span', 'sub', 'one beat per owner' + LP_DOT + act)]),
      lpH('div', 'row nums', [
        lpH('div', 'row', [lp('b', null, hb.today.beats), lp('span', null, 'beats today')]),
        lpH('div', 'row', [lp('b', null, hb.today.wakes), lp('span', null, 'woke')]),
        lpH('div', 'row', [lp('b', null, hb.today.wakeRatio.toFixed(2)), lp('span', null, 'wake ratio')]),
        kill
      ])
    ]));
    var cols = lp('div', 'row tr cols');
    [['c-owner', 'Owner'], ['c-last', 'Last beat'], ['c-int', 'Interval'], ['c-next', 'Next beat'], ['c-woke', 'Woke'], ['c-sig', 'Signals now']].forEach(function (c) {
      cols.appendChild(lpH('div', 'row ' + c[0], [el('span', null, c[1])]));
    });
    panelEl.appendChild(cols);
    if (!hb.owners.length) panelEl.appendChild(lpH('div', 'row tr', [lp('span', 'empty', 'No document names an owner with a heart: block yet.')]));
    var now = Date.now();
    hb.owners.forEach(function (o, i) {
      var last = Date.parse(o.lastBeat || ''), next = Date.parse(o.nextBeat || '');
      var elapsed = last && next && next > last ? (now - last) / (next - last) : 0;
      var kinds = {};
      o.signals.forEach(function (s) { kinds[s.kind] = (kinds[s.kind] || 0) + 1; });
      var top = Object.keys(kinds).sort(function (a, b) { return kinds[b] - kinds[a]; })[0];
      panelEl.appendChild(lpH('div', 'row tr' + (i % 2 ? '' : ' alt'), [
        lpH('div', 'row c-owner', [lpDot(o.woke ? 'var(--fresh)' : '#FFFFFF2E'), o.owner]),
        lpH('div', 'row c-last', [o.lastBeat ? lpHm(o.lastBeat) : '-']),
        lpH('div', 'row c-int', [lpEvery(o.interval) || '-']),
        lpH('div', 'row c-next', [lpMeter(elapsed, o.woke ? 'var(--fresh)' : '#FFFFFF40'), o.nextBeat ? lpHm(o.nextBeat) : '-']),
        lpH('div', 'row c-woke', [o.woke ? lp('span', 'yes', 'yes') : 'no']),
        lpH('div', 'row c-sig', top ? [lp('b', null, o.signals.length), lpKind(top)] : [String.fromCharCode(8212)])
      ]));
    });
    return panelEl;
  }

  function lpSignals(hb) {
    var all = [];
    if (hb) hb.owners.forEach(function (o) { o.signals.forEach(function (s) { all.push(s); }); });
    all.sort(function (a, b) {
      var x = LP_PRESSING.indexOf(a.kind), y = LP_PRESSING.indexOf(b.kind);
      return (x < 0 ? 99 : x) - (y < 0 ? 99 : y);
    });
    var box = lpH('div', 'panel pad col signals', [lpH('div', 'row list-head', [
      lpH('div', 'row', [lp('span', 'title', 'Signals'), lp('span', 'count', all.length)]),
      lp('span', 'sub', 'most pressing first')
    ])]);
    if (!all.length) box.appendChild(lp('div', 'empty', hb ? 'Nothing needs anyone.' : 'The heartbeat is off, so nothing is watched.'));
    all.slice(0, 5).forEach(function (s) {
      var ring = lp('i', 'ring'); ring.style.borderColor = LP_RING[s.kind] || 'var(--dim)';
      box.appendChild(lpH('div', 'col sig', [
        lpH('div', 'row pr', [ring, lpPath(s.document || s.re || s.message || '')]),
        lpH('div', 'row dr', [lpKind(s.kind), lp('span', 'why', s.why || '')])
      ]));
    });
    if (all.length > 5) box.appendChild(lp('div', 'more', 'and ' + (all.length - 5) + ' more'));
    return box;
  }

  function lpWaiting(hb) {
    var box = lpH('div', 'panel wait col', [lpH('div', 'row list-head', [
      lpH('div', 'row', [icon('hand', 14), lp('span', 'title', 'Waiting for you'), lp('span', 'count', hb.waiting.length)]),
      lp('span', 'sub', 'Reply writes to the owner' + String.fromCharCode(39) + 's inbox, from you')
    ])]);
    if (!hb.waiting.length) box.appendChild(lp('div', 'empty', 'Nothing has been brought to you.'));
    hb.waiting.forEach(function (m) {
      var file = m.re || '';
      var item = lp('div', 'col');
      var reply = lpH('button', 'btn', [icon('reply', 11), 'Reply']);
      var path = file ? lpPath(file) : lpH('span', 'path', [lp('span', 'd', 'thread '), lp('span', 'f', m.thread || m.id)]);
      item.appendChild(lpH('div', 'row wr', [lpH('div', 'col fill', [path, lp('div', 'why', m.from + ': ' + m.body)]), reply]));
      reply.onclick = function () {
        if (item.querySelector('input')) { item.querySelector('input').focus(); return; }
        var input = el('input'); input.placeholder = 'Reply to ' + m.from;
        var send = lpH('button', 'btn go', [icon('reply', 11), 'Send']);
        send.onclick = function () { lpReply(m.id, input.value, item); };
        input.addEventListener('keydown', function (e) { if (e.key === 'Enter') lpReply(m.id, input.value, item); });
        item.appendChild(lpH('div', 'row replyrow', [input, send]));
        input.focus();
      };
      box.appendChild(item);
    });
    return box;
  }

  function lpReply(id, body, item) {
    fetch('/api/reply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: id, body: body })
    }).then(function (r) {
      return r.json().then(function (data) { return { ok: r.ok, data: data }; });
    }).then(function (answer) {
      if (!answer.ok) { item.appendChild(lp('div', 'said', answer.data.error || 'refused')); return; }
      // the reply is sent: nothing is being typed any more, so the panel may redraw at once
      if (document.activeElement) document.activeElement.blur();
      refresh(false).catch(function () {});
    });
  }

  /** One action as a sentence, as the design writes it. */
  function lpWhat(a) {
    var act = a.action || {};
    if (act.type === 'ask') return 'Asked ' + act.to + ' about ' + lpFile(act.re);
    if (act.type === 'reply') return 'Replied to ' + act.message;
    if (act.type === 'escalate' || a.became === 'escalate') return lpFile(act.re || act.document || act.message) + ' ' + String.fromCharCode(8594) + ' to the person';
    if (act.type === 'wait') return 'Waiting on ' + act.on + ' for ' + lpFile(act.document);
    if (act.type === 'set_status') return 'Marked ' + lpFile(act.document) + ' ' + act.status;
    if (act.type === 'noop') return 'Nothing to do';
    return (act.type || 'action') + ' ' + (act.document || act.re || act.message || '');
  }
  function lpDetail(a) {
    var act = a.action || {};
    if (a.reason) return a.reason;
    if (act.body) return String.fromCharCode(8220) + String(act.body).split(String.fromCharCode(10))[0] + String.fromCharCode(8221);
    if (act.note) return act.note;
    if (act.after) return 'after ' + act.after;
    return a.outcome === 'already done' ? 'already done once' : '';
  }

  function lpActions(hb) {
    var latest = hb.recent[0];
    var box = lpH('div', 'panel pad col actions', [lpH('div', 'row list-head ah', [
      lp('span', 'title', 'Recent actions'),
      lp('span', 'sub', latest ? 'beat ' + latest.agent + LP_DOT + lpHm(latest.at) : '')
    ])]);
    var rows = [];
    hb.recent.forEach(function (b) {
      if (b.error) rows.push({ v: 'nothing', label: 'nothing done', icon: 'circle-alert', what: 'Beat ' + b.agent, detail: b.error });
      b.actions.forEach(function (a) {
        var v = a.became === 'escalate' ? 'escalated' : a.outcome === 'refused' ? 'refused' : 'done';
        rows.push({ v: v, label: v === 'escalated' ? 'escalate' : a.outcome, icon: v === 'escalated' ? 'arrow-up-right' : v === 'refused' ? 'x' : 'check', what: lpWhat(a), detail: lpDetail(a) });
      });
    });
    if (!rows.length) box.appendChild(lp('div', 'empty', hb.recent.length ? 'The last beats did nothing.' : 'No owner has acted yet.'));
    rows.slice(0, 4).forEach(function (r) {
      var vi = lp('div', 'vi ' + r.v); vi.appendChild(icon(r.icon, 11));
      box.appendChild(lpH('div', 'row act', [vi, lpH('div', 'col', [
        lpH('div', 'row top', [lp('span', 'what', r.what), lp('span', 'verdict ' + r.v, r.label)]),
        r.detail ? lp('div', 'detail', r.detail) : null
      ])]));
    });
    return box;
  }

  function lpOutcomes(hb) {
    var o = hb.outcomes, total = o.answered + o['answered-late'] + o.unanswered;
    var box = lpH('div', 'panel pad col fu', [lpH('div', 'row caprow', [lp('span', 'cap', 'Follow-up outcomes'), lp('span', 'sub', 'scored by the heartbeat, never the owner')])]);
    var parts = [['answered in time', 'answered', '#32D74B', '+1.0'], ['answered late', 'answered-late', '#FFD60A', '+0.5'], ['never answered', 'unanswered', '#FF453A', String.fromCharCode(8722) + '0.5']];
    var bar = lp('div', 'fubar' + (total ? '' : ' none'));
    if (total) parts.forEach(function (p) { if (!o[p[1]]) return; var i = el('i'); i.style.cssText = 'flex:' + o[p[1]] + ' 1 0;background:' + p[2]; bar.appendChild(i); });
    box.appendChild(bar);
    box.appendChild(lpH('div', 'row legend3', parts.map(function (p) {
      var sw = lp('i', 'sw'); sw.style.background = p[2];
      return lpH('div', 'col', [lpH('div', 'row top', [sw, p[0]]), lpH('div', 'row val', [lp('b', null, o[p[1]]), lp('span', null, p[3])])]);
    })));
    return box;
  }

  function lpRule(x, cls) {
    var ratio = x.acted ? x.passed / x.acted : 0;
    return lpH('div', 'row rule', [
      lp('span', 'when', x.situation),
      lpH('div', 'row choose', [icon('arrow-right', 11), lp('span', 'opt', String(x.claim).replace('choose ', ''))]),
      lp('span', 'nm', x.passed + '/' + x.acted),
      lpMeter(ratio, cls === 'told' ? 'var(--accent)' : null)
    ]);
  }

  function lpLearned() {
    var lr = state.learned;
    var box = lp('div', 'panel pad col learned');
    if (!lr) {
      box.appendChild(lpH('div', 'col lh', [lpH('div', 'row caprow', [lp('span', 'title', 'What the agent has learned')])]));
      box.appendChild(lp('div', 'empty', 'Nothing yet. Playing a day from the Games tab, or the loop' + String.fromCharCode(39) + 's scripts, writes .dep-learned.json.'));
      return box;
    }
    var base = lr.runs[0] || { label: lr.game, passRates: [] }, edit = lr.runs[1];
    var days = base.passRates.length;
    box.appendChild(lpH('div', 'col lh', [
      lpH('div', 'row caprow', [lp('span', 'title', 'What the agent has learned'), lp('span', 'sub', lr.game + LP_DOT + days + ' day' + (days === 1 ? '' : 's'))]),
      lp('div', 'srcline', 'from the loop' + String.fromCharCode(39) + 's summary' + LP_DOT + 'updated ' + lpHm(lr.updated))
    ]));
    if (days) {
      var last = base.passRates[days - 1];
      var fig = lpH('div', 'row fig', [lp('div', 'big', last.toFixed(2)), lpH('div', 'col of', [
        lp('div', 'l1', 'pass rate on day ' + days + (edit ? ', no edit' : '')),
        days > 1 ? lp('div', 'l2', (last >= base.passRates[0] ? 'up' : 'down') + ' from ' + base.passRates[0].toFixed(2) + ' on day 1') : null
      ])]);
      if (edit && edit.passRates.length) {
        var sw = lp('i', 'sw'); sw.style.background = 'var(--accent)';
        fig.appendChild(lpH('div', 'col editfig', [lpH('div', 'row', [sw, lp('b', null, edit.passRates[edit.passRates.length - 1].toFixed(2))]),
          lp('span', null, 'by day ' + edit.passRates.length + ' with your edit')]));
      }
      box.appendChild(fig);
      var chart = lp('div', 'row chart');
      var runs = edit ? [base, edit] : [base];
      var span = Math.max.apply(null, runs.map(function (r) { return r.passRates.length; }));
      for (var d = 0; d < span; d++) {
        var bars = lp('div', 'row bars');
        runs.forEach(function (r, ri) {
          var v = r.passRates[d];
          var run = lp('div', 'col run' + (ri ? ' edit' : d === span - 1 ? ' last' : ''));
          if (v !== undefined) {
            run.appendChild(lp('b', null, v.toFixed(2)));
            var bar = el('i'); bar.style.height = Math.max(1, Math.round(v * 132)) + 'px'; bar.title = r.label + ', day ' + (d + 1) + ': ' + v;
            run.appendChild(bar);
          }
          bars.appendChild(run);
        });
        chart.appendChild(lpH('div', 'col day', [bars, lp('span', 'dayn', d + 1)]));
      }
      box.appendChild(chart);
      if (edit) {
        var a = lp('i', 'sw'); a.style.background = '#FFFFFF59';
        var b = lp('i', 'sw'); b.style.background = 'var(--accent)';
        box.appendChild(lpH('div', 'row clegend', [lpH('div', 'row', [a, 'no edit']), lpH('div', 'row', [b, 'with your edit'])]));
      }
    }
    var told = lr.taught.length || lr.notes.length;
    var advice = lr.advice.slice(0, told ? 4 : 6);
    if (advice.length) {
      var rules = lpH('div', 'col rules', [lpH('div', 'row caprow', [lp('span', 'cap', 'Advice it relies on'), lp('span', 'sub', advice.length + ' of ' + lr.advice.length + ' rule' + (lr.advice.length === 1 ? '' : 's'))])]);
      advice.forEach(function (x) { rules.appendChild(lpRule(x)); });
      box.appendChild(rules);
    }
    if (told) {
      var t = lpH('div', 'col told', [lpH('div', 'row caprow', [lp('span', 'cap', 'What you told it'),
        lp('span', 'sub', lr.taught.length + ' rule' + (lr.taught.length === 1 ? '' : 's') + LP_DOT + lr.notes.length + ' note' + (lr.notes.length === 1 ? '' : 's'))])]);
      lr.taught.forEach(function (x) { t.appendChild(lpRule(x, 'told')); });
      lr.notes.forEach(function (n) { t.appendChild(lpH('div', 'row note', [icon('quote', 12), el('span', null, n)])); });
      box.appendChild(t);
    }
    box.appendChild(lp('div', 'spacer'));
    var tt = lr.totals;
    box.appendChild(lpH('div', 'row store', [
      lpH('div', 'row', [lp('b', null, tt.claims), lp('span', null, 'active claims')]),
      lpH('div', 'row', [lp('b', null, tt.rules), lp('span', null, 'rules')]),
      lpH('div', 'row', [lp('b', null, tt.habits), lp('span', null, 'habits')]),
      lpH('div', 'row', [lp('b', null, tt.nightsKept + ' / ' + tt.nightsUndone), lp('span', null, 'nights kept / undone')])
    ]));
    return box;
  }

  function renderLoop() {
    var pane = clear(byId('loop'));
    var loop = state.loop;
    if (!loop || !loop.enabled) {
      pane.appendChild(lpH('div', 'panel col offpanel', [
        el('h1', null, 'The loop is off'),
        lp('div', 'soft', 'DEP is running as pure documentation: nothing is recorded, no owner is woken, no model is asked.'),
        lp('div', 'm', 'Turn it on in .docspec with   loop: { enabled: true }   ' + String.fromCharCode(183) + ' dep loop shows each part.')
      ]));
      return;
    }
    var hb = state.heartbeat;
    pane.appendChild(lpSettings(loop));
    var left = lpH('div', 'col left', [lpHeartbeat(loop, hb)]);
    if (hb) {
      left.appendChild(lpH('div', 'row bottom', [
        lpH('div', 'col stack', [lpSignals(hb), lpWaiting(hb)]),
        lpH('div', 'col stack', [lpActions(hb), lpOutcomes(hb)])
      ]));
    }
    pane.appendChild(lpH('div', 'row main', [left, lpH('div', 'col right', [lpLearned()])]));
  }
`

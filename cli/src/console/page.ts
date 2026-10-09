/**
 * The console, as one page. It is served as a string so the compiled binary
 * carries it with no asset loading of any kind, and it talks to nothing but
 * the local server that served it.
 *
 * Deliberately free of backticks and backslashes: this file is a template
 * literal, and an escape sequence here would arrive at the browser changed.
 */
export function consolePage(project: string): string {
  const name = project.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return PAGE.split('__PROJECT__').join(name)
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__PROJECT__ — dep console</title>
<style>
  :root {
    --bg: #000000;
    --panel: rgba(255,255,255,0.045);
    --panel-solid: #0e0e10;
    --line: rgba(255,255,255,0.09);
    --line-soft: rgba(255,255,255,0.055);
    --ink: #f5f5f7;
    --dim: #86868b;
    --dimmer: #5c5c61;
    --accent: #0a84ff;
    --fresh: #30d158;
    --aging: #ffd60a;
    --stale: #ff453a;
    --tutorial: #30d158;
    --howto: #ff9f0a;
    --reference: #0a84ff;
    --explanation: #bf5af0;
    --decision: #ff375f;
    --radius: 14px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: var(--bg);
    color: var(--ink);
    font: 13px/1.5 -apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", system-ui, sans-serif;
    -webkit-font-smoothing: antialiased;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .mono { font-family: "SF Mono", ui-monospace, "JetBrains Mono", Menlo, monospace; font-size: 11.5px; }

  header {
    display: flex; align-items: center; gap: 16px;
    padding: 0 16px; height: 46px; flex: 0 0 46px;
    border-bottom: 1px solid var(--line);
    background: rgba(20,20,22,0.72);
    backdrop-filter: saturate(180%) blur(20px);
    position: relative; z-index: 20;
  }
  .brand { display: flex; align-items: center; gap: 9px; font-weight: 590; letter-spacing: -0.01em; }
  .mark {
    width: 19px; height: 19px; border-radius: 6px;
    background: linear-gradient(145deg, #0a84ff, #bf5af0);
    box-shadow: 0 0 14px rgba(10,132,255,0.35);
  }
  nav { display: flex; gap: 2px; margin: 0 auto; background: rgba(255,255,255,0.055); padding: 3px; border-radius: 9px; }
  nav button {
    appearance: none; border: 0; background: transparent; color: var(--dim);
    font: inherit; font-size: 12px; font-weight: 510;
    padding: 4px 13px; border-radius: 7px; cursor: pointer; transition: color .15s, background .15s;
  }
  nav button:hover { color: var(--ink); }
  nav button[aria-selected="true"] { background: rgba(255,255,255,0.12); color: var(--ink); }
  .live { display: flex; align-items: center; gap: 7px; font-size: 11.5px; color: var(--dim);
          border: 1px solid var(--line); border-radius: 999px; padding: 4px 11px; }
  .dot { width: 6px; height: 6px; border-radius: 50%; background: var(--fresh); box-shadow: 0 0 8px var(--fresh); }
  .dot.cold { background: var(--dimmer); box-shadow: none; }

  main { flex: 1; min-height: 0; position: relative; }
  section.screen { position: absolute; inset: 0; display: none; }
  section.screen.on { display: flex; }

  /* ── graph ─────────────────────────────────────────── */
  #canvas-wrap { flex: 1; position: relative; min-width: 0; }
  canvas { display: block; width: 100%; height: 100%; cursor: grab; }
  canvas.dragging { cursor: grabbing; }
  .float { position: absolute; background: rgba(22,22,24,0.78); backdrop-filter: blur(18px) saturate(180%);
           border: 1px solid var(--line); border-radius: var(--radius); }
  #stats { top: 16px; left: 16px; display: flex; align-items: stretch; }
  #stats .stat { padding: 11px 16px; border-right: 1px solid var(--line-soft); }
  #stats .stat:last-child { border-right: 0; }
  .stat b { display: block; font-size: 21px; font-weight: 580; letter-spacing: -0.02em; line-height: 1.15; }
  .stat span { font-size: 10.5px; color: var(--dim); text-transform: lowercase; }
  .verdict { display: flex; gap: 12px; align-items: center; font-size: 12px; }
  .verdict em { font-style: normal; font-weight: 560; }

  #legend { bottom: 16px; left: 16px; padding: 12px 14px; display: grid; gap: 9px; max-width: 460px; }
  .legend-row { display: flex; align-items: center; gap: 9px; flex-wrap: wrap; }
  .legend-row > .label { width: 62px; font-size: 10px; letter-spacing: .07em; text-transform: uppercase; color: var(--dimmer); }
  .chip { display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; color: var(--dim);
          border: 1px solid transparent; border-radius: 7px; padding: 2px 8px; cursor: pointer; user-select: none; }
  .chip:hover { color: var(--ink); background: rgba(255,255,255,0.05); }
  .chip.off { opacity: .34; }
  .chip i { width: 8px; height: 8px; border-radius: 50%; display: inline-block; }
  .chip o { width: 9px; height: 9px; border-radius: 50%; display: inline-block; border: 1.5px solid currentColor; }
  .chip b { font-weight: 500; color: var(--dimmer); font-variant-numeric: tabular-nums; }
  .chip.rel { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 10px; letter-spacing: .04em;
              border-color: var(--line); color: var(--dim); }

  aside { width: 330px; flex: 0 0 330px; border-left: 1px solid var(--line); overflow-y: auto;
          background: var(--panel-solid); padding: 18px; }
  aside h2 { font-size: 20px; font-weight: 600; letter-spacing: -0.02em; margin: 9px 0 3px; }
  aside .path { color: var(--dim); word-break: break-all; margin-bottom: 16px; }
  .badges { display: flex; gap: 6px; flex-wrap: wrap; }
  .badge { font-size: 10.5px; padding: 2.5px 8px; border-radius: 6px; background: rgba(255,255,255,0.08); color: var(--dim); }
  .badge.life { color: #000; font-weight: 600; }
  .group { border-top: 1px solid var(--line-soft); padding-top: 12px; margin-top: 16px; }
  .group > h3 { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--dimmer); margin-bottom: 9px; }
  .kv { display: flex; justify-content: space-between; gap: 12px; padding: 3.5px 0; font-size: 12px; }
  .kv span { color: var(--dim); }
  .kv b { font-weight: 500; text-align: right; }
  .meter { height: 4px; border-radius: 3px; background: rgba(255,255,255,0.1); overflow: hidden; margin-top: 7px; }
  .meter > i { display: block; height: 100%; border-radius: 3px; }
  .link-row { display: flex; gap: 8px; align-items: baseline; padding: 3.5px 0; font-size: 11.5px; cursor: pointer; }
  .link-row:hover b { color: var(--accent); }
  .rel { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 9.5px; letter-spacing: .05em;
         width: 74px; flex: 0 0 74px; text-align: right; }
  .link-row b { font-weight: 450; color: var(--ink); word-break: break-all; }
  .empty { color: var(--dimmer); font-size: 12px; padding: 20px 0; text-align: center; }
  .act { appearance: none; border: 1px solid var(--line); background: rgba(255,255,255,0.07); color: var(--ink);
         font: inherit; font-size: 11px; padding: 3px 10px; border-radius: 7px; cursor: pointer; }
  .act:hover { background: rgba(255,255,255,0.14); }
  .act.on { background: var(--accent); border-color: var(--accent); color: #fff; }
  .act:disabled { opacity: .45; cursor: default; }
  .seg { display: inline-flex; gap: 3px; }
  .tag { display: inline-flex; align-items: center; gap: 5px; }
  .tag x { cursor: pointer; color: var(--dimmer); font-style: normal; }
  .tag x:hover { color: var(--stale); }
  .field { display: flex; gap: 6px; margin-top: 8px; }
  .field input, .field select {
    flex: 1; min-width: 0; background: rgba(255,255,255,0.06); border: 1px solid var(--line);
    color: var(--ink); font: inherit; font-size: 11.5px; padding: 3px 8px; border-radius: 7px;
  }
  .field select { flex: 0 0 96px; }
  .said { font-size: 11px; margin-top: 9px; padding: 6px 9px; border-radius: 7px; }
  .said.good { background: rgba(48,209,88,0.14); color: #5de08a; }
  .said.bad { background: rgba(255,69,58,0.14); color: #ff8178; }
  .writes { font-size: 10px; color: var(--dimmer); margin-top: 9px; }

  /* ── lists & tables ───────────────────────────────── */
  .diff { font: 12px/1.55 ui-monospace, SFMono-Regular, Menlo, monospace; margin-top: 16px;
    border: 1px solid var(--line); border-radius: 10px; overflow: hidden; }
  .diff div { padding: 1px 12px; white-space: pre-wrap; word-break: break-word; }
  .diff .add { background: rgba(48,209,88,0.13); color: #7de39c; }
  .diff .del { background: rgba(255,69,58,0.12); color: #ff9a92; text-decoration: line-through; text-decoration-color: rgba(255,69,58,0.5); }
  .diff .same { color: var(--dim); }
  .decide { display: flex; gap: 8px; margin-top: 16px; align-items: center; }
  #review-count:not(:empty) { margin-left: 4px; padding: 0 6px; border-radius: 8px; background: var(--accent); color: #fff; font-size: 10px; }
  .reader { display: flex; width: 100%; min-height: 0; }
  .reader-meta { width: 340px; flex: 0 0 340px; border-right: 1px solid var(--line); overflow-y: auto; padding: 18px; background: var(--panel-solid); }
  .reader-meta pre { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 11px; line-height: 1.55; white-space: pre-wrap; word-break: break-word; color: var(--dim); background: rgba(0,0,0,0.35); border: 1px solid var(--line); border-radius: 9px; padding: 10px 12px; margin: 8px 0 14px; }
  .reader-meta a, .prose a { color: #6cb6ff; text-decoration: none; cursor: pointer; }
  .reader-meta a:hover, .prose a:hover { text-decoration: underline; }
  .prose { flex: 1; min-width: 0; overflow-y: auto; padding: 34px 48px 80px; max-width: 900px; font-size: 14px; line-height: 1.65; color: #d8d8dc; }
  .prose h1 { font-size: 26px; font-weight: 650; letter-spacing: -0.02em; margin: 0 0 16px; color: var(--ink); }
  .prose h2 { font-size: 19px; font-weight: 620; margin: 30px 0 10px; color: var(--ink); padding-top: 14px; border-top: 1px solid var(--line-soft); }
  .prose h3 { font-size: 15.5px; font-weight: 600; margin: 22px 0 8px; color: var(--ink); }
  .prose h4, .prose h5, .prose h6 { font-size: 13.5px; font-weight: 600; margin: 18px 0 6px; color: var(--ink); }
  .prose p { margin: 0 0 12px; }
  .prose ul, .prose ol { margin: 0 0 12px 22px; }
  .prose li { margin: 3px 0; }
  .prose code { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 12px; background: rgba(255,255,255,0.08); border-radius: 5px; padding: 1px 5px; color: #e4e4e8; }
  .prose pre { background: rgba(0,0,0,0.45); border: 1px solid var(--line); border-radius: 10px; padding: 12px 14px; overflow-x: auto; margin: 0 0 14px; }
  .prose pre code { background: none; padding: 0; font-size: 12px; line-height: 1.55; }
  .prose table { width: auto; margin: 0 0 16px; font-size: 12.5px; }
  .prose th, .prose td { border: 1px solid var(--line); padding: 6px 10px; text-align: left; vertical-align: top; }
  .prose th { background: rgba(255,255,255,0.05); color: var(--ink); font-weight: 600; }
  .prose blockquote { border-left: 3px solid var(--accent); padding: 4px 14px; color: var(--dim); margin: 0 0 12px; }
  .prose hr { border: 0; border-top: 1px solid var(--line); margin: 22px 0; }
  .strip { display: flex; gap: 0; background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); margin-bottom: 16px; }
  .strip > div { flex: 1; padding: 12px 15px; border-left: 1px solid var(--line-soft); min-width: 0; }
  .strip > div:first-child { border-left: 0; }
  .strip .k { font-size: 10.5px; color: var(--dimmer); }
  .strip .v { font-size: 12.5px; margin: 3px 0 2px; display: flex; align-items: center; gap: 6px; }
  .strip .v i { width: 7px; height: 7px; border-radius: 50%; display: inline-block; }
  .strip .w { font-size: 10.5px; color: var(--dim); }
  .loop-grid { display: grid; grid-template-columns: 1.55fr 1fr; gap: 16px; }
  .loop-col { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
  .loop-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  .panel { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 15px 17px; min-width: 0; }
  .panel-head { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; margin-bottom: 11px; }
  .panel-head h3 { font-size: 14px; font-weight: 600; }
  .panel-head span { font-size: 11px; color: var(--dim); }
  .panel.warm { background: rgba(255,159,10,0.06); border-color: rgba(255,159,10,0.28); }
  .item { padding: 9px 0; border-top: 1px solid var(--line-soft); font-size: 12px; }
  .item:first-of-type { border-top: 0; }
  .item .sub { color: var(--dim); font-size: 11px; margin-top: 3px; }
  .tag { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 10.5px; padding: 1px 6px; border-radius: 5px; background: rgba(10,132,255,0.15); color: #6cb6ff; margin-right: 6px; }
  .tag.amber { background: rgba(255,214,10,0.13); color: #ffd60a; }
  .tag.red { background: rgba(255,69,58,0.14); color: #ff8178; }
  .tag.green { background: rgba(48,209,88,0.14); color: #5de08a; }
  .outcome { font-size: 10.5px; font-weight: 600; float: right; }
  .chart { display: flex; align-items: flex-end; gap: 6px; height: 120px; margin: 14px 0 6px; }
  .chart .day { flex: 1; display: flex; align-items: flex-end; gap: 2px; height: 100%; position: relative; }
  .chart .day i { flex: 1; display: block; border-radius: 3px 3px 0 0; background: rgba(255,255,255,0.18); }
  .chart .day i.edit { background: var(--accent); }
  .chart .day b { position: absolute; bottom: -16px; left: 0; right: 0; text-align: center; font-size: 9.5px; color: var(--dimmer); font-weight: 400; }
  .evidence { display: inline-block; width: 46px; height: 4px; border-radius: 3px; background: rgba(255,255,255,0.08); vertical-align: middle; margin-left: 8px; overflow: hidden; }
  .evidence i { display: block; height: 100%; }
  .reply { display: flex; gap: 6px; margin-top: 7px; }
  .reply input { flex: 1; background: rgba(0,0,0,0.35); border: 1px solid var(--line); border-radius: 7px; color: var(--ink); font-size: 11.5px; padding: 5px 8px; }
  .split { display: flex; width: 100%; min-height: 0; }
  .rail { width: 300px; flex: 0 0 300px; border-right: 1px solid var(--line); overflow-y: auto; background: var(--panel-solid); }
  .rail-head { padding: 14px 16px 10px; display: flex; align-items: baseline; justify-content: space-between;
               position: sticky; top: 0; background: var(--panel-solid); border-bottom: 1px solid var(--line-soft); }
  .rail-head h3 { font-size: 13px; font-weight: 600; }
  .rail-head span { font-size: 11px; color: var(--dimmer); }
  .call { padding: 11px 16px; border-bottom: 1px solid var(--line-soft); cursor: pointer; border-left: 2px solid transparent; }
  .call:hover { background: rgba(255,255,255,0.03); }
  .call.on { background: rgba(10,132,255,0.1); border-left-color: var(--accent); }
  .call .kind { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 10.5px; color: var(--accent); }
  .call .q { margin: 4px 0 5px; font-size: 12.5px; color: var(--ink); }
  .call .meta { font-size: 10.5px; color: var(--dimmer); display: flex; gap: 8px; }
  .pane { flex: 1; min-width: 0; overflow-y: auto; padding: 22px 26px; }
  .pane h1 { font-size: 24px; font-weight: 600; letter-spacing: -0.025em; margin-bottom: 4px; }
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 14px; margin-bottom: 20px; }
  .card { background: var(--panel); border: 1px solid var(--line); border-radius: var(--radius); padding: 15px 17px; }
  .card > h3 { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--dimmer); margin-bottom: 11px; }
  .big { font-size: 30px; font-weight: 580; letter-spacing: -0.03em; line-height: 1; }
  .triple { display: flex; gap: 20px; align-items: baseline; }
  .triple div span { display: block; font-size: 10.5px; color: var(--dim); }
  .bar { display: flex; height: 6px; border-radius: 4px; overflow: hidden; margin: 13px 0 11px; background: rgba(255,255,255,0.08); }
  .bar > i { display: block; height: 100%; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; font-size: 9.5px; letter-spacing: .08em; text-transform: uppercase; color: var(--dimmer);
       font-weight: 500; padding: 0 10px 9px; border-bottom: 1px solid var(--line); }
  td { padding: 9px 10px; border-bottom: 1px solid var(--line-soft); vertical-align: middle; }
  tr.row:hover td { background: rgba(255,255,255,0.028); cursor: pointer; }
  td.num { text-align: right; font-variant-numeric: tabular-nums; color: var(--dim); }
  .overdue { font-variant-numeric: tabular-nums; font-size: 11px; padding: 1.5px 7px; border-radius: 5px; font-weight: 600; }
  .pill { display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--dim); }
  .pill i { width: 7px; height: 7px; border-radius: 50%; }
  .reason { font-size: 10px; padding: 2px 7px; border-radius: 5px; background: rgba(255,255,255,0.08); color: var(--dim); }
  .reason.match { background: rgba(10,132,255,0.18); color: #6cb6ff; }
  .reason.required { background: rgba(255,159,10,0.16); color: #ffb340; }
  .reason.expanded { background: rgba(191,90,240,0.16); color: #d08cf5; }
  .sig { display: inline-flex; gap: 3px; vertical-align: middle; }
  .sig i { width: 13px; height: 7px; border-radius: 2px; background: rgba(255,255,255,0.12); }
  .step { display: flex; gap: 10px; align-items: baseline; padding: 8px 10px; border-bottom: 1px solid var(--line-soft); }
  .step .glyph { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 11px; width: 20px; flex: 0 0 20px; }
  .step .id { font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 11.5px; }
  .step .desc { color: var(--dim); font-size: 11.5px; flex: 1; }
  .step .to { font-size: 10.5px; color: var(--dimmer); font-family: "SF Mono", ui-monospace, Menlo, monospace; }
  .budget { display: flex; height: 9px; border-radius: 5px; overflow: hidden; background: rgba(255,255,255,0.08); margin: 12px 0 8px; }
  .budget > i { display: block; height: 100%; }
  .keys { display: flex; gap: 16px; font-size: 10.5px; color: var(--dim); }
  .keys span { display: inline-flex; align-items: center; gap: 5px; }
  .keys b { width: 8px; height: 8px; border-radius: 2px; display: inline-block; }
  .muted { color: var(--dimmer); }
  ::-webkit-scrollbar { width: 9px; height: 9px; }
  ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.14); border-radius: 5px; }
  ::-webkit-scrollbar-track { background: transparent; }
</style>
</head>
<body>
<header>
  <div class="brand"><div class="mark"></div><span>__PROJECT__</span></div>
  <nav>
    <button data-screen="graph" aria-selected="true">Graph</button>
    <button data-screen="traversal" aria-selected="false">Traversal</button>
    <button data-screen="decisions" aria-selected="false">Decisions</button>
    <button data-screen="health" aria-selected="false">Health</button>
    <button data-screen="review" aria-selected="false">Review <span id="review-count"></span></button>
    <button data-screen="loop" aria-selected="false">Loop</button>
  </nav>
  <div class="live"><span class="dot" id="pulse"></span><span id="live-text">connecting</span></div>
</header>

<main>
  <section class="screen on" id="screen-graph">
    <div id="canvas-wrap">
      <canvas id="graph"></canvas>
      <div class="float" id="stats"></div>
      <div class="float" id="legend"></div>
    </div>
    <aside id="inspector"><div class="empty">Select a document in the graph.</div></aside>
  </section>

  <section class="screen" id="screen-traversal">
    <div class="split">
      <div class="rail">
        <div class="rail-head"><h3>Agent calls</h3><span id="call-count"></span></div>
        <div id="calls"></div>
      </div>
      <div class="pane" id="call-detail"><div class="empty">No request selected.</div></div>
    </div>
  </section>

  <section class="screen" id="screen-decisions">
    <div class="split">
      <div class="rail">
        <div class="rail-head"><h3>Decision trees</h3><span id="tree-count"></span></div>
        <div id="trees"></div>
      </div>
      <div class="pane" id="tree-detail"><div class="empty">No procedure selected.</div></div>
    </div>
  </section>

  <section class="screen" id="screen-health">
    <div class="pane" id="health"></div>
  </section>

  <section class="screen" id="screen-reader">
    <div class="reader">
      <aside class="reader-meta" id="reader-meta"></aside>
      <article class="prose" id="reader-body"></article>
    </div>
  </section>

  <section class="screen" id="screen-loop">
    <div class="pane" id="loop"></div>
  </section>

  <section class="screen" id="screen-review">
    <div class="split">
      <div class="rail">
        <div class="rail-head"><h3>Proposed changes</h3><span id="proposal-count"></span></div>
        <div id="proposals"></div>
      </div>
      <div class="pane" id="proposal-detail"><div class="empty">Nothing selected.</div></div>
    </div>
  </section>
</main>

<script>
(function () {
  'use strict';

  var TYPE_COLOR = {
    tutorial: '#30d158', 'how-to': '#ff9f0a', reference: '#0a84ff',
    explanation: '#bf5af0', 'decision-record': '#ff375f'
  };
  var LIFE_COLOR = { FRESH: '#30d158', AGING: '#ffd60a', STALE: '#ff453a' };
  var REL_ORDER = ['TEACHES', 'USES', 'EXPLAINS', 'DECIDES', 'REQUIRES', 'NEXT', 'INLINE'];

  var state = {
    graph: null, validation: null, trace: null, procedures: null, proposals: [], selectedProposal: null, loop: null,
    heartbeat: null, learned: null,
    selected: null, selectedCall: null, selectedTree: null,
    hiddenTypes: {}, hiddenLife: {}, hiddenRels: {},
    nodes: [], edges: [], view: { x: 0, y: 0, k: 1 }, alpha: 1
  };

  function el(tag, cls, text) {
    var node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text !== undefined && text !== null) node.textContent = String(text);
    return node;
  }
  function clear(node) { while (node.firstChild) node.removeChild(node.firstChild); return node; }
  function byId(id) { return document.getElementById(id); }
  function typeColor(t) { return TYPE_COLOR[t] || '#8e8e93'; }
  function lifeColor(l) { return LIFE_COLOR[l] || '#8e8e93'; }
  function basename(p) {
    var cut = p.lastIndexOf('/');
    var file = cut < 0 ? p : p.slice(cut + 1);
    return file.slice(-3) === '.md' ? file.slice(0, -3) : file;
  }
  function num(n) { return typeof n === 'number' ? n.toLocaleString('en-US') : '-'; }
  function days(iso) {
    if (!iso) return null;
    var then = Date.parse(iso);
    if (!then) return null;
    return Math.round((Date.now() - then) / 86400000);
  }
  function when(iso) {
    var t = Date.parse(iso);
    if (!t) return '';
    var d = new Date(t);
    var hh = String(d.getHours()).padStart(2, '0');
    var mm = String(d.getMinutes()).padStart(2, '0');
    var ss = String(d.getSeconds()).padStart(2, '0');
    return hh + ':' + mm + ':' + ss;
  }

  function get(path) {
    return fetch(path, { headers: { accept: 'application/json' } }).then(function (r) {
      if (!r.ok) return r.json().then(function (b) { throw new Error(b.error || r.status); });
      return r.json();
    });
  }

  // ── graph ───────────────────────────────────────────────────────────

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

  // ── traversal ───────────────────────────────────────────────────────

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

  // ── decisions ───────────────────────────────────────────────────────

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

  // ── health ──────────────────────────────────────────────────────────

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

  // ── review ──────────────────────────────────────────────────────────

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

  // ── loop ────────────────────────────────────────────────────────────

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

  function replyTo(id, body, item) {
    fetch('/api/reply', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: id, body: body })
    }).then(function (r) {
      return r.json().then(function (data) { return { ok: r.ok, data: data }; });
    }).then(function (answer) {
      if (!answer.ok) { item.appendChild(el('div', 'said bad', answer.data.error || 'refused')); return; }
      // the reply is sent: nothing is being typed any more, so the panel may redraw at once
      if (document.activeElement) document.activeElement.blur();
      refresh(false).catch(function () {});
    });
  }

  // ── screens & loading ───────────────────────────────────────────────

  // ── reader ──────────────────────────────────────────────────────────

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

  function showScreen(which) {
    Array.prototype.forEach.call(document.querySelectorAll('nav button'), function (b) {
      b.setAttribute('aria-selected', b.dataset.screen === which ? 'true' : 'false');
    });
    Array.prototype.forEach.call(document.querySelectorAll('section.screen'), function (s) {
      s.classList.toggle('on', s.id === 'screen-' + which);
    });
    if (which === 'graph') { sizeCanvas(); }
  }
  Array.prototype.forEach.call(document.querySelectorAll('nav button'), function (b) {
    b.onclick = function () { showScreen(b.dataset.screen); };
  });
  window.addEventListener('resize', function () { sizeCanvas(); });

  function refresh(first) {
    return Promise.all([
      get('/api/graph'),
      get('/api/validate').catch(function () { return null; }),
      get('/api/trace').catch(function () { return { entries: [], dropped: 0 }; }),
      get('/api/procedures').catch(function () { return { trees: [] }; }),
      get('/api/proposals').catch(function () { return { proposals: [] }; }),
      get('/api/loop').catch(function () { return null; }),
      get('/api/heartbeat').catch(function () { return null; }),
      get('/api/learned').catch(function () { return null; })
    ]).then(function (all) {
      var sameShape = state.graph && state.graph.nodes.length === all[0].nodes.length;
      state.graph = all[0];
      state.validation = all[1];
      state.trace = all[2];
      state.procedures = all[3];
      var before = JSON.stringify(state.proposals);
      state.proposals = all[4].proposals;
      state.loop = all[5];
      state.heartbeat = all[6];
      state.learned = all[7];
      // what the project has switched off is not shown at all
      var review = document.querySelector('nav button[data-screen="review"]');
      if (review) review.style.display = state.loop && state.loop.proposals === 'off' ? 'none' : '';
      if (first || !sameShape) layout(state.graph);
      renderStats();
      renderLegend();
      renderCalls();
      renderTrees();
      renderHealth();
      if (first || JSON.stringify(state.proposals) !== before) renderProposals();
      // a reply being typed is not swept away by the next poll
      var typing = document.activeElement && document.activeElement.tagName === 'INPUT' && byId('loop').contains(document.activeElement);
      if (!typing) renderLoop();
      if (first && state.procedures.trees.length) {
        state.selectedTree = state.procedures.trees[0].id;
        renderTrees();
        renderTree(state.procedures.trees[0]);
      }
      byId('pulse').classList.remove('cold');
      byId('live-text').textContent = 'live · ' + state.graph.stats.documents + ' documents';
    }).catch(function (err) {
      byId('pulse').classList.add('cold');
      byId('live-text').textContent = 'offline';
      throw err;
    });
  }

  sizeCanvas();
  refresh(true).then(function () { requestAnimationFrame(frame); }).catch(function () { requestAnimationFrame(frame); });
  setInterval(function () { refresh(false).catch(function () {}); }, 4000);
})();
</script>
</body>
</html>
`

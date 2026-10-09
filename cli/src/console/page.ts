/**
 * The console, as one page. It is served as a string so the compiled binary
 * carries it with no asset loading of any kind, and it talks to nothing but
 * the local server that served it.
 *
 * Deliberately free of backticks and backslashes: this file is a template
 * literal, and an escape sequence here would arrive at the browser changed.
 */
import * as graph from './screens/graph'
import * as traversal from './screens/traversal'
import * as decisions from './screens/decisions'
import * as health from './screens/health'
import * as reader from './screens/reader'
import * as loop from './screens/loop'
import * as games from './screens/games'
import * as review from './screens/review'

/** Each screen brings its own markup, styles and script; the page is the shell they share. */
const SCREENS = [graph, traversal, decisions, health, reader, loop, games, review]
const JS_ORDER = [graph, traversal, decisions, health, review, loop, games, reader]

export function consolePage(project: string): string {
  const name = project.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const page = PAGE
    .replace('__SCREEN_CSS__', () => SCREENS.map((s) => s.css).filter(Boolean).join('\n'))
    .replace('__SCREEN_HTML__', () => SCREENS.map((s) => s.html).join('\n'))
    .replace('__SCREEN_JS__', () => JS_ORDER.map((s) => s.js).join('\n'))
  return page.split('__PROJECT__').join(name)
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
__SCREEN_CSS__
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
    <button data-screen="games" aria-selected="false" style="display:none">Games</button>
  </nav>
  <div class="live"><span class="dot" id="pulse"></span><span id="live-text">connecting</span></div>
</header>

<main>
__SCREEN_HTML__
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
    heartbeat: null, learned: null, games: null, selectedGame: null, levels: {}, editing: false, gameNote: null, checkedAt: 0, playing: false,
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

__SCREEN_JS__
  // ── screens & loading ───────────────────────────────────────────────

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
      get('/api/learned').catch(function () { return null; }),
      get('/api/games').catch(function () { return null; })
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
      state.games = all[8];
      state.checkedAt = Date.now();
      var gamesTab = document.querySelector('nav button[data-screen="games"]');
      if (gamesTab) gamesTab.style.display = state.games ? '' : 'none';
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
      var editing = state.editing || (document.activeElement && document.activeElement.tagName === 'INPUT' && byId('games').contains(document.activeElement));
      if (!editing) renderGames();
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
  // a screen can be linked to: #games opens on the Games tab
  function fromHash() {
    var want = location.hash.slice(1);
    if (want && document.querySelector('nav button[data-screen="' + want + '"]')) showScreen(want);
  }
  window.addEventListener('hashchange', fromHash);
  refresh(true).then(function () { fromHash(); requestAnimationFrame(frame); }).catch(function () { requestAnimationFrame(frame); });
  setInterval(function () { refresh(false).catch(function () {}); }, 4000);
})();
</script>
</body>
</html>
`

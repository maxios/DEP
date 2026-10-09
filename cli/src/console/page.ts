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

/** What the header names: the project, the folder it lives in, and the branch checked out. */
export interface PageInfo { place?: string; branch?: string }

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function consolePage(project: string, info: PageInfo = {}): string {
  const name = escape(project)
  const page = PAGE
    .replace('__SCREEN_CSS__', () => SCREENS.map((s) => s.css).filter(Boolean).join('\n'))
    .replace('__SCREEN_HTML__', () => SCREENS.map((s) => s.html).join('\n'))
    .replace('__SCREEN_JS__', () => JS_ORDER.map((s) => s.js).join('\n'))
  return page.split('__PLACE__').join(escape(info.place ?? project)).split('__BRANCH__').join(escape(info.branch ?? ''))
    .split('__PROJECT__').join(name)
}

const PAGE = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>__PROJECT__ — dep console</title>
<style>
  :root {
    --bg: #07080A;
    --panel: #0F1013;
    --panel-solid: #0F1013;
    --surface-2: #16171B;
    --surface-3: #1E1F24;
    --line: #FFFFFF12;
    --line-soft: #FFFFFF0A;
    --line-strong: #FFFFFF24;
    --ink: #F5F5F7;
    --dim: #A1A1A8;
    --dimmer: #6B6B73;
    --accent: #0A84FF;
    --fresh: #32D74B;
    --aging: #FFD60A;
    --stale: #FF453A;
    --tutorial: #32D74B;
    --howto: #FF9F0A;
    --reference: #64D2FF;
    --explanation: #BF5AF2;
    --decision: #FF6482;
    --ui: "Inter", -apple-system, BlinkMacSystemFont, "SF Pro Text", system-ui, sans-serif;
    --mono: "JetBrains Mono", "JetBrainsMonoNL Nerd Font", "SF Mono", ui-monospace, Menlo, monospace;
    --radius: 14px;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; }
  body {
    background: var(--bg);
    color: var(--ink);
    font: 13px/1.5 var(--ui);
    -webkit-font-smoothing: antialiased;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .mono { font-family: var(--mono); font-size: 11.5px; }

  header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 16px; height: 52px; flex: 0 0 52px;
    border-bottom: 1px solid var(--line); background: var(--panel); position: relative; z-index: 20;
  }
  .hd-side { flex: 1 1 0; display: flex; align-items: center; gap: 10px; min-width: 0; }
  .hd-side.end { justify-content: flex-end; }
  .brand { display: flex; align-items: center; gap: 10px; min-width: 0; }
  .mark { width: 22px; height: 22px; flex: 0 0 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center;
          background: linear-gradient(135deg, #0A84FF 14.6%, #BF5AF2 85.4%); color: #FFFFFF; }
  .brand .name { font-size: 13px; font-weight: 600; color: var(--ink); white-space: nowrap; }
  .brand .branch { font-family: var(--mono); font-size: 11px; color: var(--dimmer); white-space: nowrap; }
  nav { display: flex; gap: 2px; background: var(--surface-3); padding: 3px; border-radius: 9px; flex: 0 0 auto; }
  nav button {
    appearance: none; border: 0; background: transparent; color: var(--dim);
    font: inherit; font-size: 12px; font-weight: 500; line-height: 15px;
    padding: 5px 18px; border-radius: 7px; cursor: pointer; transition: color .15s, background .15s;
  }
  nav button:hover { color: var(--ink); }
  nav button[aria-selected="true"] { background: #FFFFFF1F; color: var(--ink); }
  .live { display: flex; align-items: center; gap: 8px; font-size: 12px; line-height: 15px; white-space: nowrap;
          background: #32D74B14; border: 1px solid #32D74B33; border-radius: 99px; padding: 5px 12px; }
  .live #live-text { color: #9BF0AA; font-weight: 500; } .live #live-ago { color: var(--dimmer); }
  .live.cold { background: #FFFFFF0A; border-color: var(--line); } .live.cold #live-text { color: var(--dim); }
  .dot { width: 7px; height: 7px; flex: 0 0 7px; border-radius: 50%; background: var(--fresh); box-shadow: 0 0 8px #32D74BAA; }
  .dot.cold { background: var(--dimmer); box-shadow: none; }
  .search { position: relative; width: 180px; flex: 0 0 180px; display: flex; align-items: center; gap: 8px;
            padding: 6px 10px; background: var(--surface-3); border-radius: 8px; color: var(--dimmer); }
  .search input { flex: 1; min-width: 0; background: transparent; border: 0; outline: 0; color: var(--ink); font: inherit; font-size: 12px; line-height: 16px; padding: 0; }
  .search input::placeholder { color: var(--dimmer); }
  .search kbd { font: inherit; font-size: 11px; color: var(--dimmer); }
  .search-results { position: absolute; top: calc(100% + 6px); right: 0; width: 340px; background: var(--surface-2); border: 1px solid var(--line-strong);
                    border-radius: 10px; padding: 4px; display: none; box-shadow: 0 12px 32px #00000080; }
  .search-results.on { display: block; }
  .search-results div { padding: 6px 9px; border-radius: 6px; cursor: pointer; display: flex; gap: 8px; align-items: center; font-size: 12px; color: var(--ink); }
  .search-results div span { font-family: var(--mono); font-size: 10.5px; color: var(--dimmer); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .search-results div.on, .search-results div:hover { background: #FFFFFF14; }
  .search-results i { width: 7px; height: 7px; border-radius: 50%; flex: 0 0 7px; }

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
  <div class="hd-side"><div class="brand"><div class="mark" id="mark"></div><span class="name">__PLACE__</span><span class="branch">__BRANCH__</span></div></div>
  <nav>
    <button data-screen="graph" aria-selected="true">Graph</button>
    <button data-screen="traversal" aria-selected="false">Traversal</button>
    <button data-screen="decisions" aria-selected="false">Decisions</button>
    <button data-screen="health" aria-selected="false">Health</button>
    <button data-screen="review" aria-selected="false">Review <span id="review-count"></span></button>
    <button data-screen="loop" aria-selected="false">Loop</button>
    <button data-screen="games" aria-selected="false" style="display:none">Games</button>
  </nav>
  <div class="hd-side end">
    <div class="live cold" id="live"><span class="dot cold" id="pulse"></span><span id="live-text">connecting</span><span id="live-ago"></span></div>
    <label class="search" id="search-box"><span id="search-icon"></span><input id="search" placeholder="Find a document" autocomplete="off" spellcheck="false"><kbd>&#8984;K</kbd><div class="search-results" id="search-results"></div></label>
  </div>
</header>

<main>
__SCREEN_HTML__
</main>

<script>
(function () {
  'use strict';

  var TYPE_COLOR = {
    tutorial: '#32D74B', 'how-to': '#FF9F0A', reference: '#64D2FF',
    explanation: '#BF5AF2', 'decision-record': '#FF6482'
  };
  var LIFE_COLOR = { FRESH: '#32D74B', AGING: '#FFD60A', STALE: '#FF453A' };
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

  /** Lucide icons, as the designs use them; drawn with the text colour. */
  var ICONS = {
    'activity': '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
    'arrow-down-left': '<path d="M17 7 7 17"/><path d="M17 17H7V7"/>',
    'arrow-right': '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    'arrow-up-right': '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
    'ban': '<circle cx="12" cy="12" r="10"/><path d="M4.929 4.929 19.07 19.071"/>',
    'book-open': '<path d="M12 5v16"/><path d="M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z"/>',
    'check': '<path d="M20 6 9 17l-5-5"/>',
    'chevron-down': '<path d="m6 9 6 6 6-6"/>',
    'chevron-right': '<path d="m9 18 6-6-6-6"/>',
    'circle-alert': '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
    'circle-check': '<circle cx="12" cy="12" r="10"/><path d="m16 9-5.5 5.5L8 12"/>',
    'circle-dashed': '<path d="M10.1 2.182a10 10 0 0 1 3.8 0"/><path d="M13.9 21.818a10 10 0 0 1-3.8 0"/><path d="M17.609 3.721a10 10 0 0 1 2.69 2.7"/><path d="M2.182 13.9a10 10 0 0 1 0-3.8"/><path d="M20.279 17.609a10 10 0 0 1-2.7 2.69"/><path d="M21.818 10.1a10 10 0 0 1 0 3.8"/><path d="M3.721 6.391a10 10 0 0 1 2.7-2.69"/><path d="M6.391 20.279a10 10 0 0 1-2.69-2.7"/>',
    'circle-x': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    'copy': '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    'corner-down-right': '<path d="m15 10 5 5-5 5"/><path d="M4 4v7a4 4 0 0 0 4 4h12"/>',
    'eye': '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
    'file-check': '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="m9 15 2 2 4-4"/>',
    'file-text': '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/>',
    'file-x': '<path d="M6 22a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8a2.4 2.4 0 0 1 1.704.706l3.588 3.588A2.4 2.4 0 0 1 20 8v12a2 2 0 0 1-2 2z"/><path d="M14 2v5a1 1 0 0 0 1 1h5"/><path d="m14.5 12.5-5 5"/><path d="m9.5 12.5 5 5"/>',
    'git-compare-arrows': '<circle cx="5" cy="6" r="3"/><path d="M12 6h5a2 2 0 0 1 2 2v7"/><path d="m15 9-3-3 3-3"/><circle cx="19" cy="18" r="3"/><path d="M12 18H7a2 2 0 0 1-2-2V9"/><path d="m9 15 3 3-3 3"/>',
    'git-fork': '<circle cx="12" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><circle cx="18" cy="6" r="3"/><path d="M18 9v2c0 .6-.4 1-1 1H7c-.6 0-1-.4-1-1V9"/><path d="M12 12v3"/>',
    'hand': '<path d="M18 11V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2"/><path d="M14 10V4a2 2 0 0 0-2-2a2 2 0 0 0-2 2v2"/><path d="M10 10.5V6a2 2 0 0 0-2-2a2 2 0 0 0-2 2v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
    'layers': '<path d="M12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83z"/><path d="M2 12a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 12"/><path d="M2 17a1 1 0 0 0 .58.91l8.6 3.91a2 2 0 0 0 1.65 0l8.58-3.9A1 1 0 0 0 22 17"/>',
    'lightbulb': '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    'link-2': '<path d="M9 17H7A5 5 0 0 1 7 7h2"/><path d="M15 7h2a5 5 0 1 1 0 10h-2"/><line x1="8" x2="16" y1="12" y2="12"/>',
    'list-tree': '<path d="M8 5h13"/><path d="M13 12h8"/><path d="M13 19h8"/><path d="M3 10a2 2 0 0 0 2 2h3"/><path d="M3 5v12a2 2 0 0 0 2 2h3"/>',
    'locate-fixed': '<line x1="2" x2="5" y1="12" y2="12"/><line x1="19" x2="22" y1="12" y2="12"/><line x1="12" x2="12" y1="2" y2="5"/><line x1="12" x2="12" y1="19" y2="22"/><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/>',
    'lock': '<rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    'minus': '<path d="M5 12h14"/>',
    'pencil': '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
    'pencil-line': '<path d="M13 21h8"/><path d="m15 5 4 4"/><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/>',
    'play': '<path d="M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z"/>',
    'plus': '<path d="M5 12h14"/><path d="M12 5v14"/>',
    'power': '<path d="M12 2v10"/><path d="M18.4 6.6a9 9 0 1 1-12.77.04"/>',
    'quote': '<path d="M16 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/><path d="M5 3a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2 1 1 0 0 1 1 1v1a2 2 0 0 1-2 2 1 1 0 0 0-1 1v2a1 1 0 0 0 1 1 6 6 0 0 0 6-6V5a2 2 0 0 0-2-2z"/>',
    'refresh-cw': '<path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>',
    'reply': '<path d="M20 18v-2a4 4 0 0 0-4-4H4"/><path d="m9 17-5-5 5-5"/>',
    'rotate-ccw': '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
    'scan': '<path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/>',
    'search': '<path d="m21 21-4.34-4.34"/><circle cx="11" cy="11" r="8"/>',
    'shield-check': '<path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/>',
    'triangle-alert': '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    'user-round': '<circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/>',
    'waypoints': '<path d="m10.586 5.414-5.172 5.172"/><path d="m18.586 13.414-5.172 5.172"/><path d="M6 12h12"/><circle cx="12" cy="20" r="2"/><circle cx="12" cy="4" r="2"/><circle cx="20" cy="12" r="2"/><circle cx="4" cy="12" r="2"/>',
    'x': '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'
  };
  function icon(name, size) {
    var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('width', size); svg.setAttribute('height', size);
    svg.setAttribute('fill', 'none'); svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2'); svg.setAttribute('stroke-linecap', 'round'); svg.setAttribute('stroke-linejoin', 'round');
    svg.style.flex = '0 0 auto';
    svg.innerHTML = ICONS[name] || '';
    return svg;
  }
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

  // ── header ──────────────────────────────────────────────────────────

  byId('mark').appendChild(icon('waypoints', 13));
  byId('search-icon').appendChild(icon('search', 14));
  byId('search-icon').style.display = 'flex';

  function agoText(at) {
    var s = Math.max(0, Math.round((Date.now() - at) / 1000));
    return s < 60 ? s + 's ago' : s < 3600 ? Math.round(s / 60) + 'm ago' : Math.round(s / 3600) + 'h ago';
  }
  function liveAgo() {
    if (state.refreshedAt && !byId('live').classList.contains('cold')) byId('live-ago').textContent = 'scraped ' + agoText(state.refreshedAt);
  }
  setInterval(liveAgo, 1000);

  /** Find a document by title or path; choosing one selects it in the graph. */
  var searchHits = [], searchAt = 0;
  function renderSearch() {
    var box = clear(byId('search-results'));
    var q = byId('search').value.trim().toLowerCase();
    searchHits = !q || !state.graph ? [] : state.graph.nodes.filter(function (n) {
      return (n.title || '').toLowerCase().indexOf(q) >= 0 || n.path.toLowerCase().indexOf(q) >= 0;
    }).slice(0, 8);
    searchAt = Math.min(searchAt, Math.max(0, searchHits.length - 1));
    searchHits.forEach(function (n, i) {
      var row = el('div', i === searchAt ? 'on' : null);
      var dot = el('i'); dot.style.background = TYPE_COLOR[n.type] || 'var(--dim)';
      row.appendChild(dot);
      row.appendChild(document.createTextNode(n.title || n.path));
      row.appendChild(el('span', null, n.path));
      row.onmousedown = function (e) { e.preventDefault(); chooseSearch(n); };
      box.appendChild(row);
    });
    if (q && !searchHits.length) box.appendChild(el('div', null, 'No document matches.'));
    box.classList.toggle('on', !!q);
  }
  function chooseSearch(n) {
    byId('search').value = '';
    byId('search').blur();
    renderSearch();
    showScreen('graph');
    select(n.path);
  }
  byId('search').addEventListener('input', function () { searchAt = 0; renderSearch(); });
  byId('search').addEventListener('blur', function () { byId('search-results').classList.remove('on'); });
  byId('search').addEventListener('focus', renderSearch);
  byId('search').addEventListener('keydown', function (e) {
    if (e.key === 'ArrowDown') { searchAt = Math.min(searchAt + 1, searchHits.length - 1); renderSearch(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { searchAt = Math.max(searchAt - 1, 0); renderSearch(); e.preventDefault(); }
    else if (e.key === 'Enter' && searchHits[searchAt]) chooseSearch(searchHits[searchAt]);
    else if (e.key === 'Escape') { byId('search').value = ''; byId('search').blur(); }
  });
  document.addEventListener('keydown', function (e) {
    if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); byId('search').focus(); byId('search').select(); }
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
      // what the project has switched off is not shown at all; Review shows itself while something waits for you
      var review = document.querySelector('nav button[data-screen="review"]');
      var waiting = state.proposals.length + dueForReview().length;
      if (review) review.style.display = (state.loop && state.loop.proposals === 'off') || (!waiting && review.getAttribute('aria-selected') !== 'true') ? 'none' : '';
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
      byId('live').classList.remove('cold');
      byId('live-text').textContent = 'Live ' + String.fromCharCode(183) + ' ' + location.host;
      state.refreshedAt = Date.now();
      liveAgo();
    }).catch(function (err) {
      byId('pulse').classList.add('cold');
      byId('live').classList.add('cold');
      byId('live-text').textContent = 'Offline';
      byId('live-ago').textContent = state.refreshedAt ? 'last seen ' + agoText(state.refreshedAt) : '';
      throw err;
    });
  }

  sizeCanvas();
  // a screen can be linked to: #games opens on the Games tab
  // #graph/docs/seed.md selects that document; #decisions/<tree> opens that tree
  function fromHash() {
    var want = decodeURIComponent(location.hash.slice(1));
    var cut = want.indexOf('/');
    var screen = cut < 0 ? want : want.slice(0, cut), what = cut < 0 ? '' : want.slice(cut + 1);
    if (!screen || !document.querySelector('nav button[data-screen="' + screen + '"]')) return;
    showScreen(screen);
    if (what) openFromHash(screen, what);
  }
  function openFromHash(screen, what) {
    if (screen === 'graph') select(what);
    if (screen === 'reader') openReader(what);
  }
  window.addEventListener('hashchange', fromHash);
  refresh(true).then(function () { fromHash(); requestAnimationFrame(frame); }).catch(function () { requestAnimationFrame(frame); });
  setInterval(function () { refresh(false).catch(function () {}); }, 4000);
})();
</script>
</body>
</html>
`

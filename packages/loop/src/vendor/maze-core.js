/* maze-core.js — loop intelligence in a maze, deterministic core. Revision 4: Motion gets its own loop.
 *
 * The SAME file runs inside the playground page and in `bun maze.ts`.
 * Everything random goes through a seeded RNG, so a run is fully
 * described by (seed, initial params, param-change events, move count)
 * and can be replayed and verified bit for bit.
 *
 *   PERSISTENCE ──seed──▶ MOTION ──pain──▶ MATTER ──gain──▶ PERSISTENCE
 *
 * Three persistences, three timescales:
 *
 *   Scratch   keyed by CELL, lives one RUN     — "I have been here this run"
 *   Riverbed  keyed by CELL, lives one MAZE    — knows this maze
 *   Habits    keyed by SITUATION, lives on    — knows mazes
 *             (which walls surround me + where I came from)
 *
 * What flows where (revision 3):
 *   wall pain   → riverbed + habits, always      (walls are physics, true in every maze)
 *   loop pain   → scratch only                   (a revisit is a fact about this run, not the place)
 *   goal gain   → riverbed + habits, gated       (carved back along the trail, fading)
 *
 * The gate: Level 2 listens to Level 1 only while Level 1 is competent —
 * at most one give-up in its last five runs of this maze. A thrashing
 * lower level produces noise, and noise must not become instinct.
 *
 * The game master derives its rules from the maze it hands out: the move
 * cap scales with the shortest path, and "solved" means settled (eight
 * runs reached, typical run within 20% of the best of them).
 *
 * Revision 4 — the Motion port is itself a loop (the planner):
 *   Persistence: a model, P(wall | situation, direction), as counts
 *   Motion:      imagine each candidate move against the model and pay
 *                imagined pain before paying real pain
 *   Matter:      the real verdict a moment later; the model's own pain
 *                is surprise (how wrong the imagined verdict was)
 * The model learns from every move, gated by nothing: a wall is physics.
 */
(function (root) {
  'use strict';
  const VERSION = 'maze-core/4';
  const N = 10;
  const DIRS = ['N', 'E', 'S', 'W'];
  const DELTA = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };
  const OPP = { N: 'S', E: 'W', S: 'N', W: 'E' };
  const MAX_MOVES = N * N * 4;
  const REWARD = 10;
  const DEFAULT_PARAMS = { explore: 0.05, decay: 0.97, cap: 60, gamma: 0.9, habit: 1.0, imagine: 6 };
  const HABIT_RATE = 0.2, HABIT_CLAMP = 3, HABIT_DECAY = 0.99, SCRATCH_PAIN = 2;
  const moveCap = maze => Math.max(MAX_MOVES, 8 * maze.shortest);   // the master's rule, derived from the maze it set
  const key = (x, y) => x + ',' + y;

  // mulberry32 — small, fast, identical on every JS engine
  function Rng(seed) {
    let a = seed >>> 0;
    const next = () => {
      a = (a + 0x6D2B79F5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    next.int = n => Math.floor(next() * n);
    next.pick = xs => xs[next.int(xs.length)];
    return next;
  }

  // ───────── Matter: the maze. The game master owns this; the player never touches it. ─────────
  class Maze {
    constructor(rng) {
      this.rng = rng;
      this.generate();
      this.start = [0, 0];
      this.goal = [N - 1, N - 1];
      this.recompute();
    }
    generate() {
      // perfect maze by DFS, then open a few walls so there are loops and wrong shortcuts
      this.walls = new Map();
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) this.walls.set(key(x, y), { N: true, E: true, S: true, W: true });
      const seen = new Set([key(0, 0)]); const stack = [[0, 0]];
      while (stack.length) {
        const [x, y] = stack[stack.length - 1];
        const opts = DIRS.filter(d => { const nx = x + DELTA[d][0], ny = y + DELTA[d][1]; return nx >= 0 && ny >= 0 && nx < N && ny < N && !seen.has(key(nx, ny)); });
        if (!opts.length) { stack.pop(); continue; }
        const d = this.rng.pick(opts); const nx = x + DELTA[d][0], ny = y + DELTA[d][1];
        this.walls.get(key(x, y))[d] = false; this.walls.get(key(nx, ny))[OPP[d]] = false;
        seen.add(key(nx, ny)); stack.push([nx, ny]);
      }
      for (let i = 0; i < 8; i++) {
        const x = 1 + this.rng.int(N - 2), y = 1 + this.rng.int(N - 2), d = this.rng.pick(DIRS);
        this.walls.get(key(x, y))[d] = false; this.walls.get(key(x + DELTA[d][0], y + DELTA[d][1]))[OPP[d]] = false;
      }
    }
    blocked(x, y, d) { return this.walls.get(key(x, y))[d]; }
    recompute() { this.dist = this.bfs(this.start); this.shortest = this.dist.get(key(this.goal[0], this.goal[1])); }
    bfs(from) {
      const dist = new Map([[key(from[0], from[1]), 0]]); const q = [from];
      for (let i = 0; i < q.length; i++) {
        const [x, y] = q[i];
        for (const d of DIRS) {
          if (this.blocked(x, y, d)) continue;
          const nx = x + DELTA[d][0], ny = y + DELTA[d][1], k = key(nx, ny);
          if (!dist.has(k)) { dist.set(k, dist.get(key(x, y)) + 1); q.push([nx, ny]); }
        }
      }
      return dist;
    }
    /** the game master changes the game: goal jumps to a far cell */
    moveGoal() {
      const far = [];
      for (const [k, d] of this.dist) if (d >= this.shortest * 0.6 && k !== key(this.goal[0], this.goal[1])) far.push(k);
      const k = this.rng.pick(far);
      this.goal = k.split(',').map(Number);
      this.recompute();
    }
    /** reality pushes back: it does not explain, it only says what happened */
    judge(x, y, d) {
      if (this.blocked(x, y, d)) return { kind: 'wall', x, y };
      const nx = x + DELTA[d][0], ny = y + DELTA[d][1];
      return { kind: nx === this.goal[0] && ny === this.goal[1] ? 'goal' : 'step', x: nx, y: ny };
    }
    /** compact, order-stable description of the walls for the export */
    serialize() {
      const out = [];
      for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const w = this.walls.get(key(x, y)); out.push((w.N ? 1 : 0) | (w.E ? 2 : 0) | (w.S ? 4 : 0) | (w.W ? 8 : 0)); }
      return out;
    }
  }

  // ───────── Persistence: the riverbed. Keyed by cell, written by pain and gain, erodes. ─────────
  class Riverbed {
    constructor() { this.grooves = new Map(); }
    recall(x, y) { return this.grooves.get(key(x, y)) || { N: 0, E: 0, S: 0, W: 0 }; }
    carve(x, y, d, v) {
      const k = key(x, y); const g = this.grooves.get(k) || { N: 0, E: 0, S: 0, W: 0 };
      g[d] = Math.max(-20, Math.min(20, g[d] + v)); this.grooves.set(k, g);
    }
    depth(g) { return Math.max(Math.abs(g.N), Math.abs(g.E), Math.abs(g.S), Math.abs(g.W)); }
    erode(decay, cap) {
      for (const g of this.grooves.values()) for (const d of DIRS) g[d] *= decay;
      const ranked = [];
      for (const e of this.grooves) if (this.depth(e[1]) >= 0.1) ranked.push(e);
      // stable sort: deeper first, ties keep insertion order (Map iteration order is deterministic)
      ranked.sort((a, b) => this.depth(b[1]) - this.depth(a[1]));
      this.grooves = new Map(ranked.slice(0, cap));
    }
    serialize() {
      const out = {};
      for (const [k, g] of [...this.grooves.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) out[k] = [g.N, g.E, g.S, g.W];
      return out;
    }
  }

  // ───────── Level 2 Persistence: habits. Keyed by situation, so they transfer between mazes. ─────────
  class Habits {
    constructor() { this.grooves = new Map(); }
    recall(sit) { return this.grooves.get(sit) || { N: 0, E: 0, S: 0, W: 0 }; }
    carve(sit, d, v) {
      const g = this.grooves.get(sit) || { N: 0, E: 0, S: 0, W: 0 };
      g[d] = Math.max(-HABIT_CLAMP, Math.min(HABIT_CLAMP, g[d] + v * HABIT_RATE)); this.grooves.set(sit, g);
    }
    depth(g) { return Math.max(Math.abs(g.N), Math.abs(g.E), Math.abs(g.S), Math.abs(g.W)); }
    erode() { for (const g of this.grooves.values()) for (const d of DIRS) g[d] *= HABIT_DECAY; }
    serialize() {
      const out = {};
      for (const [k, g] of [...this.grooves.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) out[k] = [g.N, g.E, g.S, g.W];
      return out;
    }
  }
  // ───────── The planner's Persistence: a model of what a move will do. Keyed by situation. ─────────
  class Model {
    constructor() { this.counts = new Map(); this.surprise = 0; this.n = 0; }
    entry(sit) { let e = this.counts.get(sit); if (!e) { e = { N: [0, 0], E: [0, 0], S: [0, 0], W: [0, 0] }; this.counts.set(sit, e); } return e; }
    /** imagined probability of hitting a wall (Laplace: unknown moves are a coin flip) */
    pWall(sit, d) { const c = this.counts.get(sit); const t = c ? c[d] : [0, 0]; return (t[1] + 1) / (t[0] + 2); }
    /** the real verdict arrives: the model's pain is how surprised it was */
    observe(sit, d, wall) {
      const p = this.pWall(sit, d);
      const e = this.entry(sit); e[d][0]++; if (wall) e[d][1]++;
      const err = Math.abs((wall ? 1 : 0) - p);
      this.n++; this.surprise += (err - this.surprise) / Math.min(this.n, 500);   // running mean over the recent past
    }
    serialize() {
      const out = {};
      for (const [k, e] of [...this.counts.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))) out[k] = [e.N, e.E, e.S, e.W];
      return out;
    }
  }

  /** the situation a cell presents: which of N,E,S,W are walled, and which way I came from */
  const situation = (maze, x, y, from) => {
    const w = maze.walls.get(key(x, y));
    return (w.N ? 'N' : '.') + (w.E ? 'E' : '.') + (w.S ? 'S' : '.') + (w.W ? 'W' : '.') + ':' + from;
  };

  // ───────── The loops ─────────
  class Sim {
    constructor(seed, params) {
      this.seed = seed >>> 0;
      this.rng = Rng(this.seed);
      this.params = Object.assign({}, DEFAULT_PARAMS, params || {});
      this.initialParams = Object.assign({}, this.params);
      this.events = [];                         // param changes, with the move index they took effect at
      this.maze = new Maze(this.rng);
      this.bed = new Riverbed();
      this.habits = new Habits();
      this.model = new Model();
      this.mazeIndex = 1; this.mazes = [{ index: 1, ep: 1, shortest: this.maze.shortest }];
      this.episode = 1; this.history = []; this.rotations = []; this.log = [];
      this.totalMoves = 0; this.sinceRotation = 0; this.last = null;
      this.resetPlayer();
    }
    resetPlayer() {
      this.pos = [this.maze.start[0], this.maze.start[1]]; this.from = '-'; this.trail = [];
      this.visited = new Set([key(this.pos[0], this.pos[1])]); this.scratch = new Map(); this.moves = 0; this.bumps = 0;
    }

    /** the gate on the upward edge: is level 1 converging in this maze? */
    competent() {
      const recent = this.history.slice(-5).filter(h => h.maze === this.mazeIndex);
      return recent.filter(h => !h.reached).length <= 1;
    }
    /** a carve at level 1 that also reaches level 2 — but only while level 1 is worth listening to */
    carve(x, y, d, sit, v) { this.bed.carve(x, y, d, v); if (this.competent()) this.habits.carve(sit, d, v); }

    /** change a lever mid-run; recorded so the run stays replayable */
    setParam(name, value) {
      if (!(name in DEFAULT_PARAMS)) throw new Error('unknown param ' + name);
      this.params[name] = value; this.events.push({ t: this.totalMoves, name, value });
    }

    tick() {                                                    // fast loop: one move
      const p = this.params, bed = this.bed, maze = this.maze;
      const [x, y] = this.pos;
      const sit = situation(maze, x, y, this.from);
      const cell = bed.recall(x, y), habit = this.habits.recall(sit);
      const scratch = this.scratch.get(key(x, y)) || { N: 0, E: 0, S: 0, W: 0 };
      const groove = { N: 0, E: 0, S: 0, W: 0 };                // seed = this maze's groove + the habit for this kind of place + this run's scratch
      for (const dd of DIRS) groove[dd] = cell[dd] + p.habit * habit[dd] + scratch[dd];
      const explored = this.rng() < p.explore;
      let d, overruled = null;
      if (explored) d = this.rng.pick(DIRS);                    // variation
      else {                                                    // the planner: imagine each move, pay imagined pain first
        const argmax = g => { let top = -Infinity; for (const dd of DIRS) if (g[dd] > top) top = g[dd]; return DIRS.filter(dd => g[dd] === top); };
        const imagined = { N: 0, E: 0, S: 0, W: 0 };
        for (const dd of DIRS) imagined[dd] = groove[dd] - p.imagine * this.model.pWall(sit, dd);
        const plain = argmax(groove), planned = argmax(imagined);
        d = this.rng.pick(planned);
        if (!plain.includes(d)) overruled = plain[0];           // imagination changed the choice
      }
      const verdict = maze.judge(x, y, d);                      // pain
      this.model.observe(sit, d, verdict.kind === 'wall');      // the planner's own Matter: real vs imagined
      let note;
      if (verdict.kind === 'wall') { bed.carve(x, y, d, -1); this.habits.carve(sit, d, -1); this.bumps++; note = 'hit a wall'; }   // physics: always flows up
      else {
        this.trail.push({ x, y, d, sit });
        this.pos = [verdict.x, verdict.y]; this.from = OPP[d];
        const k = key(verdict.x, verdict.y);
        if (this.visited.has(k)) {                              // loop pain: this run's working memory only
          const kk = key(x, y); const g = this.scratch.get(kk) || { N: 0, E: 0, S: 0, W: 0 }; g[d] -= SCRATCH_PAIN; this.scratch.set(kk, g);
          note = 'looped back into a known cell';
        }
        else { this.visited.add(k); note = 'stepped into new ground'; }
        if (verdict.kind === 'goal') {                          // gain flows back along the trail, fading
          const seen = new Set(); let fade = REWARD;
          for (let i = this.trail.length - 1; i >= 0; i--) {
            const t = this.trail[i], id = t.x + ',' + t.y + ',' + t.d;
            if (seen.has(id)) continue; seen.add(id);
            this.carve(t.x, t.y, t.d, t.sit, fade); fade *= p.gamma;
          }
          note = 'reached the goal — the trail is carved';
        }
      }
      this.moves++; this.totalMoves++;
      this.last = { x, y, d, sit, explored, overruled, flat: bed.depth(cell) < 0.1, habitSaid: this.habits.depth(habit) >= 0.5 ? DIRS.reduce((b, dd) => habit[dd] > habit[b] ? dd : b) : null, gate: this.competent(), note };
      if (this.totalMoves % 100 === 0) bed.erode(p.decay, p.cap);          // slow loop: this maze's memory
      if (this.totalMoves % 1000 === 0) this.habits.erode();                // slower loop: habits
      const gaveUp = this.moves >= moveCap(maze) && verdict.kind !== 'goal';
      if (gaveUp) this.last.note = 'gave up — the master calls the run';
      if (verdict.kind === 'goal' || gaveUp) this.gameMaster(verdict.kind === 'goal');
      return this.last;
    }

    gameMaster(reached) {                                        // slowest loop
      const maze = this.maze;
      const first = this.history.length === 0 || this.history[this.history.length - 1].maze !== this.mazeIndex;
      this.history.push({ ep: this.episode, maze: this.mazeIndex, first, steps: this.moves, bumps: this.bumps, reached, shortest: maze.shortest });
      this.log.push('run ' + String(this.episode).padStart(3) + '  ' +
        (reached ? String(this.moves).padStart(3) + ' moves  ' + (this.moves / maze.shortest).toFixed(1) + '× shortest' : 'gave up            ') +
        '  bumps ' + String(this.bumps).padStart(3) + (first ? '  ← first run in maze ' + this.mazeIndex : ''));
      this.sinceRotation++;
      const recent = this.history.slice(-8);
      const steps = recent.map(h => h.steps).sort((a, b) => a - b), median = (steps[3] + steps[4]) / 2, best = steps[0];
      const allReached = recent.every(h => h.reached);
      // "solved" = the player has settled: eight runs in a row reached the goal and the typical run is within 20% of the best of them
      if (this.sinceRotation >= 8 && allReached && median <= best * 1.2) {
        // solved: the game master hands the player a NEW maze. The riverbed was about the old one; the habits stay.
        this.maze = new Maze(this.rng); this.bed = new Riverbed(); this.sinceRotation = 0;
        this.mazeIndex++; this.mazes.push({ index: this.mazeIndex, ep: this.episode + 1, shortest: this.maze.shortest });
        this.rotations.push({ ep: this.episode, maze: this.mazeIndex });
        this.log.push('          solved — game master swaps in maze ' + this.mazeIndex + ' (shortest ' + this.maze.shortest + ')');
      }
      if (this.log.length > 400) this.log.splice(0, this.log.length - 400);
      this.episode++; this.resetPlayer();
    }

    /** everything needed to replay this run and check the result */
    exportRun() {
      return {
        version: VERSION, seed: this.seed, params: this.initialParams, events: this.events,
        totalMoves: this.totalMoves, episode: this.episode,
        maze: { n: N, index: this.mazeIndex, walls: this.maze.serialize(), start: this.maze.start, goal: this.maze.goal, shortest: this.maze.shortest },
        mazes: this.mazes, history: this.history, rotations: this.rotations, grooves: this.bed.serialize(), habits: this.habits.serialize(),
        model: this.model.serialize(), surprise: this.model.surprise,
      };
    }

    /** rebuild a run from its export by replaying; returns the fresh sim */
    static replay(run) {
      if (run.version !== VERSION) throw new Error('export is ' + run.version + ', this core is ' + VERSION);
      const sim = new Sim(run.seed, run.params);
      const events = [...run.events].sort((a, b) => a.t - b.t);
      let e = 0;
      for (let t = 0; t < run.totalMoves; t++) {
        while (e < events.length && events[e].t <= t) { sim.params[events[e].name] = events[e].value; e++; }
        sim.tick();
      }
      return sim;
    }
  }

  /** compare an export with a replay; returns { ok, diffs } */
  function verify(run) {
    const sim = Sim.replay(run);
    const fresh = sim.exportRun();
    const diffs = [];
    const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    if (!eq(fresh.maze.walls, run.maze.walls)) diffs.push('maze walls differ');
    if (!eq(fresh.maze.goal, run.maze.goal)) diffs.push('goal: replay ' + fresh.maze.goal + ' vs export ' + run.maze.goal);
    if (fresh.episode !== run.episode) diffs.push('episode: replay ' + fresh.episode + ' vs export ' + run.episode);
    const n = Math.min(fresh.history.length, run.history.length);
    for (let i = 0; i < n; i++) if (!eq(fresh.history[i], run.history[i])) { diffs.push('history diverges at run ' + run.history[i].ep + ': replay ' + JSON.stringify(fresh.history[i]) + ' vs export ' + JSON.stringify(run.history[i])); break; }
    if (fresh.history.length !== run.history.length) diffs.push('history length: replay ' + fresh.history.length + ' vs export ' + run.history.length);
    if (!eq(fresh.rotations, run.rotations)) diffs.push('rotations differ');
    const keys = new Set([...Object.keys(fresh.grooves), ...Object.keys(run.grooves)]);
    let grooveDiffs = 0;
    for (const k of keys) {
      const a = fresh.grooves[k], b = run.grooves[k];
      if (!a || !b || a.some((v, i) => Math.abs(v - b[i]) > 1e-9)) grooveDiffs++;
    }
    if (grooveDiffs) diffs.push(grooveDiffs + ' cell(s) differ in the riverbed');
    const hkeys = new Set([...Object.keys(fresh.habits), ...Object.keys(run.habits || {})]);
    let habitDiffs = 0;
    for (const k of hkeys) {
      const a = fresh.habits[k], b = (run.habits || {})[k];
      if (!a || !b || a.some((v, i) => Math.abs(v - b[i]) > 1e-9)) habitDiffs++;
    }
    if (habitDiffs) diffs.push(habitDiffs + ' situation(s) differ in the habits');
    if (JSON.stringify(fresh.model) !== JSON.stringify(run.model)) diffs.push('the planner\'s model differs');
    return { ok: diffs.length === 0, diffs, sim };
  }

  const LoopMaze = { VERSION, N, DIRS, DELTA, OPP, MAX_MOVES, REWARD, DEFAULT_PARAMS, Rng, Maze, Riverbed, Habits, Model, Sim, verify, key, situation, moveCap };
  root.LoopMaze = LoopMaze;
  if (typeof module !== 'undefined' && module.exports) module.exports = LoopMaze;
})(typeof globalThis !== 'undefined' ? globalThis : this);

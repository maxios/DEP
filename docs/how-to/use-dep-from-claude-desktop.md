---
dep:
  type: how-to
  audience:
    - project-lead
    - ai-agent
  owner: "@dep-core"
  created: 2026-09-11T10:00:00+03:00
  last_verified: 2026-09-11T10:00:00+03:00
  confidence: high
  depends_on:
    - packages/dep-mcp/index.mjs
    - cli/src/mcp/tools.ts
  tags:
    - mcp
    - integration
    - install
  links:
    - target: assemble-a-context-bundle.md
      rel: USES
    - target: ../reference/context-bundle-schema.md
      rel: USES
---

# How-To: Use DEP from Claude Desktop

**Goal**: Give Claude Desktop (or any MCP client) DEP's knowledge and DAP's procedures as tools, with the CLI installed and kept current on every machine from one line of configuration.

## Prerequisites

- A project with a `.docspec`
- The `dep` CLI installed (`install.sh` on macOS/Linux, `install.ps1` on Windows, or `dep upgrade` if an older one is present). Node is **not** required.

## Steps

### 1. Print the entry for this machine

```bash
dep mcp --print-config --root /path/to/your/project
```

The output names the installed binary and the project root with absolute paths, which is what Claude Desktop needs — `~` and `%USERPROFILE%` are not expanded in its configuration.

### 2. Add it to Claude Desktop

Merge the printed `mcpServers.dep` entry into `claude_desktop_config.json` (macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`) and restart Claude Desktop.

### 3. Let the server keep the CLI current

Each time it starts, `dep mcp` looks for a newer release at most once a day and replaces the binary (after running the download and requiring it to report a version), keeping the previous one as `dep.prev`. Put `"env": { "DEP_MCP_UPGRADE": "never" }` in the entry to turn that off, or `"always"` to check on every start.

### 4. Alternatively, let a launcher install it (needs Node 18+)

If the machine has Node and you would rather not install the binary yourself, the `@maxios/dep-mcp` launcher does the install and the daily upgrade, then starts `dep mcp`:

```json
{ "mcpServers": { "dep": { "command": "npx", "args": ["-y", "@maxios/dep-mcp", "--root", "/path/to/your/project"] } } }
```

It is published on GitHub Packages, so `~/.npmrc` needs `@maxios:registry=https://npm.pkg.github.com` and a token with `read:packages` (GitHub requires one even for public packages). Without Node, use steps 1–3.

### 5. Use the tools

| Tool | Use it to |
|------|-----------|
| `dep_context` | Load the passages a task needs, packed to a budget, stale ones withheld, each with provenance |
| `dep_search` | Rank documents for a query |
| `dep_validate`, `dep_graph`, `dep_query`, `dep_metadata` | Inspect the set |
| `dep_index` | Bring the retrieval index up to date |
| `dap_resolve`, `dap_node`, `dap_trace` | Find a procedure and follow it one step at a time |
| `dep_version` | Confirm which CLI is serving |

Every tool takes an optional `root`, so one server can serve several projects.

## Verification

- `dep mcp --print-config` prints an entry whose `command` exists on disk
- Claude Desktop lists the eleven tools under the `dep` server
- `dep_version` reports 0.3.0 or newer

## Related

- The CLI-side command the launcher runs: `dep mcp --root <project>`
- [Keep the retrieval index current](keep-the-index-current.md) — `dep_index` is the same operation

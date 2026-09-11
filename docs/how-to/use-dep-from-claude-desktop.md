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

- Node 18 or newer on the machine (the launcher runs under Node; the CLI itself needs nothing)
- A project with a `.docspec`

## Steps

### 1. Point npm at GitHub Packages

The launcher is published on GitHub Packages under the `@maxios` scope, which npm must be told about — and, by GitHub's rule, needs a token with `read:packages` even for a public package. Once per machine:

```bash
cat >> ~/.npmrc <<'EOF'
@maxios:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
EOF
```

### 2. Add the server to Claude Desktop

In `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dep": {
      "command": "npx",
      "args": ["-y", "@maxios/dep-mcp", "--root", "/path/to/your/project"]
    }
  }
}
```

Without the registry setup, point at the file in a checkout: `"command": "node", "args": ["/path/to/DEP/packages/dep-mcp/index.mjs", "--root", "/path/to/your/project"]`.

### 3. Let the launcher place the CLI

On first start the launcher downloads the release for the machine's operating system and architecture to `~/.dep/bin/dep` (`~/.dep/bin/dep.exe` on Windows), runs it, requires it to report a version, and only then moves it into place. Set `DEP_HOME` to move the whole tree.

### 4. Let it keep the CLI current

Once a day the launcher asks for the latest release and installs it before starting the server, keeping the previous binary as `dep.prev`. `DEP_MCP_UPGRADE=never` (or `--no-upgrade`) turns this off; `DEP_VERSION=v0.3.0` pins a release.

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

- `node packages/dep-mcp/index.mjs --print-location` prints the path the CLI will live at
- Claude Desktop lists the eleven tools under the `dep` server
- `dep_version` reports 0.3.0 or newer

## Related

- The CLI-side command the launcher runs: `dep mcp --root <project>`
- [Keep the retrieval index current](keep-the-index-current.md) — `dep_index` is the same operation

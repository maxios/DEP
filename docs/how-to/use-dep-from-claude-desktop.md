---
dep:
  type: how-to
  audience:
    - project-lead
    - ai-agent
  owner: "@dep-core"
  created: 2026-09-11T10:00:00+03:00
  last_verified: 2026-09-11T15:28:12.451+03:00
  confidence: high
  depends_on:
    - cli/src/commands/setup.ts
    - cli/src/mcp/tools.ts
    - cli/scripts/bundle.ts
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

**Goal**: Give Claude Desktop (or any MCP client) DEP's knowledge and DAP's procedures as tools, on macOS, Linux or Windows — including a Windows machine where scripts and PowerShell are blocked.

## Prerequisites

- A project with a `.docspec`
- Nothing else: the CLI is one self-contained file and needs no runtime, shell or script

## Steps

Pick one of the three routes; they end in the same place.

### Route A — the bundle (no terminal, no file editing)

1. Download the bundle for the machine from the latest release: `dep-windows-x64.mcpb`, `dep-darwin-arm64.mcpb`, `dep-darwin-x64.mcpb`, `dep-linux-x64.mcpb` or `dep-linux-arm64.mcpb`.
2. Open it with Claude Desktop (Settings → Extensions, or double-open the file). Claude Desktop copies the CLI inside it, asks for the **Project root** folder, and writes its own configuration.
3. Restart Claude Desktop; the `dep` server lists eleven tools.

### Route B — the binary sets itself up (one file, no scripts)

1. Download the CLI for the machine: `dep-windows-x64.exe` (or `dep-darwin-…`, `dep-linux-…`) from the latest release.
2. Run it once with `setup`, naming the project:

   ```
   dep-windows-x64.exe setup --root C:\path\to\project
   ```

   On Windows a downloaded copy opened with no arguments does the same thing and waits for Enter before closing. `setup` copies the file to `~/.dep/bin`, adds that folder to the user's PATH (through the registry — no shell involved), merges a `dep` entry into `claude_desktop_config.json` (other servers kept, previous file kept as `.bak`), and runs the self-check.
3. Restart Claude Desktop.

On Windows without PowerShell, `install.cmd` does the download for you with nothing but `cmd` and `curl.exe`:

```
curl.exe -fsSL -o %TEMP%\install-dep.cmd https://raw.githubusercontent.com/maxios/DEP/main/install.cmd && %TEMP%\install-dep.cmd --root C:\path\to\project
```

### Route C — an installed CLI writes or prints the entry

```bash
dep setup --root /path/to/project              # writes claude_desktop_config.json
dep mcp --print-config --root /path/to/project # or prints the entry to paste
```

The entry names the binary and the project with absolute paths, which is what Claude Desktop needs (`~` and `%USERPROFILE%` are not expanded there).

### Keeping the CLI current

Each time it starts, `dep mcp` looks for a newer release at most once a day and replaces the binary after running the download and requiring it to report a version; the previous binary is kept as `dep.prev`. Put `"env": { "DEP_MCP_UPGRADE": "never" }` in the entry to turn that off.

### With Node 18+ only: a launcher that installs for you

`@maxios/dep-mcp` (GitHub Packages) installs the CLI and starts the server: `"command": "npx", "args": ["-y", "@maxios/dep-mcp", "--root", "/path/to/project"]`, with `~/.npmrc` carrying `@maxios:registry=https://npm.pkg.github.com` and a token with `read:packages`. Routes A–C need none of this.

### The tools

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

- `dep doctor` ends with "All checks pass" — its `mcp` check performs the same handshake Claude Desktop does
- Claude Desktop lists the eleven tools under the `dep` server; `dep_version` reports 0.3.3 or newer

## Related

- [Keep the retrieval index current](keep-the-index-current.md) — `dep_index` is the same operation
- Windows SmartScreen warns once on any unsigned download; that is a signing question, not an installation one

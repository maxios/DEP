# @dep/mcp

Starts the DEP MCP server for Claude Desktop (or any MCP client), installing the
`dep` CLI first if the machine does not have it and keeping it current.

```
  npx -y @dep/mcp --root /path/to/project
        │
        ├─ ~/.dep/bin/dep missing?  ──▶ download latest release for this OS/arch,
        │                               run it, require it to report a version,
        │                               then move it into place
        ├─ checked today already?   ──▶ skip the release service
        ├─ newer release published? ──▶ install it, keep the old one as dep.prev
        └─ exec  dep mcp --root /path/to/project      (stdout = MCP, stderr = notes)
```

The CLI lives at the same place on every operating system: `~/.dep/bin/dep`
(`~/.dep/bin/dep.exe` on Windows). Set `DEP_HOME` to move the whole tree.

## Claude Desktop

`claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "dep": {
      "command": "npx",
      "args": ["-y", "@dep/mcp", "--root", "/path/to/your/project"]
    }
  }
}
```

Until the package is on npm, point at the file directly:

```json
{ "mcpServers": { "dep": { "command": "node", "args": ["/path/to/DEP/packages/dep-mcp/index.mjs", "--root", "/path/to/your/project"] } } }
```

The server offers `dep_context`, `dep_search`, `dep_validate`, `dep_graph`,
`dep_query`, `dep_metadata`, `dep_index`, `dap_resolve`, `dap_node`,
`dap_trace` and `dep_version`. Every tool takes an optional `root`, so one
server can serve several projects.

## Environment

| Variable | Default | Meaning |
|---|---|---|
| `DEP_HOME` | `~/.dep` | Where the CLI, its native libraries and model cache live |
| `DEP_VERSION` | latest | Pin a release tag |
| `DEP_MCP_UPGRADE` | `daily` | `daily` \| `always` \| `never` — how often to ask for a newer release (`--no-upgrade` for one run) |
| `DEP_RELEASES_API`, `DEP_RELEASES_DOWNLOAD` | GitHub | Where releases are looked up and downloaded |

`--print-location` prints the CLI path and exits.

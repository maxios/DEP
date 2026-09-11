# Install DEP on this machine — instructions for an AI agent

You are installing the `dep` CLI (Documentation Engineering Protocol) for the
person you are helping. Work through the steps in order. Run the commands
yourself wherever you have a shell; where you do not, give the person the exact
command and wait for its output. Stop at the first failure and go to step 5.

Ground rules:

- Install only under the user's home: `~/.dep` (Windows: `%USERPROFILE%\.dep`). No `sudo`, no system directories, no package managers.
- Never paste tokens, keys or the contents of `.npmrc`/`.env` into any output or report.
- Say what you did, where the binary is, and what version it reports — before you stop.

## 1. Detect the platform

```
  uname -s / uname -m          (macOS, Linux)
  $env:PROCESSOR_ARCHITECTURE  (Windows PowerShell)

  OS       ARCH            RELEASE ASSET            INSTALL LOCATION
  ───────  ──────────────  ───────────────────────  ─────────────────────────────
  macOS    arm64           dep-darwin-arm64         ~/.dep/bin/dep
  macOS    x86_64          dep-darwin-x64           ~/.dep/bin/dep
  Linux    x86_64          dep-linux-x64            ~/.dep/bin/dep
  Linux    aarch64/arm64   dep-linux-arm64          ~/.dep/bin/dep
  Windows  AMD64           dep-windows-x64.exe      %USERPROFILE%\.dep\bin\dep.exe
```

Any other combination is not published: skip to step 5 and file the report
with the platform named — do not try to build from source unless asked.

## 2. Install

macOS or Linux:

```bash
curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh
export PATH="$HOME/.dep/bin:$PATH"
```

Windows (PowerShell):

```powershell
irm https://raw.githubusercontent.com/maxios/DEP/main/install.ps1 | iex
```

Both scripts download the asset from the latest GitHub Release, place it at the
location above, and add `~/.dep/bin` to the user's PATH. If a script cannot be
fetched, download the asset directly from
`https://github.com/maxios/DEP/releases/latest/download/<asset>`, make it
executable (`chmod +x` on macOS/Linux), and put it at the install location.

If the person already has `dep` and it is older than 0.3.2, run `dep upgrade`
instead of reinstalling.

## 3. Prove it works

```bash
dep version          # must print: dep 0.3.2 or newer
dep doctor           # must end with: All checks pass — dep works on this machine.
```

`dep doctor` builds a throwaway project and checks, on this machine, that the
binary runs, its home is writable, and that it validates, indexes (offline),
answers a context bundle and serves MCP:

```
  ✓ version           dep 0.3.2 (standalone binary)
  ✓ home              ~/.dep is writable
  ✓ validate          2 document(s) pass, graph checks pass
  ✓ index             2 document(s), 4 chunks, provider hash:v1-4096
  ✓ context           2 passage(s), ranking hybrid
  ✓ mcp               server dep 0.3.2 answered initialize

All checks pass — dep works on this machine.
```

If the person will use meaning-based search with the built-in model, also run
`dep doctor --full` once; it downloads the model (about 90 MB) and reports how
long it took to load.

## 4. Connect it

Claude Desktop — the CLI prints the exact entry for this machine (absolute
paths, works on Windows, needs nothing but the binary):

```bash
dep mcp --print-config --root /path/to/project
```

Merge its output into `claude_desktop_config.json`
(macOS: `~/Library/Application Support/Claude/`, Windows: `%APPDATA%\Claude\`).
It looks like this:

```json
{ "mcpServers": { "dep": { "command": "C:\\Users\\NAME\\.dep\\bin\\dep.exe", "args": ["mcp", "--root", "C:\\path\\to\\project"] } } }
```

The server looks for a newer release each day when it starts and replaces
itself, so this entry stays current with no other runtime involved.
(`DEP_MCP_UPGRADE=never` in the entry's `env` turns that off.)

Only if the person prefers not to install the binary by hand *and* has Node 18+:
the `@maxios/dep-mcp` launcher does steps 2–3 itself —
`"command": "npx", "args": ["-y", "@maxios/dep-mcp", "--root", "/path/to/project"]`,
with `~/.npmrc` pointed at GitHub Packages (`@maxios:registry=https://npm.pkg.github.com`
plus a token with `read:packages`). Do not assume Node exists; check with `node --version` first.

Claude Code — `/plugin marketplace add maxios/DEP` then `/plugin install dep@dep-marketplace`.

Then point it at a project: `dep validate --root <project>` should list the
project's documents.

## 5. If anything failed: file a report

Collect, in this order, whichever you have:

1. `dep doctor --json` output (or, if `dep` does not run at all: the exact command, its exit code and the last 30 lines it printed).
2. The platform line from step 1.
3. Which step failed and what you had already done.

Then file it on the project's issue tracker — one of, in order of preference:

```bash
# a) the CLI writes the report and prints a prefilled link — open it, or give it to the person
dep doctor --issue

# b) GitHub CLI is available and signed in
dep doctor --json > /tmp/dep-doctor.json
gh issue create --repo maxios/DEP \
  --title "install: <os>-<arch>: <failing check or step>" \
  --body-file /tmp/dep-doctor.json

# c) neither: give the person this link and the report text to paste
https://github.com/maxios/DEP/issues/new
```

Title format: `install: <os>-<arch>: <what failed>` — for example
`install: linux-arm64: mcp check failed` or `install: windows-x64: install.ps1 download 404`.
Redact anything that looks like a token or a password before it leaves the machine;
`dep doctor` already replaces the user's home directory with `~`.

## 6. Report back to the person

Three lines: where `dep` is installed, what `dep version` and `dep doctor`
said, and — if anything failed — the link to the issue you filed.

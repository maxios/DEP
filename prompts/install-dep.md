# Install DEP on this machine — instructions for an AI agent

You are installing the `dep` CLI (Documentation Engineering Protocol) for the
person you are helping. Work through the steps in order. Run the commands
yourself wherever you have a shell; where you do not, give the person the exact
command and wait for its output. Stop at the first failure and go to step 5.

Ground rules:

- Install only under the user's home: `~/.dep` (Windows: `%USERPROFILE%\.dep`). No `sudo`, no system directories, no package managers.
- Never assume PowerShell, Node, npm or any runtime is available. The CLI is one self-contained file and installs itself.
- Never paste tokens, keys or the contents of `.npmrc`/`.env` into any output or report.
- Say what you did, where the binary is, and what version it reports — before you stop.

## 1. Detect the platform

```
  uname -s / uname -m          (macOS, Linux)
  echo %PROCESSOR_ARCHITECTURE%  (Windows, cmd)

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

## 2. Get the file onto the machine

Pick the first option that works on this machine. All of them end with the
same binary in the same place; the binary then does the rest itself.

**Windows, no PowerShell** (cmd only — `curl.exe` ships with Windows 10 1803+):

```cmd
curl.exe -fsSL -o %TEMP%\install-dep.cmd https://raw.githubusercontent.com/maxios/DEP/main/install.cmd && %TEMP%\install-dep.cmd --root C:\path\to\project
```

**Windows, no terminal at all:** download
`https://github.com/maxios/DEP/releases/latest/download/dep-windows-x64.exe`
in a browser and open it. A downloaded copy run with no arguments installs
itself, registers with Claude Desktop (asks for nothing if run from inside the
project folder; otherwise run it later with `setup --root <project>`), runs its
self-check, and waits for Enter before closing. SmartScreen will warn once
about an unsigned download — "More info → Run anyway".

**Windows with PowerShell allowed:** `irm https://raw.githubusercontent.com/maxios/DEP/main/install.ps1 | iex`

**macOS or Linux:**

```bash
curl -fsSL https://raw.githubusercontent.com/maxios/DEP/main/install.sh | sh
export PATH="$HOME/.dep/bin:$PATH"
```

**Any OS, by hand:** download the asset from
`https://github.com/maxios/DEP/releases/latest/download/<asset>`, make it
executable on macOS/Linux (`chmod +x`), and run `<asset> setup --root <project>`.
`setup` copies the file to the install location, puts it on the user's search
path (Windows registry, no shell needed), writes the Claude Desktop entry, and
runs the self-check.

If the person already has `dep` and it is older than 0.3.3, run `dep upgrade`.

## 3. Prove it works

```bash
dep version          # must print: dep 0.3.3 or newer
dep doctor           # must end with: All checks pass — dep works on this machine.
```

`dep doctor` builds a throwaway project and checks, on this machine, that the
binary runs, its home is writable, and that it validates, indexes (offline),
answers a context bundle and serves MCP:

```
  ✓ version           dep 0.3.3 (standalone binary)
  ✓ home              ~/.dep is writable
  ✓ validate          2 document(s) pass, graph checks pass
  ✓ index             2 document(s), 4 chunks, provider hash:v1-4096
  ✓ context           2 passage(s), ranking hybrid
  ✓ mcp               server dep 0.3.3 answered initialize

All checks pass — dep works on this machine.
```

If the person will use meaning-based search with the built-in model, also run
`dep doctor --full` once; it downloads the model (about 90 MB) and reports how
long it took to load.

## 4. Connect it to Claude Desktop

If step 2 ran `setup` with `--root`, this is already done — the entry is in
`claude_desktop_config.json`; tell the person to restart Claude Desktop.
Otherwise, one of:

```bash
dep setup --root /path/to/project        # writes the entry (merges; keeps other servers; backs up to .bak)
dep mcp --print-config --root /path/to/project   # prints the entry to paste by hand
```

The entry points straight at the binary with absolute paths and needs nothing
else on the machine. The server checks for a newer release each day when it
starts and replaces itself (`DEP_MCP_UPGRADE=never` in the entry's `env`
turns that off).

Alternative with no terminal and no file editing: the release also carries a
Claude Desktop bundle per platform (`dep-<os>-<arch>.mcpb`). Open it with
Claude Desktop → it asks for the project folder → done.

Alternative for machines that have Node 18+: the `@maxios/dep-mcp` launcher
(`"command": "npx", "args": ["-y", "@maxios/dep-mcp", "--root", …]`, with
`~/.npmrc` pointed at GitHub Packages). Check `node --version` first; never
assume it.

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
dep doctor --json > %TEMP%\dep-doctor.json      (Windows)   /   /tmp/dep-doctor.json
gh issue create --repo maxios/DEP --title "install: <os>-<arch>: <failing check or step>" --body-file <that file>

# c) neither: give the person this link and the report text to paste
https://github.com/maxios/DEP/issues/new
```

Title format: `install: <os>-<arch>: <what failed>` — for example
`install: linux-arm64: mcp check failed` or `install: windows-x64: install.cmd download 404`.
Redact anything that looks like a token or a password before it leaves the machine;
`dep doctor` already replaces the user's home directory with `~`.

## 6. Report back to the person

Three lines: where `dep` is installed, what `dep version` and `dep doctor`
said, and — if anything failed — the link to the issue you filed.

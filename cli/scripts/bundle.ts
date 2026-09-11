#!/usr/bin/env bun
/**
 * Build Claude Desktop bundles (.mcpb) from the standalone binaries.
 *
 *   bun run scripts/bundle.ts --target=windows-x64          # dist/dep-windows-x64.mcpb
 *   bun run scripts/bundle.ts --all                          # one per built binary in dist/
 *   bun run scripts/bundle.ts --target=… --binary=<file> --out=<dir>   # tests
 *
 * A bundle is a zip with manifest.json at the root and the binary under
 * server/. Claude Desktop installs it, asks for the project root, and runs
 * `dep mcp --root <root>` itself — no terminal, script or runtime involved.
 * Format: https://github.com/modelcontextprotocol/mcpb/blob/main/MANIFEST.md
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { zip } from "./zip";
import pkg from "../package.json";

const PLATFORMS: Record<string, "darwin" | "win32" | "linux"> = {
  "darwin-arm64": "darwin",
  "darwin-x64": "darwin",
  "linux-x64": "linux",
  "linux-arm64": "linux",
  "windows-x64": "win32",
};

const cliDir = join(import.meta.dir, "..");
const distDir = join(cliDir, "dist");

function arg(name: string): string | undefined {
  return process.argv.find((a) => a.startsWith(`--${name}=`))?.slice(name.length + 3);
}

function assetFor(target: string): string {
  return `dep-${target}${target.startsWith("windows") ? ".exe" : ""}`;
}

export function manifest(target: string, version: string) {
  const platform = PLATFORMS[target];
  if (!platform) throw new Error(`unknown target ${target}`);
  return {
    manifest_version: "0.3",
    name: "dep",
    display_name: "DEP — Documentation Engineering Protocol",
    version,
    description: "Governed documentation as tools: budgeted context bundles with provenance, validation, the documentation graph, and DAP decision procedures one step at a time.",
    long_description: "DEP structures knowledge; DAP structures decisions. Ask dep_context for the passages a task needs — packed to a token budget, stale knowledge withheld, every passage naming its document, section and freshness — instead of reading whole documents. dap_resolve finds the procedure for a request; dap_node hands you one step at a time.",
    author: { name: "dep-core", url: "https://github.com/maxios/DEP" },
    repository: { type: "git", url: "https://github.com/maxios/DEP" },
    homepage: "https://github.com/maxios/DEP",
    license: "MIT",
    keywords: ["documentation", "context", "retrieval", "dap", "decisions"],
    server: {
      type: "binary",
      entry_point: "server/dep",
      mcp_config: {
        command: "${__dirname}/server/dep",
        args: ["mcp", "--root", "${user_config.project_root}"],
        env: { DEP_HOME: "${HOME}/.dep" },
      },
    },
    tools: [
      { name: "dep_context", description: "Passages for a question, packed to a budget, with provenance" },
      { name: "dep_search", description: "Documents ranked for a query" },
      { name: "dep_validate", description: "One verdict per document plus graph integrity" },
      { name: "dep_graph", description: "The documentation graph" },
      { name: "dep_query", description: "Documents narrowed by metadata" },
      { name: "dep_metadata", description: "A document's metadata and freshness" },
      { name: "dep_index", description: "Bring the retrieval index up to date" },
      { name: "dap_resolve", description: "Find the procedure for a request" },
      { name: "dap_node", description: "One step of a procedure" },
      { name: "dap_trace", description: "A whole procedure, for review" },
      { name: "dep_version", description: "The CLI version serving these tools" },
    ],
    user_config: {
      project_root: {
        type: "directory",
        title: "Project root",
        description: "The folder that holds the project's .docspec (every tool also accepts a root per call).",
        required: true,
      },
    },
    compatibility: {
      claude_desktop: ">=0.10.0",
      platforms: [platform],
    },
  };
}

export function buildBundle(target: string, binaryPath: string, outDir: string, version = pkg.version): string {
  if (!PLATFORMS[target]) throw new Error(`unknown target ${target}; known: ${Object.keys(PLATFORMS).join(", ")}`);
  const binary = readFileSync(binaryPath);
  const serverName = target.startsWith("windows") ? "server/dep.exe" : "server/dep";
  const bytes = zip([
    { name: "manifest.json", data: new TextEncoder().encode(JSON.stringify(manifest(target, version), null, 2) + "\n"), mode: 0o644 },
    { name: serverName, data: new Uint8Array(binary), mode: 0o755 },
  ]);
  mkdirSync(outDir, { recursive: true });
  const out = join(outDir, `dep-${target}.mcpb`);
  writeFileSync(out, bytes);
  return out;
}

if (import.meta.main) {
  const out = arg("out") ?? distDir;
  const targets = process.argv.includes("--all")
    ? Object.keys(PLATFORMS).filter((t) => existsSync(join(distDir, assetFor(t))))
    : arg("target") ? [arg("target")!] : [];
  if (targets.length === 0) {
    console.error(`Usage: bun run scripts/bundle.ts --target=<${Object.keys(PLATFORMS).join("|")}> | --all   [--binary=<file>] [--out=<dir>]`);
    process.exit(1);
  }
  for (const target of targets) {
    const binary = arg("binary") ?? join(distDir, assetFor(target));
    if (!existsSync(binary)) {
      const built = existsSync(distDir) ? readdirSync(distDir).filter((f) => f.startsWith("dep-") && !f.endsWith(".mcpb")).map((f) => f.replace(/^dep-/, "").replace(/\.exe$/, "")) : [];
      console.error(`no built CLI for ${target} (${binary}); built platforms: ${built.join(", ") || "none"}`);
      process.exit(1);
    }
    const path = buildBundle(target, binary, out);
    console.log(`  ✓ ${path}`);
  }
}

#!/usr/bin/env bun

import { $ } from "bun";
import { rm, mkdir } from "fs/promises";
import { join } from "path";

const targets = [
  "bun-darwin-arm64",
  "bun-darwin-x64",
  "bun-linux-x64",
  "bun-linux-arm64",
] as const;

const cliDir = join(import.meta.dir, "..");
const distDir = join(cliDir, "dist");
const entryPoint = join(cliDir, "src", "index.ts");

// Clean and recreate dist directory
await rm(distDir, { recursive: true, force: true });
await mkdir(distDir, { recursive: true });

console.log("Building DEP CLI for all platforms...\n");

for (const target of targets) {
  const binaryName = `dep-${target.replace("bun-", "")}`;
  const outfile = join(distDir, binaryName);

  console.log(`Building ${binaryName}...`);
  await $`bun build --compile --target=${target} ${entryPoint} --outfile ${outfile}`;
  console.log(`  ✓ ${binaryName}\n`);
}

console.log("All builds complete. Binaries in cli/dist/");

#!/usr/bin/env bun
/**
 * Build standalone `dep` executables.
 *
 *   bun run scripts/build.ts            # every supported target into cli/dist/
 *   bun run scripts/build.ts --local    # current platform only, as cli/dist/dep
 *
 * The bundle swaps `sharp` for a stub (see src/embeddings/native/sharp-stub.ts)
 * and embeds each target's onnxruntime shared libraries (see src/embeddings/native.ts).
 */

import type { BunPlugin } from "bun";
import { rm, mkdir } from "fs/promises";
import { join } from "path";

const ALL_TARGETS = [
  "bun-darwin-arm64",
  "bun-darwin-x64",
  "bun-linux-x64",
  "bun-linux-arm64",
  "bun-windows-x64",
] as const;

type Target = (typeof ALL_TARGETS)[number];

const cliDir = join(import.meta.dir, "..");
const distDir = join(cliDir, "dist");
const entryPoint = join(cliDir, "src", "index.ts");

const stubSharp: BunPlugin = {
  name: "stub-sharp",
  setup(build) {
    build.onResolve({ filter: /^sharp$/ }, () => ({
      path: join(cliDir, "src", "embeddings", "native", "sharp-stub.ts"),
    }));
  },
};

async function compile(target: Target, outfile: string): Promise<void> {
  const result = await Bun.build({
    entrypoints: [entryPoint],
    plugins: [stubSharp],
    compile: { target, outfile },
  });
  if (!result.success) {
    for (const log of result.logs) console.error(String(log));
    throw new Error(`Build failed for ${target}`);
  }
}

const local = process.argv.includes("--local");

if (local) {
  const target = `bun-${process.platform}-${process.arch}` as Target;
  if (!ALL_TARGETS.includes(target)) throw new Error(`Unsupported platform: ${target}`);
  await mkdir(distDir, { recursive: true });
  const outfile = join(distDir, "dep");
  console.log(`Building dep for ${target}...`);
  await compile(target, outfile);
  console.log(`  ✓ ${outfile}`);
} else {
  // Clean and recreate dist directory
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  console.log("Building DEP CLI for all platforms...\n");

  for (const target of ALL_TARGETS) {
    const binaryName = `dep-${target.replace("bun-", "")}${target.includes("windows") ? ".exe" : ""}`;
    console.log(`Building ${binaryName}...`);
    await compile(target, join(distDir, binaryName));
    console.log(`  ✓ ${binaryName}\n`);
  }

  console.log("All builds complete. Binaries in cli/dist/");
}

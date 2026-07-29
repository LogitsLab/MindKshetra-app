#!/usr/bin/env node
/**
 * Regenerate PNG brand assets from store-assets/*.svg (Option A — lotus rings).
 * Requires: npx sharp-cli (pulled on demand).
 */
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const jobs = [
  ["store-assets/app-icon-1024.svg", "assets/icon.png", 1024, 1024],
  ["store-assets/app-icon-1024.svg", "assets/splash-icon.png", 1024, 1024],
  ["store-assets/play-icon-512.svg", "store-assets/play-icon-512.png", 512, 512],
  ["store-assets/app-icon-1024.svg", "store-assets/app-icon-1024.png", 1024, 1024],
  ["store-assets/android-fg.svg", "assets/android-icon-foreground.png", 512, 512],
  ["store-assets/android-bg.svg", "assets/android-icon-background.png", 512, 512],
  ["store-assets/android-mono.svg", "assets/android-icon-monochrome.png", 512, 512],
  ["store-assets/play-icon-512.svg", "assets/favicon.png", 48, 48],
];

for (const [input, output, w, h] of jobs) {
  const inPath = path.join(root, input);
  const outPath = path.join(root, output);
  execSync(
    `npx --yes sharp-cli resize ${w} ${h} --input "${inPath}" --output "${outPath}"`,
    { stdio: "inherit", cwd: root }
  );
  console.log(`✓ ${output}`);
}

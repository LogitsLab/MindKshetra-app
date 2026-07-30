#!/usr/bin/env node
/**
 * Resolve release notes + listing copy for the current app version.
 * Usage:
 *   node scripts/release-notes.mjs              # print notes
 *   node scripts/release-notes.mjs --json       # full payload
 *   node scripts/release-notes.mjs --write-env  # GITHUB_OUTPUT / .env.release
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const app = JSON.parse(readFileSync(join(root, "app.json"), "utf8"));
const listing = JSON.parse(readFileSync(join(root, "store/listing.json"), "utf8"));
const version = app.expo?.version;
if (!version) throw new Error("Missing expo.version in app.json");

const versionPath = join(root, "store/release-notes", `${version}.md`);
const defaultPath = join(root, "store/release-notes/DEFAULT.md");
const notesRaw = readFileSync(
  existsSync(versionPath) ? versionPath : defaultPath,
  "utf8"
);

function stripMd(md) {
  return md
    .replace(/^#+\s.*$/gm, "")
    .replace(/^\s*[-*]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const whatsNew = stripMd(notesRaw);
const payload = {
  version,
  whatsNew,
  whatsNewPlain: whatsNew.replace(/^• /gm, "- "),
  listing: listing.en,
  listingHi: listing.hi,
  shortDescription: listing.en.shortDescription,
  fullDescription: listing.en.fullDescription,
  iosSubmitNotes: listing.ios?.submitNotes ?? "",
  androidTrack: listing.android?.defaultTrack ?? "internal",
};

const args = new Set(process.argv.slice(2));

if (args.has("--json")) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
} else if (args.has("--write-env")) {
  const lines = [
    `VERSION=${version}`,
    `WHATS_NEW<<EOF`,
    whatsNew,
    `EOF`,
    `SHORT_DESCRIPTION=${JSON.stringify(listing.en.shortDescription)}`,
    `FULL_DESCRIPTION<<EOF`,
    listing.en.fullDescription,
    `EOF`,
  ].join("\n");
  writeFileSync(join(root, ".env.release"), `${lines}\n`);
  if (process.env.GITHUB_OUTPUT) {
    const out = [
      `version=${version}`,
      `whats_new<<NOTES_EOF`,
      whatsNew,
      `NOTES_EOF`,
      `short_description=${listing.en.shortDescription}`,
    ].join("\n");
    writeFileSync(process.env.GITHUB_OUTPUT, `${out}\n`, { flag: "a" });
  }
  process.stdout.write(`Wrote release notes for v${version}\n`);
} else if (args.has("--ensure-file")) {
  if (!existsSync(versionPath)) {
    mkdirSync(dirname(versionPath), { recursive: true });
    const stub = `# What's new in ${version}\n\n${listing.en.whatsNewFallback}\n`;
    writeFileSync(versionPath, stub);
    process.stdout.write(`Created ${versionPath}\n`);
  } else {
    process.stdout.write(`Exists ${versionPath}\n`);
  }
} else {
  process.stdout.write(`v${version}\n\n${whatsNew}\n`);
}

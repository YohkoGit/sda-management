#!/usr/bin/env node
// Fail the build if anyone re-introduces raw `font-mono text-[10px] uppercase tracking-[0.18em]`
// Tailwind sequences instead of using <Eyebrow> (or the `.eyebrow` CSS utility).
//
// Audit follow-up #4: the design-system migration replaced 38 sites; this
// guard keeps them gone.

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const SRC_DIR = join(__dirname, "..", "src");
const FORBIDDEN = "font-mono text-[10px] uppercase tracking-[0.18em]";
const EXTENSIONS = [".ts", ".tsx", ".js", ".jsx"];
const SKIP_DIRS = new Set(["api-generated", "node_modules", "__generated__"]);

async function* walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(join(dir, entry.name));
    } else if (EXTENSIONS.some((ext) => entry.name.endsWith(ext))) {
      yield join(dir, entry.name);
    }
  }
}

let offenders = [];
for await (const file of walk(SRC_DIR)) {
  const contents = await readFile(file, "utf8");
  if (!contents.includes(FORBIDDEN)) continue;
  const lines = contents.split(/\r?\n/);
  lines.forEach((line, i) => {
    if (line.includes(FORBIDDEN)) {
      offenders.push(`${relative(process.cwd(), file)}:${i + 1}`);
    }
  });
}

if (offenders.length > 0) {
  console.error(
    "\n[check-eyebrow] Raw Eyebrow Tailwind sequence found. Use <Eyebrow> or className=\"eyebrow\" instead.\n",
  );
  offenders.forEach((loc) => console.error("  " + loc));
  console.error("\nForbidden: " + FORBIDDEN + "\n");
  process.exit(1);
}
console.log("[check-eyebrow] No raw Eyebrow sequences found.");

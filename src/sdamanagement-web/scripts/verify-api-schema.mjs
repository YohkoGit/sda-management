#!/usr/bin/env node
// Lightweight smoke check for the committed OpenAPI-generated schema.
// Run via `npm run generate:api:check`. Designed for CI when a live backend
// isn't available — it just verifies that the committed schema.ts is a
// non-empty TypeScript module with the expected exports.

import { readFile, access } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const schemaPath = resolve(__dirname, "..", "src", "api-generated", "schema.ts");

async function main() {
  try {
    await access(schemaPath);
  } catch {
    console.log(
      `[generate:api:check] schema.ts is not committed yet. Skipping check.\n` +
        `Run \`npm run generate:api\` against a live backend to generate it.`,
    );
    process.exit(0);
  }

  const contents = await readFile(schemaPath, "utf8");
  if (contents.length < 200) {
    console.error(
      "[generate:api:check] schema.ts is suspiciously small (<200 bytes).",
    );
    process.exit(1);
  }
  for (const expected of ["export interface paths", "export interface components"]) {
    if (!contents.includes(expected)) {
      console.error(
        `[generate:api:check] schema.ts is missing expected export: \`${expected}\`. ` +
          `It may be corrupted or generated from a non-OpenAPI source.`,
      );
      process.exit(1);
    }
  }
  console.log("[generate:api:check] schema.ts looks healthy.");
}

main().catch((err) => {
  console.error("[generate:api:check] failed:", err);
  process.exit(1);
});

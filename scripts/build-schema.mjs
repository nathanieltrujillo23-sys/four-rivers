// Rebuilds supabase/schema.sql (the "paste it all into a new project" file) from the migrations folder:
// the baseline first, then every later migration in order.
//
//   node scripts/build-schema.mjs          write supabase/schema.sql
//   node scripts/build-schema.mjs --check  fail if schema.sql is out of date (used by CI)
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "supabase");
const dir = join(root, "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

const parts = files.map((f, i) =>
  i === 0
    ? readFileSync(join(dir, f), "utf8").trimEnd()
    : `\n-- ------------------------------------------------------------------ --\n-- ${f}\n-- ------------------------------------------------------------------ --\n${readFileSync(join(dir, f), "utf8").trimEnd()}`,
);
const out = parts.join("\n") + "\n";

if (process.argv.includes("--check")) {
  const current = readFileSync(join(root, "schema.sql"), "utf8");
  if (current !== out) {
    console.error("supabase/schema.sql is out of date. Run: node scripts/build-schema.mjs");
    process.exit(1);
  }
  console.log("schema.sql is up to date");
} else {
  writeFileSync(join(root, "schema.sql"), out);
  console.log(`wrote supabase/schema.sql from ${files.length} migrations`);
}

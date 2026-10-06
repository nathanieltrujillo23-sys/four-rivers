#!/usr/bin/env node
/**
 * Runs the database permission tests without Docker or the Supabase CLI.
 *
 * It starts a throwaway in-process Postgres (PGlite), adds the small parts of Supabase the schema
 * relies on (the anon / authenticated / service_role roles, auth.users, auth.uid()), applies every file in
 * supabase/migrations, then runs each supabase/tests/database/*.test.sql. The tests are written for pgTAP;
 * here a tiny stand-in for the handful of pgTAP functions they use (plan, is, ok, throws_ok, lives_ok, finish)
 * keeps them runnable. The real `supabase test db` (in CI) is still the reference run.
 *
 *   npm run test:db
 */
import { PGlite } from "@electric-sql/pglite";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { SUPABASE_SHIM } from "./pg-shim.mjs";

const root = fileURLToPath(new URL("..", import.meta.url));
const db = new PGlite();

const PGTAP_SHIM = `
create table public.pgtap_results (n serial, ok boolean, descr text, detail text);
grant all on public.pgtap_results to public;
grant all on sequence public.pgtap_results_n_seq to public;
create function extensions.plan(int) returns text language sql as $$ select 'plan' $$;
create function extensions.ok(boolean, text default '') returns boolean language plpgsql as $$
begin insert into public.pgtap_results (ok, descr) values (coalesce($1, false), $2); return $1; end $$;
create function extensions.is(anyelement, anyelement, text default '') returns boolean language plpgsql as $$
begin
  insert into public.pgtap_results (ok, descr, detail)
  values ($1 is not distinct from $2, $3, format('got %s, wanted %s', $1, $2));
  return $1 is not distinct from $2;
end $$;
create function extensions.throws_ok(text, text default null, text default null, text default '') returns boolean language plpgsql as $$
begin
  execute $1;
  insert into public.pgtap_results (ok, descr, detail) values (false, $4, 'nothing was raised');
  return false;
exception when others then
  insert into public.pgtap_results (ok, descr) values (true, $4);
  return true;
end $$;
create function extensions.lives_ok(text, text default '') returns boolean language plpgsql as $$
begin
  execute $1;
  insert into public.pgtap_results (ok, descr) values (true, $2);
  return true;
exception when others then
  insert into public.pgtap_results (ok, descr, detail) values (false, $2, sqlerrm);
  return false;
end $$;
`;

async function run(label, sql) {
  try {
    await db.exec(sql);
  } catch (err) {
    console.error(`\n${label} failed: ${err.message}`);
    process.exit(1);
  }
}

await run("Supabase shim", SUPABASE_SHIM);
await run("pgTAP shim", PGTAP_SHIM);

const migrations = readdirSync(join(root, "supabase/migrations")).filter((f) => f.endsWith(".sql")).sort();
for (const f of migrations) {
  // The real project has these extensions; here uuid_generate_v4() is provided by the shim instead.
  const sql = readFileSync(join(root, "supabase/migrations", f), "utf8").replace(/create extension[^;]*;/gi, "");
  await run(`migration ${f}`, sql);
  console.log(`applied ${f}`);
}

// The catch-up files in supabase/catchup are for a live project that is missing older updates. They must be safe to
// run again on a project that already has everything.
const catchupDir = join(root, "supabase/catchup");
try {
  for (const f of readdirSync(catchupDir).filter((x) => x.endsWith(".sql")).sort()) {
    await run(`catch-up ${f}`, readFileSync(join(catchupDir, f), "utf8"));
    console.log(`re-ran ${f} (safe to repeat)`);
  }
} catch (err) {
  if (err.code !== "ENOENT") throw err;
}

const testDir = join(root, "supabase/tests/database");
let failed = 0;
let total = 0;
for (const f of readdirSync(testDir).filter((x) => x.endsWith(".test.sql")).sort()) {
  const text = readFileSync(join(testDir, f), "utf8")
    .replace(/create extension if not exists pgtap[^;]*;/i, "")
    .replace(/set search_path = public, extensions;/i, "set search_path = public, extensions;");
  const [body] = text.split(/select \* from finish\(\);/i);
  await db.exec("delete from public.pgtap_results");
  await run(f, body);
  const rows = (await db.query("select ok, descr, detail from public.pgtap_results order by n")).rows;
  await db.exec("rollback");
  const planned = Number(body.match(/select plan\((\d+)\)/i)?.[1] ?? rows.length);
  if (planned !== rows.length) {
    failed += 1;
    console.log(`\n${f}: planned ${planned} checks but ran ${rows.length}`);
  }
  console.log(`\n${f}`);
  for (const r of rows) {
    total += 1;
    if (!r.ok) failed += 1;
    console.log(`  ${r.ok ? "ok    " : "FAIL  "}${r.descr}${r.ok ? "" : `  (${r.detail})`}`);
  }
}
console.log(`\n${total - failed} of ${total} passed`);
process.exit(failed ? 1 : 0);

#!/usr/bin/env node
/**
 * Backs up the whole 4 Rivers database to one encrypted file.
 *
 *   SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... BACKUP_PASSPHRASE=... \
 *     node scripts/backup.mjs [out-folder]
 *
 * It reads every table in the public schema through Supabase's REST API with the service role key (which
 * skips row level security), plus the list of user accounts (ids, emails, sign-up dates; never passwords).
 * The file is compressed and encrypted with BACKUP_PASSPHRASE. Restore it with scripts/restore.mjs.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { manifestOf, seal } from "./backup-lib.mjs";

const url = (process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? "").replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const passphrase = process.env.BACKUP_PASSPHRASE;
if (!url || !key || !passphrase) {
  console.error("Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and BACKUP_PASSPHRASE.");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}` };

async function json(path, init) {
  const res = await fetch(`${url}${path}`, { headers, ...init });
  if (!res.ok) throw new Error(`${res.status} ${path}: ${(await res.text()).slice(0, 200)}`);
  return res.json();
}

// The table list comes from the API's own description, so new tables are never forgotten.
const spec = await json("/rest/v1/", { headers: { ...headers, Accept: "application/openapi+json" } });
const names = Object.keys(spec.definitions ?? {}).sort();

const tables = {};
const PAGE = 1000;
for (const name of names) {
  const rows = [];
  for (let from = 0; ; from += PAGE) {
    const page = await json(`/rest/v1/${encodeURIComponent(name)}?select=*`, {
      headers: { ...headers, Range: `${from}-${from + PAGE - 1}`, "Range-Unit": "items" },
    });
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  tables[name] = rows;
  console.log(`${name}: ${rows.length}`);
}

const users = [];
for (let page = 1; ; page++) {
  const res = await json(`/auth/v1/admin/users?page=${page}&per_page=200`);
  const batch = res.users ?? [];
  users.push(
    ...batch.map((u) => ({
      id: u.id,
      email: u.email,
      created_at: u.created_at,
      email_confirmed_at: u.email_confirmed_at,
      user_metadata: u.user_metadata,
    })),
  );
  if (batch.length < 200) break;
}
console.log(`users: ${users.length}`);

const backup = {
  format: 1,
  createdAt: new Date().toISOString(),
  source: new URL(url).host,
  manifest: manifestOf(tables),
  tables,
  users,
};

const dir = process.argv[2] ?? "backups";
mkdirSync(dir, { recursive: true });
const file = join(dir, `four-rivers-${backup.createdAt.slice(0, 10)}.4rbk`);
writeFileSync(file, seal(backup, passphrase));
console.log(`wrote ${file}`);

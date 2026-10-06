#!/usr/bin/env node
/**
 * Checks a backup, and optionally restores it into an EMPTY Supabase project (the restore drill).
 *
 *   BACKUP_PASSPHRASE=... node scripts/restore.mjs backups/four-rivers-2026-10-06.4rbk
 *       Opens the file and checks it is consistent (row counts, every profile has a user). Changes nothing.
 *
 *   BACKUP_PASSPHRASE=... TARGET_SUPABASE_URL=... TARGET_SERVICE_ROLE_KEY=... \
 *     node scripts/restore.mjs backups/four-rivers-2026-10-06.4rbk --restore
 *       Loads it into a scratch project that already has the schema (run supabase/schema.sql there first).
 *       It refuses to run unless the target has no rows, so it cannot overwrite a live project by accident.
 *
 * People's passwords are not in a backup. Restored accounts are created without one; they sign in by choosing
 * "forgot password". The restore re-creates accounts with their original ids so every row still points at them.
 */
import { readFileSync } from "node:fs";
import { open, restoreOrder, verify } from "./backup-lib.mjs";

const file = process.argv[2];
const passphrase = process.env.BACKUP_PASSPHRASE;
if (!file || !passphrase) {
  console.error("Usage: BACKUP_PASSPHRASE=... node scripts/restore.mjs <file.4rbk> [--restore]");
  process.exit(1);
}

const backup = open(readFileSync(file), passphrase);
const problems = verify(backup);
console.log(`Backup from ${backup.createdAt} (${backup.source})`);
for (const [name, n] of Object.entries(backup.manifest)) console.log(`  ${name}: ${n}`);
console.log(`  users: ${backup.users.length}`);
if (problems.length > 0) {
  console.error("\nProblems:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log("\nThe backup is consistent.");
if (!process.argv.includes("--restore")) process.exit(0);

const url = (process.env.TARGET_SUPABASE_URL ?? "").replace(/\/$/, "");
const key = process.env.TARGET_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Set TARGET_SUPABASE_URL and TARGET_SERVICE_ROLE_KEY to restore.");
  process.exit(1);
}
if (url === (process.env.SUPABASE_URL ?? "").replace(/\/$/, "")) {
  console.error("The target is the same project as SUPABASE_URL. Restore into a scratch project only.");
  process.exit(1);
}
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

async function call(path, init) {
  const res = await fetch(`${url}${path}`, { headers, ...init });
  return { ok: res.ok, status: res.status, body: await res.text() };
}

// Safety: the target must be empty.
const existing = await call("/auth/v1/admin/users?page=1&per_page=1");
if (existing.ok && (JSON.parse(existing.body).users ?? []).length > 0) {
  console.error("The target project already has users. Use an empty project.");
  process.exit(1);
}

for (const u of backup.users) {
  const res = await call("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ id: u.id, email: u.email, email_confirm: true, user_metadata: u.user_metadata }),
  });
  if (!res.ok && !/already/i.test(res.body)) console.error(`user ${u.email}: ${res.status} ${res.body.slice(0, 120)}`);
}
console.log(`created ${backup.users.length} accounts`);

// Foreign keys are read from the target's own description of its tables.
const spec = JSON.parse((await call("/rest/v1/", { headers: { ...headers, Accept: "application/openapi+json" } })).body);
const refs = {};
for (const [table, def] of Object.entries(spec.definitions ?? {})) {
  refs[table] = Object.values(def.properties ?? {})
    .map((p) => /<fk table='([^']+)'/.exec(p.description ?? "")?.[1])
    .filter(Boolean);
}
const names = Object.keys(backup.tables).filter((n) => backup.tables[n].length > 0);
let pending = restoreOrder(names, refs);

for (let pass = 1; pass <= 4 && pending.length > 0; pass++) {
  const failed = [];
  for (const name of pending) {
    const rows = backup.tables[name];
    let ok = true;
    for (let i = 0; i < rows.length; i += 500) {
      const res = await call(`/rest/v1/${encodeURIComponent(name)}`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rows.slice(i, i + 500)),
      });
      if (!res.ok) {
        ok = false;
        if (pass === 4) console.error(`${name}: ${res.status} ${res.body.slice(0, 160)}`);
        break;
      }
    }
    console.log(`${ok ? "restored" : "retry later"}: ${name} (${rows.length})`);
    if (!ok) failed.push(name);
  }
  pending = failed;
}

// Compare what is now in the target with what the backup says should be there.
let bad = 0;
for (const [name, n] of Object.entries(backup.manifest)) {
  if (n === 0) continue;
  const count = await fetch(`${url}/rest/v1/${encodeURIComponent(name)}?select=*`, {
    method: "HEAD",
    headers: { ...headers, Prefer: "count=exact" },
  });
  const have = Number(/\/(\d+)$/.exec(count.headers.get("content-range") ?? "")?.[1] ?? -1);
  if (have !== n) {
    bad += 1;
    console.error(`MISMATCH ${name}: backup has ${n}, restored ${have}`);
  }
}
console.log(bad === 0 ? "\nRestore drill passed: every table matches the backup." : `\n${bad} tables do not match.`);
process.exit(bad === 0 ? 0 : 1);

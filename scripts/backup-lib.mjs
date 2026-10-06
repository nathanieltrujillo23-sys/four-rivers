import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";
import { gunzipSync, gzipSync } from "node:zlib";

const MAGIC = Buffer.from("4RBK1");

/** Compresses and encrypts a backup. A backup holds personal data, so it is never written in the clear. */
export function seal(backup, passphrase) {
  if (!passphrase || passphrase.length < 12) throw new Error("BACKUP_PASSPHRASE must be at least 12 characters");
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(gzipSync(JSON.stringify(backup))), cipher.final()]);
  return Buffer.concat([MAGIC, salt, iv, cipher.getAuthTag(), body]);
}

/** The reverse of seal(); throws if the passphrase is wrong or the file was changed. */
export function open(file, passphrase) {
  if (!file.subarray(0, MAGIC.length).equals(MAGIC)) throw new Error("not a 4 Rivers backup file");
  let at = MAGIC.length;
  const salt = file.subarray(at, (at += 16));
  const iv = file.subarray(at, (at += 12));
  const tag = file.subarray(at, (at += 16));
  const key = scryptSync(passphrase, salt, 32);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  let plain;
  try {
    plain = Buffer.concat([decipher.update(file.subarray(at)), decipher.final()]);
  } catch {
    throw new Error("wrong passphrase, or the file is damaged");
  }
  return JSON.parse(gunzipSync(plain).toString("utf8"));
}

/** Row counts per table, written into the backup so a restore can be checked against it. */
export function manifestOf(tables) {
  return Object.fromEntries(Object.entries(tables).map(([name, rows]) => [name, rows.length]));
}

/** Problems found in a backup (an empty list means it is consistent). */
export function verify(backup) {
  const problems = [];
  if (backup?.format !== 1) problems.push("unknown backup format");
  if (!backup?.tables || typeof backup.tables !== "object") return [...problems, "no tables"];
  for (const [name, count] of Object.entries(backup.manifest ?? {})) {
    const rows = backup.tables[name];
    if (!Array.isArray(rows)) problems.push(`table ${name} is missing`);
    else if (rows.length !== count) problems.push(`table ${name} has ${rows.length} rows, expected ${count}`);
  }
  if (!Array.isArray(backup.users)) problems.push("the user list is missing");
  else {
    const ids = new Set(backup.users.map((u) => u.id));
    const profiles = backup.tables.profiles ?? [];
    const orphans = profiles.filter((p) => !ids.has(p.user_id)).length;
    if (orphans > 0) problems.push(`${orphans} profiles have no matching user`);
  }
  return problems;
}

/**
 * An order to restore tables in so rows come after the rows they refer to. `refs` maps a table to the tables
 * its foreign keys point at. Tables that cannot be placed (a cycle) are appended and left to the retry pass.
 */
export function restoreOrder(names, refs) {
  const placed = [];
  const left = new Set(names);
  while (left.size > 0) {
    const ready = [...left].filter((n) => (refs[n] ?? []).every((r) => r === n || !left.has(r)));
    if (ready.length === 0) {
      placed.push(...left);
      break;
    }
    for (const n of ready.sort()) {
      placed.push(n);
      left.delete(n);
    }
  }
  return placed;
}

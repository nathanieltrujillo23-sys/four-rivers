# Backups and the restore drill

## What is backed up

`scripts/backup.mjs` copies **every table** in the database (it asks Supabase which tables exist, so new ones are never
forgotten) and the list of accounts (ids, emails, sign-up dates; never passwords). The result is one file,
`four-rivers-YYYY-MM-DD.4rbk`, compressed and **encrypted** with a passphrase, because it contains people's names,
emails, money entries, and prayers.

## Turn on the nightly backup

1. On github.com, add `ci/github-backup.yml` to the repository as `.github/workflows/backup.yml`.
2. Add three repository secrets (Settings > Secrets and variables > Actions):
   - `SUPABASE_URL`, your project address.
   - `SUPABASE_SERVICE_ROLE_KEY`, from Supabase > Project Settings > API. It can read everything, so only ever
     put it in secrets.
   - `BACKUP_PASSPHRASE`, a long random phrase. **Save it in your password manager.** A backup cannot be opened
     without it, and it cannot be recovered.
3. Run it once by hand (Actions > Nightly backup > Run workflow) and confirm it is green.

Each run saves the encrypted file as a workflow artifact for 30 days, then checks that it opens and its row counts
add up. For a longer history, download one now and then and keep it somewhere safe.

You can also run it yourself:

```bash
SUPABASE_URL=https://xxxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... BACKUP_PASSPHRASE=... node scripts/backup.mjs
```

## The restore drill (do this once, then every few months)

A backup you have never restored is a guess. The drill proves it works without touching the live site.

1. Create a **new, empty** Supabase project (the free tier is fine) and run `supabase/schema.sql` in its SQL editor.
2. Check the backup file opens (this changes nothing):

   ```bash
   BACKUP_PASSPHRASE=... node scripts/restore.mjs backups/four-rivers-2026-10-06.4rbk
   ```

3. Load it into the scratch project:

   ```bash
   BACKUP_PASSPHRASE=... TARGET_SUPABASE_URL=https://scratch.supabase.co TARGET_SERVICE_ROLE_KEY=... \
     node scripts/restore.mjs backups/four-rivers-2026-10-06.4rbk --restore
   ```

   It refuses to run if the target already has users, so it cannot overwrite a live project by accident. At the end
   it compares every table's row count with the backup and prints "Restore drill passed" or lists what differs.
4. Open the scratch project's Table Editor and look at a few rows. Delete the scratch project when you are done.

## Real recovery

If the live project is ever lost: create a new project, run `supabase/schema.sql`, restore into it as above, then point
the app's environment variables (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) at it.
Accounts come back with their original ids but **no passwords**: everyone signs in with "forgot password" once.

## Good to know

- Supabase's Pro plan adds its own daily backups and point-in-time recovery. This is an independent copy you control,
  and the only one on the free plan.
- The backup covers the database only. Profile pictures are stored inside it (as small images); there are no other files.

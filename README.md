# 4 Rivers

A standalone financial-education web app teaching four biblical principles of
stewardship as a sequential four-step course:

1. **Multiple Streams of Income**
2. **Saving**
3. **Investing**
4. **Giving**

Named for the four rivers that flowed out of Eden (Genesis 2:10–14): one source,
four distinct streams.

This is a fully independent brand — its own Supabase project, no shared auth,
branding, or database with any other app.

## Stack

- React + Vite + TypeScript
- Tailwind CSS v4
- React Router
- Supabase (Auth, Postgres) — a **dedicated** project, not a shared instance
- oxlint

## Getting started

```bash
npm install
cp .env.local.example .env.local   # then fill in the two VITE_ values
npm run dev                         # http://localhost:5273
```

### Supabase setup

1. Create a **new** Supabase project (this app must not share one).
2. Run `supabase/schema.sql` in the SQL editor.
3. In Authentication → Providers, enable Email. For local testing you may want to
   turn "Confirm email" off.
4. Copy the project URL and anon key into `.env.local`.

To make a user an admin:

```sql
update profiles set role = 'admin' where user_id = '<uuid>';
```

### Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app at http://localhost:5273 |
| `npm test` | Unit tests (Vitest): logic, the Bible and reading-plan code, and the serverless functions in `api/` |
| `npm run test:e2e` | Browser tests (Playwright) on the in-memory demo account, plus an accessibility scan (axe) in light and dark |
| `npm run lint`, `npx tsc -b` | Lint and type check |
| `npm run schema:build` | Rebuild `supabase/schema.sql` from the migrations folder |
| `npm run test:db` | Database permission tests on a throwaway in-process Postgres (no Docker needed); the same files run on the real Supabase stack with `supabase test db` |
| `node scripts/backup.mjs` | Encrypted backup of the whole database; see [docs/backups.md](docs/backups.md) for the nightly job and the restore drill |

CI (the workflow in `ci/github-ci.yml`) runs lint, types, unit tests, the schema check, the build, and the browser tests on
every push and pull request. Vercel builds a preview site for every pull request on its own.

**To turn CI on:** the workflow file is saved as `ci/github-ci.yml` because the access token used for pushes cannot
create workflow files. On github.com open the repo, choose Add file, Create new file, name it
`.github/workflows/ci.yml`, paste the contents of `ci/github-ci.yml`, and commit.

### Database changes

* `supabase/migrations/` is the source of truth: `20261001000000_baseline.sql` is the whole schema as of
  October 2026, and every later change is its own timestamped file. Add new changes there.
* `supabase/schema.sql` is generated from those files for a brand-new project (paste it into the SQL editor).
  After adding a migration run `npm run schema:build`; CI fails if it is out of date.
* `supabase/legacy/` holds the numbered files (002 to 019) that were pasted by hand into the live project
  before the migrations folder existed. They are history; the baseline already contains them.
* Existing project: run each new file in `supabase/migrations/` after the baseline once in the SQL editor
  (or, with the CLI linked, `supabase migration repair --status applied 20261001000000` and then
  `supabase db push`).
* `supabase/catchup/` holds one-off scripts for a live project that is missing older updates (found 2026-10-06:
  notifications and co-leaders had never been run). They are safe to repeat, and `npm run test:db` re-runs them
  on top of the full schema to prove it.
* `supabase/tests/database/` has pgTAP permission tests: who can read, write, rename, or remove what.

### Optional services (all off until you set their variables; see `.env.local.example`)

| Feature | Variables (Vercel project settings) |
| --- | --- |
| Error monitoring | `VITE_SENTRY_DSN`, optional `VITE_COMMIT_SHA` |
| Page-view analytics | Turn on Web Analytics for the project in Vercel (no variable) |
| ESV and NLT verse search | `ESV_API_KEY`, `NLT_API_KEY` (free non-commercial keys; see the terms note in `api/bible.ts`) |
| NIV readings | `YOUVERSION_APP_KEY` (from platform.youversion.com; Biblica must have approved the app; `YOUVERSION_NIV_ID` defaults to 111) |
| NIV verse search (optional) | `API_BIBLE_KEY`, `API_BIBLE_NIV_ID` (API.Bible; without it the NIV is searched in the course library) |
| Weekly email to group leaders | Same variables as the reminders (it runs Sundays via `/api/digest`); leaders can turn it off in Edit profile |
| Nightly database backup | GitHub repository secrets `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `BACKUP_PASSPHRASE` (see [docs/backups.md](docs/backups.md)) |
| Welcome email, announcements, leader-request alert | Same email variables as the reminders; see [docs/sign-up-protection.md](docs/sign-up-protection.md) |
| Sign-up bot check | `VITE_TURNSTILE_SITE_KEY` (Cloudflare Turnstile) and the same account's secret in Supabase, Authentication, Attack Protection |
| Automatic Spanish translation (testimony, welcome message, announcements) | `ANTHROPIC_API_KEY` |
| Daily reading reminders | `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `REMINDER_FROM`; for devices also `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` and `VITE_VAPID_PUBLIC_KEY` (same value as the public key) |

### Automated testing

`scripts/create-test-session.mjs` mints a password session for a dedicated
`claude-test@four-rivers.local` user (needs `SUPABASE_SERVICE_ROLE_KEY` in
`.env.local`, which is gitignored). Never test against a real account.

## Architecture notes

- **Ledger integrity.** Every tracker entry (income stream, savings
  contribution, investment contribution, gift) is a real row. All summary
  numbers are derived by summing rows at read time — never stored as a running
  total. See `src/data/repository.ts` and `src/state/progress.ts`.
- **Completion rule.** A river is complete when its lesson has been viewed *and*
  at least one tracker entry has been logged. `course_progress.completed_at` is
  set the moment both hold; status is always derived (`src/state/progress.ts`).
- **Theme.** All tone-defining values live in `src/theme/theme.ts` and the
  `@theme` block of `src/index.css`. Swap those to re-skin without touching
  components.
- **Access / monetization.** All role and (future) payment gating flows through
  `src/lib/access.ts`. v1 roles: Guest / Free / Admin. A `Paid` tier can be
  added there without restructuring the app. No Stripe in v1.
- **Lesson content** ships as static data in `src/content/lessons.ts` (teaching
  text is placeholder; scripture references are real, WEB / public domain). A
  `lessons` table is stubbed in `schema.sql` for when editing moves in-app.

## Out of scope for v1

Payments/Stripe, real-time investment valuation or market data, personalized
financial/investment advice, social/community features.

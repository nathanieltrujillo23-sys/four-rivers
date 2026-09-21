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

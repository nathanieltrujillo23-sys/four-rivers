# 4 Rivers: updates

Every batch of work is named and numbered, so we can talk about it by number. Newest first.

## Reminders (do later)

| What | Where it came from | Notes |
| --- | --- | --- |
| **Founder video on the home page** (about 45 seconds from Nathaniel) | Update 1, idea 19 | Builds trust faster than any design change. Place it above "What you'll learn", with a captioned transcript for accessibility. |
| **"Last time, in one line"** (recap on Continue) | Update 3, idea 1 | On hold. Needs ~49 authored one-liners (EN/ES). Decisions pending: authored recap vs learner's own note, where it shows, tone, dismissible. |
| ESV and NLT keys | Bible versions work | Free keys at api.esv.org and api.nlt.to; add `ESV_API_KEY` and `NLT_API_KEY` in Vercel. Until then those versions fall back to the KJV with a note. |
| **Buy a domain, then turn on automatic emails** | Update 3, Outreach | Resend only delivers to you until a domain you own is verified (`four-rivers.vercel.app` can't be). A domain is about $10-15 a year; Resend is free on top. It unlocks Outreach invitation emails, the daily reading reminders, welcome emails, and the weekly leader summary. Until then Outreach has "Send it from your own email". Variables: `RESEND_API_KEY`, `REMINDER_FROM` (an address on the domain), `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`. Steps in [sign-up-protection.md](sign-up-protection.md). |
| Email, translation, and sign-up protection setup | Update before Update 1 | Resend (`RESEND_API_KEY`, `REMINDER_FROM`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`), `GEMINI_API_KEY` (free; translation needs only this key), Supabase "Confirm email", Cloudflare Turnstile. Step by step in [sign-up-protection.md](sign-up-protection.md). |
| Restore drill | Backups work | Restore a backup into an empty scratch Supabase project once. See [backups.md](backups.md). |
| Account export and delete | Suggestion list | A button in Edit profile. Also what privacy laws expect. |
| A separate test Supabase project | Suggestion list | Lets browser tests run real sign-up, groups and admin flows. |

---

## Update 11: Download Button (2026-10-10)

A **Download the app** button for phones, in two places: under the three screenshots on the home page (a blue button), and in the
phone menu (the hamburger dropdown), where it is plain left-aligned text with no icon, just above Sign out (or Sign in). It is hidden on larger screens and once the app is already installed.

- **One tap where the browser allows it** (Chrome and similar): the button opens the browser's own install prompt.
- **Steps where it doesn't** (iPhone Safari, Firefox, or a browser that hasn't offered it yet): the button opens a short note,
  "tap Share, then Add to Home Screen" on iPhone, or "open the browser menu, then Install app" elsewhere. English and Spanish.
- **Why it needed a fix underneath:** the browser offers install once, early, and a button that appeared later would have
  missed it. It is now caught at startup in `src/state/useInstallPrompt.ts` and shared by every install button, including the
  existing one in the language menu.
- **Where:** `src/components/ui/InstallButton.tsx`, used in `PhoneShowcase.tsx` and `AppShell.tsx`.

---

## Update 10: Motion (2026-10-10)

Animations and transitions across the app, all in CSS and a few small helpers (no animation library, so nothing heavy to
download). The numbers refer to the ideas list.

- **Everywhere:** pages rise in with a soft fade and a river sweeps across the top as you move between them (1, 3); cards and
  tiles rise in one after another (2); buttons lift and press (4); menus and pop-ups glide in (5); the logo flows in (6); sections
  below the fold fade up as you scroll on the dashboard, community, and course home (home-page style); status and error
  messages slide in (44); the theme fades between light and dark (46); fields glow softly when focused (36); loading
  placeholders appear in a stagger (45).
- **Reduce motion (7):** a new button in the header, and the app also follows the device's own setting. With it on, nothing
  animates, nothing is hidden waiting for an animation, and effects that tidy themselves up still do. It is remembered.
- **Learning:** a reading river along the top of a lesson fills as you scroll (8); "Mark as read" draws a check and glows (9); the
  four-river strip's water flows out to your progress and the check marks draw themselves (10); moving between lessons turns
  the page forward or back (11); quiz answers glow when right and shake once when wrong, and the explanation unfolds (12); the
  streak number bumps when it grows (13); the score counts up with a bar and a mark where passing begins, with sparkles for a
  pass (14, 40); verses fade in as you reach them (15); the certificate rises in and its seal stamps down (16); money-moment
  cards lift and their icons wiggle (17); glossary definitions pop open (18).
- **Dashboard and trackers:** totals count up (19); the chart's bars grow from the baseline (20); a new entry slides in and a
  deleted one slides away while the rest close the gap (21, 23); savings goals fill like water with a moving crest (22);
  milestones (first entry, a goal halfway or full, $100 and $1,000 given) get a small celebration, once (24); empty states bob
  gently (25).
- **Community and workshop:** new chat messages slide in (26); new prayers are written onto the chalkboard and "I prayed" pops
  (27); online members' dots breathe (28); the invite QR scales in and "Copied" draws a check (29); the workshop slides between
  steps with a river that fills across the six steps (30); "Saved" fades in and out (31); signatures sweep in (32).
- **Toolkit:** sections glide open (33); result tiles roll to new values and flash when they change (34, 35); the debt tool races
  snowball against avalanche (37); loan and mortgage balances drain over time (38); growth, retirement, emergency fund, card
  payoff, and the loan-payoff lines draw themselves (39).
- **Rewards (40-42):** celebrations are tiered, from a small sparkle to confetti, and phones feel a short vibration at the
  moments that matter (not when motion is reduced). A warm "Welcome back" card slides in after three or more days away (41).
- Browser tests now run with reduced motion (otherwise scanning colors mid-fade is unreliable); a separate `motion` test project
  runs the animated app.
- Also fixed on the way: the home page's closing call-to-action had low contrast in the dark theme, hidden before because the
  section had not yet faded in when it was scanned.

---

## Update 9: Thirty-Six Tools (2026-10-10)

A sixth tool in every section of the money toolkit, for 36 in all:

- **Estate planning:** **Income tax estimator.** Federal income tax (standard deduction and the 2026 brackets), Social Security,
  Medicare, and a state rate you enter, for single, married-filing-jointly, and head-of-household filers. It shows what you keep
  per year, per month, and every two weeks, plus your effective rate and the tax on your next dollar. The 2026 figures live in
  `src/lib/taxMath.ts` and need updating each year (they are the IRS's, Rev. Proc. 2025-32). It is an estimate for a wage earner,
  not tax advice.
- **Live:** **Subscription audit.** What every recurring charge costs a year, and what cancelling some could grow into.
- **Give:** **Grow your giving.** Step the percent you give up a little each year toward a goal, as your pay rises.
- **Grow:** **Employer match.** Whether you are capturing all the free money your employer offers, and what to put in to get it.
- **Owe:** **Credit card minimum trap.** What paying only the minimum costs, against a steady payment.
- **Other financial goals:** **Paying for college.** The real cost of a degree as prices rise, after scholarships, and the monthly
  saving to cover it.

They print on the meeting PDF like the others, and every word of them can be reworded in Admin, Content.

---

## Update 8: Editable Text, Open Dashboard, Account Reset (2026-10-09)

- **Reword the new text from Admin, Content.** Under the lesson editor, a new "Other text on the site" section lists every piece of
  text added in the recent updates, in six groups, and lets an admin reword any of it: the **quiz and exam explanations** (100), the
  five **money moments**, the home page **"What you'll learn"** cards, the **discovery workshop** (the six steps, their questions and
  box labels, the agreement wording, the topics, the PDF wording), the **money toolkit** (section and tool names and descriptions,
  every introduction and note, the estate planning pages), and the **outreach guide**. Press Save and it changes for everyone at
  once; "Back to the original" returns the wording that shipped. English only, like the lesson editor. Stored one row per item in
  the existing `site_text` table (`copy:...`), so no database change was needed.
- **Reset any account (Admin, Tools).** Search for a person, pick them, type their email to confirm, and their course progress is
  cleared (rivers, modules read, quiz and exam results, certificate, 30-Day Challenge, tracker entries). Their journal, feedback,
  groups, and saved scenarios are kept. One-time database setup: `supabase/migrations/20261009000300_admin_reset_account.sql`.
- **The dashboard is open to everyone.** No more waiting until all four rivers are finished. Numbers that need a river's tracker
  to be filled in carry a note over them saying which tracker to fill in. The course's closing reflection still appears only once
  the course is complete.
- **The About page is archived** (`src/archive/AboutPage.tsx`): it repeated the home page. Old `/about` links go to the home page,
  and the founder's contact card moved to its own page, `/contact` (the footer's Contact link). Restore instructions are in the file.

---

## Update 7: Six-Section Toolkit (2026-10-09)

The money toolkit is now **six drop-down sections of five tools each** (30 tools), in the Daily Bread group page and in step 6 of a
discovery meeting. Choosing a topic in a meeting opens the section that holds its tool.

- **Live** (needs, wants, and wishes): Monthly budget, Housing and roommates, Emergency fund, Trim a want, Wish list planner.
- **Give** (church, family, friends, charity): Giving plan, Church giving, Family support, Friends and celebrations, Charity gifts.
- **Grow** (yourself and the markets): Investing in yourself, Growing your income, Investing in the markets, Growth over time,
  Retirement target.
- **Owe** (buying with a loan, paying a loan off): Buying a car, Buying a house, Paying off several debts, Pay one loan off faster,
  Compare two loans.
- **Estate planning** (the five core documents): Last will and testament, Revocable living trust, Durable power of attorney, Health
  care power of attorney, Living will. Each is an organizer: a status, the key decisions (who is the executor, trustee, or agent),
  and where the paper is kept. They are not legal documents, and each says to use an attorney in your state.
- **Other financial goals:** Getting married, Taking a vacation, Having a child, Starting a business or side hustle, Moving.

The meeting PDF still includes any 2 or 3 tools, and now prints these too. Saved numbers from the older toolkit still load.
New tools are written as short specs in `toolSpecs.ts` (fields plus a calculation), so one definition drives the screen and the PDF.
No database change was needed.

---

## Update 6: Analysts (2026-10-09)

In a group with the Discovery workshop on (Daily Bread), the leader and any co-leader can make an ordinary member an
**analyst**, from the Members list on the leader page ("Make analyst" / "Remove analyst").

- An analyst gets the Discovery workshop on the group page and **nothing else** a leader can do. They see only the meetings they
  took themselves; the group's owner still sees all of them.
- Taking the role away (or removing the person from the group) ends their access at once. Their old meetings stay, readable by
  the owner.
- Members see an "Analyst" badge in the Members list. Co-leaders already have the workshop, so they don't need the role.
- Enforced in the database, not just on screen: a member cannot name themselves or anyone else, and an analyst cannot name analysts.
- One-time setup on the live database: `supabase/migrations/20261009000200_workshop_analysts.sql`.

---

## Update 5: Meeting PDF (2026-10-09)

A printable PDF of a discovery meeting, for the analyst to give to the participant.

- On the last step (Recap / Next Steps), tick the box under **2 or 3 tools** in the next-step tools, then **Download the meeting
  PDF**. (Three is the most; the button waits for at least two.)
- The PDF has the participant, date, analyst, and agreement status; the money mission statement set apart with Ephesians 2:8-10
  (KJV); the notes from all six steps; the chosen topics; and a section for each chosen tool with the numbers used and what they
  show. Every page is marked confidential and "education only".
- Each tool now keeps the numbers typed into it **with the meeting**, so they are still there when the meeting is reopened, and
  the PDF prints exactly what was on screen. A tool nobody opened is printed as "only a starting example", and says so.
- The workshop's **Budgeting** tool is now its own scratch budget kept with the meeting. (The course's budget calculator saves to
  the signed-in person's own budget, so using it in a meeting could have changed the analyst's.)
- No database change was needed.

---

## Update 4: Daily Bread Workshop (2026-10-09)

For the Daily Bread group at UF (and any group the site owner switches it on for). Three switches on a group, set only from the
Supabase SQL editor (a leader cannot flip them): `workshop_enabled`, `verse_locked`, `code_locked`.

- **Permanent verse and code.** Daily Bread's code is **2810** (to mirror Ephesians 2:8-10) and its verse is Ephesians 2:8-10 in
  the KJV, shown as "Our group verse" instead of a verse of the day. The leader page shows that the verse is permanent, and
  "Make a new code" is gone. The database enforces both, so even a direct edit is refused.
- **Discovery workshop** (below the member list and chat; for the group's leaders and co-leaders, the "analysts"). Start a
  meeting with a person's name, then:
  - **The agreement.** Open the one-page Daily Bread agreement (Google Drive) to read together, then the analyst and the
    participant each print their name and sign (drawn with a finger or mouse, or their typed name), tick the confirmation, and
    the signed record is kept with the meeting.
  - **Six steps, in order,** each with the question and space for notes that autosave: Basics / Connection, Vision, SWOT
    Analysis (strengths, weaknesses, opportunities, threats, each personally and financially), SWOT Reflection, Money Mission
    Statement (with Ephesians 2:8-10), and Recap / Next Steps (pick 2-3 topics).
  - **Next-step tools** open on the last step, with the chosen topics first. A "Copy a summary of my notes" button and a
    "Mark the meeting done" button are there too.
  - **Confidential.** Only the analyst who took the notes, and the group's owner, can read a meeting. Members never see them.
- **Money toolkit** (every member of the group). Budgeting (the course's budget calculator), investing in the markets
  (traditional, Roth, brokerage and HSA side by side, plus the growth calculator), investing in yourself, income (where extra
  income goes, comparing two job offers), getting married, buying a car, buying a house, taking a vacation (any savings
  goal), and paying off debt (snowball and avalanche side by side).
- English only for now. The workshop is not translated into Spanish.

One-time setup on the live database (done 2026-10-09): `supabase/migrations/20261009000100_discovery_workshop.sql`, then
`supabase/data/20261009_daily_bread.sql`.

---

## Update 3: Learn, Share, Reach (2026-10-08)

- **Quiz answers explained.** After you submit any quiz or the final exam, every question shows a short "why": the reason
  the right answer is right, one verse from that lesson, and a link back to read it again. Missed questions are open,
  correct ones are tucked away. "Practice the ones I missed" reruns only those, with no score and nothing saved.
- **Money moments.** Five short (2 to 3 minute) reads for real events, each with Scripture, a short story, three things to
  try, and four questions: your first paycheck, buying a car, student loans, a wedding budget, a job offer. A row of them
  sits under the rivers on the course home. English and Spanish.
- **Calendar downloads.** The group reading plan and the 30-Day Challenge can be added to any calendar app (`.ics` file).
- **Invite to group.** On the leader page, an "Invite to group" button opens a window with the group's QR code and
  4-digit code (copy the code or link, or print an invite poster with the QR on it). An Apple Wallet card was dropped
  because it needs a paid Apple Developer account.
- **Outreach (Admin only).** A new Admin tab with a printable one-page guide for churches and campus ministries (English
  and Spanish, your contact details, a QR code) and a bulk invite form. Invited people become group leaders the moment
  they sign up (or right away if they already have an account) and get a short email. Needs the migration
  `20261008000100_outreach.sql` (run on the live database 2026-10-09). Invitations are recorded even before email is
  set up; the emails need the Resend variables.

- **Logo chooser (Admin, Tools).** Six logos to pick from (the original plus five new ones: droplet, river tile,
  monogram, ribbons, water orb). The choice changes the header mark, certificates, the browser tab icon, and, through
  `/api/brand`, the link-preview picture and the phone and install icons. The pictures are drawn by
  `node tools/dev/make_logo_assets.mjs` into `public/brand/<name>/`.

Held for a decision: **"Last time, in one line"** (a one-sentence recap on Continue).

---

## Update 2: Lesson Previews (2026-10-08)

The four "What you'll learn" cards on the home page now describe what each river actually teaches (one or two sentences,
in English and Spanish), not what you will do: the fragility of one stream, Joseph's reservoir, the parable of the talents,
and "everything is already His". The section's subtitle changed to match.

---

## Update 1: Sharp and Professional (2026-10-08)

A visual and structural pass so the site looks and feels like a finished product.

- **A stronger first screen:** a much larger headline with tighter spacing, the Genesis 2:10 quote directly under it, and the four streams that draw themselves in from the source.
- **A shorter home page** (about 4,500px instead of 12,500): promise, What you'll learn, How it works, See it in action, the founder's story (with "Keep reading my story"), Questions answered, and a closing invitation. The rivers' full Scripture and the contact card moved to a new **About** page (`/about`), linked from the menu and footer.
- **What you'll learn:** four river cards, each with one sentence about what you will be able to do.
- **See it in action:** three phone-framed screenshots of the real app, in English and Spanish, made by `tools/dev/capture-showcase.mjs`.
- **Questions answered:** six FAQs, in English and Spanish.
- **One icon set:** consistent line icons for features (`FeatureIcons.tsx`).
- **One type scale and one card style** used everywhere (`t-display`, `t-h1` to `t-h4`, `t-eyebrow`, `panel`, `page-stack`), with a one-page [style guide](STYLE-GUIDE.md).
- **Shimmering loading placeholders** instead of the word "Loading".
- **Gentle motion:** pages fade in as you move between them, home page sections rise as they scroll into view, and everything is off for visitors who prefer less motion.
- **Sharper brand images:** smooth-edged favicon, app icons (including a maskable one and an `.ico`), and the share card, all drawn by `tools/dev/make_brand_assets.py`.
- **Dark mode checked** page by page, with accessibility scans for the new About page in both themes.

Not part of this update: the CTA button hierarchy and the social-proof line near the top (ideas 1 and 4).

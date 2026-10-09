# 4 Rivers: updates

Every batch of work is named and numbered, so we can talk about it by number. Newest first.

## Reminders (do later)

| What | Where it came from | Notes |
| --- | --- | --- |
| **Founder video on the home page** (about 45 seconds from Nathaniel) | Update 1, idea 19 | Builds trust faster than any design change. Place it above "What you'll learn", with a captioned transcript for accessibility. |
| **"Last time, in one line"** (recap on Continue) | Update 3, idea 1 | On hold. Needs ~49 authored one-liners (EN/ES). Decisions pending: authored recap vs learner's own note, where it shows, tone, dismissible. |
| ESV and NLT keys | Bible versions work | Free keys at api.esv.org and api.nlt.to; add `ESV_API_KEY` and `NLT_API_KEY` in Vercel. Until then those versions fall back to the KJV with a note. |
| **Buy a domain, then turn on automatic emails** | Update 3, Outreach | Resend only delivers to you until a domain you own is verified (`four-rivers.vercel.app` can't be). A domain is about $10-15 a year; Resend is free on top. It unlocks Outreach invitation emails, the daily reading reminders, welcome emails, and the weekly leader summary. Until then Outreach has "Send it from your own email". Variables: `RESEND_API_KEY`, `REMINDER_FROM` (an address on the domain), `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`. Steps in [sign-up-protection.md](sign-up-protection.md). |
| Email, translation, and sign-up protection setup | Update before Update 1 | Resend (`RESEND_API_KEY`, `REMINDER_FROM`, `CRON_SECRET`, `SUPABASE_SERVICE_ROLE_KEY`), `ANTHROPIC_API_KEY`, Supabase "Confirm email", Cloudflare Turnstile. Step by step in [sign-up-protection.md](sign-up-protection.md). |
| Restore drill | Backups work | Restore a backup into an empty scratch Supabase project once. See [backups.md](backups.md). |
| Account export and delete | Suggestion list | A button in Edit profile. Also what privacy laws expect. |
| A separate test Supabase project | Suggestion list | Lets browser tests run real sign-up, groups and admin flows. |

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

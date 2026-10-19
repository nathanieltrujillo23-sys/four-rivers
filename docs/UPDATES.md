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
| **Saved for later: career and community items as possible admin inputs** | Suggestion list, 2026-10-17 | Nathaniel asked to keep these for later, as things an admin could enter or manage rather than hard-code: (1) an **internship timeline** (application windows by semester, each with the date it was checked and a link to the firm's careers page); (2) **mock interview scoring with peers** (the case-review rubric reused for interviews); (3) **mentor matching** with upperclassmen and alumni, approved by leaders; (4) cases shared and reviews written counted in the **resume bullets**; (5) **comments or a report button** on library cases. Not requested: the private bank solutions map slide and the net-worth waterfall chart. |
| Restore drill | Backups work | Restore a backup into an empty scratch Supabase project once. See [backups.md](backups.md). |
| Account export and delete | Suggestion list | A button in Edit profile. Also what privacy laws expect. |
| A separate test Supabase project | Suggestion list | Lets browser tests run real sign-up, groups and admin flows. |

---

## Update 22: Approval Notifications (2026-10-19)

- **A person is told when an admin approves their request**, for group leaders and for Wealth Tools:
  - **In the app (always):** a database trigger adds a notice to the person's bell the moment their status becomes approved, whoever or
    whatever makes the change (the Admin dashboard, or the SQL editor). It reads "You're approved as a group leader. Create your first
    group." (or "...for Wealth Tools. Start a client plan.") in English or Spanish, and tapping it opens the right page. An admin approving
    their own account is not told. Table `account_notices` (owner-only), migration `20261019000100_approval_notices.sql` (applied live), 10 database checks (185 in all).
  - **By email (when email is set up):** after the admin approves, the Admin dashboard calls the new `api/approved.ts`, which checks the caller
    is an admin and the person really is approved, then emails them once in their language (it records `leader_approved_notified_at` /
    `wealth_approved_notified_at` before sending, so a double click or a second call sends nothing more). It needs the same
    `RESEND_API_KEY` as the other emails; until a domain is verified at Resend (see Reminders), Resend delivers only to your own address,
    so for now the bell is what reaches the person.
- Code: migration, `api/approved.ts`, `useNotifications.ts`, `NotificationBell.tsx`, repository methods; 4 server tests and an end-to-end check
  that the bell shows the notice (the demo account has one, already read).

---

## Update 21: Workflow, Records and Show-the-Math (2026-10-17)

Third of three batches from the "other suggestions" list.

- **Follow-up and records (new last step):** four tabs.
  - **Stage and action items:** each client has a stage (prospect through closed), a next meeting, and action items for you and for the client
    with due dates; overdue ones are flagged. The client list shows each client's stage, next meeting and open or overdue items, and a
    **Pipeline** view groups every client by stage.
  - **Follow-up email:** a draft from the plan (thanks, what you covered, who does what by when, the next meeting, an optional paragraph of
    your own, and the reminder that you are a student and this is not advice), in a friendly or formal tone. Edit it, copy it, or open it in your
    email app. Nothing is ever sent from the app.
  - **Compliance:** an automatic review (disclosures slide on, role line is a student's, presenter named, no promises or named securities in the
    text you wrote, sources and dates on assumptions and the market view, meeting date, checklist status) and a 13-item checklist you confirm
    yourself, each with a reason and the date you confirmed it, plus your own items.
  - **Versions:** save the plan and toolkit numbers after each meeting (30 per client); see what changed since any version, and from one version
    to the one before it, in plain words (goals, saving, return, risk profile, stock share, outcomes, scenarios, roadmap); restore one, which saves
    the current plan first so it can be undone. New table `wealth_versions` (owner-only; migration `20261017000300_wealth_versions.sql`, applied
    live) with 9 database checks (175 in all).
- **Compliance review in the Presentation step:** the same automatic check is shown above the deck settings.
- **Show the math:** a "How this was calculated" note, with the client's own numbers, on the goals, snapshot ratios, risk profile, portfolio, projection and
  retirement income, and for **each of the 36 toolkit tools** (in the tool's panel and in that tool slide's speaker notes). Notes for the
  planning tools and scenarios were added in Updates 19 and 20.
- Code: `wealthTrack.ts`, `wealthFollowUp.ts`, `wealthVersions.ts`, `wealthPreflight.ts`, the checklist in `wealthCompliance.ts`, `wealthToolMath.ts`,
  `wealthCoreMath.ts`, `FollowUpStep.tsx`; unit tests, an end-to-end test, and accessibility scans of every tab and the pipeline in light and dark.

---

## Update 20: Deck, Visuals, House View and Compliance Wording (2026-10-17)

Second of three batches from the "other suggestions" list.

- **Compliance wording (all of the deck):** Nathaniel is a student who will have passed the FINRA SIE by the end of 2026 and holds no
  Series 65/66 or CFP, so the deck is written as an educational exercise and never as advice. "Recommendation" became "Key
  takeaways and options"; recommendations now read as options ("Consider paying down...", "An illustrative growth allocation, not
  a recommendation of any fund"); the investment policy statement is labelled illustrative; the title slide says "Educational case
  study, not investment, tax or legal advice" and describes the presenter as "Student, Daily Bread Wealth Management Track" (the role
  line is editable, and a warning appears if it contains a title such as advisor, planner or CFP). A tick box adds a line about the SIE
  only once it is passed, and says the SIE is not a license. The disclosures slide now covers: education only, who the presenter is
  and is not, illustrative and hypothetical projections, assumptions, taxes and insurance, where to get real advice, and confidentiality.
  The speaker notes tell the presenter not to call themselves an advisor or to tell anyone what to buy.
- **Deck looks:** five designed palettes and a custom two-color option; text stays readable in every palette (colors are darkened until
  they pass the contrast guideline). The default is unchanged.
- **Base, upside and downside:** a Scenarios tab in the Model step keeps up to six named versions of the model (inputs left blank follow
  the plan), runs them with the same seed, compares them in cards and one chart, and feeds a deck slide.
- **Sensitivity (tornado):** a tab and a deck slide showing, one assumption at a time (return, volatility, monthly saving, years,
  starting balance, inflation), how far the median ending balance moves; the biggest swing first.
- **"How we will work together" slide:** five standard steps, each editable, with a closing line about the limits of the relationship.
- **House view (`/community/wealth/house`):** the analyst's default assumptions (inflation, fee, state tax, filing status, return and
  volatility for each risk profile) and a dated market view with sourced indicators, kept privately in the career-prep document. "Apply my
  house view" copies them into a client's plan (Client step, and the Presentation step for the market view); the plan keeps its own
  copy. A **Market snapshot** slide appears once a view is entered.
- **Anticipated questions:** about 25 standard questions across 18 parts of the deck, answered from the client's numbers, go in the
  speaker notes of the matching slide. Edit an answer, hide a question, or add your own.
- **Client handout:** the printable one-pager became a customizable leave-behind: choose its parts (mission, key numbers, goals, SWOT,
  projection, ideas to discuss, scenarios, planning highlights, market, weekly time, next steps), in the deck's colors, with the
  presenter's role and a compliance footer. It prints or saves as a PDF through the browser's print window (there is no separate PDF
  file download).
- Not done: per-tool overrides of the house view inside the 36 toolkit tools (each tool keeps its own inputs), custom fonts.
- Code: `wealthCompliance.ts`, `wealthTheme.ts`, `wealthScenarios.ts`, `wealthHouse.ts`, `wealthProcess.ts`, `wealthQuestions.ts`,
  `wealthDeckScenarios.ts`, `wealthDeckExtras.ts`, `ScenarioTabs.tsx`, `HousePage.tsx`, `DeckLook.tsx`, `DeckCustomize.tsx`; unit tests for each, an
  end-to-end test, and accessibility scans in light and dark.

---

## Update 19: Planning Depth and Per-Client Tailoring (2026-10-17)

First of three batches from the "other suggestions" list (planning depth, then deck and visuals, then workflow and records).

- **Tailor this plan (Client step):** pick the kind of client (general, college student, young professional, business owner,
  family, near retirement, executive with concentrated stock) for sensible starting choices, then switch any part of the workbench
  on or off for that one person: SWOT and strategy, money mission, portfolio and investments, retirement income, focus areas, and
  each planning tool. Parts that are off disappear from the step bar (the numbers close up) and from the presentation, and the deck
  outline says why. Your choices are kept with the plan.
- **Planning depth (new step 9):** five tools, each showing its working in a "How this was calculated" note and taking a note of your
  own that goes on its slide:
  - **Insurance needs:** life by the DIME method (debts, income, mortgage, education) plus final expenses, less liquid savings and
    coverage in force; disability as a share of income against employer and own cover; umbrella from net worth and risk factors.
    Debts, mortgage and savings can come from the Snapshot or be typed.
  - **Roth conversion:** room left in each bracket, the tax on the amount, and the value after N years in a Roth against a
    traditional account after tax, with the tax drag on the money used to pay the tax and a break-even retirement tax rate.
  - **Asset location:** places the portfolio's mix across taxable, tax-deferred and Roth accounts (cash taxable, costliest income
    in the deferred account, highest growth in the Roth) and shows the yearly tax drag against holding the same mix everywhere.
  - **Capital gains:** lots with cost, value, holding period and a sell switch; nets short against long, 0/15/20% stacking on top
    of income (2026 thresholds), the 3.8% investment income tax, the $3,000 loss deduction and carryover, and the room left at 0%.
  - **Charitable giving:** cash each year, appreciated stock each year, and several years bunched into a donor-advised fund, compared
    after tax (2026 rules: the new deduction for cash gifts by people taking the standard deduction, the 0.5% of income floor).
- **Deck:** five new slides (insurance, Roth, location, gains, giving), each with a recommendation box when you wrote one. The deck
  drawing helpers moved into `wealthDeckKit.ts` so new slide files can share them.
- Tax figures are the IRS's for 2026 and rounded; the 2026 capital gains thresholds, the non-itemizer deduction and the
  qualified charitable distribution limit should be rechecked each January. Not modeled: credits, phase-outs, the alternative minimum
  tax, state rules, the 35% cap on itemized benefit at the top bracket, Medicare surcharges.
- Code: `wealthPlanning.ts` (math, 21 tests), `wealthSetup.ts`, `PlanningStep.tsx`, `SetupPanel.tsx`, `wealthDeckPlanning.ts`;
  a deck test, an end-to-end test, and accessibility scans of every tab in light and dark.

---

## Update 18: Community Layer (2026-10-17)

Step four of the four-step build: the wealth track as a place to learn from each other. Everything is limited to people with
Wealth Tools (the Daily Bread wealth management track); nobody else can read any of it.

- **Case library (`/community/wealth/cases`, linked from Wealth Tools):** classmates' anonymized cases, newest first, with who
  shared it (or "A student in the track" if they chose to stay unnamed), when, and how many reviews it has. For each case:
  download its deck, **copy it into your own clients** to practice on, review it, and (for its author, or an admin) remove it.
- **Sharing:** on the Presentation step, under the anonymized-case panel, "Share it with the track" takes a title and an option to
  show your name. It uses the same anonymizer and the same confirmation as the download, and is blocked while an email or phone
  number is still in the text. Up to 50 cases each.
- **Peer review:** a six-line rubric scored 1 to 4 (discovery quality, goal clarity, analytical rigor, assumption transparency,
  recommendation and communication, disclosure and suitability), each with a hint and a description of every level, plus "what
  worked" and "what I would change". One review per person per case (reviewing again replaces it); you cannot review your own
  case. **Reviews are private** to the reviewer, the case's author, and admins; everyone else sees only the review count.
  The Reviews tab shows an author the average per line and every review of their cases, and a reviewer the reviews they wrote.
- **Learning path:** nine steps in order (learn the language, rehearse a discovery meeting, build a first plan, profile risk and write
  the policy, build a portfolio from sourced assumptions, present it, share a case, review two classmates, keep a market journal),
  each **checked from work actually done** rather than ticked by hand, with a link to where to do it.
- **Moderation:** admins can remove any case or review (the Remove button on a case shows "(admin)"); removing a case removes its reviews.
- **Database:** migration `20261017000200_wealth_cases.sql` adds `wealth_cases` and `wealth_case_reviews` (read-only through
  policies; writes only through `publish_wealth_case`, `delete_wealth_case`, `review_wealth_case`, `delete_wealth_review`;
  `wealth_case_review_counts` gives the counts without the reviews). 18 new database checks (166 total).
- Code: `wealthCommunity.ts` (rubric, averages, learning path; 6 tests), `useWealthCommunity.ts`, `CasesPage.tsx`,
  `PresentationStep.tsx`; the demo account has one classmate's case to review; 1 end-to-end test and accessibility scans of all
  three tabs in light and dark.
- **Not built, by design:** no comments on cases, no reporting button (admins moderate), and the anonymization is only as good as
  the person sharing; the confirmation says so.

That completes the four-step plan (credibility core, investment layer, internship layer, community layer).

---

## Update 17: Internship Layer (2026-10-17)

Step three of the four-step build: turning the Wealth Tools into a way to prepare for, and show, the work.

- **Interview and career prep (new page, `/community/wealth/prep`, linked from Wealth Tools):** seven tabs, saved privately per person.
  - **Technical questions (37):** across planning and clients, investments, taxes and accounts, private banking and markets. Try it,
    reveal the answer, rate yourself (needs work / okay / confident); filter by category or hide what you already know.
  - **Behavioral (11):** prompts with a place to write the answer and a word count.
  - **Practice clients (6 invented people):** a discovery script to role-play, what the client says when asked, a rubric to score
    your recommendation, and "Start a plan" which creates a full plan from the persona (analysis left blank for you to do).
  - **Market journal:** a weekly view in your own words (view, evidence, what would change my mind).
  - **Readiness:** a checklist of skills, markets knowledge, credentials, experience and network.
  - **Applications:** a tracker (firm, role, status, deadline, notes).
  - **Resume bullets:** drafted only from what you have actually done (plans built, decks made, journal entries, questions
    mastered), with "educational, not a professional engagement" wording. Nothing is invented.
- **Anonymized case studies:** on the Presentation step, a case export replaces the client's name with "Client A", removes contact
  details (and optionally notes, psychology and beneficiaries), flags any email or phone left in free text, and needs a
  confirmation before it downloads (`Client-A-Case-Study.pptx`).
- **Database:** migration `20261017000100_wealth_prep.sql` adds `wealth_prep` (own row, wealth-approved only) with
  `save_wealth_prep` and `bump_wealth_stat` (decks and case exports counters). 9 new database checks (148 total).
- Code: `wealthPrep.ts`, `wealthPrepContent.ts`, `wealthPersonas.ts`, `wealthCase.ts`, `useWealthPrep.ts`, `PrepPage.tsx`,
  `prepTabs.tsx`; 8 unit tests, 2 end-to-end tests, and accessibility scans of every tab in light and dark.

Next in the agreed order: the community layer (shared anonymized cases, peer review, learning path) - see Update 18.

---

## Update 16: Investment Layer (2026-10-17)

Step two of the four-step build toward an industry-standard workbench: the work that sits between a plan and a portfolio.

- **Portfolio step (new step 8)** with five tabs:
  - **Assumptions and sources:** capital market assumptions you enter, for eight asset classes (expected compound return and
    volatility) and a correlation matrix, with a source and as-of date that print under every exhibit. The starting numbers are
    round, **illustrative placeholders** and are labelled as such. Under the tables are **seven guidelines** for choosing
    assumptions (one published set, compound returns, time frame, reasonableness checks, inflation consistency, uncertainty,
    recording the source) and **eight references** to look the figures up (published capital market assumption sets, long
    historical return datasets, FRED, and index fact sheets). Correlations that cannot all be true together are pulled slightly toward
    zero, and the tool says so.
  - **Allocation:** weights with model portfolios for the five risk profiles and a 60/40 reference, stocks share, expected
    return (compound and average), volatility, return per unit of risk, a bad year (1 in 10), each class's share of the
    risk, a side-by-side with the 60/40, and "Use this portfolio in the model".
  - **Efficient frontier:** a chart of 6,000 random long-only mixes, the best line through them, each asset class, this portfolio and
    the 60/40, with a sentence on how far below the frontier the portfolio sits.
  - **Stress tests:** the portfolio in 2000 to 2002, 2008, the 2020 crash and 2022 (approximate, rounded index returns, editable) and
    your own scenario, with dollars lost and years to recover.
  - **Fees and rebalancing:** what yearly fees from 0.05% to 1.25% (and your own) cost over the plan's years, and the drift and
    trades after a market year, with a rebalancing band.
- **Retirement income (Model step, new tab):** saving until retirement and then spending, in today's dollars, with the chance the
  money lasts, the balance at retirement, the first-year withdrawal against the 4% guide, and a note on sequence risk.
- **Deck:** new slides for asset allocation, correlations (a heat-mapped table), the efficient frontier (drawn from shapes so every mark
  is editable), stress tests, fees, rebalancing and retirement income, with the allocation written into the investment policy
  statement. The example deck is now about 38 slides.
- **Method notes:** published returns are compound, the Monte Carlo model uses an average return, so the tool converts (average =
  compound plus half the variance) and "Use this portfolio in the model" sets the average. Historical stress figures are approximate
  and should be checked with the index providers before presenting.
- Code: `wealthPortfolio.ts` (math, with 12 tests), `wealthReferences.ts`, `PortfolioStep.tsx`, `RetirementTab.tsx`, `charts.tsx`.

Next in the agreed order: the internship layer, then the community layer.

---

## Update 15: Credibility Core (2026-10-17)

The first of four steps toward an industry-standard wealth planning workbench (the order was agreed after a brainstorm on matching
what private banks and wealth managers produce). This one adds what every professional plan starts with, and the conventions a
professional deck follows.

- **Financial snapshot (new step 2):** what the client owns and owes (with quick-add accounts), and where the month goes (needs,
  wants, giving, saving). It works out net worth, the cash cushion in months of needs, the savings rate, debt payments as a share
  of take-home, the weighted debt rate, and the monthly surplus, each with a rule of thumb and a word for where it stands.
- **Three-part risk profile (new step 7, "Risk and IPS"):** risk **tolerance** (six questions about attitude), risk **capacity**
  (five questions, three answered automatically from the plan: horizon, cash cushion, debt load), and the **return the goals
  require** (solved from the goals with no swings). The plan uses the more cautious of tolerance and capacity, and says plainly when
  the goals need more return than the client should take (the fix is saving more, more time, or a smaller target, not more risk).
  "Apply to the model" sets the planning return and swings.
- **Investment policy statement (IPS):** eleven sections (purpose, return, risk, horizon, liquidity, taxes, legal, unique
  circumstances, allocation, rebalancing, review) drafted from the plan, each rewordable, with "Copy as text".
- **Goals now have buckets and a funding status:** essential, important or aspirational (defaulting from priority), and the chance
  each goal is reached on time. The client's monthly saving is shared out in bucket order, or typed per goal. Short goals are
  simulated with cash-like returns, long ones with the plan's portfolio (goals under a year use months, not whole years).
- **Deck conventions:** each slide now has a small topic label and the takeaway as its title (an action title); charts and tables are
  numbered exhibits with a source line and an as-of date; negatives show in parentheses; a **Recommendation** slide comes right after
  the executive summary; new slides for the **balance sheet**, **goal funding status**, **risk profile**, **investment policy
  statement**, an actual-versus-guideline **cash flow** slide, an expanded **disclosures** page and a **methodology appendix**.
  The deck now runs to about 31 slides for the example client.
- Step numbers on screen now come from one list (`steps.ts`), so adding a step renumbers the rest.
- Code: `wealthRisk.ts`, `wealthIps.ts`, `SnapshotStep.tsx`, `RiskStep.tsx`; tests in `wealthRisk.test.ts`, the deck tests, and a new
  browser test for the three new steps.

Next in the agreed order: the investment layer (asset allocation with capital market assumptions you enter, efficient frontier,
stress tests, a retirement income phase), then the internship layer, then the community layer.

---

## Update 14: Automatic Tax Estimates and a Draggable Roadmap (2026-10-17)

**Taxes worked out from income.** Wherever a Wealth Tools tool asks for a tax rate next to an income, the rate is now estimated from
that income with the 2026 federal brackets and standard deductions, and a line of fine print says exactly how the number was
reached. A small **Estimate / My own** switch on each rate lets the analyst type any rate instead (it starts from the estimate, and
the fine print then says the rate was chosen by hand).

- **Gifts (Charity tool):** the rate on a gift is the client's federal bracket for the next dollar, from their income and filing status.
- **Side business:** the amount to set aside is self-employment tax (15.3% on 92.35% of profit) plus federal income tax on the profit
  stacked on any other income, after the standard deduction and half of the self-employment tax.
- **Extra income (Income tool):** the tax on extra pay is the extra federal income tax from stacking it on the pay already earned,
  plus 7.65% Social Security and Medicare.
- **Accounts (Traditional, Roth, brokerage, HSA):** "tax rate now" is the client's bracket from their yearly income.
- **Client profile (step 1):** "Estimate take-home pay from pay before tax" works out monthly take-home (federal tax, Social Security
  and Medicare) and fills the box on request.
- Each of these has a **filing status** (single, married filing jointly, head of household), which picks the brackets and deduction.
  State tax is not included in an estimate; "My own" is for that. A rate typed in before this update stays as typed. The numbers
  appear in the presentation's tool slides, labelled "estimated from income" where they were.
- Code: `src/lib/taxMath.ts` (the estimates, with tests), `TaxRateField.tsx`, a new `rate` field kind in the tool specs.

**Draggable roadmap.** In step 7, Roadmap, each milestone has a handle (⠿). Drag it into another time frame (30 days, 90 days,
6 months, 1 year, 3 years) and drop it anywhere in that column; the column lights up, and a dashed slot shows where it will land.
It works with a mouse or a finger, and the page scrolls while a milestone is held near the top or bottom of the screen. Without
dragging: press the left or right arrow key on the handle, or use the **Move to** menu on each card. The presentation's roadmap
slide and the progress counts follow the new places.

---

## Update 13: Client Plans and Presentations (2026-10-16)

Wealth Tools is now what it was meant to be: a workbench for students in the Daily Bread wealth management track to take a
**discovery meeting with another student or client** all the way to a **PowerPoint walk-through**. It is no longer "my own
wealth plan".

- **Client plans:** the Wealth Tools page lists the student's clients ("Start a client plan", or "See an example client").
  Each client has their own plan and their own toolkit numbers. Delete a plan with its Delete button.
- **Eight steps per client:** Client (with a box for the discovery meeting notes), Goals, SWOT, Strategy, Mission, **Focus
  areas**, Model, **Presentation**.
- **Focus areas and tools (step 6):** pick the client's 2 or 3 topics (the same list as the discovery workshop); each one opens
  its toolkit tool right there for the client's real numbers, with a line on why it matters. The whole toolkit is below, as a
  summary, for extra tools to bring; tick one to add its slide.
- **Presentation (step 8):** presenter name, meeting date, and a checklist of what goes in. **Download PowerPoint (.pptx)** builds
  a 16:9 deck (about 25 slides): title, contents with page numbers, executive summary with a goals chart, client profile, vision
  and mission, goals, SWOT, strategy, the Monte Carlo projection (fan chart of the 10th, 50th and 90th percentiles against the
  goal), a scenario table (four monthly savings amounts across three risk profiles, colour-coded by chance of success, plus the
  monthly amount for an 80% chance), account comparison and after-tax growth charts, income comparison, a 50/30/20 cash-flow
  chart, weekly time, the focus areas, **one slide per toolkit tool** (their numbers, result tiles, and a chart for the debt,
  car, house, accounts, income and growth tools), roadmap, next steps, a closing slide with the KJV verse, and assumptions
  and disclosures. Charts and tables are native, so they can be edited in PowerPoint, Keynote or Google Slides, and **every
  slide has speaker notes** that explain it in plain words. A tool the client has not filled in is labelled as using example
  numbers. The one-page brief is still there to print.
- **Reference:** the structure (contents page, executive dashboard, scenario and risk slides) follows the kind of decks listed at
  slidegeeks.com/ppt/wealth-management-structure; the designs are our own.
- **Data:** a new `wealth_clients` table (migration `20261016000200_wealth_clients.sql`), one row per client plan, owned by the
  student who made it and readable only by them (not by leaders, members or admins). Plans saved in the first version became that
  person's first client plan. The deck is built in the browser; nothing about the client is sent anywhere.
- **Under the hood:** `src/lib/wealthDeck.ts` (the slides), `wealthDeckTools.ts` (tool charts), `wealthContent.ts` (reference
  tables and topic blurbs), and `src/components/wealth/` (the screens). The pptxgenjs library loads only when the button is pressed.
  23 database checks cover the privacy rules; 6 deck tests build every part, including a slide for all 36 tools.
- **Also fixed:** the highlighted result tiles in the toolkit were too faint in dark mode.

Reminders: the old `wealth_workspaces` table is left in place as a copy; drop it with `drop table wealth_workspaces;` when
you are happy with the move.

---

## Update 12: Wealth Tools (2026-10-16)

A private, tool-style space in Community, plus a new **Request wealth tools** button beside **Request leader status**.

- **How a person gets in:** on the Community page, "Request wealth tools" sits to the right of "Request leader status". It
  asks the admin, like leader status does. The admin approves from **Admin, Wealth tools** (a gold number on the tab shows
  how many are waiting; an email goes out too once automatic email is set up). Admins always have it.
- **What it holds:**
  - **My wealth plan** (from the Daily Bread Wealth Management Track): six modules (About you, Goals, SWOT, Reflection,
    Money mission, and Model-learn-act with a Monte Carlo projection, an education hub, a weekly schedule and a roadmap) and a
    one page brief to print or save as a PDF. "See an example plan" fills it in with a worked example.
  - **Money toolkit**, summarized: "Your numbers at a glance" shows only the tools you have filled in, with their headline
    numbers (printable), then the six sections as one line per tool. A tool opens in place; "Clear my numbers" takes it back out.
- **Everyone's data stays their own:** one private row per person (`wealth_workspaces`). Only that person can read it;
  nobody else, group leaders and admins included. It can only be written through two functions that write the caller's own
  row, so there is no way to save into someone else's. A copy is also kept on that device under their user id and is
  removed when they sign out. Changes save a moment after typing, and anything waiting is sent when the page is left.
- **Daily Bread group removed:** the group was deleted from the live site (script in `supabase/data/20261016_remove_daily_bread.sql`;
  its one completed meeting's notes were copied to a private `archived_discovery_meetings` table first). The workshop and
  group toolkit code is still in the app (switched on per group from the SQL editor) and the demo tour still shows it.
- **Words an admin can change:** Admin, Content, "Wealth Tools" (heading, introduction, privacy line, toolkit summary line).
- **Under the hood:** database migration `20261016000100_wealth_tools.sql` (profile columns, the request and approval
  functions, the workspace table; 16 new permission checks in `supabase/tests/database/wealth.test.sql`), the plan logic in
  `src/lib/wealthMath.ts` (with tests), the screens in `src/components/wealth/`, and the saving hook `src/state/useWealth.ts`.
  No new libraries: the charts are drawn in SVG, in the app's own colours (so dark mode works).

Not part of this update: Daily Bread members are not approved automatically (they can ask with the button, or an admin can
approve them in Admin, Wealth tools).

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

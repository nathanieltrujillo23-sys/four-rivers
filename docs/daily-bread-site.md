# Daily Bread website: the plan (on hold)

**Status:** archived until Nathaniel asks to build it. Nothing here is built yet. Keep adding to this file as ideas come up; when we're ready, it becomes the build plan.

Last updated: 2026-11-17

---

## 1. The decision so far

A **separate Daily Bread website** with its own domain and landing page, sharing the **same Supabase project and accounts** as 4 Rivers.

| Option | Why / why not |
| --- | --- |
| Inside 4 Rivers only | 4 Rivers is a free public course with Nathaniel's name on it. The organization needs its own brand, a recruiting page, and ownership that survives officer turnover. |
| Completely separate | Members would need a second account, and the tools, chat and prayer wall would have to be rebuilt or copied. |
| **Separate site, shared backend (recommended)** | One sign-in. The tool sets stay in 4 Rivers and the new site links straight into them. Organization data lives in new tables, with access set by role and track. |

Until then, the Daily Bread space inside 4 Rivers (`/community/daily-bread`) keeps serving members.

## 2. Before we build

- [ ] Exec board approval
- [ ] Choose a name and buy a domain (about $10–15 a year; also unlocks automatic emails through Resend)
- [ ] An organization email that owns the domain, Vercel and Supabase, with Nathaniel as an admin
- [ ] Check that Vercel's free plan terms fit a student organization (otherwise the paid plan is $20 a month)
- [ ] Check UF's rules on student-organization names and university marks (don't use the UF name or logo without approval)
- [ ] Brand assets: wordmark and skyline photo are in `public/brand/`; ask for the original logo files and any other photos
- [ ] List of tracks, track leads and directors, and the current roster

## 3. Roles and data

**Roles:** member, analyst, track lead, director, exec.

**New tables (same Supabase project):** organizations, tracks, memberships (role + tracks), events, attendance, excused absences, announcements, read receipts, curriculum weeks/sessions, files (Supabase Storage). Row-level security by role and track.

**Added 2026-11-17:** applications, application reviews (rubric scores), interview slots, recruiting windows, member pipelines (private), alumni profiles, mentor requests, research posts (with an approval status), role handbooks (duties, checklist, files), onboarding steps and progress.

**Privacy rules for the new data:**
- Applications and scores: directors and exec only. Applicants see only their own status.
- A member's recruiting pipeline is private to them. Leaders see totals only ("9 at superdays"), never names or firms per person.
- Research goes public only after a director approves it and the author agrees.
- Alumni listing is opt-in.

## 3a. What already exists in 4 Rivers (reuse, don't rebuild)

The new site links into these or reuses their code:
- **Members' space** (`/community/daily-bread`): weekly brief, verse of the day, reading plan with calendar and catch-up, prayer wall, group chat, member directory (members listed on joining, Update 44).
- **Tool sets:** Wealth Tools (discovery workshop, scenario toolkit, signed agreements, wealth plan decks), Investment Banking (model reviews), Consulting.
- **For leaders:** leader dashboard, invite poster, Excel export (`lib/excelWrite.ts`).
- **Design and brand:** `CommunityKit.tsx` and `cm-*` classes; wordmark in ink and white, HD skyline (`public/brand/daily-bread-skyline-*`, Update 45).
- **Reusable pieces:** the case-review rubric (for application scoring), the signature pad (for officer handoff sign-off), the member directory (as the base for alumni).

## 4. Features

### Attendance
- The presenter's screen shows a QR code that changes every 30 seconds, so it can't be texted to someone who isn't there; a 4-digit code read aloud as a backup.
- Excused-absence requests with a reason, approved by the track lead.
- An attendance record per member; a table by track for directors, exportable to Excel (reuse `lib/excelWrite.ts`).

### Announcements
- To the whole organization or one track; pinned and scheduled posts.
- Read receipts ("read by 34 of 52") and a "please confirm you've read this" option for important posts.
- A weekly email digest once the domain exists.

### Calendars
- One calendar with a layer per track; each member sees the organization's events plus their own tracks, with RSVP.
- A subscribe link (ICS feed) for Google or Apple Calendar that stays up to date.
- Each event links to its attendance check-in and that session's materials.

### Curriculum files
- A semester plan per track: week, then session, then slides, workbook or case.
- Pre-work due before each meeting, with a completion check the track lead can see.
- Sessions open the matching 4 Rivers tool directly (e.g. "Week 5: DCF" opens the valuation tool).

### Site header (Nathaniel's layout, 2026-11-17)
On every page, left to right after the wordmark:
- **Tracks:** a menu with a link to each track's overview page.
- **Team:** the Meet the Team page.
- **Apply:** the application (the application portal below).
- **Events:** the event calendar.
- **Service:** the community service page.
- A sign-in link for members at the far right. On phones the links fold into a menu.

### Landing page: three full screens (Nathaniel's layout, 2026-11-17)
Scrolling moves one full screen at a time:
1. **Mission:** the mission statement over the city skyline background. The wordmark's cross can draw itself and the text fade in, with a slow zoom on the photo; keep the motion quiet.
2. **Tracks:** a fresh screen with one card per track (what the track is, what an analyst does each week), each linking to that track's overview page.
3. **FAQ and contact:** common questions (who can join, time commitment, faith expectations, when recruiting opens) and contact info (the organization's email and socials), with a link to apply.

Style: professional and sharp, consistent with the Community design (see `CommunityKit.tsx`, `cm-*` classes).

Ideas from the first plan that move off the landing page so it stays to three screens: live numbers, where members have interned (text only, no firm logos, with permission), director quotes, and the "semester in Daily Bread" timeline. They can live on the track, team or application pages.

### Other public pages (2026-11-17)
- **Track overview pages**, one per track: what the track covers, the semester curriculum at a glance, the tools members use, the track lead, and a link to apply.
- **Meet the Team:** exec board, directors and track leads, each with a photo, role, year, major and one line. Officers keep it current, and it updates automatically when the officer handoff happens.
- **Event calendar:** public events are visible to anyone; members-only events show once signed in. Each event has an RSVP and a subscribe link.
- **Service:** the organization's community service: upcoming projects with sign-ups, past projects with photos, and total hours served. Members log their hours, and an officer approves them.

### Analyst record
- One semester summary per member: attendance, pre-work, cases presented, peer reviews. Printable, useful in interviews.

### Application portal (added 2026-11-17)
- The interest form grows into a full application: short answers, resume upload, track preference.
- Applicants book an interview from slots that directors open.
- Directors score each applicant on a shared rubric (reuse the case-review rubric), see an average, and leave notes.
- Decisions are sent from the site (by email once the domain exists). An accepted applicant becomes a member in one click, with their tracks set.
- Replaces Google Forms and spreadsheets; nothing about applicants is visible to members.

### Recruiting tracker (added 2026-11-17)
- **Season calendar:** application windows by firm and role. Each entry shows the date it was checked and links to the firm's careers page; officers enter them (from the October "saved for later" list).
- **My pipeline:** each member's private list: firm, role, stage (applied, first round, superday, offer), dates and notes.
- **Org totals for leaders:** counts by stage, with no names, used to plan mock interviews and prep sessions.

### Alumni and mentors (added 2026-11-17)
- Members who graduate keep their account and move to an alumni role.
- Opt-in alumni directory: graduation year, where they are now, and the topics they'll talk about. Built on the member directory.
- Mentor requests: a member asks, a track lead approves, and the alum accepts. No contact details are shown until both sides agree.

### Public research page (added 2026-11-17)
- The best stock pitches and cases, each with the deck or a summary, the presenter (with their consent) and the date.
- A director approves every post before it goes public.
- Every post carries a clear label: educational work by students, not investment advice, not a recommendation to buy or sell.
- Doubles as a recruiting showcase and a portfolio members can link to.

### Officer handoff (added 2026-11-17)
- A page per officer role: duties, a semester checklist, key files and accounts (names of accounts, never passwords).
- At turnover the outgoing officer marks each item done and the incoming one signs off (reuse the signature pad).
- The exec board sees which roles have been handed over.

### New analyst onboarding (added 2026-11-17)
- A first-weeks checklist: finish the profile, get approved for a tool set, first reading, first meeting, meet the track lead.
- Track leads see who is stuck and on which step.

## 5. Build order

Decided 2026-11-17: **both, smaller.** Start with a thin version of the recruiting front door and of member operations, then deepen each.

1. **Foundation:** domain, org tables and roles, roster import.
2. **Thin front door and thin operations:** the header, the three-screen landing page (mission, tracks, FAQ and contact) with the interest form, the track overview pages and Meet the Team, plus the event calendar (RSVP and subscribe link) and announcements.
3. **Attendance, onboarding and service:** check-in tied to events, excused absences, the new-analyst checklist, and the Service page with project sign-ups and hours.
4. **Application portal:** applications, interview slots, rubric scoring, decisions.
5. **Curriculum library and officer handoff.**
6. **Recruiting tracker, alumni and mentors.**
7. **Public research page and landing page polish:** the research showcase, plus the landing page's motion and any extras that move onto the track and team pages.
8. **Directors' dashboard and the analyst record.**

Roughly 8–10 updates, numbered like the rest ("Update N: Name").

## 6. Open questions

- Name and domain?
- Which tracks besides wealth management, investment banking and consulting?
- Does attendance affect standing or eligibility for anything (e.g. trips, leadership)?
- Who can post announcements: track leads, directors, or exec only?
- Should the interest form be public, or open only during recruiting?
- Applications: who scores them (directors only, or track leads for their own track)? How many reviewers per applicant?
- Alumni: who counts (graduates only, or also members who left early)? Do alumni keep access to the tool sets?
- Research page: full names or initials? Does a member's internship employer need to be told before their work is public?
- Recruiting windows: which officer keeps them current, and how often?
- The mission statement's exact wording (the photo's tagline is "Faith driven leaders. Purpose driven careers.").
- FAQ questions and answers, and the contact details to show (organization email, Instagram, LinkedIn?).
- Team photos: does everyone have a headshot, or do we take them at a meeting?
- Service: which projects and partners so far, and are hours required of members?

## 7. Idea log

Add new ideas here with the date, newest first.

- 2026-11-17: Nathaniel set the site layout. The landing page is three full screens: mission statement over the city background, then the tracks, then FAQ and contact. The header links to the track overview pages, Team (Meet the Team), Apply, Events (calendar) and Service (community service page). Service hours, set aside earlier the same day, come back as part of the Service page.

- 2026-11-17: Added the application portal, recruiting tracker, alumni and mentors, public research page, officer handoff and new-analyst onboarding. Build order changed to "both, smaller". Considered and left out for now: faith-life extras (accountability pairs, service hours, devotional archive), dues tracking, public speaker-event pages.

- 2026-11-15: First version of this plan (from the Update 37 discussion).

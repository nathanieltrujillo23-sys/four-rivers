# Daily Bread website: the plan (on hold)

**Status:** archived until Nathaniel asks to build it. Nothing here is built yet. Keep adding to this file as ideas come up; when we're ready, it becomes the build plan.

Last updated: 2026-11-15

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

### Landing page
- Skyline photo with a slow zoom, the cross in the wordmark drawing itself, the tagline fading in.
- Three track cards that open to show what an analyst does each week.
- A "semester in Daily Bread" timeline that unfolds on scroll.
- Live numbers from the database (members, sessions held, cases presented).
- Where members have interned: text only, no firm logos, with permission.
- Director quotes, an interest form with a recruiting-deadline countdown, an FAQ, and the faith statement.
- Style: professional and sharp, consistent with the Community design (see `CommunityKit.tsx`, `cm-*` classes).

### Analyst record
- One semester summary per member: attendance, pre-work, cases presented, peer reviews. Printable, useful in interviews.

## 5. Suggested build order

1. Foundation: domain, org tables and roles, roster import
2. Landing page and interest form
3. Calendar, RSVP and subscribe link
4. Attendance tied to events
5. Announcements with read receipts
6. Curriculum library
7. Directors' dashboard and the analyst record

Roughly 6–8 updates, numbered like the rest ("Update N: Name").

## 6. Open questions

- Name and domain?
- Which tracks besides wealth management, investment banking and consulting?
- Does attendance affect standing or eligibility for anything (e.g. trips, leadership)?
- Who can post announcements: track leads, directors, or exec only?
- Should the interest form be public, or open only during recruiting?

## 7. Idea log

Add new ideas here with the date, newest first.

- 2026-11-15: First version of this plan (from the Update 37 discussion).

# Project status

Where Make My Marriage stands, one entry per big feature. Newest entries go at
the top of the log. Product questions and differences from the specs go in
[decisions.md](decisions.md), not here.

Status values: **Done** (merged into `dev`), **In progress** (on a feature
branch), **Next**, **Later**.

## Summary

| Feature                                        | Status      | Branch / PR                       | Updated    |
| ---------------------------------------------- | ----------- | --------------------------------- | ---------- |
| Foundation scaffold                            | Done        | `dev` (first commits)             | 2026-11-03 |
| Dashboard (sample data)                        | Done        | `feature/dashboard`, PR #1        | 2026-11-04 |
| Landing page (homepage), sign-up and log-in UI | Done        | `feature/landing`, PR #2          | 2026-11-05 |
| Permission checks and rate limits (platform)   | Done        | `feature/auth-api`, PR #3         | 2026-11-11 |
| Accounts: database, sign-up and log-in API     | Done        | `feature/auth-api`, PR #3         | 2026-11-11 |
| Dashboard only after login (`proxy.ts`)        | Done        | `feature/auth-api`, PR #3         | 2026-11-11 |
| Create wedding (`/wedding/new`)                | Done        | `feature/auth-api`, PR #3         | 2026-11-11 |
| Email verification and forgot password         | Done        | `feature/auth-api`, PR #3         | 2026-11-11 |
| Landing page knows who's signed in             | Done        | `feature/landing-session`, PR #4  | 2026-11-11 |
| Members and invites                            | Done        | `feature/members`, PR #5          | 2026-11-13 |
| Email (Gmail, or Resend)                       | Done        | `feature/email`, PR #6            | 2026-11-15 |
| Wedding settings (`/settings/wedding`)         | Done        | `feature/wedding-settings`, PR #7 | 2026-11-16 |
| Deployment (Vercel, Production from `main`)    | Done        | `feature/deploy`, PR #8           | 2026-11-16 |
| Database indexes in production (`db:indexes`)  | Done        | `fix/db-indexes`, PR #9           | 2026-11-16 |
| Emailed links never use localhost on Vercel    | Done        | `fix/app-url`, PR #10             | 2026-11-17 |
| Events (`/events`)                             | In progress | `feature/events`                  | 2026-11-17 |
| Landing page: features, how it works, footer   | Later       | —                                 | —          |

## Log

### 2026-11-17: Events (In progress)

- **Events** in the sidebar: the schedule grouped by day, earliest first,
  in India time. Admins add events (name, start and end, which may be the
  next day, muhurtham, venue and address, map link, dress code,
  instructions for guests, livestream link) and delete them after a check
  that lists what changes. Admins and Managers edit details; only Admins set
  the livestream link. Without a map link, the event links to a Google Maps
  search for the venue.
- API: `GET`/`POST /events`, `GET`/`PATCH`/`DELETE /events/{id}`,
  `GET /events/{id}/delete-check`. Indexes added to `pnpm db:indexes`.
- The QR code, WhatsApp share, cover image, the event page's counts and
  activity entries arrive with Gallery, Invitations, photo storage and the
  features that own them; the dashboard's upcoming events stay on sample
  data until "Dashboard on the real wedding".
- Tested: schema, permission and database tests for creating, listing,
  editing, clearing, the time rules, other weddings and deleting; a browser
  test as Admin and Manager; checked at 360 px and on desktop.
- QA pass: about 50 extra checks (bad and boundary input, February 30,
  `javascript:` and fake YouTube links, injected fields, other weddings,
  roles, CSRF, signed out, two Admins at once, a script in the name,
  keyboard use, 404s, the Manager's view). It found one bug, fixed: an
  80-character name with no spaces widened the page (865 px on a phone);
  long text now wraps, and a browser test checks it. 179 unit and database
  tests and 19 end-to-end tests pass.
- **Waiting for:** the owner's check in the browser, then the PR into `dev`;
  after release, run `pnpm db:indexes --database mmm_prod` for the new
  `events` indexes.
- Decision 70.

### 2026-11-17: Emailed links never use localhost on Vercel (Done, PR #10)

- An invite email reached the owner with a `localhost:3000` link. On Vercel
  the app now ignores a localhost (or missing) `NEXT_PUBLIC_APP_URL` and uses
  the deployment's own address; a trailing slash is dropped too. Unit tests
  cover Production, Preview, a custom domain and local use.
- Reminder: send family invites from the live site; invites sent from
  `localhost:3000` go to the development database with localhost links.
- Released to `main` (PR #11). Checked by the owner on the live site: a new
  invite's link uses the live address.
- Decision 69.

### 2026-11-16: Database indexes in production (Done, PR #9)

- Found while starting Events: production runs with `autoIndex` off and the
  setup script Database Design names didn't exist, so the live database had
  no unique or TTL indexes. Everyday use was still protected by the code's
  own checks; two requests at the same instant could have made a duplicate,
  and expired sessions and tokens weren't being deleted.
- Added `pnpm db:indexes --database <name>`, built from each module's
  `model.ts`. Tried on a test database in production mode: it built exactly
  Database Design's indexes. A database test checks them; 161 unit and
  database tests and 17 end-to-end tests pass.
- Run on `mmm_prod` by the owner: all 7 collections got Database Design's
  indexes, with no duplicate-key errors, so no duplicates had slipped in.
  Released to `main` in PR #11.
- Decision 68.

### 2026-11-16: Deployment to Vercel (Done, PR #8)

- **Live at https://make-my-marriage-app.vercel.app**, on Vercel's free
  Hobby plan, functions in Mumbai (`bom1`), database `mmm_prod` on Atlas.
- `main` is the Production branch (created from `dev`). Features still
  merge into `dev`; a PR from `dev` into `main` releases.
- Variables set: `MONGODB_URI`, `NEXT_PUBLIC_APP_URL` and the Gmail ones.
  `SESSION_SECRET` and `JOB_SECRET` aren't used by any code yet, so they
  wait for the job runner.
- First deploy couldn't reach the database (`db: down`) until Atlas Network
  Access allowed `0.0.0.0/0`.
- Automated QA on the live site, creating no accounts and sending no email:
  HTTPS redirect and HSTS, signed-out refusals, the CSRF header, sign-up
  validation, wrong password, protected pages, 404 and bad invite links,
  360 px, no browser errors. All passed.
- Checked by the owner on the live site: sign up, the verification email
  (link on the live address), Create wedding, Wedding details, and inviting
  a member who joined.
- **Follow-ups:** a production-only Atlas user (the first deploy reuses the
  development one, on the separate `mmm_prod` database); an uptime monitor
  on `/api/health`; a fake password-reset link could say it's invalid
  before the form is filled in.
- Decision 67.

### 2026-11-16: Wedding settings (Done, PR #7)

- **Settings → Wedding details** (Admin only): change the couple's names,
  wedding name, date, city, website address, tagline and description. Only
  the changed fields are saved; a taken address offers free ones; a new date
  can't be in the past. The sidebar's name and monogram follow at once.
- `GET /api/v1/wedding` (Admins, Managers, photographer) and
  `PATCH /api/v1/wedding` (Admins).
- The RSVP cutoff, upload cap and cover image wait for RSVP, the gallery and
  photo storage.
- Create wedding and Wedding details now share the website address field
  and its "is it free" check.
- Tested: schema and database tests for saving, past dates, addresses and
  roles; an end-to-end test on its own wedding (Admin edits in the browser, a
  Manager can read but not change, CSRF, taken address). Checked at 360 px
  and on desktop. New browser tests also cover the website address (taken,
  suggested, free, saved) and Undo on Wedding details, and the Create
  wedding form, whose address field is now shared.
- A QA pass found that an impossible date such as 30 February was accepted
  (JavaScript rolls it over to 1 March); dates must now read back unchanged,
  for Create wedding too. It also checked limits, bad input, a script in the
  name, two Admins saving at once, two weddings taking one address, keyboard
  use and 360 px. All 160 unit and database tests and 17 end-to-end tests
  pass.
- Checked by the owner in the browser on the test server (port 3100).
- Small follow-ups: the Settings cards' links are all named "Open" for
  screen readers; one end-to-end run of Create wedding failed once and
  passed in the next 7 runs.
- Decision 66.

### 2026-11-15: Email through Gmail or Resend (Done, PR #6)

- Verification, password-reset and invite emails are sent through a free
  Gmail account with an app password (`GMAIL_USER`, `GMAIL_APP_PASSWORD`,
  sender name `EMAIL_FROM_NAME`), or through Resend if Gmail isn't set up. No
  domain is bought. Development still prints emails in the terminal. A failed
  email is logged and never undoes the action.
- Resend without a domain refused an invite to another address (it only
  reaches the Resend account's own email), which is why Gmail is used.
- Tested by hand with real inboxes: password reset, member invite, resend
  invite and joining through the new link all work. Email links use
  `NEXT_PUBLIC_APP_URL`, so it must match the port the app runs on.
- End-to-end tests now start their own server on port 3100 instead of
  reusing `pnpm dev` on 3000, which has the real database and email
  (decision 65).
- Tests never send real email. All 151 unit and database tests and 15
  end-to-end tests pass.
- **Not yet:** the email queue in the `jobs` collection (Database Design);
  needed for bulk guest invitations in Phase 2.
- Decisions 64–65.

### 2026-11-13: Members and invites (Done, PR #5)

- **Settings → Wedding members** (Admin only): invite family by email as Admin
  or Manager with a relation ("Bride's mother").
  - **Pending invitations:** listed with role, relation, Pending or Expired,
    the link's expiry and who sent it.
  - **Revoke an invitation:** Cancel invite stops the link at once (no
    confirm step, since it can be sent again). Resend gives a new link for 7
    more days and stops the old one.
  - **Change roles:** Make Admin or Make Manager; the member is logged out
    so the new role applies.
  - **Remove a member, or Leave the wedding,** each with a confirm step
    ("Remove Meena?", "Leave this wedding?").
- **Invite link** `/invite/<token>`: shows who invited whom to which wedding;
  sign up with the invited email (locked) or log in, then join. Joining
  confirms the email. Wrong account, used, expired and cancelled links each
  get their own message.
- Rules from the PRD: one wedding per person, at least one Admin always,
  role changes and removals log the member out at once, links work once for
  7 days. Managers can't see Settings or the members API.
- Tested: 12 database tests against Atlas (including two Admins demoting or
  removing each other at the same instant), 5 permanent end-to-end tests
  (`tests/e2e/members.spec.ts`), and 28 checks in Edge on desktop and phone
  (invite, join, Manager limits, role change, remove, Leave, expired, wrong
  account, already in a wedding, cancelled). On 2026-11-15, with real email:
  invite, resend, join, and remove checked again by the owner.
- Matched to two new Stitch designs generated for these pages (decision 62).
- Auth review fixes: **Your account** page (change name or password) and the
  verification link now logs you in, as PRD F1 says (decision 63).
- Decisions 61–63.

### 2026-11-11: Landing page knows who's signed in (Done, PR #4)

- A signed-in visitor sees their name and **Go to dashboard** (or **Continue
  setup** before verifying or creating a wedding) instead of Log in and Sign
  up, in the header and the hero. Public pages still load when the database
  can't be reached.
- Code review fixes: the browser's session cookie now slides with use
  (it expired 30 days after logging in, decision 60); the header button hides
  on the page it would open; unexpected session errors are logged; an
  end-to-end test covers the landing page logged out and logged in.
- Decisions 59–60.

### 2026-11-06: The app is protected (Done, PR #3)

- Logged-out visitors are sent to log in and brought back afterwards;
  unverified users go to verify, users without a wedding to Create wedding.
- Log out in the sidebar and mobile menu, beside the user's name.
- Manual test in Edge of every auth flow (sign up, verify, log in, lockout,
  rate limit, forgot and reset, create wedding, log out): all pass. One bug
  found and fixed on the way (an old address error hid "This address is free").
- End-to-end tests log in with a seeded account in their own database.
- **Known:** the dashboard's cards, including the countdown, still show the
  sample wedding.
- Decision 58.

### 2026-11-06: Forgot and reset password (Done, PR #3)

- "Forgot password?" on log in opens `/forgot`; the emailed link
  `/reset?token=…` sets a new password, logs out every other device and
  logs in. Links work once, for an hour, and only the newest counts.
- Emails print in the server terminal until Resend is set up.
- Decision 57.

### 2026-11-06: Create wedding (Done, PR #3)

- `/wedding/new`: the PRD's setup fields (bride, groom, wedding name, date,
  city, website address, tagline, description); the address is checked while
  typing, with suggestions when taken. The cover image waits for photo
  storage.
- `POST /api/v1/wedding` creates the wedding and the Admin membership in one
  transaction; `GET /api/v1/wedding/slug-available` checks an address.
- Log-in now remembers the user's wedding; the sidebar shows its name and
  monogram.
- **Still open:** the dashboard isn't protected yet and still shows sample
  data.
- Decision 56.

### 2026-11-05: Accounts API (Done, PR #3)

- `src/modules/auth`: users, sessions and authTokens models; sign-up,
  log-in, log-out and current-user logic. Passwords use bcrypt (cost 12);
  sessions are 32 random bytes stored as a SHA-256 hash, 30 days, sliding at
  most once a day; 5 wrong passwords lock the account for 15 minutes.
- Routes: `POST /api/v1/auth/signup`, `/login`, `/logout` and
  `GET /api/v1/auth/me`, with the `mmm_session` cookie, the CSRF header and
  per-IP rate limits.
- Sign-up "sends" the verification email by printing it in the server
  terminal (decision 51).
- **Email verification:** `/verify` asks a signed-in user to check their inbox
  (with "Resend email", at most 3 an hour, and "Log out"); the emailed link
  `/verify?token=…` confirms the email once, within 24 hours. Routes
  `POST /api/v1/auth/verify` and `/verify/resend`.
- **Connected to MongoDB Atlas** (free cluster MMM, Mumbai). All 19 database
  tests pass against it; sign-up and log-in work in the browser.
- Decisions 51–53.
- Also on this branch: the Make My Marriage logo (linked rings with shine lines, decision 54) and a drawn mandap illustration with "what's waiting" information on log in and sign up (decision 55).

### 2026-11-05: Permission checks and rate limits (Done, PR #3)

- `src/platform/rbac.ts`: `authorize(session, policy, action)` applies API
  Design's caller rules in order: 401 UNAUTHENTICATED, 403
  EMAIL_NOT_VERIFIED, 403 NO_WEDDING, 403 FORBIDDEN. It returns the
  `{ userId, weddingId, role }` context that services filter by.
- `src/platform/rate-limit.ts`: per-IP limits counted in the `rateLimits`
  collection, one atomic update per request; `AUTH_RATE_LIMIT` is 10 per 15
  minutes. Errors answer 429 RATE_LIMITED with a `Retry-After` header (also
  used later for 423 ACCOUNT_LOCKED).
- **Not yet tested against a real database:** the MongoDB counter runs once
  `MONGODB_URI` is set, with the accounts work.
- Decision 50.

### 2026-11-05: Landing page, sign up and log in (Done, PR #2)

- **Landing page `/`:** the Make My Marriage header (Features, How it works,
  For guests, Log in, Sign up), the hero ("From Haldi to Reception, nothing
  slips through."), an example-wedding dashboard picture and the ceremony
  strip. Built from the Stitch designs.
- **Sign up `/signup` and log in `/login`:** styled like the landing page,
  with the intro on the left and the form on the right. They check fields
  as API Design specifies, and show every error message from the PRD and API
  Design.
- **Not working yet:** submitting shows "Accounts aren't switched on yet."
  until the auth API exists.
- Make My Marriage is the product and "KaLi's era" is one wedding (decision
  48).
- Decisions 47–49.

### 2026-11-04: Dashboard on sample data (Done, PR #1)

- `/dashboard` with every card from the PRD:
  - countdown and task progress, and my tasks;
  - upcoming events, totals, and pending payments;
  - wedding-day contacts and recent activity;
  - the new-wedding checklist.
- Loading and error states, plus empty states (`?sample=empty`).
- Shared UI pieces: card, stat, progress bar, badge and empty state.
- Rupee and Asia/Kolkata date helpers in `src/lib/format.ts`.
- **Runs on sample data** (`src/modules/dashboard/sample.ts`). It shows real
  wedding data once accounts and weddings exist.
- Decisions 37–46.

### 2026-11-03: Foundation scaffold (Done)

- Next.js 16 App Router, TypeScript, Tailwind design tokens, MongoDB
  (Mongoose) connection, Zod, Vitest and Playwright.
- Folder layout from System Design: `(auth)`, `(app)`, `w/[slug]`,
  `i/[token]`, `u/[eventToken]`, `photographer`, `api/v1` and
  `api/jobs/run`.
- `{ data }` / `{ error }` response helpers and `AppError`.
- An ESLint rule that modules import each other only through
  `@/modules/<name>`.
- The health check returns 503 when the database is down.
- GitHub Actions CI (`.github/workflows/ci.yml`).
- `AGENTS.md` project rules.
- Stitch designs saved in `docs/stitch/`.
- **Still missing from System Design's foundation step:** Vercel Preview
  and Production environments, which haven't been checked yet.

## Up next

1. **Events:** Haldi to Reception with date, time, venue and dress code
   (PRD "Events"; next in System Design's Phase 1 order).
2. **Dashboard on the real wedding:** replace the sample data as events,
   tasks and money arrive.
3. **Production housekeeping:** a production-only Atlas user, and an
   uptime monitor on `/api/health` (decision 67).

## Roadmap

From System Design, "Build order". Each item gets a summary row once work on
it starts.

| Phase                         | Features                                                                                                                                 |
| ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation (Nov 2026)         | Scaffold ✔, rbac and rate limits ✔, Preview and Production environments                                                                  |
| Phase 1 (Dec 2026 – Apr 2027) | Auth → wedding and members → events → tasks → notifications and jobs runner → expenses → vendors → activity log → dashboard on real data |
| Phase 2 (May – Sep 2027)      | Guests and CSV import → invitations → public and personal website → RSVP → headcount exports                                             |
| Phase 3 (Oct – Dec 2027)      | Storage and uploads → gallery and QR codes → photographer area → livestream → final exports → load test                                  |
| Jan 2028                      | Freeze on 1 Jan; fixes only until the wedding on 28 Jan                                                                                  |

The dashboard UI and the landing page were built ahead of this order, at the
owner's request, so the family could see the look early.

## Temporary until a later feature

| What                        | Goes away with                    |
| --------------------------- | --------------------------------- |
| Dashboard shows sample data | Events, tasks, expenses and so on |

## Housekeeping

- **Production indexes:** Mongoose builds indexes only outside production
  (decision 25); Database Design's setup script that creates them (unique
  email, slug and tokens, TTLs) is still to be written before the first
  deploy.
- **CI test database:** add `MONGODB_TEST_URI` as a GitHub secret so CI runs
  the database and logged-in end-to-end tests.

- **Rotate the Stitch API key.** It was shared in a chat. The key lives only
  in the user-level Claude settings and must never be committed.
- **Resend key:** the Gmail app password and the Resend key were rotated on
  2026-11-15 after being shared in a chat. The new Resend key has Full
  access; swap it for a Sending access key, or clear `RESEND_API_KEY`,
  since Gmail does the sending.
- **Old branches:** `feature/foundation-platform`, `feature/dashboard`,
  `feature/landing`, `feature/auth-api`, `feature/landing-session`,
  `feature/members` and `feature/email` are fully merged into `dev` and can
  be deleted on GitHub.

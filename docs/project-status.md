# Project status

Where Make My Marriage stands, one entry per big feature. Newest entries go at
the top of the log. Product questions and differences from the specs go in
[decisions.md](decisions.md), not here.

Status values: **Done** (merged into `dev`), **In progress** (on a feature
branch), **Next**, **Later**.

## Summary

| Feature                                        | Status      | Branch / PR                   | Updated    |
| ---------------------------------------------- | ----------- | ----------------------------- | ---------- |
| Foundation scaffold                            | Done        | `dev` (first commits)         | 2026-11-03 |
| Dashboard (sample data)                        | Done        | `feature/dashboard`, PR #1    | 2026-11-04 |
| Landing page (homepage), sign-up and log-in UI | Done        | `feature/landing`, PR #2      | 2026-11-05 |
| Permission checks and rate limits (platform)   | In progress | `feature/foundation-platform` | 2026-11-05 |
| Accounts: database, sign-up and log-in API     | Next        | —                             | —          |
| Dashboard only after login (`proxy.ts`)        | Later       | —                             | —          |
| Create wedding (`/wedding/new`)                | Later       | —                             | —          |
| Email verification and forgot password         | Later       | —                             | —          |
| Landing page: features, how it works, footer   | Later       | —                             | —          |

## Log

### 2026-11-05: Permission checks and rate limits (In progress)

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

1. **Accounts:**
   - connect MongoDB (needs `MONGODB_URI` in `.env.local`);
   - users, sessions and authTokens;
   - sign-up, log-in, log-out and current-user API routes.
2. **Protect the app:** the dashboard opens only after login.
3. **Create wedding:** then the dashboard shows the signed-in wedding.

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

| What                                                                 | Goes away with                    |
| -------------------------------------------------------------------- | --------------------------------- |
| Dashboard shows sample data                                          | Events, tasks, expenses and so on |
| Sidebar and mobile menu always show "KaLi's era" and the LK monogram | Create wedding                    |
| Sign-up and log-in forms say "Accounts aren't switched on yet."      | Accounts API                      |
| "Forgot password?" shows "Soon"                                      | Email (Resend)                    |
| Anyone can open `/dashboard` without logging in                      | Protect the app (`proxy.ts`)      |

## Housekeeping

- **Rotate the Stitch API key.** It was shared in a chat. The key lives only
  in the user-level Claude settings and must never be committed.
- **Old branches:** `feature/dashboard`, `feature/landing` and
  `feature/auth` are fully merged into `dev` and can be deleted.

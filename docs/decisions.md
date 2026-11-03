# Decisions

Decisions not covered by the project docs (`PRD_v1.md`, `System Design v1.md`, `Database Design v1.md`, `API Design v1.md`, `design-system.md`), or that differ from them. Newest last. Add an entry whenever you decide something the docs don't cover.

## Foundation scaffold (November 2026)

### Versions and tooling

1. **TypeScript 6.0.3, not 7.0.2.** `typescript-eslint`, which `eslint-config-next` uses, supports only TypeScript below 6.1.0. Upgrade when it supports 7.
2. **Node 24.22.1** (Maintenance LTS, supported until 30 April 2028, after the wedding). This is the version already installed for development. Node 26 became Active LTS on 28 October 2026; move to it after the wedding or when a dependency needs it.
3. **Other versions:** the latest stable at setup (Next.js 16.4.3, React 19.3.1, Tailwind CSS 4.3.3, ESLint 10.14.0, Vitest 5.0.5, Playwright 1.64.1, pnpm 12.16.1), pinned exactly. The lockfile is committed.
4. **pnpm build scripts:** only `unrs-resolver` (used by ESLint's import resolver) may run its install script, as approved in `pnpm-workspace.yaml`.
5. **`typecheck` runs `next typegen` before `tsc --noEmit`.** Without it, `tsc` fails on a clean checkout because `next-env.d.ts` and the route types don't exist yet. Next.js documents this pairing.
6. **Vitest resolves the `@/*` alias natively** (`resolve.tsconfigPaths`, Vite 8), so `vite-tsconfig-paths` isn't needed. `server-only` is replaced by an empty stub in unit tests.
7. **Files are written by hand, not with `create-next-app`,** so no template pages, images or colours come along.
8. **File naming:** React components in PascalCase (`Sidebar.tsx`). Every other file in kebab-case (`request-id.ts`, later `rate-limit.ts`, not System Design's `rateLimit.ts`).

### Architecture and boundaries

9. **Module import rule is stricter than "no model imports".** System Design says files in `modules/a` "may import only `modules/b/index.ts`". ESLint therefore blocks any import of a file inside another module (`model`, `service`, `schemas`, `policy`), from anywhere in the app. Only `@/modules/<name>` is allowed. A module may import its own files.
10. **The platform layer starts with** `env`, `public-env`, `errors`, `http`, `request-id` and `db`. System Design's `storage`, `jobs`, `email`, `rbac` and `rate-limit` will be added with the features that use them. `rbac` and rate limits open Feature 1 (auth), their first users.
11. **No UI component library yet.** System Design names shadcn/ui. It will be adopted with the first real forms (auth), with its colour variables pointed at our tokens. `components/ui/` stays empty until then.
12. **The `(public)` route group** holds the landing page at `/`, so it doesn't use the app shell. It doesn't change any URL.

### Configuration

13. **Two env files.** `platform/env.ts` holds the server-only secrets and imports `server-only`, so importing it from browser code fails the build. `platform/public-env.ts` holds only `NEXT_PUBLIC_APP_URL`, which browser code may read.
14. **Missing credentials never crash the app, in any environment.** A service with missing variables is "not configured". Code that needs it calls `requireService()`, which fails with `503 SERVICE_NOT_CONFIGURED`. Values that are set but malformed always throw. Variables are read on first use, so `next build` runs without secrets. When auth lands, `MONGODB_URI` and `SESSION_SECRET` become required in production.
15. **A partly configured service** (for example two of the four R2 variables) counts as not configured and logs a warning.
16. **`SESSION_SECRET` signs the professional-album cookie (`mmm_pro`).** Organiser sessions are random ids stored hashed in MongoDB (Database Design), so they aren't signed. "Session secret" here means System Design's "cookie signing key".
17. **`NEXT_PUBLIC_APP_URL`** defaults to `http://localhost:3000` outside production and must be set in production.
18. **Email provider: Resend** (Database Design names it). There are no variables yet for Sentry or the email sender address; they come with those features.

### API

19. **New error code `SERVICE_NOT_CONFIGURED` (503)**, for a feature whose service isn't configured. API Design has no code for this.
20. **The error envelope always includes `details`,** set to `null` when there are none, so the shape never changes.
21. **Every API response carries an `X-Request-Id` header** (`req_` + 24 hex characters). API Design puts `requestId` only in error bodies. The header makes any request traceable from the browser and in logs.
22. **`Content-Type: application/json; charset=utf-8`** is set explicitly on every API response, as API Design specifies.
23. **`GET /api/health` returns 503 only when MongoDB is configured but unreachable** (`data.db` is `down`), as API Design specifies, so an uptime monitor can alert on the status code alone. With `up` or `not_configured` it returns 200: a missing database is normal in development and CI (decision 14), not an outage. The body always has the same `data` shape, including on 503. Because of the cold-start effect in decision 25, a single 503 right after a deploy can be a false alarm; set monitors to alert after two consecutive failures. It sends `Cache-Control: no-store` and answers within 2 seconds (1.5-second cap on the database check).
24. **`POST /api/jobs/run` returns `404 NOT_FOUND`** until the job runner is built. That matches how API Design says it treats a missing secret.

### Database

25. **Mongoose connection:** cached on `globalThis`, `maxPoolSize: 2`, `serverSelectionTimeoutMS: 5000`, `bufferCommands: false`, and `autoIndex` off in production (Database Design: indexes come from a setup script). A failed connection is retried on the next call. Mongoose is imported on first use, not when the file loads: the import alone took 1.3–1.5 s on a cold start in local testing, which would otherwise push the first health check past 2 seconds. A side effect: on a cold start, a reachable but slow-to-connect database can show as `down` on the first health check while the connection finishes in the background. The next check shows `up`.
    - **Why 5 s and not 1.5 s:** `serverSelectionTimeoutMS` applies to every query, not just the health check. At 1.5 s, a brief Atlas primary switch (maintenance, failover) would fail real requests such as logins instead of letting them wait a moment. 5 s rides out short switches and stays well inside a serverless request (the driver default of 30 s is too long). The health check has its own 1.5-second cap, so it still answers within 2 seconds.
26. **Local development:** a local MongoDB must run as a replica set, because the app uses transactions. Atlas always provides one.

### Design and UI

27. **Design tokens are enforced by Tailwind.** `globals.css` removes Tailwind's default colours, font sizes and radii, so only the tokens in `design-system.md` can be used. Spacing uses Tailwind's default 4px scale, because the design system defines no spacing tokens.
28. **Fonts:** Inter is the default interface font. Fraunces is used for the brand, titles and headings. Both are self-hosted with `next/font`.
29. **Navigation covers every organiser screen in the PRD.** Two items beyond the initial list were added: **Wedding-day contacts** (a PRD screen) and the **notifications bell** in the top bar (the PRD specifies a bell).

    | Item                 | PRD screens                                                                 |
    | -------------------- | --------------------------------------------------------------------------- |
    | Dashboard            | Dashboard                                                                   |
    | Events               | Events list, event detail, QR codes per event                               |
    | Tasks                | Tasks list, task detail                                                     |
    | Guests               | Guests list, add/edit guest, import, RSVP summary and headcount export      |
    | Invitations          | Send invitations                                                            |
    | Expenses             | Expenses list, add/edit expense                                             |
    | Vendors              | Vendors list, vendor detail                                                 |
    | Wedding-day contacts | Wedding-day contacts                                                        |
    | Gallery              | Guest and professional albums                                               |
    | Website & livestream | Website settings and publish, livestream links                              |
    | Activity             | Activity log                                                                |
    | Settings (bottom)    | Wedding settings, members, photographer access, professional album password |
    | Bell (top bar)       | Notifications                                                               |

    The photographer's upload area (`/photographer`) is separate and not in this menu. Hiding Admin-only items (Settings, website editing) from Managers comes with auth.

30. **Unbuilt pages aren't links.** Only Dashboard links anywhere today. The other items show as unavailable with a "Soon" caption, so nobody hits a 404. Each becomes a link when its page is built.
31. **Mobile navigation:** below 768px the sidebar is hidden and the top bar shows a menu button. It opens the same navigation in a drawer built on the native `<dialog>` (focus trap, Esc, backdrop click, screen-reader support). It closes when you pick an item or the window widens to 768px. The page doesn't scroll behind it.

### CI and formatting

32. **CI also runs the Playwright test,** because System Design requires Playwright on every pull request. It runs against the production build (`pnpm start`) and needs no browser download, since it uses only Playwright's HTTP client.
33. **Prettier skips `docs/*v1.md`** (the source documents are kept exactly as provided), `pnpm-lock.yaml`, and `AGENTS.md` (generated by `next dev`).

### Conflicts between the docs

34. **Email-verification and password-reset tokens live in one `authTokens` collection, as Database Design specifies.** System Design names the auth collection `passwordResets` instead. Database Design wins because it is the more detailed source: it defines the fields (`userId`, `type: VERIFY_EMAIL | RESET_PASSWORD`, `tokenHash`, `expiresAt`, `usedAt`) and the indexes. Both token kinds have the same shape, lifecycle and errors (`410 TOKEN_EXPIRED`, `410 TOKEN_USED`). `passwordResets` would leave verification tokens with no home. Organiser invites stay in their own `invites` collection (wedding module), as both docs say.
35. **The job runner wraps its result in `data`, like every other endpoint.** API Design shows `POST /api/jobs/run` returning `{ "processed": 37, "failed": 1, "remaining": 120 }` unwrapped. It will return `{ "data": { "processed": …, "failed": …, "remaining": … } }`, so every JSON response has the same shape.
36. **Errors include `requestId`, following API Design.** System Design's error example omits it.

## Dashboard (November 2026)

The Stitch designs are in [`docs/stitch/`](stitch/README.md). The dashboard follows `dashboard-desktop-1440px-updated`, adjusted as below.

37. **Our design system wins over Stitch's.** Stitch's palette is nearly ours (maroon `#7A1F3D` vs our `#7A263A`, ivory `#FBF8F4` vs `#FAF7F2`, the same 14px and 10px radii and 44px controls), so the Stitch look is built from the tokens in `design-system.md`, whose contrast is measured. Headings stay in Fraunces (decision 28), not Stitch's Newsreader. Stitch's hard-coded badge colours become our `success`, `warning` and `danger` tokens, and nothing goes below the 12px `caption` size.
38. **Only Phase 1 cards are built now:** countdown, task progress, my tasks, upcoming events, totals, pending payments, wedding-day contacts and recent activity. Stitch's RSVP summary, invitations, gallery, wedding website and "Live now" banner wait for their features (Phases 2 and 3). The guests total shows "Soon" until guests exist.
39. **"Spent" is the sum of Paid expenses; "pending" is the sum of Pending ones.** The PRD says expenses track "what was actually spent, with no budget system", so Stitch's "of ₹35.0 L planned budget" is dropped.
40. **The dashboard response extends API Design's** (the PRD needs these and the API shape lacks them):
    - `countdown` adds `title`, `city` and `coverUrl` (the PRD's countdown card shows the wedding name and cover image).
    - `myTasks` items add `eventName`, shown as a chip.
    - `upcomingEvents` items add `endAt` and `dressCode`.
    - `money` adds `pendingPayments`: up to 3 Pending expenses, nearest due first, each with `id`, `description`, `vendorName`, `amountPaise` and `dueDate`. `nextDue` stays for compatibility.
    - New `weddingDayContacts`: up to 4, with `id`, `name`, `role` and `phone`, from vendors flagged as wedding-day contacts plus organisers (the PRD's Wedding-day contacts screen).
    - `recentActivity` items add `actorName`, for the avatar initial.
      Dropped from Stitch because no data backs them: "pacing on schedule", "% contact details added", the vendor booked/in-inquiry split, and the invitation counts.
41. **No checkbox on dashboard tasks.** Tasks move To Do → In Progress → Completed (PRD), so a tick that jumps straight to Completed would skip a step. Each row opens the task instead (shown as "Soon" until the Tasks page exists, decision 30). This also avoids Stitch's 16px checkbox, which is below the 44px touch target.
42. **The dashboard has a `dashboard` module** (`src/modules/dashboard/`) with a service, schemas and index but no model: it owns no collections and builds its response by calling other modules' services. Until those exist, its service returns sample data that matches the schema exactly, so swapping in real data changes no UI code.
43. **Mobile layout is ours, not Stitch's** (Stitch has no mobile dashboard): one column, cards in PRD order, using the existing app shell.

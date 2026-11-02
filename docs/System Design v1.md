Make My Marriage — System Design v1 

# Make My Marriage — System Design v1 

Oct 23, 2026 · @Venu 

## Summary and key decisions 

Make My Marriage v1 is one Next.js application in TypeScript: a modular monolith on Vercel's free plan, with MongoDB Atlas for data, Cloudflare R2 for files and a free email provider. It implements the v1 PRD for one wedding, sized for about 20 organisers and 1,000–1,500 guest households. 

|Decision|Choice|Why|
|---|---|---|
|Architecture|Modular monolith, one deployable|Small team and load; modules can<br>be extracted later|
|App framework|Next.js (App Router), React,<br>TypeScript|One codebase and language for UI<br>and API|
|API style|REST route handlers under<br>`/api/v1`|Clear contracts; easy to move into<br>a separate Node API later|
|Database|MongoDB Atlas free tier,<br>Mongoose|Document shape fits guests,<br>RSVPs and events|
|Files|Cloudflare R2 (S3-compatible),<br>pre-signed URLs|Uploads bypass the app server;<br>private by default|
|Auth|Custom session layer: bcrypt<br>passwords, session documents in<br>Mongo, httpOnly cookie|Removing a member or changing a<br>role must take effect immediately,<br>which server-side sessions give<br>and stateless JWTs do not|
|Background<br>work|`jobs`collection processed by a<br>secured endpoint called every few<br>minutes by an external scheduler|Serverless functions cannot run<br>background loops|
|Email|Resend or Brevo free tier through a<br>send queue|Respects daily send limits|
|Hosting|Vercel Hobby, Atlas free, R2 free|Zero cost for the family wedding|



Page 1 of 20 

Make My Marriage — System Design v1 

**Assumptions:** single wedding in v1, but every record carries `weddingId` ; English only; no custom domain; the Hobby plan is for personal use, so a paid plan or another host is needed before opening to other couples. 

## Architecture 



<!-- Start of picture text -->
Everything runs in one Next.js app; photos go straight to R2<br>Organisers Guests Photographer<br>browser<br>or installed PWA invite link or event QR upload area login<br>Next.js app on Vercel, one deployable<br>Pages (React) API routes /api/v1<br>dashboard, website, invitation Zod validation, permission checks<br>Modules (services)<br>auth - wedding - events : tasks - expenses : vendors<br>guests - invitations : gallery - notifications - activity<br>Platform<br>db - storage jobs - email: rbac-- rate limits<br>MongoDB Atlas Email provider Scheduler Cloudflare R2<br>data, sessions, jobs invites, reminders calls /api/jobs/run photos and documents<br>browsers upload here directly<br><!-- End of picture text -->

architecture · one app, four external services 

All three kinds of user reach one Next.js app, whose API routes call module services that share one platform layer. Photo bytes skip the app entirely: browsers upload to and view from R2 with signed URLs. YouTube Live is embedded and Google Maps opened by link, both in the browser. 

Page 2 of 20 

Make My Marriage — System Design v1 

## Modules 

Twelve modules, each owning its collections and logic; a module reads or changes another module's data only by calling that module's service, never its model directly. 

|Module|Owns (collections)|Responsibilities|Calls|
|---|---|---|---|
|auth|`users`,<br>`sessions`,<br>`passwordResets`|Signup, login, logout,<br>email verification,<br>password reset, current-<br>user context|notifications<br>(emails)|
|wedding|`weddings`,<br>`memberships`,<br>`invites`|Create wedding, settings,<br>website settings,<br>members, roles, invites,<br>photographer account,<br>professional album<br>password|auth, notifications,<br>activity|
|events|`events`|Event CRUD, schedule,<br>per-event upload QR<br>token, livestream URL|gallery (move<br>photos on delete),<br>activity|
|tasks|`tasks`|Task CRUD, assignment,<br>status, overdue<br>calculation|notifications,<br>activity|
|expenses|`expenses`|Expense CRUD, totals by<br>event, category, status|storage (receipts),<br>activity|
|vendors|`vendors`|Vendor CRUD, booking<br>status, documents, Find<br>nearby links, wedding-<br>day contacts|expenses (paid<br>totals), storage,<br>activity|
|guests|`guests`|Households, side, allowed<br>count, invited events,<br>search and filters, CSV<br>import, RSVP records,<br>headcounts|activity|



Page 3 of 20 

Make My Marriage — System Design v1 

|Module|Owns (collections)|Responsibilities|Calls|
|---|---|---|---|
|invitations|— (uses<br>`guests`and<br>`jobs`)|Invitation links, public<br>and personal website<br>views, email invites and<br>reminders, WhatsApp<br>share links, RSVP<br>submission|guests, wedding,<br>events, jobs|
|gallery|`photos`|Upload sessions, guest<br>and professional albums,<br>deletes, downloads,<br>upload summaries|storage,<br>notifications,<br>activity|
|notifications|`notifications`|In-app notifications,<br>email templates, hourly<br>upload summaries|jobs|
|activity|`activityLog`|Append-only log of every<br>change; query by person,<br>area, date|—|
|platform<br>(shared)|`jobs`,<br>`rateLimits`|Database connection,<br>storage client, job queue,<br>rate limits, errors,<br>permission checks|—|



**How modules talk:** synchronous service calls inside the same request (for example, `tasks.assign()` calls `notifications.notifyTaskAssigned()` ). Anything slow or ratelimited, such as emails, becomes a job document written in the same request and processed later. 

## Project structure 

Route files stay thin: they parse the request, check permissions and call a module service; all business logic lives under `src/modules` . 

```
src/
  app/
    (auth)/          signup, login, verify, forgot, reset, invite/[token]
    (app)/           dashboard, events, tasks, expenses, vendors, guests,
gallery, settings, activity
```

Page 4 of 20 

Make My Marriage — System Design v1 

```
    w/[slug]/        public wedding website
    i/[token]/       personal invitation page, RSVP, gallery
    u/[eventToken]/  upload-only page opened from an event QR code
    photographer/    photographer upload area
    api/v1/          REST route handlers, one folder per module
    api/jobs/run/    job runner endpoint called by the scheduler
  modules/
    <module>/
      model.ts       Mongoose schema and indexes (private to the module)
      service.ts     business logic, the only public entry point
      schemas.ts     Zod request and response schemas
      policy.ts      permission rules for this module
      index.ts       exports the service and types
  platform/
    db.ts            cached Mongo connection for serverless
    storage.ts       R2 client, pre-signed URLs
    jobs.ts          enqueue and process jobs
    email.ts         email provider client
    rbac.ts          role and context checks
    errors.ts        typed errors mapped to HTTP status
    rateLimit.ts     Mongo-backed rate limiter
  components/        shared UI (shadcn/ui based)
  lib/               dates, money (INR), formatting
```

Rule enforced in code review and with an ESLint import rule: files in `modules/a` may import only `modules/b/index.ts` , never `modules/b/model.ts` . 

## Authentication, sessions and permissions 

Four kinds of caller reach the app, and every request is resolved to exactly one of them before any module code runs. 

|Caller|How identified|Lifetime|
|---|---|---|
|Organiser (Admin,|`mmm_session`httpOnly, Secure,|30 days, sliding; deleted on|
|Manager)|SameSite=Lax cookie →<br>`sessions`document|logout, removal or role change|
|Photographer|Same session cookie, membership<br>role PHOTOGRAPHER|Same; Admin can reset or<br>remove|



Page 5 of 20 

Make My Marriage — System Design v1 

|Caller|How identified|Lifetime|
|---|---|---|
|Guest household|32-byte random token in<br>`/i/<token>`|Until the Admin regenerates it|
|QR uploader|Per-event upload token in|Until the Admin regenerates it|
||`/u/<eventToken>`|or the event is deleted|



### **Organiser sessions** 

- Passwords hashed with bcrypt (cost 12). Email stored lowercase and unique. 

- Session id = 32 random bytes; the cookie holds the id, the database holds its SHA-256 hash, user id, wedding id, role and expiry. A TTL index removes expired sessions. 

- Each request loads the session and membership once and builds a context: `{ userId, weddingId, role }` . Role changes and removals delete that user's sessions, so they take effect on the next request. 

- Verification, invite and reset tokens are random, stored hashed, single-use, with expiry (verification 24 h, invite 7 days, reset 1 h). 

- Login lockout: 5 failures → 15 minutes, tracked on the user document. 

### **Permission checks** 

- Every module has a `policy.ts` mapping actions to roles, matching the PRD matrix, for example `guests.delete: [ADMIN]` , `guests.update: [ADMIN, MANAGER]` , `gallery.uploadPro: [ADMIN, PHOTOGRAPHER]` . 

- Route handlers call `authorize(ctx, 'guests.delete')` ; services also receive `ctx` and always filter queries by `ctx.weddingId` , so one wedding can never read another's data. 

- Member rules live in the wedding service: the last Admin cannot be demoted, removed or leave. 

### **Guest and QR access** 

- Guest token lookup returns `{ guestId, weddingId }` ; the token grants only invitation, RSVP, guest-gallery and own-photo actions. 

- Event upload token grants only uploads to that event's guest album; no viewing. 

- Professional album password: bcrypt hash plus a `proPasswordVersion` number on the wedding. A correct password sets a signed cookie holding the wedding id and version; changing the password increments the version, which invalidates every device. 

Page 6 of 20 

Make My Marriage — System Design v1 

## Data model 

Every document except `users` and `sessions` carries `weddingId` , and every index on a wedding-owned collection starts with it. All documents have `createdAt` , `updatedAt` and, where organisers edit them, `createdBy` and `updatedBy` . 

|Collection|Key fields|Indexes|
|---|---|---|
|`users`|name, email, passwordHash,<br>emailVerifiedAt, failedLogins,<br>lockedUntil|email (unique)|
|`sessions`|idHash, userId, weddingId, role,<br>expiresAt|idHash (unique); expiresAt (TTL)|
|`weddings`|brideName, groomName, title, date,<br>city, slug, coverKey, description,<br>tagline, rsvpCutoff, website<br>{published, showEventsPublicly},<br>proPasswordHash,<br>proPasswordVersion,<br>guestUploadCap (default 100),<br>storageBytes (updated on upload<br>confirm and purge)|slug (unique)|
|`memberships`|userId, weddingId, role (ADMIN /<br>MANAGER / PHOTOGRAPHER),<br>relationLabel|userId (unique, one wedding per<br>user); weddingId + role|
|`invites`|weddingId, email, role, tokenHash,<br>expiresAt, status|tokenHash (unique); weddingId +<br>status|
|`events`|name, startAt, endAt, muhurthamAt,<br>venue {name, address, mapUrl},<br>dressCode, instructions, coverKey,<br>livestreamUrl, proDeliveryUrl,<br>uploadToken|weddingId + startAt; uploadToken<br>(unique)|
|`tasks`|title, description, eventId,<br>assigneeId, dueDate, priority, status,<br>completedAt|weddingId + assigneeId + status;<br>weddingId + eventId; weddingId +<br>dueDate|



Page 7 of 20 

Make My Marriage — System Design v1 

|Collection|Key fields|Indexes|
|---|---|---|
|`vendors`|name, serviceType, phone, notes,<br>bookingStatus, quoteAmount,<br>agreedCost, documents [ {key,<br>name, type} ], weddingDayContact|weddingId + serviceType|
|`expenses`|amount (paise, integer), date,<br>eventId, taskId, vendorId, category,<br>description, paidBy, status,<br>dueDate, receiptKey|weddingId + eventId; weddingId +<br>status + dueDate; weddingId +<br>vendorId|
|`guests`|name, phone (E.164), email, side,<br>allowedCount, invitedEventIds [ ],<br>rsvp [ {eventId, status, count, at} ],<br>notes, token, inviteStatus, sentAt,<br>firstOpenedAt, lastReminderAt,<br>uploadCount|token (unique); weddingId +<br>phone (unique); weddingId +<br>side; weddingId +<br>invitedEventIds; text index on<br>name|
|`photos`|eventId (null = Unsorted), album<br>(GUEST / PRO), uploader {kind:<br>GUEST / USER, id}, key, thumbKey,<br>bytes, width, height, status<br>(PENDING / READY / DELETED)|weddingId + eventId + album +<br>createdAt; uploader.id|
|`notifications`|recipientId, type, title, body, link,<br>readAt|recipientId + readAt + createdAt|
|`activityLog`|actor {kind, id, name}, action, entity<br>{type, id, label}, summary|weddingId + createdAt;<br>weddingId + entity.type|
|`jobs`|type, payload, status (QUEUED /<br>RUNNING / DONE / FAILED),<br>runAfter, attempts, lastError,<br>lockedUntil|status + runAfter; TTL on finished<br>jobs after 30 days|
|`rateLimits`|key, count, windowEndsAt|key (unique); windowEndsAt<br>(TTL)|



### **Modelling choices** 

- RSVP is an array of `{eventId, status, count}` inside the guest, so per-event headcounts are one aggregation ( `$unwind` then `$group` by event) and a guest's RSVP is one document write. 

Page 8 of 20 

Make My Marriage — System Design v1 

- Money is stored as integer paise to avoid floating-point rounding. 

- Deletes of guests, events, tasks, expenses and vendors are real deletes after confirmation, recorded in the activity log with a label; photos are soft-deleted first (status DELETED), then a job removes the files from R2. 

- Deleting an event runs in a MongoDB transaction: remove the event, unlink its tasks and expenses, set its photos' `eventId` to null, pull it from guests' invited events and RSVPs. 

## API design 

REST over JSON under `/api/v1` , validated with Zod on the way in and out; the wedding comes from the session, so organiser URLs never contain a wedding id. 

### **Conventions** 

- Errors: `{ "error": { "code": "FORBIDDEN", "message": "…", "details": {…} } }` with 400 validation, 401 not logged in, 403 not allowed, 404 not found, 409 conflict, 429 rate limited. 

- Lists use cursor pagination: `?limit=50&cursor=<id>` ; filters as query parameters. Writes that may be retried (RSVP, uploads, bulk send) accept an `Idempotency-Key` header. 

- Mutations require the session cookie plus an `X-Requested-With` header as a cheap CSRF guard alongside SameSite cookies. 

### **Organiser endpoints** 

|Module|Endp|oints|Roles|
|---|---|---|---|
|auth|`POST`|`/auth/signup`·<br>`POST`|Public / any user|
||`/auth`|`/login`·<br>`POST /auth/logout`·||
||`POST`|`/auth/verify`·<br>`POST`||
||`/auth`|`/forgot`·<br>`POST /auth/reset`·||
||`GET`|`/auth/me`||
|wedding|`POST`|`/wedding`·<br>`GET, PATCH`|Create: user with no wedding;|
||`/wedd`|`ing`·<br>`PATCH /wedding/website`·|edit: Admin|
||`PUT`|`/wedding/pro-password`||



Page 9 of 20 

Make My Marriage — System Design v1 

|Module|Endpoints|Roles|
|---|---|---|
|members|`GET /members`·<br>`POST /invites`·<br>`POST`<br>`/invites/{id}/resend`·<br>`DELETE`<br>`/invites/{id}`·<br>`POST`<br>`/invites/{token}/accept`·<br>`PATCH`<br>`/members/{id}`(role) ·<br>`DELETE`<br>`/members/{id}`·<br>`POST`<br>`/members/photographer`|List: all; others: Admin|
|events|`GET, POST /events`·<br>`GET, PATCH,`<br>`DELETE /events/{id}`·<br>`POST`<br>`/events/{id}/upload-token`<br>(regenerate)|Create, delete, token: Admin;<br>edit: Admin, Manager|
|tasks|`GET, POST /tasks`·<br>`GET, PATCH,`<br>`DELETE /tasks/{id}`|Admin, Manager|
|expenses|`GET, POST /expenses`·<br>`PATCH, DELETE`<br>`/expenses/{id}`·<br>`GET`<br>`/expenses/summary`|Admin, Manager|
|vendors|`GET, POST /vendors`·<br>`GET, PATCH,`<br>`DELETE /vendors/{id}`·<br>`GET`<br>`/vendors/contacts`|Admin, Manager|
|guests|`GET, POST /guests`·<br>`GET, PATCH`<br>`/guests/{id}`·<br>`DELETE /guests/{id}`·<br>`POST /guests/import`(preview,<br>commit) ·<br>`POST /guests/{id}/token`<br>(regenerate) ·<br>`GET /guests/export`|Delete, import, token: Admin;<br>rest: Admin, Manager|
|invitations|`POST /guests/{id}/invite`·<br>`POST`<br>`/guests/{id}/remind`·<br>`POST`<br>`/invitations/bulk`·<br>`GET`<br>`/guests/{id}/whatsapp-link`· `GET<br>/events/{id}/headcount?format=xlsx|pdf`|
|gallery|`GET /photos?eventId&album`·<br>`POST`<br>`/photos/uploads`(pre-signed URLs) ·<br>`POST /photos/complete`·<br>`DELETE`<br>`/photos/{id}`·<br>`GET`<br>`/photos/{id}/download`|Delete: Admin; upload pro:<br>Admin, Photographer|



Page 10 of 20 

Make My Marriage — System Design v1 

|Module|Endpoints|Roles|
|---|---|---|
|dashboard|`GET /dashboard`|Admin, Manager|
|notifications|`GET /notifications`·<br>`POST`<br>`/notifications/read`|All organisers|
|activity|`GET /activity?actor&type&from&to`|Admin, Manager|
|exports|`POST /exports/final`(photo manifest,<br>expenses and guests Excel)|Admin|



Also in v1: `POST /guests/bulk-events` (add or remove many households from an event; Admin, Manager) · `GET /events/{id}/whatsapp-link` (share an event's details on WhatsApp; Admin, Manager) · `GET /guests?noEmail=true` (the Send via WhatsApp list). Accepting an invite returns `409 EMAIL_IN_OTHER_WEDDING` when that email already belongs to another wedding. 

**Guest endpoints** (token in the path, no cookie needed) 

|Endpoint|Purpose|
|---|---|
|`GET /public/w/{slug}`|Public website data|
|`GET /public/i/{token}`|Personal invitation: household, invited<br>events, RSVP state; marks first open|
|`PUT /public/i/{token}/rsvp`|Submit or change RSVP per event (before<br>cutoff)|
|`GET /public/i/{token}/photos`·<br>`POST`|Guest gallery, upload, delete own|
|`/public/i/{token}/uploads`·<br>`DELETE`<br>`/public/i/{token}/photos/{id}`||
|`POST /public/i/{token}/pro-access`·<br>`GET`<br>`/public/i/{token}/pro-photos`|Unlock and view professional albums|
|`POST /public/u/{eventToken}/uploads`|QR upload-only|



### **Example: submit RSVP** 

Page 11 of 20 

Make My Marriage — System Design v1 

```
PUT /api/v1/public/i/9f3k…/rsvp
```

```
{ "responses": [ { "eventId": "66a1…", "status": "ATTENDING", "count": 3 },
                 { "eventId": "66a2…", "status": "NOT_ATTENDING", "count": 0
} ] }
```

```
→ 200 { "rsvp": [ … ], "editableUntil": "2028-01-15" }
```

```
→ 400 COUNT_EXCEEDS_ALLOWED · 403 EVENT_NOT_INVITED · 409 RSVP_CLOSED
```

## File uploads, gallery and exports 

Files never pass through the app server: the browser resizes them, asks the API for presigned URLs, and uploads straight to a private R2 bucket. This avoids serverless requestsize and time limits. 

### **Upload flow (photos, receipts, vendor documents)** 

1. Browser resizes each photo to about 2,000 px on the long edge (JPEG, quality about 0.8) and makes a 400 px thumbnail. 

2. `POST …/uploads` with file count, types and sizes. The server checks permissions, file type (JPEG, PNG, WebP, HEIC converted in the browser; PDF for documents), 10 MB limit and the guest's 100-photo cap, then creates `photos` records with status PENDING and returns two pre-signed PUT URLs per photo (full and thumbnail), valid 10 minutes. 

3. Browser uploads directly to R2, up to 3 files at a time, retrying failed parts. The queue is saved in the browser's IndexedDB, so if the page closes midway the remaining files resume the next time the guest opens their link. 

4. `POST /photos/complete` with up to 20 photo ids per call → server confirms each object exists (HEAD request), sets status READY, increments the guest's upload count and writes an activity entry. 

5. A cleanup job deletes PENDING records older than 1 hour and their partial files. 

### **Storage layout** 

```
weddings/{weddingId}/photos/{eventId|unsorted}/{guest|pro}/{photoId}.jpg
weddings/{weddingId}/photos/…/{photoId}_thumb.jpg
weddings/{weddingId}/receipts/{expenseId}/{fileId}.{ext}
weddings/{weddingId}/vendors/{vendorId}/{fileId}.{ext}
weddings/{weddingId}/covers/{id}.jpg
```

Page 12 of 20 

Make My Marriage — System Design v1 

**Viewing:** the bucket is private. Gallery pages list photos with thumbnail URLs signed for 1 hour; opening or downloading a photo signs its full-size URL. Lists are paginated 60 photos at a time with lazy loading. 

**Deleting:** sets status DELETED immediately (hidden everywhere), logs who did it, and queues a job that removes both files from R2. Guest deletes and uploads are counted for the hourly Admin summary. 

**QR codes:** generated on demand as SVG or PNG from `/u/{eventToken}` with the `qrcode` package; the Admin downloads them per event for printing. 

### **Exports** 

|Export|How|
|---|---|
|Per-event headcount (Excel, PDF)|Route handler aggregates RSVPs, builds the file<br>with ExcelJS or a PDF library, streams it back; 1,500<br>rows is well within limits|
|Guest list (Excel)|Same, with current filters applied|
|Expenses (Excel)|Same|
|All photos (zip)|Built in the Admin's browser: the API returns a<br>manifest of signed URLs per album, and a<br>streaming zip library downloads and zips them on<br>the device, one album at a time. No server time<br>limits involved|



### **Scale: thousands of guests uploading** 

The app server handles only small JSON calls (one to request upload URLs and one to confirm, per batch of up to 20 photos); the bytes go phone → R2. Guest-link and QR uploads use the same batched calls: `POST /public/i/{token}/uploads` and `POST /public/i/{token}/uploads/complete` . 

|Scenario|Photos|Storage (full + thumbnail)|
|---|---|---|
|Realistic: 30% of 1,500 households upload about 30|~13,500|~7 GB|
|each|||
|Professional edited set|~1,500|~1.5 GB|



Page 13 of 20 

Make My Marriage — System Design v1 

|Scenario|Photos|Storage (full + thumbnail)|
|---|---|---|
|Worst case: every household hits the 100-photo|150,000|~70 GB|
|cap|||



Estimates assume about 500 KB per resized photo and 40 KB per thumbnail. 

- **Storage:** the realistic case is near R2's free tier; beyond it R2 bills a small per-GB monthly charge and nothing for downloads (verify current pricing). Admins see storage used on the dashboard, and the per-link cap (default 100) is a setting that can be lowered to 50. 

- **Venue network:** the likely bottleneck. In-browser resizing cuts data about tenfold, uploads retry, and the IndexedDB queue resumes later; guests can also upload after the wedding. 

- **Database connections:** pool of 2 per serverless instance and batched confirm calls keep peak connections low. 

- **Viewing:** 60 thumbnails per page (about 2.5 MB), URLs signed locally without calling R2, no egress fees. 

## Background jobs, email queue and notifications 

Slow or rate-limited work is written as a job document during the request and processed later by `POST /api/jobs/run` , which a free external scheduler calls every 5 minutes with a secret header. 

### **Job types** 

|Job|Created when|Does|
|---|---|---|
|`email.send`|Invite, reminder, task<br>assigned, member invite,<br>verification, reset|Sends one email through the<br>provider|
|`invitations.bulk`|Admin bulk-sends|Expands into one<br>`email.send`<br>per household, skipping those<br>without email|



Page 14 of 20 

Make My Marriage — System Design v1 

|Job|Created when|Does|
|---|---|---|
|`gallery.uploadSummary`|Hourly (scheduled by the<br>runner itself)|Groups the last hour's guest<br>uploads and deletes per<br>household into one Admin<br>notification|
|`gallery.purge`|Photo deleted|Removes files from R2|
|`uploads.cleanup`|Hourly|Removes PENDING uploads<br>older than 1 hour|



### **Runner rules** 

- Claims jobs atomically with `findOneAndUpdate` (status QUEUED, `runAfter` ≤ now → RUNNING with `lockedUntil` = now + 2 minutes), so overlapping runs never process the same job twice. 

- Processes jobs until about 40 seconds have passed, then stops; the next call continues. A job whose lock expired is picked up again. 

- Failures retry with backoff (1, 5, 30 minutes), up to 5 attempts, then FAILED and visible to Admins. 

- Email jobs check a daily counter against the provider's free limit; once reached, remaining emails get `runAfter` = next day. 

- Every email job carries an idempotency key (for example `invite:{guestId}: {sentAt}` ) so a retry never sends twice. 

- Reminder throttling: a reminder is not queued if `lastReminderAt` is under 3 days old. 

**In-app notifications** are written directly in the request (task assigned, RSVP received) or by the summary job; the bell polls `GET /notifications` every 60 seconds while the app is open. No websockets in v1. 

**Activity log** entries are written by each service in the same request as the change, using a shared `activity.record(ctx, action, entity, summary)` call. 

## Computed views and UI behaviour 

Several PRD features need no stored data of their own; they are computed when a page loads. 

Page 15 of 20 

Make My Marriage — System Design v1 

|PRD feature|How it is computed|
|---|---|
|Dashboard|`GET /dashboard`runs parallel queries: countdown<br>from wedding date; my tasks (assignee = me, not<br>Completed, overdue first); task counts by status<br>plus overdue; next 3 events; events and vendors<br>count; total guests as households and as sum of<br>allowed counts; RSVP replied and attending per<br>event; total spent and pending payments with<br>nearest due date; last 10 activity entries; for<br>Admins, storage used (sum of photo and document<br>bytes) against the free-tier limit|
|Overdue task|`dueDate < today`and status not Completed,<br>evaluated in Asia/Kolkata|
|Map link|If empty,<br>`https://www.google.com/maps/search/?`<br>`api=1&query=<encoded venue address>`|
|Find nearby|Same URL format with<br>`<service type> near`<br>`<venue address>`; opened in a new tab, no API key|
|Live now banner|Shown when an event has a livestream URL and<br>now is between its start and end|
|Website not published|Public<br>`/w/<slug>`shows a coming-soon page;<br>personal<br>`/i/<token>`links keep working|
|Wedding-day contacts|Vendors flagged as wedding-day contacts plus all<br>organisers, with tap-to-call phone links|
|Invitation status|Not sent → Sent (email or WhatsApp share marked<br>sent) → Link opened (first token visit)|
|RSVP Pending|An invited event with no response in the guest's<br>`rsvp`array|
|Professional full set|Event's<br>`proDeliveryUrl`, shown as a link in that<br>event's professional album|



**PWA:** web app manifest, app icons and a service worker that caches only the app shell and static assets; all data is always fetched live, so nobody sees stale RSVPs or tasks. Layouts are built mobile first from 360 px width. 

Page 16 of 20 

Make My Marriage — System Design v1 

## Security, limits and performance 

The main risks are leaked guest links, abuse of public upload pages and accidental crosswedding data access; each has a specific control. 

|Risk|Control|
|---|---|
|Guessing guest or QR tokens|32 random bytes (base64url); rate limit 30<br>requests/min per IP on<br>`/public/*`|
|Forwarded guest link|Admin regenerates the token; old link stops<br>working|
|Upload abuse via QR page|Per-IP limit (60 photos/hour), file type and size<br>checks, Admins can delete; event token can be<br>regenerated|
|Brute-force login|5-failure lockout plus per-IP rate limit on<br>`/auth/*`|
|Cross-wedding access|Every query filtered by<br>`ctx.weddingId`;<br>integration tests try to read another wedding's ids|
|XSS|React escaping, no raw HTML from users, strict<br>Content-Security-Policy|
|CSRF|SameSite=Lax cookies plus required custom<br>header on mutations|
|Secrets|Environment variables only (Mongo URI, R2 keys,<br>email key, job secret, cookie signing key)|
|Personal data|Phone numbers and emails visible only to<br>organisers; never in URLs or public pages|



Rate limits are counters in the `rateLimits` collection with a TTL index, so no Redis is needed. 

### **Performance targets** 

- Pages usable on a mid-range Android phone over 4G: dashboard data in one API call, under 1 s server time. 

- Guest list of 1,500 households: server-side search and filters, 50 per page. 

- Wedding day: up to about 300 guests uploading at once; since files go straight to R2, the app only handles small JSON requests. 

Page 17 of 20 

Make My Marriage — System Design v1 

Mongo connection cached across serverless invocations to avoid reconnecting on each request, with a pool of at most 2 connections per instance so total connections stay under the Atlas free-tier cap during wedding-day peaks. 

## Deployment, environments and monitoring 

Two environments, both free: Preview for testing and Production for the family; each has its own database, bucket and keys. 

|Item|Preview|Production|
|---|---|---|
|App|Vercel preview deployment per pull<br>request|Vercel production from<br>`main`|
|Database|Atlas free cluster, database<br>`mmm_preview`|Separate database<br>`mmm_prod`(or a<br>second free project if limits require)|
|Files|R2 bucket<br>`mmm-preview`|R2 bucket<br>`mmm-prod`|
|Email|Provider test mode or a sandbox<br>recipient list|Live sending|
|Scheduler|Off, run jobs manually|Calls<br>`/api/jobs/run`every 5 minutes|



**Pipeline:** GitHub repository → on every pull request, GitHub Actions runs type checks, ESLint (including the module-import rule), Vitest unit tests and Playwright tests for the key flows (signup, create wedding, RSVP, guest upload) → Vercel deploys a preview → merge to `main` deploys production. 

**Monitoring:** Sentry free tier for frontend and API errors; a health endpoint checked by the scheduler; Admin-visible list of FAILED jobs. 

**Backups:** Atlas free clusters have limited built-in backups, so a weekly scheduled export (GitHub Action running `mongodump` to a private R2 bucket) keeps copies of the data. 

## PRD coverage 

Every section of the v1 PRD maps to a part of this design. 

Page 18 of 20 

Make My Marriage — System Design v1 

|PRD section|Covered in|
|---|---|
|Roles and permissions|Authentication, sessions and permissions; API<br>design (roles per endpoint)|
|Accounts, wedding setup, members|Authentication; Data model (<br>`users`,<br>`weddings`,<br>`memberships`,<br>`invites`); API: auth, wedding,<br>members|
|Dashboard|Computed views; API: dashboard|
|Events|Data model (<br>`events`); API: events; event delete<br>transaction|
|Tasks|Data model (<br>`tasks`); Computed views (overdue);<br>Jobs (assignment email)|
|Expenses and vendors|Data model; API: expenses, vendors; File uploads<br>(receipts, documents); Computed views (Find<br>nearby, contacts)|
|Guests, invitations, RSVP|Data model (<br>`guests`); API: guests, invitations,<br>guest endpoints; Jobs (email queue, reminders,<br>bulk)|
|Wedding website|Data model (<br>`weddings.website`); API: public<br>endpoints; Computed views|
|Photo gallery|File uploads and gallery; Auth (guest, QR, pro<br>password); Jobs (summary, purge)|
|Livestream|`events.livestreamUrl`; Computed views (Live<br>now)|
|Notifications, activity log, exports|Background jobs and notifications; File uploads<br>and exports|
|Key flows F1–F10|Auth (F1, F2); events and tasks (F3); vendors and<br>expenses (F4); guests and invitations (F5, F6);<br>gallery (F7, F8); website (F9); exports (F10)|
|Non-functional requirements|Security, limits and performance; Deployment;<br>PWA|



Page 19 of 20 

Make My Marriage — System Design v1 

## Build order and items to verify 

Build the shared platform first, then modules in the PRD's phase order, so each phase ends with something the family can use. 

1. **Foundation (Nov 2026):** repository, Next.js + TypeScript setup, CI, `platform/` (db, errors, rbac, rate limits), Preview and Production environments. 

2. **Phase 1 (Dec 2026 – Apr 2027):** auth → wedding and members → events → tasks → notifications and jobs runner → expenses → vendors → activity log → dashboard. 

3. **Phase 2 (May – Sep 2027):** guests and CSV import → invitations (email queue, WhatsApp links) → public and personal website → RSVP → headcount exports. 

4. **Phase 3 (Oct – Dec 2027):** storage and upload flow → gallery and QR codes → photographer area and pro password → livestream embed → final exports → load test with a few hundred photos. 

5. **Jan 2028:** freeze on Jan 1; fixes only until Jan 28. 

**Verify before building on them** (free-tier terms change): 

- Vercel Hobby: function duration and request body limits, cron frequency, and personal-use terms. 

- MongoDB Atlas free tier: storage size, connection limits, transaction support, backups. Cloudflare R2 free tier: storage and operation limits against expected photo volume. Email provider: daily and monthly free limits, deliverability without a custom domain (test with family Gmail accounts). 

- External scheduler: reliability of 5-minute calls (cron-job.org or GitHub Actions). 

Page 20 of 20 


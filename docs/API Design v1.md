Make My Marriage — API Design v1 

# Make My Marriage — API Design v1 

Oct 24, 2026 · @Venu 

## Conventions 

All endpoints are REST over JSON under `/api/v1` , implemented as Next.js route handlers that call module services. Every request and response body is validated with Zod. 

|Topic|Rule|
|---|---|
|Base URL|`https://<app>/api/v1`|
|Wedding scope|Organiser endpoints take the wedding from the<br>session; URLs never include a wedding id|
|Content type|`application/json; charset=utf-8`, except file<br>downloads and exports|
|Ids|24-character hex strings (MongoDB ObjectId)|
|Instants|ISO 8601 UTC, e.g.<br>`2028-01-28T20:30:00.000Z`|
|Calendar dates|`YYYY-MM-DD`, interpreted in Asia/Kolkata|
|Money|Integer paise in fields ending<br>`Paise`(₹1,250.50 →<br>`125050`)|
|Enums|Uppercase strings, e.g.<br>`IN_PROGRESS`|
|Field names|camelCase|
|Partial updates|`PATCH`with only the fields to change;<br>`null`clears<br>an optional field|



### **Response envelope** 

Page 1 of 26 

Make My Marriage — API Design v1 

```
// single resource
```

```
{ "data": { "id": "66b0…", "title": "Book caterer" } }
```

- `// list` 

- `{ "data": [ … ], "page": { "nextCursor": "eyJpZCI6…", "limit": 50 } }` 

- `// error (see Error format)` 

```
{ "error": { "code": "FORBIDDEN", "message": "…", "details": { } } }
```

**Pagination:** cursor based. `?limit=` (default 50, maximum 100; gallery default 60) and `? cursor=` from the previous `page.nextCursor` ; the cursor is an opaque base64 string of the last item's sort key and id. `nextCursor` is `null` on the last page. 

**Filtering and sorting:** filters as query parameters named after fields ( `? status=IN_PROGRESS&eventId=…` ); each list endpoint allows a fixed set of `sort` values documented with it. 

### **Headers** 

|Header|When|Purpose|
|---|---|---|
|`Cookie:`|Organiser and photographer|Session|
|`mmm_session=…`|calls||
|`X-Requested-With:`|Every non-GET call from the|CSRF guard together with|
|`mmm`|app|SameSite cookies|
|`Idempotency-Key:`|Optional on RSVP, uploads,|Repeating the call with the same|
|`<uuid>`|invitation sends|key returns the first result|
|`X-Job-Secret`|Job runner only|Shared secret from the<br>scheduler|
|`Retry-After`|Response on 429 and 423|Seconds to wait|



**Versioning:** breaking changes go to `/api/v2` ; additive fields can appear in v1 at any time, so clients ignore unknown fields. 

## Callers and authentication rules 

Each request is resolved to exactly one caller type before any module code runs; a route declares which caller types it accepts. 

Page 2 of 26 

Make My Marriage — API Design v1 

|Caller|Credential|Resolved to|Accepted by|
|---|---|---|---|
|Organiser|`mmm_session`cookie|`{ userId,`<br>`weddingId,`<br>`role: ADMIN`<br>`or MANAGER }`|`/api/v1/*`except<br>`/public/*`|
|Photographer|`mmm_session`cookie|`{ userId,`<br>`weddingId,`<br>`role:`<br>`PHOTOGRAPHER`<br>`}`|`/auth/me`,<br>`/auth/logout`,<br>`/events`(read),<br>`/photos/uploads`,<br>`/photos/complete`,<br>`/photos?album=PRO`|
|Signed-in<br>user without|`mmm_session`cookie, no<br>wedding yet|`{ userId }`|`/auth/*`,<br>`POST /wedding`,<br>`POST`|
|a wedding|||`/invites/{token}/accept`|
|Guest<br>household|token in the path<br>`/public/i/{token}`|`{ guestId,`<br>`weddingId }`|`/public/i/{token}/*`|
|QR uploader|event token in the path<br>`/public/u/{eventToken}`|`{ eventId,`<br>`weddingId }`|`/public/u/{eventToken}/*`|
|Website<br>visitor|none|wedding by<br>slug|`GET /public/w/{slug}`|
|Scheduler|`X-Job-Secret`header|system|`POST /api/jobs/run`|



### **Rules** 

1. No or expired session on an organiser route → `401 UNAUTHENTICATED` . 

2. Valid session but the role is not allowed for the action → `403 FORBIDDEN` . 

3. Valid session but no wedding yet on a wedding route → `403 NO_WEDDING` (the app sends the user to Create wedding). 

4. Unknown or regenerated guest, QR or invite token → `404 NOT_FOUND` , never 401, so tokens can't be probed. 

5. A record from another wedding is reported as `404 NOT_FOUND` , not 403, so ids don't reveal other weddings' data. 

6. Unverified email: login works, but every wedding route returns `403 EMAIL_NOT_VERIFIED` until verified. 

Page 3 of 26 

Make My Marriage — API Design v1 

7. Professional albums for guests additionally need the `mmm_pro` cookie from `POST /public/i/{token}/pro-access` ; without it → `401 PRO_ACCESS_REQUIRED` . 

## Error format and codes 

Every error has the same shape: a stable machine-readable `code` , a human `message` safe to show in the UI, and optional `details` . 

```
{
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Some fields are invalid.",
    "details": { "fields": { "endAt": "Must be after the start time",
"venue.name": "Required" } },
    "requestId": "req_7f3a…"
  }
}
```

The UI switches on `code` , never on `message` . `requestId` is also logged and sent to Sentry, so a reported error can be traced. 

|HTTP|Code|When|
|---|---|---|
|400|`VALIDATION_FAILED`|Body or query fails Zod validation;<br>`details.fields`maps field → message|
|400|`COUNT_EXCEEDS_ALLOWED`|RSVP count above the household's allowed<br>count|
|401|`UNAUTHENTICATED`|No session or it expired|
|401|`INVALID_CREDENTIALS`|Wrong email or password (same message for<br>both)|
|401|`PRO_ACCESS_REQUIRED`|Professional album without the access cookie|
|401|`PRO_PASSWORD_INVALID`|Wrong professional album password|
|403|`FORBIDDEN`|Role not allowed for this action|
|403|`NO_WEDDING`|Signed-in user has not created or joined a<br>wedding|
|403|`EMAIL_NOT_VERIFIED`|Email not verified yet|



Page 4 of 26 

Make My Marriage — API Design v1 

|HTTP|Code|When|
|---|---|---|
|403|`EVENT_NOT_INVITED`|Guest acting on an event they are not invited to|
|403|`NOT_OWN_PHOTO`|Guest deleting a photo they did not upload|
|404|`NOT_FOUND`|Record, token or slug does not exist, or belongs<br>to another wedding|
|409|`EMAIL_TAKEN`|Signup with an existing email|
|409|`SLUG_TAKEN`|Website slug in use;<br>`details.suggestions`<br>offers alternatives|
|409|`PHONE_EXISTS`|Guest phone already in this wedding;<br>`details.guestId`|
|409|`ALREADY_IN_WEDDING`|User with a wedding tries to create another|
|409|`EMAIL_IN_OTHER_WEDDING`|Invite accepted by a user already in another<br>wedding|
|409|`LAST_ADMIN`|Change would leave the wedding with no Admin|
|409|`EVENT_HAS_ACTIVE_ITEMS`|Event delete while tasks are In Progress or<br>expenses Pending;<br>`details.tasks`,<br>`details.expenses`list them|
|409|`RSVP_CLOSED`|RSVP after the cutoff date|
|409|`REMINDER_TOO_SOON`|Reminder within 3 days of the last;<br>`details.nextAllowedAt`|
|409|`UPLOAD_CAP_REACHED`|Guest link has used its upload allowance;<br>`details.remaining`|
|409|`UPLOAD_NOT_FOUND_IN_STORAGE`|Complete called but the file never reached R2|
|410|`TOKEN_EXPIRED`|Verification, reset or invite link expired|
|410|`TOKEN_USED`|Single-use link already used|
|413|`FILE_TOO_LARGE`|File over 10 MB|
|415|`UNSUPPORTED_FILE_TYPE`|Not JPEG, PNG, WebP or PDF (documents)|
|423|`ACCOUNT_LOCKED`|5 failed logins;<br>`Retry-After`header|
|429|`RATE_LIMITED`|Too many requests;<br>`Retry-After`header|



Page 5 of 26 

Make My Marriage — API Design v1 

|HTTP|Code|When|
|---|---|---|
|500|`INTERNAL_ERROR`|Unexpected failure; message is generic, details<br>only in logs|



## Auth endpoints 

All under `/api/v1/auth` . Login, signup, forgot and reset are rate limited per IP (10 per 15 minutes). 

|Method|Path|Caller|Purpose|Success|
|---|---|---|---|---|
|POST|`/auth/signup`|Anyone|Create account, send<br>verification email, start<br>session|201|
|POST|`/auth/login`|Anyone|Start session|200|
|POST|`/auth/logout`|Signed in|End this session|204|
|POST|`/auth/verify`|Anyone with<br>link|Verify email from token|200|
|POST|`/auth/verify/resend`|Signed in,<br>unverified|New verification email<br>(max 3 per hour)|202|
|POST|`/auth/forgot`|Anyone|Send reset email if the<br>account exists|202<br>(always)|
|POST|`/auth/reset`|Anyone with<br>link|Set new password, end<br>all sessions, start a new<br>one|200|
|GET|`/auth/me`|Signed in|Current user, wedding<br>and role|200|
|PATCH|`/auth/me`|Signed in|Change name or<br>password (needs current<br>password)|200|



### **Signup** 

Page 6 of 26 

Make My Marriage — API Design v1 

```
POST /api/v1/auth/signup
{ "name": "Venu", "email": "venu@example.com", "password": "at-least-10-
chars" }
```

```
201  Set-Cookie: mmm_session=…
{ "data": { "user": { "id": "66b0…", "name": "Venu", "email":
"venu@example.com", "emailVerified": false }, "wedding": null, "role": null }
}
```

```
Errors: 400 VALIDATION_FAILED · 409 EMAIL_TAKEN · 429 RATE_LIMITED
```

Password rules: 10–128 characters, not equal to the email; checked again on reset. 

### **Login** 

```
POST /api/v1/auth/login
{ "email": "venu@example.com", "password": "…" }
```

```
200  Set-Cookie: mmm_session=…
{ "data": { "user": { … }, "wedding": { "id": "66b1…", "title": "Ravi weds
Sneha" }, "role": "ADMIN" } }
```

```
Errors: 401 INVALID_CREDENTIALS · 423 ACCOUNT_LOCKED · 429 RATE_LIMITED
```

### **Verify and reset** 

```
POST /api/v1/auth/verify      { "token": "…" }                         → 200
· 410 TOKEN_EXPIRED · 410 TOKEN_USED · 404 NOT_FOUND
POST /api/v1/auth/forgot      { "email": "…" }                         → 202
(same response whether or not the email exists)
POST /api/v1/auth/reset       { "token": "…", "password": "…" }       → 200 +
new session · 410 TOKEN_EXPIRED · 410 TOKEN_USED
```

**Current user** ( `GET /auth/me` ) returns `user` , `wedding` ( `id` , `title` , `date` , `slug` ) or `null` , and `role` . The app calls it on load to decide whether to show login, Create wedding, the photographer upload area or the dashboard. 

Page 7 of 26 

Make My Marriage — API Design v1 

## Wedding, website and member endpoints 

|Method|Path|Roles|Purpose|Success|
|---|---|---|---|---|
|POST|`/wedding`|Signed in, no<br>wedding,<br>verified|Create wedding;<br>caller becomes<br>Admin|201|
|GET|`/wedding`|Admin,<br>Manager,<br>Photographer|Wedding details|200|
|PATCH|`/wedding`|Admin|Edit details,<br>tagline, RSVP<br>cutoff, upload cap|200|
|GET|`/wedding/slug-available?`<br>`slug=`|Signed in|Check slug while<br>typing|200|
|PATCH|`/wedding/website`|Admin|Publish or<br>unpublish; show<br>events publicly|200|
|PUT|`/wedding/pro-password`|Admin|Set or change the<br>professional<br>album password|204|
|POST|`/wedding/cover`|Admin|Pre-signed URL<br>for the cover<br>image (see<br>Gallery uploads)|200|
|GET|`/members`|Admin|Members and<br>pending invites|200|
|POST|`/invites`|Admin|Invite an organiser<br>by email|201|
|POST|`/invites/{id}/resend`|Admin|New token and<br>email|202|
|DELETE|`/invites/{id}`|Admin|Cancel a pending<br>invite|204|



Page 8 of 26 

Make My Marriage — API Design v1 

|Method|Path|Roles|Purpose|Success|
|---|---|---|---|---|
|GET|`/invites/by-`<br>`token/{token}`|Anyone|Show the invite<br>(wedding title,<br>inviter, email)<br>before signup|200|
|POST|`/invites/{token}/accept`|Signed in with<br>the invited<br>email|Join the wedding|200|
|PATCH|`/members/{userId}`|Admin|Change role or<br>relation label|200|
|DELETE|`/members/{userId}`|Admin|Remove member<br>(sessions ended,<br>tasks unassigned)|204|
|POST|`/members/photographer`|Admin|Create<br>photographer<br>login|201|
|POST|`/members/{userId}/reset-`<br>`password`|Admin|New temporary<br>password for the<br>photographer|200|



### **Create wedding** 

```
POST /api/v1/wedding
```

```
{
```

```
  "brideName": "Sneha", "groomName": "Ravi", "title": "Ravi weds Sneha",
  "date": "2028-01-28", "city": "Hyderabad", "slug": "ravi-weds-sneha",
  "description": "…", "tagline": "invite you to celebrate with us"
}
```

```
201 { "data": { "wedding": { "id": "66b1…", …, "website": { "published":
false, "showEventsPublicly": false } }, "role": "ADMIN" } }
```

```
Errors: 400 VALIDATION_FAILED · 403 EMAIL_NOT_VERIFIED · 409 SLUG_TAKEN · 409
ALREADY_IN_WEDDING
```

### **Invite and accept** 

Page 9 of 26 

Make My Marriage — API Design v1 

#### `POST /api/v1/invites` 

```
{ "name": "Lakshmi", "email": "lakshmi@example.com", "role": "MANAGER",
"relationLabel": "Bride's mother" }
201 { "data": { "id": "66c2…", "status": "PENDING", "expiresAt": "2026-11-
01T10:00:00Z" } }
```

```
POST /api/v1/invites/{token}/accept      (caller signed in as
lakshmi@example.com)
200 { "data": { "wedding": { … }, "role": "MANAGER" } }
Errors: 403 FORBIDDEN (signed in with a different email) · 409
EMAIL_IN_OTHER_WEDDING · 410 TOKEN_EXPIRED · 410 TOKEN_USED
```

**Change role** — `PATCH /members/{userId}` with `{ "role": "ADMIN" }` . Returns `409 LAST_ADMIN` if it would leave no Admin; all of that user's sessions end so the new role applies at their next request. 

**Photographer** — `POST /members/photographer` with `{ "name", "email" }` returns `{ "userId", "temporaryPassword" }` once; the Admin shares it and the photographer changes it after first login. 

## Event and task endpoints 

### **Events** 

|Method|Path|Roles|Purpose|Success|
|---|---|---|---|---|
|GET|`/events`|Admin, Manager,<br>Photographer|All events, sorted<br>by<br>`startAt`|200|
|POST|`/events`|Admin|Create event|201|
|GET|`/events/{id}`|Admin, Manager|Event with counts<br>(tasks by status,<br>expenses total,<br>invited<br>households,<br>attending people,<br>photos)|200|
|PATCH|`/events/{id}`|Admin, Manager|Edit details;<br>livestream URL<br>Admin only|200|



Page 10 of 26 

Make My Marriage — API Design v1 

|Method|Path|Roles|Purpose|Success|
|---|---|---|---|---|
|DELETE|`/events/{id}`|Admin|Delete (blocked if<br>items are active)|204|
|GET|`/events/{id}/delete-`<br>`check`|Admin|Preview what a<br>delete would<br>change or block|200|
|POST|`/events/{id}/upload-`<br>`token`|Admin|Regenerate the<br>QR upload token|200|
|GET|`/events/{id}/qr?`<br>`format=svg|png`|Admin|Printable QR code<br>for uploads|200<br>(image)|
|GET|`/events/{id}/whatsapp-`<br>`link`|Admin, Manager|WhatsApp share<br>URL with event<br>details|200|



```
POST /api/v1/events
{
  "name": "Sangeet",
  "startAt": "2028-01-26T13:30:00Z", "endAt": "2028-01-26T18:30:00Z",
  "venue": { "name": "Grand Palace Hall", "address": "Road No. 12, Banjara
Hills, Hyderabad" },
  "dressCode": "Indo-western", "instructions": "Parking at the back gate"
}
201 { "data": { "id": "66d3…", …, "venue": { …, "mapUrl":
"https://www.google.com/maps/search/?api=1&query=…" }, "uploadUrl":
"https://<app>/u/Xk9…" } }
Errors: 400 VALIDATION_FAILED (endAt must be after startAt)
```

```
GET /api/v1/events/66d3…/delete-check
200 { "data": { "blocked": true,
  "blockingTasks": [ { "id": "…", "title": "Confirm DJ", "status":
"IN_PROGRESS" } ],
  "blockingExpenses": [ { "id": "…", "description": "Decor balance",
"amountPaise": 4500000 } ],
  "willUnlink": { "tasks": 6, "paidExpenses": 3, "photos": 214, "guests": 380
} } }
```

`DELETE` re-runs the same check inside the transaction and returns `409 EVENT_HAS_ACTIVE_ITEMS` with the same lists if anything became active in between. 

Page 11 of 26 

Make My Marriage — API Design v1 

### **Tasks** 

|Method|Path|Roles|Purpose|Success|
|---|---|---|---|---|
|GET|`/tasks`|Admin,<br>Manager|List with filters|200|
|POST|`/tasks`|Admin,<br>Manager|Create; notifies assignee|201|
|GET|`/tasks/{id}`|Admin,<br>Manager|One task|200|
|PATCH|`/tasks/{id}`|Admin,<br>Manager|Edit, reassign (notifies new<br>assignee), change status|200|
|DELETE|`/tasks/{id}`|Admin,<br>Manager|Delete; linked expenses keep<br>their data|204|
|GET|`/tasks/assignees`|Admin,<br>Manager|Names of Admins and<br>Managers (id, name, relation)<br>for the assignee picker; no<br>emails, roles or invites|200|



Filters on `GET /tasks` : `eventId` (or `none` for general tasks), `assigneeId` (or `me` , `none` ), `status` (repeatable), `priority` , `overdue=true` , `dueBefore` , `q` (title search). Sort: `dueDate` (default, empty last), `-priority` , `-createdAt` . 

```
POST /api/v1/tasks
```

```
{ "title": "Book mehendi artist", "eventId": "66d2…", "assigneeId": "66b4…",
"dueDate": "2027-11-15", "priority": "HIGH" }
201 { "data": { "id": "66e5…", "status": "TODO", "overdue": false,
```

```
"assignee": { "id": "66b4…", "name": "Priya", "relationLabel": "Bride's
sister" }, … } }
Errors: 400 VALIDATION_FAILED (assignee not a member, event not in this
wedding)
```

Every task in a response carries a computed `overdue` boolean. 

## Expense and vendor endpoints 

All expense and vendor endpoints are open to Admins and Managers, including delete. 

Page 12 of 26 

Make My Marriage — API Design v1 

### **Expenses** 

|Method|Path|Purpose|Success|
|---|---|---|---|
|GET|`/expenses`|List with filters|200|
|POST|`/expenses`|Create|201|
|GET|`/expenses/{id}`|One expense with signed<br>receipt URL|200|
|PATCH|`/expenses/{id}`|Edit, mark paid|200|
|DELETE|`/expenses/{id}`|Delete (receipt queued for<br>purge)|204|
|POST|`/expenses/{id}/receipt`|Pre-signed URL to upload a<br>receipt|200|
|POST|`/expenses/{id}/receipt/complete`|Attach the uploaded receipt|200|
|GET|`/expenses/summary`|Totals: overall, per event, per<br>category, pending|200|



Filters: `eventId` (or `none` ), `taskId` , `vendorId` , `category` , `status` , `from` , `to` , `dueBefore` . Sort: `-date` (default), `dueDate` , `-amountPaise` . 

```
POST /api/v1/expenses
{
  "amountPaise": 4500000, "date": "2027-10-02", "eventId": "66d2…",
"vendorId": "66f1…",
  "category": "DECOR", "description": "Decor balance", "paidBy": "Venu",
  "status": "PENDING", "dueDate": "2028-01-20"
}
201 { "data": { "id": "66f9…", …, "event": { "id": "66d2…", "name": "Sangeet"
}, "vendor": { "id": "66f1…", "name": "Bloom Decor" } } }
Errors: 400 VALIDATION_FAILED (dueDate required when PENDING; event, task or
vendor not in this wedding)
```

Page 13 of 26 

Make My Marriage — API Design v1 

```
GET /api/v1/expenses/summary
200 { "data": {
  "totalPaise": 185000000, "paidPaise": 140000000, "pendingPaise": 45000000,
  "nextDue": { "id": "66f9…", "description": "Decor balance", "dueDate":
"2028-01-20" },
  "byEvent": [ { "eventId": "66d2…", "name": "Sangeet", "totalPaise":
32000000 } ],
  "byCategory": [ { "category": "CATERING", "totalPaise": 90000000 } ] } }
```

### **Vendors** 

|Method|Path|Purpose|Success|
|---|---|---|---|
|GET|`/vendors`|List; each with<br>`paidPaise`from linked<br>expenses|200|
|POST|`/vendors`|Create|201|
|GET|`/vendors/{id}`|Vendor with documents<br>(signed URLs) and linked<br>expenses|200|
|PATCH|`/vendors/{id}`|Edit, change booking<br>status|200|
|DELETE|`/vendors/{id}`|Delete; expenses keep<br>their data, documents<br>purged|204|
|POST|`/vendors/{id}/documents`|Pre-signed URL for a<br>document|200|
|POST|`/vendors/{id}/documents/complete`|Attach document<br>`{`<br>`key, name, type }`|200|
|DELETE|`/vendors/{id}/documents/{key}`|Remove a document|204|
|GET|`/vendors/contacts`|Wedding-day contacts:<br>flagged vendors and all<br>organisers with phones|200|



Page 14 of 26 

Make My Marriage — API Design v1 

|Method|Path|Purpose|Success|
|---|---|---|---|
|GET|`/vendors/find-nearby?`|Google Maps search|200|
||`serviceType=&eventId=`|URL for that service||
|||near the event venue||



Filters on `GET /vendors` : `serviceType` , `bookingStatus` , `q` . The Find nearby endpoint only builds a URL ( `{ "data": { "url": "https://www.google.com/maps/search/? api=1&query=Caterers%20near%20…" } }` ); no Google API is called. 

## Guest and invitation endpoints 

### **Guests** 

|Method|Path|Roles|Purpose|Success|
|---|---|---|---|---|
|GET|`/guests`|Admin,<br>Manager|Search and filter<br>households|200|
|POST|`/guests`|Admin,<br>Manager|Add a household (token<br>generated)|201|
|GET|`/guests/{id}`|Admin,<br>Manager|Household with RSVPs<br>and invitation link|200|
|PATCH|`/guests/{id}`|Admin,<br>Manager|Edit details, invited<br>events|200|
|DELETE|`/guests/{id}`|Admin|Delete household|204|
|POST|`/guests/bulk-events`|Admin,<br>Manager|Add or remove many<br>households from events|200|
|POST|`/guests/import/preview`|Admin|Parse an Excel/CSV file,<br>return rows with errors<br>and duplicates|200|
|POST|`/guests/import/commit`|Admin|Save the previewed<br>rows|200|
|POST|`/guests/{id}/token`|Admin|Regenerate the<br>invitation link|200|



Page 15 of 26 

Make My Marriage — API Design v1 

|Method|Path|Roles|Purpose|Success|
|---|---|---|---|---|
|GET|`/guests/export?`<br>`format=xlsx`|Admin,<br>Manager|Excel of the current<br>filter|200<br>(file)|
|GET|`/guests/stats`|Admin,<br>Manager|Households and people<br>by side, RSVP counts<br>per event|200|



Filters on `GET /guests` : `q` (name or phone), `side` , `eventId` , `rsvp` ( `PENDING` , 

`ATTENDING` , `NOT_ATTENDING` , with `eventId` ), `inviteStatus` , `noEmail=true` . Sort: `name` (default), `-updatedAt` . 

```
POST /api/v1/guests
{ "name": "Ramesh Sharma family", "phone": "+919876543210", "email":
"ramesh@example.com",
  "side": "GROOM", "allowedCount": 4, "invitedEventIds": ["66d2…", "66d4…"],
"notes": "Coming from Pune" }
201 { "data": { "id": "66g1…", …, "inviteStatus": "NOT_SENT", "inviteUrl":
"https://<app>/i/9f3k…",
  "rsvp": [ { "eventId": "66d2…", "status": "PENDING" }, { "eventId":
"66d4…", "status": "PENDING" } ] } }
Errors: 400 VALIDATION_FAILED · 409 PHONE_EXISTS
```

**Import:** `preview` takes `multipart/form-data` with the file (max 2 MB, up to 3,000 rows; columns name, phone, email, side, allowedCount, events). It returns each row as `valid` , `error` (with reasons) or `duplicate` (with the existing guest id). `commit` takes `{ "rows": [ …valid rows… ], "onDuplicate": "SKIP" | "UPDATE" }` , re-validates everything and returns `{ created, updated, skipped }` . No file is stored. 

```
POST /api/v1/guests/bulk-events
{ "guestIds": ["66g1…", "66g2…"], "add": ["66d3…"], "remove": [] }
200 { "data": { "updated": 2 } }
```

### **Invitations** 

|Method|Path|Roles|Purpose|Success|
|---|---|---|---|---|
|POST|`/guests/{id}/invite`|Admin,|Queue the invitation|202|
|||Manager|email||



Page 16 of 26 

Make My Marriage — API Design v1 

|Method|Path|Roles|Purpose|Success|
|---|---|---|---|---|
|POST|`/guests/{id}/remind`|Admin,<br>Manager|Queue a reminder<br>(pending RSVPs<br>only)|202|
|POST|`/guests/{id}/whatsapp`|Admin,<br>Manager|WhatsApp URL with<br>the guest's link;<br>marks Sent via<br>WhatsApp|200|
|POST|`/invitations/bulk`|Admin|Queue invites or<br>reminders for a filter|202|
|GET|`/invitations/queue`|Admin|Emails queued, sent<br>today, failed|200|
|GET|`/events/{id}/headcount?`<br>`format=json|xlsx|pdf`|Admin,<br>Manager|Attending<br>households, names<br>and counts|200|



```
POST /api/v1/guests/66g1…/whatsapp
200 { "data": { "url": "https://wa.me/919876543210?
text=Dear%20Ramesh%20Sharma%20family…" } }
```

```
POST /api/v1/invitations/bulk
```

```
{ "type": "INVITE", "filter": { "eventId": "66d2…", "side": "BRIDE",
"inviteStatus": "NOT_SENT" } }
202 { "data": { "jobId": "66j1…", "matched": 412, "withoutEmail": 97 } }
```

`type` is `INVITE` or `REMINDER` ; reminders skip households that have answered every invited event or were reminded in the last 3 days. Single sends return `409 REMINDER_TOO_SOON` or `400 VALIDATION_FAILED` (no email on record) where applicable. 

## Gallery and upload endpoints 

Organiser and photographer photo endpoints. Uploads are two calls per batch of up to 20 photos: reserve (get pre-signed URLs), then complete; the bytes go straight from the browser to R2 in between. 

Page 17 of 26 

Make My Marriage — API Design v1 

|Method|Path|Roles|Purpose|Success|
|---|---|---|---|---|
|GET|`/photos`|Admin, Manager;<br>Photographer<br>(PRO only)|List photos with<br>signed<br>thumbnail URLs|200|
|GET|`/photos/albums`|Admin, Manager|Per event: guest<br>and pro counts,<br>cover thumbnail|200|
|POST|`/photos/uploads`|Admin, Manager<br>(GUEST album);<br>Admin,<br>Photographer<br>(PRO album)|Reserve up to<br>20 uploads, get<br>pre-signed PUT<br>URLs|200|
|POST|`/photos/complete`|Same as above|Confirm up to<br>20 uploaded<br>photos|200|
|GET|`/photos/{id}/download`|Admin, Manager|Signed full-size<br>URL (1 hour)|200|
|DELETE|`/photos/{id}`|Admin;<br>Photographer for<br>own PRO photos|Soft delete,<br>files purged<br>later|204|
|GET|`/photos/export-manifest?`<br>`eventId=&album=`|Admin, Manager|Signed URLs for<br>a whole album,<br>for in-browser<br>zip|200|
|PATCH|`/events/{id}`with<br>`proDeliveryUrl`|Admin,<br>Photographer|Link to the full-<br>resolution set|200|



Filters on `GET /photos` : `eventId` (or `unsorted` ), `album` ( `GUEST` or `PRO` ), `uploaderId` . Sort: newest first. Limit default 60. 

### **Reserve** 

Page 18 of 26 

Make My Marriage — API Design v1 

```
POST /api/v1/photos/uploads
```

```
{ "eventId": "66d3…", "album": "GUEST",
  "files": [ { "clientId": "a1", "contentType": "image/jpeg", "bytes":
512340, "thumbBytes": 41200, "width": 2000, "height": 1333 } ] }
```

```
200 { "data": { "uploads": [ {
```

```
  "clientId": "a1", "photoId": "66p1…",
```

```
  "putUrl": "https://<bucket>.r2.cloudflarestorage.com/weddings/…/66p1….jpg?
X-Amz-…",
```

```
  "thumbPutUrl": "https://…/66p1…_thumb.jpg?X-Amz-…",
```

```
  "headers": { "Content-Type": "image/jpeg" }, "expiresAt": "…+10 min" } ] }
}
```

```
Errors: 400 VALIDATION_FAILED (more than 20 files) · 413 FILE_TOO_LARGE · 415
UNSUPPORTED_FILE_TYPE · 403 FORBIDDEN (album not allowed)
```

The browser then sends each file with `PUT putUrl` (and the thumbnail with `PUT thumbPutUrl` ) directly to R2. 

### **Complete** 

```
POST /api/v1/photos/complete
{ "photoIds": ["66p1…", "66p2…"] }
200 { "data": { "ready": ["66p1…"], "missing": ["66p2…"] } }
```

`missing` lists photos whose files are not in R2 yet; the browser retries those uploads and calls complete again. Unconfirmed reservations are cleaned up after an hour. 

### **List item shape** 

```
{ "id": "66p1…", "eventId": "66d3…", "album": "GUEST",
```

```
  "uploader": { "kind": "GUEST", "name": "Ramesh Sharma family" },
  "thumbUrl": "https://…signed…", "width": 2000, "height": 1333, "createdAt":
"…" }
```

The same reserve/complete pattern is used for the wedding cover, event covers, expense receipts and vendor documents (PDF allowed for the last two). 

Page 19 of 26 

Make My Marriage — API Design v1 

## Public endpoints 

No account or cookie is needed: the token in the path is the credential. All `/public/*` routes are rate limited per IP (30 requests a minute; QR uploads 60 photos an hour) and never return phone numbers or emails of other guests. 

|Method|Path|Purpose|Success|
|---|---|---|---|
|GET|`/public/w/{slug}`|Public website:<br>names, title, tagline,<br>date, city, cover,<br>description, live<br>stream when on,<br>event names and<br>dates if enabled|200|
|GET|`/public/i/{token}`|Invitation:<br>household, couple,<br>invited events with<br>full details, RSVP<br>state, cutoff;<br>records first open|200|
|PUT|`/public/i/{token}/rsvp`|Submit or change<br>RSVP for one or<br>more events|200|
|GET|`/public/i/{token}/photos`|Guest photos from<br>all events (filter<br>`eventId`)|200|
|GET|`/public/i/{token}/albums`|Event albums with<br>counts|200|
|POST|`/public/i/{token}/uploads`|Reserve up to 20<br>guest uploads|200|
|POST|`/public/i/{token}/uploads/complete`|Confirm uploads|200|
|DELETE|`/public/i/{token}/photos/{id}`|Delete own upload|204|
|GET|`/public/i/{token}/photos/{id}/download`|Signed full-size URL|200|



Page 20 of 26 

Make My Marriage — API Design v1 

|Method|Path|Purpose|Success|
|---|---|---|---|
|POST|`/public/i/{token}/pro-access`|Check the<br>professional album<br>password, set<br>`mmm_pro`cookie|204|
|GET|`/public/i/{token}/pro-photos`|Professional photos<br>(needs<br>`mmm_pro`)|200|
|GET|`/public/u/{eventToken}`|Event name and<br>wedding title for the<br>QR upload page|200|
|POST|`/public/u/{eventToken}/uploads`|Reserve uploads to<br>that event's guest<br>album|200|
|POST|`/public/u/{eventToken}/uploads/complete`|Confirm uploads|200|



### **Invitation** 

```
GET /api/v1/public/i/9f3k…
200 { "data": {
  "household": { "name": "Ramesh Sharma family", "allowedCount": 4 },
  "wedding": { "brideName": "Sneha", "groomName": "Ravi", "title": "Ravi weds
Sneha", "tagline": "…", "date": "2028-01-28", "coverUrl": "…" },
  "events": [ { "id": "66d4…", "name": "Pelli", "startAt": "…", "endAt": "…",
"muhurthamAt": "…",
                "venue": { "name": "…", "address": "…", "mapUrl": "…" },
"dressCode": "…", "instructions": "…",
                "live": false, "livestreamUrl": null,
                "rsvp": { "status": "PENDING", "count": null } } ],
  "rsvpEditableUntil": "2028-01-15", "uploadsRemaining": 100,
"proAlbumsLocked": true } }
Errors: 404 NOT_FOUND
```

### **RSVP** 

Page 21 of 26 

Make My Marriage — API Design v1 

```
PUT /api/v1/public/i/9f3k…/rsvp
{ "responses": [ { "eventId": "66d4…", "status": "ATTENDING", "count": 3 },
                 { "eventId": "66d2…", "status": "NOT_ATTENDING", "count": 0
} ] }
200 { "data": { "rsvp": [ … ], "rsvpEditableUntil": "2028-01-15" } }
Errors: 400 COUNT_EXCEEDS_ALLOWED · 400 VALIDATION_FAILED · 403
EVENT_NOT_INVITED · 409 RSVP_CLOSED
```

Events not included in `responses` keep their current answer. Each change notifies Admins and is logged in the activity log as the household. 

**Uploads by guests and QR** use the same request and response shapes as `POST /photos/uploads` and `/photos/complete` , without `album` (always GUEST) and, for QR, without `eventId` (taken from the token). Extra errors: `409 UPLOAD_CAP_REACHED` for guest links, `429 RATE_LIMITED` for QR pages. The reserve call holds the guest's allowance; unconfirmed reservations are released after an hour. 

### **Professional access** 

```
POST /api/v1/public/i/9f3k…/pro-access      { "password": "…" }
204  Set-Cookie: mmm_pro=… (90 days)
Errors: 401 PRO_PASSWORD_INVALID · 429 RATE_LIMITED (5 attempts per 15
minutes per IP)
```

Website unpublished → `GET /public/w/{slug}` returns `200 { "data": { "published": false, "title": "…" } }` so the page can show coming-soon; personal links keep working. 

## Dashboard, notifications, activity, exports and job runner 

|Method|Path|Roles|Purpose|Success|
|---|---|---|---|---|
|GET|`/dashboard`|Admin, Manager|All dashboard<br>cards in one call|200|
|GET|`/notifications`|Admin, Manager,<br>Photographer|Latest<br>notifications and<br>unread count|200|
|POST|`/notifications/read`|Same|Mark some or all as<br>read|204|



Page 22 of 26 

Make My Marriage — API Design v1 

|Method|Path|Roles|Purpose|Success|
|---|---|---|---|---|
|GET|`/activity`|Admin, Manager|Activity log with<br>filters|200|
|GET|`/exports/expenses?`<br>`format=xlsx`|Admin, Manager|Expense list|200<br>(file)|
|GET|`/exports/final`|Admin|After-wedding<br>bundle: Excel links<br>plus photo<br>manifests per<br>album|200|
|GET|`/admin/jobs?`<br>`status=FAILED`|Admin|Failed jobs with<br>errors|200|
|POST|`/admin/jobs/{id}/retry`|Admin|Re-queue a failed<br>job|202|
|POST|`/api/jobs/run`|Scheduler (<br>`X-`<br>`Job-Secret`)|Process due jobs<br>for about 40<br>seconds|200|
|GET|`/api/health`|Anyone|Database<br>reachable, version|200 /<br>503|



### **Dashboard** 

Page 23 of 26 

Make My Marriage — API Design v1 

```
GET /api/v1/dashboard
200 { "data": {
  "countdown": { "date": "2028-01-28", "daysLeft": 461 },
  "myTasks": [ { "id": "…", "title": "Book mehendi artist", "dueDate": "2027-
11-15", "overdue": false, "priority": "HIGH" } ],
  "tasks": { "todo": 42, "inProgress": 9, "completed": 31, "overdue": 4 },
  "upcomingEvents": [ { "id": "…", "name": "Haldi", "startAt": "…",
"venueName": "…" } ],
  "totals": { "events": 6, "vendors": 14, "households": 1180, "people": 3420
},
  "rsvp": { "replied": 640, "pending": 540, "byEvent": [ { "eventId": "…",
"name": "Pelli", "attendingPeople": 1540 } ] },
  "money": { "spentPaise": 185000000, "pendingPaise": 45000000, "nextDue": {
"description": "Decor balance", "dueDate": "2028-01-20" } },
  "recentActivity": [ { "summary": "Priya completed 'Order return gifts'",
"at": "…" } ],
  "storage": { "usedBytes": 7400000000 }
} }
```

`storage` is included only for Admins. `myTasks` returns up to 10, overdue first. **Notifications** 

```
GET /api/v1/notifications?limit=20
200 { "data": [ { "id": "…", "type": "TASK_ASSIGNED", "title": "New task:
Book mehendi artist", "link": "/tasks/66e5…", "readAt": null, "createdAt":
"…" } ],
      "unreadCount": 3, "page": { "nextCursor": null, "limit": 20 } }
POST /api/v1/notifications/read   { "ids": ["…"] }  or  { "all": true }
```

**Activity filters:** `actorId` , `entityType` , `from` , `to` ; newest first. 

**Job runner:** `POST /api/jobs/run` returns `{ "processed": 37, "failed": 1, "remaining": 120 }` . A missing or wrong `X-Job-Secret` returns `404 NOT_FOUND` so the endpoint does not advertise itself. 

## Authorization summary 

One place to check who can do what; each module's `policy.ts` encodes exactly this table, and integration tests call every endpoint as every caller type to confirm it. 

Page 24 of 26 

Make My Marriage — API Design v1 

|Area|Admin|Manager|Photographer|Guest link|QR|
|---|---|---|---|---|---|
|Own account<br>(<br>`/auth/*`)|✓|✓|✓|—|—|
|Wedding details,<br>website, pro password|Read, edit|Read|Read|Public view|—|
|Members and invites|Full|—|—|—|—|
|Events|Full, incl. delete, QR<br>token, livestream<br>URL|Read, edit<br>details|Read; set<br>`proDeliveryUrl`|Invited<br>events only|Event<br>name|
|Tasks|Full|Full|—|—|—|
|Expenses, receipts|Full|Full|—|—|—|
|Vendors, documents,<br>contacts|Full|Full|—|—|—|
|Guests: list, add, edit,<br>bulk events, export|✓|✓|—|Own<br>household|—|
|Guests: delete, import,<br>regenerate link|✓|—|—|—|—|
|Invitations: single<br>invite, reminder,<br>WhatsApp|✓|✓|—|—|—|
|Invitations: bulk, queue<br>status|✓|—|—|—|—|
|Headcount export|✓|✓|—|—|—|
|RSVP|—|—|—|Own<br>household|—|
|Guest photos: view|✓|✓|—|All events|—|
|Guest photos: upload|✓|✓|—|✓(cap)|✓(rate<br>limit)|
|Guest photos: delete|Any|—|—|Own only|—|
|Pro photos: upload|✓|—|✓|—|—|
|Pro photos: view|✓|✓|✓|With<br>password|—|
|Pro photos: delete|Any|—|Own only|—|—|
|Album download<br>manifest|✓|✓|—|—|—|
|Dashboard|✓(incl. storage)|✓|—|—|—|



Page 25 of 26 

Make My Marriage — API Design v1 

|Area|Admin|Manager|Photographer|Guest link|QR|
|---|---|---|---|---|---|
|Notifications|✓|✓|✓|—|—|
|Activity log|✓|✓|—|—|—|
|Final export, failed jobs|✓|—|—|—|—|



Every organiser action is also scoped to the caller's wedding, and every guest or QR action to the token's wedding, before the role check is applied. 

Page 26 of 26 


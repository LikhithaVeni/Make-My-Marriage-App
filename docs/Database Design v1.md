Make My Marriage — Database Design v1 

# Make My Marriage — Database Design v1 

Oct 23, 2026 · @Venu 

## Summary and conventions 

The database is one MongoDB Atlas database ( `mmm_prod` ) with 17 collections, accessed only through Mongoose models owned by each module. The wedding is the root: every wedding-owned document carries `weddingId` , and every query on those collections filters by it. 

|Convention|Rule|
|---|---|
|Ids|MongoDB<br>`ObjectId`in<br>`_id`; references store the<br>`ObjectId`, named<br>`<thing>Id`|
|Timestamps|`createdAt`,<br>`updatedAt`on every document<br>(Mongoose<br>`timestamps`), stored in UTC|
|Authorship|`createdBy`,<br>`updatedBy`(user ids) on documents<br>organisers edit|
|Wedding scoping|`weddingId`required on all wedding-owned<br>collections; first field of their compound indexes|
|Money|Integer paise (<br>`amountPaise`), never floating-point<br>rupees; shown as INR in the UI|
|Dates|Instants as<br>`Date`(UTC). Calendar-only values (due<br>dates, RSVP cutoff) as<br>`YYYY-MM-DD`strings,<br>interpreted in<br>`Asia/Kolkata`|
|Enums|Uppercase strings (<br>`ATTENDING`,<br>`IN_PROGRESS`),<br>validated by Mongoose<br>`enum`and Zod|
|Names|Collections camelCase plural; fields camelCase|
|Phones|E.164 (<br>`+919876543210`), normalised on write|
|Emails|Trimmed and lowercased on write|



Page 1 of 21 

Make My Marriage — Database Design v1 

|Convention|Rule|
|---|---|
|Files|Only R2 object keys are stored (<br>`coverKey`,<br>`receiptKey`); never URLs, since signed URLs<br>expire|
|Secrets|Tokens and passwords are stored hashed; raw<br>values exist only in emails and links|
|Validation|Zod at the API edge, Mongoose schema rules at the<br>database layer; both from the same field<br>definitions|



## Relationships 



<!-- Start of picture text -->
Every record hangs off the wedding; events tie planning and guests together<br>weddingldon<br>every document<br>Organisers Planning Guests and media<br>users events guests<br>memberships<br>tasks<br>sessions<br>authTokens expenses photos<br>invites vendors<br>System: notifications - activityLog - jobs - rateLimits - counters<br><!-- End of picture text -->

collection relationships · arrows point to the referenced collection 

Arrows point from the document holding the reference to the one it references. Events are the hub: tasks, expenses and photos point to an event, and guests point to events through `invitedEventIds` and their embedded RSVPs. Not drawn: memberships, 

Page 2 of 21 

Make My Marriage — Database Design v1 

sessions, authTokens and invites all reference `users` ; tasks reference their assignee in `users` ; photos reference their uploader (a guest or a user). 

## Embedding vs referencing 

Embed when the data is small, bounded and always read with its parent; reference when it grows without limit, is shared, or is queried on its own. 

|Data|Decision|Why|
|---|---|---|
|Event venue (name,<br>address, map URL)|Embed in<br>`events`|Always shown with the event;<br>never queried alone|
|Wedding website<br>settings|Embed in<br>`weddings`|A handful of flags, read with<br>the wedding|
|Guest RSVPs (one per<br>invited event)|Embed array in<br>`guests`|Bounded by the number of<br>events (about 10); one write<br>per RSVP; headcounts via<br>`$unwind`|
|Guest invited events|Embed array of event ids in<br>`guests`|Bounded; needed on every<br>invitation page load|
|Vendor documents (key,<br>name, type)|Embed array in<br>`vendors`|Few per vendor; deleted with<br>the vendor|
|Expense receipt|Single key field in<br>`expenses`|One file per expense|
|Tasks|Separate collection,<br>reference<br>`eventId`|Hundreds per wedding;<br>queried by assignee, status<br>and due date across events|
|Expenses|Separate collection,<br>references<br>`eventId`,<br>`taskId`,<br>`vendorId`|Totals by event, category,<br>vendor and status|
|Photos|Separate collection,<br>references<br>`eventId`,<br>uploader|Thousands to 150,000;<br>paginated and filtered|



Page 3 of 21 

Make My Marriage — Database Design v1 

|Data|Decision|Why|
|---|---|---|
|Memberships|Separate collection|Links users and weddings;<br>enforces one wedding per<br>user; lets one user join many<br>weddings later|
|Sessions, auth tokens,<br>invites|Separate collections with TTL|Expire on their own; looked up<br>by token hash|
|Notifications, activity log,<br>jobs|Separate collections|Grow continuously; queried by<br>time|
|Task comments,<br>checklists|Not in v1|Dropped from scope|



Denormalised copies (kept small and updated by the owning service): `activityLog.actor.name` and `entity.label` , so the log still reads correctly after a member or record is deleted; `sessions.role` and `weddingId` , so a request needs one lookup. 

## Identity and access collections 

Five collections, owned by the auth and wedding modules. `?` marks optional fields; all others are required. Timestamps are omitted below. 

**users** (auth) — one per organiser or photographer 

|`{`<br>`_id: ObjectId`||
|---|---|
|`name: string`|`// 1–80 chars`|
|`email: string`|`// lowercase, unique`|
|`passwordHash: string`|`// bcrypt, cost 12`|
|`emailVerifiedAt?: Date`||
|`failedLogins: number`|`// default 0, reset on success`|
|`lockedUntil?: Date`|`// set after 5 failures, +15 min`|
|`lastLoginAt?: Date`<br>`}`||



**sessions** (auth) — one per logged-in device 

Page 4 of 21 

Make My Marriage — Database Design v1 

```
{
  _id: ObjectId
  idHash: string              // SHA-256 of the cookie value, unique
  userId: ObjectId            // → users
  weddingId?: ObjectId        // → weddings; empty until the user creates or
joins one
  role?: 'ADMIN' | 'MANAGER' | 'PHOTOGRAPHER'   // copy of membership.role
  expiresAt: Date             // now + 30 days, extended on use (at most once
per day)
  userAgent?: string
  ip?: string
}
```

### **authTokens** (auth) — email verification and password reset 

```
{
  _id: ObjectId
  userId: ObjectId            // → users
  type: 'VERIFY_EMAIL' | 'RESET_PASSWORD'
  tokenHash: string           // SHA-256, unique
  expiresAt: Date             // verify 24 h, reset 1 h; TTL removes it
  usedAt?: Date               // single use
}
```

### **memberships** (wedding) — links a user to a wedding with a role 

```
{
  _id: ObjectId
  userId: ObjectId            // → users, unique in v1 (one wedding per user)
  weddingId: ObjectId         // → weddings
  role: 'ADMIN' | 'MANAGER' | 'PHOTOGRAPHER'
  relationLabel?: string      // "Bride's mother", "Groom's brother"
  invitedBy?: ObjectId        // → users
}
```

**invites** (wedding) — pending organiser invitations 

Page 5 of 21 

Make My Marriage — Database Design v1 

```
{
  _id: ObjectId
  weddingId: ObjectId
  email: string               // lowercase
  name: string
  role: 'ADMIN' | 'MANAGER'
  relationLabel?: string
  tokenHash: string           // unique
  status: 'PENDING' | 'ACCEPTED' | 'CANCELLED' | 'EXPIRED'
  expiresAt: Date             // now + 7 days
  invitedBy: ObjectId
  acceptedBy?: ObjectId
}
```

The photographer is a `users` document plus a `memberships` document with role PHOTOGRAPHER, created directly by an Admin rather than through an invite. 

## Wedding and planning collections 

Five collections owned by the wedding, events, tasks, vendors and expenses modules. All except `weddings` carry `weddingId` , `createdBy` and `updatedBy` , omitted below. **weddings** (wedding) — the workspace root 

Page 6 of 21 

Make My Marriage — Database Design v1 

```
{
  _id: ObjectId
  brideName: string
  groomName: string
  title: string               // "Ravi weds Sneha"
  date: string                // YYYY-MM-DD
  city: string
  slug: string                // unique, a-z 0-9 -, 3–40 chars
  coverKey?: string
  description?: string        // up to 2,000 chars
  tagline: string             // default "invite you to celebrate with us"
  rsvpCutoff?: string         // YYYY-MM-DD
  website: { published: boolean, showEventsPublicly: boolean }   // both
default false
  proPasswordHash?: string
  proPasswordVersion: number  // default 0, +1 on every change
  guestUploadCap: number      // default 100
  storageBytes: number        // default 0
  createdBy: ObjectId
}
```

### **events** (events) 

```
{
  _id: ObjectId
  weddingId: ObjectId
  name: string                // "Haldi", "Pelli"
  startAt: Date
  endAt: Date                 // > startAt; may be the next day
  muhurthamAt?: Date
  venue: { name: string, address: string, mapUrl?: string }
  dressCode?: string
  instructions?: string
  coverKey?: string
  livestreamUrl?: string      // YouTube URL only
  proDeliveryUrl?: string
  uploadToken: string         // random, unique; for the event QR code
  sortOrder: number
}
```

### **tasks** (tasks) 

Page 7 of 21 

Make My Marriage — Database Design v1 

```
{
  _id: ObjectId
  weddingId: ObjectId
  title: string               // 1–200 chars
  description?: string
  eventId?: ObjectId          // → events; empty = general task
  assigneeId?: ObjectId       // → users (a member of this wedding)
  dueDate?: string            // YYYY-MM-DD
  priority: 'LOW' | 'MEDIUM' | 'HIGH'          // default MEDIUM
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' // default TODO
  completedAt?: Date
}
```

### **vendors** (vendors) 

```
{
  _id: ObjectId
  weddingId: ObjectId
  name: string
  serviceType: string         // "Catering", "Decor", "Photography" …
  phone?: string
  notes?: string
  bookingStatus: 'ENQUIRED' | 'QUOTED' | 'BOOKED' | 'ADVANCE_PAID' |
'FULLY_PAID' | 'CANCELLED'
  quotePaise?: number
  agreedPaise?: number
  documents: { key: string, name: string, type: 'QUOTE' | 'CONTRACT' |
'CONFIRMATION' | 'RECEIPT' | 'OTHER', uploadedAt: Date }[]
  weddingDayContact: boolean  // default false
}
```

### **expenses** (expenses) 

Page 8 of 21 

Make My Marriage — Database Design v1 

```
{
  _id: ObjectId
  weddingId: ObjectId
  amountPaise: number         // > 0
  date: string                // YYYY-MM-DD
  eventId: ObjectId           // → events; required on create, unset only if
its event is deleted
  taskId?: ObjectId           // → tasks
  vendorId?: ObjectId         // → vendors
  category: 'CATERING' | 'DECOR' | 'VENUE' | 'CLOTHING' | 'JEWELLERY' |
'TRAVEL' | 'POOJA' | 'PHOTOGRAPHY' | 'OTHER'
  description?: string
  paidBy: string              // organiser name or free text
  status: 'PAID' | 'PENDING'
  dueDate?: string            // required when PENDING
  receiptKey?: string
}
```

## Guests and media collections 

The two largest collections: about 1,500 guest households and up to 150,000 photos. **guests** (guests) — one document per household 

```
{
  _id: ObjectId
  weddingId: ObjectId
  name: string                // "Ramesh Sharma family"
  phone: string               // E.164, unique per wedding
  email?: string              // lowercase
  side: 'BRIDE' | 'GROOM'
  allowedCount: number        // 1–20 (primary guest + companions)
  invitedEventIds: ObjectId[] // → events; at least one
  rsvp: {
    eventId: ObjectId         // must be in invitedEventIds
    status: 'ATTENDING' | 'NOT_ATTENDING'
    count: number             // 0 if NOT_ATTENDING; 1..allowedCount if
ATTENDING
    respondedAt: Date
  }[]                         // no entry for an event = PENDING
  notes?: string
  token: string               // 32 random bytes, base64url; unique
```

Page 9 of 21 

Make My Marriage — Database Design v1 

```
  inviteStatus: 'NOT_SENT' | 'SENT' | 'OPENED'
  sentAt?: Date
  sentVia?: ('EMAIL' | 'WHATSAPP')[]
  firstOpenedAt?: Date
  lastReminderAt?: Date
  uploadCount: number         // default 0, compared with
weddings.guestUploadCap
  createdBy: ObjectId
  updatedBy: ObjectId
}
```

The guest token is stored as-is (not hashed) because organisers need to resend the same link and generate WhatsApp messages; regenerating it replaces the value. 

### **photos** (gallery) 

```
{
  _id: ObjectId
  weddingId: ObjectId
  eventId?: ObjectId          // → events; empty = Unsorted album
  album: 'GUEST' | 'PRO'
  uploader: {
    kind: 'GUEST' | 'USER' | 'QR'
    id?: ObjectId             // guests._id or users._id; empty for QR
uploads
    name: string              // copied for display
  }
  key: string                 // R2 object key, full size
  thumbKey: string
  bytes: number               // full + thumbnail
  width: number
  height: number
  status: 'PENDING' | 'READY' | 'DELETED'
  readyAt?: Date
  deletedAt?: Date
  deletedBy?: { kind: 'GUEST' | 'USER', id: ObjectId }
  uploadIp?: string           // for QR abuse checks; removed 30 days after
the wedding
}
```

Page 10 of 21 

Make My Marriage — Database Design v1 

## System collections 

Five supporting collections owned by notifications, activity and the platform layer. **notifications** (notifications) 

```
{
  _id: ObjectId
  weddingId: ObjectId
  recipientId: ObjectId       // → users
  type: 'TASK_ASSIGNED' | 'RSVP_RECEIVED' | 'GUEST_UPLOAD_SUMMARY' |
'JOB_FAILED' | 'MEMBER_JOINED'
  title: string
  body?: string
  link?: string               // in-app path, e.g. /tasks/66a…
  readAt?: Date
}
```

### **activityLog** (activity) — append-only 

```
{
  _id: ObjectId
  weddingId: ObjectId
  actor: { kind: 'USER' | 'GUEST' | 'SYSTEM', id?: ObjectId, name: string }
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'INVITE' | 'ROLE_CHANGE' | 'SEND'
| 'UPLOAD' | 'RSVP'
  entity: { type: 'EVENT' | 'TASK' | 'EXPENSE' | 'VENDOR' | 'GUEST' | 'PHOTO'
| 'MEMBER' | 'WEDDING', id: ObjectId, label: string }
  summary: string             // "Moved 'Book caterer' to Completed"
  changes?: { field: string, from?: unknown, to?: unknown }[]   // for
UPDATE; sensitive fields excluded
}
```

### **jobs** (platform) 

Page 11 of 21 

Make My Marriage — Database Design v1 

```
{
  _id: ObjectId
  weddingId?: ObjectId
  type: 'EMAIL_SEND' | 'INVITATIONS_BULK' | 'UPLOAD_SUMMARY' | 'PHOTO_PURGE'
| 'UPLOAD_CLEANUP'
  payload: object             // type-specific, validated by Zod per type
  idempotencyKey?: string     // unique when present
  status: 'QUEUED' | 'RUNNING' | 'DONE' | 'FAILED'
  runAfter: Date
  attempts: number            // default 0, max 5
  lockedUntil?: Date
  lastError?: string
  finishedAt?: Date           // TTL: removed 30 days after finishing
}
```

### **rateLimits** (platform) 

```
{
  _id: ObjectId
  key: string                 // "login:ip:1.2.3.4", "qr-upload:ip:1.2.3.4"
  count: number
  windowEndsAt: Date          // TTL removes the document when the window
ends
}
```

**counters** (platform) — small shared counters 

```
{
  _id: string                 // "email:2027-11-02" (IST day)
  value: number               // emails sent that day
  expiresAt: Date             // TTL, 7 days
}
```

## Indexes 

Every index serves a named query; wedding-owned indexes lead with `weddingId` . Indexes are declared in each module's `model.ts` and created by a setup script, with `autoIndex` off in production. 

Page 12 of 21 

Make My Marriage — Database Design v1 

|Collection|Index|Options|Serves|
|---|---|---|---|
|users|`{ email: 1 }`|unique|Login, signup<br>duplicate check|
|sessions|`{ idHash: 1 }`|unique|Every authenticated<br>request|
|sessions|`{ userId: 1 }`||Log out a user<br>everywhere on<br>removal or role<br>change|
|sessions|`{ expiresAt: 1 }`|TTL 0 s|Expiry cleanup|
|authTokens|`{ tokenHash: 1 }`|unique|Verify and reset links|
|authTokens|`{ expiresAt: 1 }`|TTL 0 s|Expiry cleanup|
|memberships|`{ userId: 1 }`|unique|One wedding per<br>user; session build|
|memberships|`{ weddingId: 1, role: 1`<br>`}`||Members page; last-<br>Admin check|
|invites|`{ tokenHash: 1 }`|unique|Accept invite|
|invites|`{ weddingId: 1, status:`<br>`1 }`||Pending invites list|
|weddings|`{ slug: 1 }`|unique|Public website|
|events|`{ weddingId: 1,`<br>`startAt: 1 }`||Schedule, upcoming<br>events|
|events|`{ uploadToken: 1 }`|unique|QR upload page|
|tasks|`{ weddingId: 1,`<br>`assigneeId: 1, status: 1`<br>`}`||My tasks, dashboard|
|tasks|`{ weddingId: 1,`<br>`eventId: 1, status: 1 }`||Tasks by event|



Page 13 of 21 

Make My Marriage — Database Design v1 

|Collection|Index|Options|Serves|
|---|---|---|---|
|tasks|`{ weddingId: 1,`<br>`dueDate: 1 }`|partial: status in<br>TODO,<br>IN_PROGRESS|Overdue and<br>upcoming|
|vendors|`{ weddingId: 1,`<br>`serviceType: 1 }`||Vendor list by type|
|vendors|`{ weddingId: 1,`<br>`weddingDayContact: 1 }`|partial: true|Wedding-day<br>contacts|
|expenses|`{ weddingId: 1,`<br>`eventId: 1, date: -1 }`||Expenses by event,<br>totals|
|expenses|`{ weddingId: 1, status:`<br>`1, dueDate: 1 }`||Pending payments|
|expenses|`{ weddingId: 1,`<br>`vendorId: 1 }`|sparse|Paid vs agreed per<br>vendor|
|guests|`{ token: 1 }`|unique|Every invitation page<br>and guest action|
|guests|`{ weddingId: 1, phone:`<br>`1 }`|unique|Duplicate check,<br>import|
|guests|`{ weddingId: 1, side:`<br>`1, name: 1 }`||Default list order and<br>side filter|
|guests|`{ weddingId: 1,`<br>`invitedEventIds: 1 }`|multikey|Guests per event,<br>headcount|
|guests|`{ weddingId: 1,`<br>`inviteStatus: 1 }`||"Never opened" and<br>"not sent" filters|
|guests|`{ name: 'text', phone:`<br>`'text' }`|text|Search box|
|photos|`{ weddingId: 1,`<br>`eventId: 1, album: 1,`<br>`status: 1, _id: -1 }`||Gallery pages, newest<br>first, cursor paging|
|photos|`{ 'uploader.id': 1,`<br>`status: 1 }`||A guest's own photos,<br>delete-own check|



Page 14 of 21 

Make My Marriage — Database Design v1 

|Collection|Index|Options|Serves|
|---|---|---|---|
|photos|`{ status: 1, createdAt:`<br>`1 }`|partial: PENDING|Stale upload cleanup|
|notifications|`{ recipientId: 1,`<br>`readAt: 1, _id: -1 }`||Bell list, unread count|
|activityLog|`{ weddingId: 1, _id: -1`<br>`}`||Activity feed|
|activityLog|`{ weddingId: 1,`<br>`'entity.type': 1, _id:`<br>`-1 }`||Filter by area|
|activityLog|`{ weddingId: 1,`<br>`'actor.id': 1, _id: -1`<br>`}`||Filter by person|
|jobs|`{ status: 1, runAfter:`<br>`1 }`||Runner claims next<br>job|
|jobs|`{ idempotencyKey: 1 }`|unique, partial:<br>exists|No duplicate emails|
|jobs|`{ finishedAt: 1 }`|TTL 30 days|Cleanup|
|rateLimits|`{ key: 1 }`|unique|Increment counter|
|rateLimits|`{ windowEndsAt: 1 }`|TTL 0 s|Cleanup|
|counters|`{ expiresAt: 1 }`|TTL 0 s|Cleanup|



This must stay the only text index on `guests` (MongoDB allows one per collection); searches combine it with a `weddingId` filter. 

## Constraints and integrity 

MongoDB enforces uniqueness and TTLs; everything else is enforced in the owning service, inside a transaction where several documents must change together. 

**Enforced by the database:** the unique indexes above (email, slug, tokens, one membership per user, one phone per wedding, idempotency keys) and TTL expiry. A duplicate-key error is mapped to a `409` with a readable message. 

Page 15 of 21 

Make My Marriage — Database Design v1 

### **Field rules (Mongoose + Zod)** 

|Rule|Where|
|---|---|
|`events.endAt > startAt`|events|
|`expenses.amountPaise > 0`;<br>`dueDate`required<br>when status PENDING|expenses|
|`guests.allowedCount`1–20; each<br>`rsvp.count`≤<br>`allowedCount`;<br>`count`0 when NOT_ATTENDING|guests|
|`rsvp[].eventId` ∈<br>`invitedEventIds`; one entry<br>per event|guests|
|`tasks.assigneeId`is a member of the same<br>wedding|tasks service|
|`expenses.taskId`,<br>`vendorId`,<br>`eventId`belong to<br>the same wedding|expenses service|
|`livestreamUrl`is a youtube.com or youtu.be URL|events|
|String lengths: names ≤ 80, titles ≤ 200, notes and<br>descriptions ≤ 2,000|all|



### **Business rules in services** 

- At least one ADMIN per wedding: demote, remove and leave run in a transaction that counts Admins after the change and aborts if zero. 

- A user can hold only one membership (unique index); accepting an invite for a user who already has one returns `409 EMAIL_IN_OTHER_WEDDING` . 

- Guest uploads: the upload request reserves capacity with an atomic `$inc` on `guests.uploadCount` guarded by `uploadCount + n ≤ guestUploadCap` . 

- RSVP after `rsvpCutoff` is rejected with `409 RSVP_CLOSED` . 

**What happens on delete** (no foreign keys in MongoDB, so each delete names its followups) 

Page 16 of 21 

Make My Marriage — Database Design v1 

|Deleted|Effect on related data|Transaction|
|---|---|---|
|Event|**Blocked**with<br>`409 EVENT_HAS_ACTIVE_ITEMS`while<br>any of its tasks is In Progress or any of its expenses<br>is Pending; the error lists them so they can be<br>finished or moved first. Otherwise: To Do and<br>Completed tasks get<br>`eventId`unset (become<br>general tasks); Paid expenses get<br>`eventId`unset<br>and show under "No event"; photos get<br>`eventId`<br>unset (Unsorted); the event is pulled from guests'<br>`invitedEventIds`and<br>`rsvp`|Yes|
|Task|Expenses:<br>`taskId`unset|Yes|
|Vendor|Expenses:<br>`vendorId`unset; vendor documents<br>queued for purge from R2|Yes|
|Guest|Their photos stay, uploader name kept|No|
|Member removed|Tasks:<br>`assigneeId`unset; sessions deleted;<br>membership deleted|Yes|
|Photo|Soft delete (status DELETED),<br>`PHOTO_PURGE`job<br>removes files and reduces<br>`storageBytes`|No|



Every delete writes an `activityLog` entry with the deleted record's label. Transactions need a replica set, which every Atlas cluster, including the free tier, provides. 

## Tokens and sessions 

All tokens are 32 random bytes from `crypto.randomBytes` , encoded base64url (43 characters). Tokens that grant an organiser account access are stored only as SHA-256 hashes; guest and QR tokens are stored as-is because organisers must be able to show and resend them. 

|Token|Stored as|Where|Lifetime|Single<br>use|Revoked by|
|---|---|---|---|---|---|
|Session|SHA-256 hash|`sessions.idHash`|30 days,<br>sliding|No|Logout,<br>removal, role|
||||||change,<br>password reset|



Page 17 of 21 

Make My Marriage — Database Design v1 

|Token|Stored as|Where|Lifetime|Single<br>use|Revoked by|
|---|---|---|---|---|---|
|Email<br>verification|SHA-256 hash|`authTokens`|24 hours|Yes|Use or expiry|
|Password<br>reset|SHA-256 hash|`authTokens`|1 hour|Yes|Use, expiry,<br>newer reset|
|Organiser<br>invite|SHA-256 hash|`invites.tokenHash`|7 days|Yes|Accept, cancel,<br>resend (new<br>token)|
|Guest<br>invitation|Plain|`guests.token`|Until<br>regenerated|No|Admin<br>regenerate|
|Event QR<br>upload|Plain|`events.uploadToken`|Until<br>regenerated|No|Admin<br>regenerate,<br>event delete|
|Professional<br>album access|Signed cookie (HMAC)<br>holding weddingId and<br>`proPasswordVersion`|Browser only|90 days|No|Password<br>change<br>(version +1)|



### **Session lifecycle** 

1. Login succeeds → create `sessions` document with `userId` , `weddingId` and `role` copied from the membership, `expiresAt` = now + 30 days → set cookie `mmm_session` (httpOnly, Secure, SameSite=Lax, path /, max-age 30 days). 

2. Each request hashes the cookie, finds the session by `idHash` , rejects it if expired, and builds `ctx = { userId, weddingId, role }` . One indexed read; no separate membership read. 

3. If `expiresAt` is less than 29 days away, extend it to now + 30 days (at most one write per day per session). 

4. Creating or joining a wedding updates `weddingId` and `role` on that user's sessions. 

5. Role change or removal → `deleteMany({ userId })` on sessions, so the next request sends them to login. 

6. Password reset → all sessions for the user deleted, then a fresh one is created. 

7. Logout → delete the session and clear the cookie. 

**Lookup cost:** a session read on `idHash` and a guest read on `token` each hit a unique index, so both stay at about a millisecond of database time at this data size. 

Page 18 of 21 

Make My Marriage — Database Design v1 

## Email jobs and the queue 

Every email goes through the `jobs` collection: the request that triggers it writes an `EMAIL_SEND` job and returns at once, and the runner sends it later within the provider's daily limit. 



<!-- Start of picture text -->
Ajob retries up to 5 times before Admins see it<br>Request QUEUED claim RUNNING success DONE<br>writes the job waits for runAfter locked for 2 min kept 30 days<br>FAILED<br>Admins notified<br>error: retryin 1, 5, 30 min 5th failure<br>email limit: wait until tomorrow<br><!-- End of picture text -->

job lifecycle · 4 states, retry loop 

A failed attempt goes back to QUEUED with a later `runAfter` ; a job that hits the daily email limit waits until the next day without using up an attempt. 

### **EMAIL_SEND payload** 

```
{
  template: 'GUEST_INVITE' | 'GUEST_REMINDER' | 'ORGANISER_INVITE' |
'TASK_ASSIGNED' | 'VERIFY_EMAIL' | 'RESET_PASSWORD'
  to: string                  // email address
  data: object                // template variables, e.g. { guestName, link,
events }
  guestId?: ObjectId          // to update inviteStatus / lastReminderAt
after sending
}
```

```
  data: object                // template variables, e.g. { guestName, link,
events }
```

### **Runner steps** ( `POST /api/jobs/run` , every 5 minutes) 

1. Claim: `findOneAndUpdate({ status: 'QUEUED', runAfter: { $lte: now } } or {` <mark>`status: 'RUNNING', lockedUntil: { $lt: now } }, { status: 'RUNNING',`</mark> `lockedUntil: now + 2 min, $inc: { attempts: 1 } }, sort by runAfter)` . 

Page 19 of 21 

Make My Marriage — Database Design v1 

2. For email jobs, increment `counters` for today's IST date; if the new value exceeds the daily limit, undo the increment, set `runAfter` to 00:05 IST tomorrow, return the job to QUEUED and decrement `attempts` . 

3. Send through Resend; on success mark DONE with `finishedAt` , and update the guest ( `inviteStatus: SENT` , `sentAt` , or `lastReminderAt` ). 

4. On error, store `lastError` ; if `attempts` < 5 return to QUEUED with `runAfter` + 1, 5 or 30 minutes, else mark FAILED and notify Admins. 

5. Stop after about 40 seconds; the next call continues. 

**No duplicates:** `idempotencyKey` is unique, built as `<template>:<guestId or userId>: <trigger id>` (for example `GUEST_INVITE:66b…:batch-17` ). Pressing "send" twice, or a retried request, hits the unique index and creates nothing new. 

**Bulk sends:** an `INVITATIONS_BULK` job holds the filter (event, side, not yet sent) and expands it into individual `EMAIL_SEND` jobs in pages of 200, so one bulk request never does thousands of writes at once. 

## Sizing, seed data and migrations 

Even the worst case stays far below the Atlas free tier's roughly 512 MB, because photo bytes live in R2 and only metadata lives in MongoDB. 

|Collection|Documents (worst case)|Avg size|Data|
|---|---|---|---|
|guests|1,500|~1.5 KB|~2 MB|
|photos|150,000|~0.5 KB|~75 MB|
|activityLog|~60,000|~0.4 KB|~24 MB|
|tasks, expenses, vendors, events|~3,000|~0.5 KB|~2 MB|
|notifications|~20,000|~0.3 KB|~6 MB|
|jobs (30-day window)|~15,000|~0.5 KB|~8 MB|
|Indexes|||~40 MB|
|**Total**|||**~160 MB**|



Page 20 of 21 

Make My Marriage — Database Design v1 

The realistic case (about 15,000 photos) is around 40 MB. Sizes are estimates; the Admin storage card and Atlas metrics track the real figures. Free-tier limits should be re-checked before launch. 

### **Seed data** 

- `scripts/seed-dev.ts` creates a demo wedding: 2 Admins, 3 Managers, 1 

- photographer, 6 events (Haldi, Mehendi, Sangeet, Pelli, Cocktail, Reception), 40 tasks, 20 expenses, 10 vendors and 300 generated guests with mixed RSVPs. Used in Preview only. 

- `scripts/load-guests.ts` generates 1,500 households and 20,000 photo records for 

- load testing queries and indexes. 

- Production starts empty; the first signup creates the real wedding. 

### **Migrations** 

- Schema changes are additive where possible (new optional fields with defaults applied in code). 

- When data must change, a numbered script in `migrations/` (for example `003-addguest-upload-count.ts` ) runs once; applied migrations are recorded in a `migrations` collection with name and run time. 

- `scripts/ensure-indexes.ts` creates or updates every index; it runs in the release 

- workflow before traffic moves to the new version. 

- Before any migration in production, take a `mongodump` backup to R2. 

Page 21 of 21 


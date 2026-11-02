## Make My Marriage — PRD v1

Oct 21, 2026 · @Venu

Related documents: System Design v1 · Database Design v1 · API Design v1 [URL 🔗](https://claude.ai/artifact/9eJhFGGXVN6jWr5RQgM6Mo)

## Overview

Make My Marriage is a private web app where a couple and their families plan one wedding together: events, tasks, expenses, vendors, guests, invitations, photos and the livestream. v1 is built for the family wedding on Jan 28, 2028, and designed so it can open to other couples later.

Problem: Indian weddings run across many ceremonies and many relatives. Tasks get forgotten, spending is scattered across people, guest lists live in phone contacts, and photos end up spread over dozens of WhatsApp chats.

Not in scope as a product idea: this is not a vendor or venue marketplace like WedMeGood. All data belongs to the family.

| Item v1 decision Organisers Bride, groom, parents, siblings, cousins, close friends; each signs up with email and password Guests 1,000–1,500 households; no accounts, each household gets a unique link Weddings One wedding; every record carries weddingId so multiple weddings can be added later Language English |
| --- |
| Platform Responsive web app, installable on phones (PWA) Cost Free tiers only, no custom domain |

Success for v1: every ceremony's tasks tracked to completion, per-event headcounts ready for caterers, RSVPs collected from guests, and all wedding photos in one private gallery.


Product goals for v1: set up a wedding; invite family to manage it; plan multiple events; create and assign tasks; maintain a guest list; send digital invitations; collect RSVPs per event; track expenses; maintain vendors and discover nearby ones; publish a simple wedding website; share photos privately; let guests contribute photos via links and QR codes; embed a YouTube livestream.

Core rules: the wedding is the workspace that owns all data; one organiser account belongs to one wedding; a wedding has many members, including several Admins and Managers; all Admins and Managers see the same wedding data; guests never need accounts.

## Primary user journey

The first-time path from signup to the wedding day; the website is published before invitations because invitations link to it.

- 1. Sign up: the bride or groom creates an account (name, email, password).

- 2. Create the wedding: bride and groom names, title, date, city, cover image; the creator becomes Admin.

- 3. Invite members: the Admin invites the partner, parents, siblings and trusted friends by email.

- 4. Create events: Haldi, Mehendi, Sangeet, Pelli, Cocktail, Reception and others.

- 5. Add tasks: per event or general, assigned to members.

- 6. Manage vendors: use Find nearby, save chosen vendors.

- 7. Track expenses: record spending against events, tasks and vendors.

- 8. Add guests: manually or by Excel/CSV import; choose events per household.

- 9. Publish the wedding website: public page at /w/<wedding-name> .

- 10. Send invitations: unique links by email, WhatsApp share or both.

- 11. Receive RSVPs: guests answer per event without logging in.

- 12. Configure livestream: YouTube Live link per event.

- 13. Share QR codes: print one upload QR per event for the venue.

- 14. Wedding gallery: guests and the photographer upload; everyone views and downloads.

## Key flows

Each flow lists the happy path first, then the main exceptions.


## F1. Create a wedding (first organiser)

- 1. Visitor opens the app → Sign up with name, email (must be unique) and password.

- 2. Verification email → user clicks the link → logged in.

- 3. User has no wedding → app shows the Create wedding form.

- 4. User enters bride and groom names, title, date, city, website slug and optional cover image, description and tagline → Save.

- 5. Wedding created; user becomes Admin → lands on the dashboard with an empty-state checklist (invite members, add events, add tasks, add guests).

Exceptions: email already registered → "Log in instead"; slug taken → suggest alternatives.

## F2. Invite and join as a member

- 1. Admin opens Settings → Wedding members → Invite, enters name, email and role (Admin or Manager).

- 2. Invite email sent with a link valid for 7 days; invite shows as Pending.

- 3. Invitee opens the link → signup form with email pre-filled → sets name and password.

- 4. Account joins the wedding with the chosen role → lands on the dashboard.

Exceptions: link expired → ask the Admin to resend; email already belongs to another wedding → cannot join, message shown; email already registered without a wedding → log in and join.

## F3. Plan an event and its tasks

- 1. Admin creates an event with name, start and end date-time, venue, address and optional details.

- 2. Admin or Manager adds tasks to the event with assignee, due date and priority.

- 3. Assignee gets an in-app notification and one email.

- 4. Assignee moves the task To Do → In Progress → Completed; dashboard counts update.

- 5. A task past its due date and not Completed shows as Overdue on the dashboard and in My tasks.

## F4. Find a vendor and record payments

- 1. On an event, organiser taps Find nearby → picks a service type → Google Maps opens with "<service type> near <venue>".

- 2. Organiser saves the chosen vendor with phone, quote and booking status Quoted.

- 3. On booking, status becomes Booked; the advance is recorded as an expense linked to the vendor and event, status Paid, with receipt.


- 4. The balance is recorded as an expense with status Pending and a due date → shown under pending payments.

- 5. When paid, the organiser marks it Paid and attaches the receipt; vendor status becomes Fully paid.

## F5. Add guests and send invitations

- 1. Organiser adds a household (name, phone, side, allowed count, invited events), or an Admin imports an Excel/CSV file.

- 2. Import shows a preview with errors and duplicate phone numbers before saving.

- 3. A unique invitation link is created for each household; status Not sent.

- 4. Organiser sends the invitation: email, WhatsApp share button, or both. Admins can bulk-send by email.

- 5. Status becomes Sent; when the guest first opens the link it becomes Link opened.

Exceptions: no email on record → household appears in the Send via WhatsApp list; email provider's daily limit reached → remaining emails wait in the queue for the next day.

## F6. Guest RSVP

- 1. Guest opens their link → sees their name, the couple, and only the events they are invited to.

- 2. For each event they choose Attending or Not attending, and the number attending (up to the allowed count).

- 3. Submit → confirmation on screen; Admins get an in-app notification; headcounts update.

- 4. Guest can reopen the link and change answers until the RSVP cutoff date; after it, the form is read-only.

- 5. Organisers send reminders to households still Pending (at most one every 3 days per household).

## F7. Guest photo upload and viewing

- 1. At the venue, the guest scans the event's QR code → upload-only page for that event → selects photos → they upload after in-browser resizing.

- 2. Or the guest opens their personal link → Gallery → picks an event album → Upload.

- 3. Photos appear immediately in the event's guest album; Admins get an hourly summary of guest uploads and deletes.

- 4. Through their personal link, a guest views guest photos from all events, downloads single photos, and deletes only their own uploads.


Exceptions: file over 10 MB or not an image → rejected with a message; 100-upload limit reached → further uploads blocked for that link.

## F8. Professional photos

- 1. Admin creates the photographer's login in Settings → Wedding members and sets the shared viewing password for professional albums.

- 2. Photographer logs in → sees only the upload area → uploads edited photos into each event's professional album and adds a link to the full-resolution delivery.

- 3. Guests open Gallery → Professional → enter the shared password once per device → view and download.

- 4. Admin can change the viewing password at any time; devices must re-enter it.

## F9. Wedding website and livestream

- 1. Admin sets the website content and toggles (show event list publicly or not) → Publish.

- 2. The public link /w/<wedding-name> is shared freely, for example on WhatsApp status.

- 3. Admin adds each streamed event's YouTube Live URL.

- 4. Between the event's start and end time, the public site and every invitation page show a Live now banner with the embedded stream.

## F10. After the wedding

- 1. Admin exports all photos by album as a zip, the expense list and the guest list as Excel.

- 2. The website and gallery stay online while free hosting allows.

## Screens

| Area | Screens | Who |
| --- | --- | --- |
| Auth | Sign up, Log in, Verify email, Forgot password, | Organisers |
|   | Reset password, Accept invite |   |
| Setup | Create wedding, Wedding settings | Admin |
| Home | Dashboard, Notifications, Activity log | Organisers |
| Planning | Events list, Event detail (tasks, expenses, guests, | Organisers |
|   | photos for that event), Tasks list, Task detail |   |
| Money | Expenses list, Add/edit expense, Vendors list, | Organisers |
|   | Vendor detail, Wedding-day contacts |   |


| Area | Screens | Who |
| --- | --- | --- |
| Guests | Guests list with search and filters, Add/edit guest, | Organisers |
|   | Import guests, Send invitations, RSVP summary |   |
|   | and headcount export |   |
| Photos | Gallery (guest and professional albums per event), | Organisers |
|   | QR codes per event |   |
| Website | Website settings and publish | Admin |
| Settings | Wedding members, Photographer access, | Admin |
|   | Professional album password |   |
| Photographer Upload area |   | Photographer |
| Guest side | Public website, Invitation page with RSVP, Gallery, | Guests |
|   | Event upload page (from QR) |   |

## Roles and permissions

Three roles plus guests: Admins can do everything, Managers run day-to-day planning, and the Photographer only uploads professional photos. Permissions are enforced on the backend for every request.

| Area | Admin | Manager | Photographer Guest (via link) |   |
| --- | --- | --- | --- | --- |
| Wedding details, | Full | View | — | — |
| delete wedding |   |   |   |   |
| Members: invite, | Full | — | — | — |
| remove, promote, |   |   |   |   |
| demote |   |   |   |   |
| Events | Create, edit, delete Edit details — |   |   | View invited |
|   |   |   |   | events |
| Tasks | Full | Create, edit, | — | — |
|   |   | delete |   |   |
| Expenses | Full | Create, edit, | — | — |
|   |   | delete |   |   |


| Area | Admin | Manager | Photographer Guest (via link) |   |
| --- | --- | --- | --- | --- |
| Vendors | Full | Create, edit, | — | — |
|   |   | delete |   |   |
| Guests | Full, incl. delete | Add, edit, | — | — |
|   | and Excel/CSV | assign to |   |   |
|   | import | events |   |   |
| Invitations and | Single and bulk | Single guest | — | RSVP per |
| reminders | send | only |   | event |
| Guest photos | View, upload, | View, upload — |   | View all |
|   | delete any |   |   | events, upload, |
|   |   |   |   | delete own |
| Professional | Full, manage | View | Upload | View with |
| photos | photographer |   |   | shared |
|   | credentials |   |   | password |
| Livestream links | Set and edit | View | — | Watch |
| Activity log | View | View | — | — |
| Wedding website | Edit, publish, | View | — | View public |
|   | unpublish |   |   | and personal |
|   |   |   |   | pages |

## Rules

- At least one Admin must always exist; the last Admin cannot leave, be removed or be demoted.

- Any Admin can promote a Manager to Admin, or demote and remove another Admin.

- A removed member is logged out immediately; their tasks become unassigned, not deleted.

- Guest list and RSVPs are visible to all organisers, across both sides.

## Accounts, wedding setup and members

Organisers join either by creating the wedding (and becoming its Admin) or by accepting an Admin's email invite; there is no open signup into an existing wedding.

## Signup and login


- 1. Create a wedding: sign up with name, email, password → verify email → wedding setup form → user becomes Admin.

- 2. Accept an invite: Admin enters name and email → invite email with a link valid 7 days → signup with email pre-filled → user joins as Manager.

- 3. Login with email and password; logout; forgot password via emailed reset link (valid 1 hour).

- 4. Passwords hashed with BCrypt; account locked for 15 minutes after 5 failed logins.

- 5. Each organiser account belongs to exactly one wedding in v1 (stored as a separate membership record).

## Wedding setup (Admin only, editable later)

| Field | Required |
| --- | --- |
| Bride name, groom name | Yes |
| Wedding name | Yes |
| Wedding date | Yes |
| City | Yes |
| Cover image | No |
| Description | No |
| Invitation tagline (default: "invite you to celebrate | No |
| with us") |   |

## Member management (Admin only)

- Invite by email; resend or cancel pending invites.

- Promote Manager → Admin, demote Admin → Manager, remove member, within the at- least-one-Admin rule.

- Create and reset the photographer's credentials (see Photo gallery).

Each organiser email belongs to one wedding. Invited people sign up through the invite link, which skips the "create a wedding" prompt; an invite to an email already in another wedding cannot be accepted and the screen says so. Only Admins manage members; Managers cannot invite, remove or change roles.


## Dashboard

The dashboard is the first screen after login and works as the daily tracker; every card opens its full page.

| Card | Shows |
| --- | --- |
| Countdown | Days to the wedding, cover image, wedding name |
| My tasks | Tasks assigned to the logged-in organiser, overdue |
|   | first |
| Task progress | Counts of To Do, In Progress, Completed and |
|   | Overdue across the wedding |
| Upcoming events Next 3 events with date, time and venue |   |
| Totals | Number of events, number of vendors, total guests |
|   | (households and people), total spent, pending |
|   | payments with nearest due date |
| RSVP summary | Households invited, households replied, people |
|   | attending per event |
| Recent activity | Last 10 entries from the activity log |
| Quick links | Events, Tasks, Guests, Vendors, Expenses, Gallery |

## Events

Each ceremony (Haldi, Mehendi, Sangeet, Pelli, Reception and any custom event) is an event; Admins create and delete events, Managers edit their details.

| Field | Required Note |   |
| --- | --- | --- |
| Event name | Yes |   |
| Start date-time | Yes | Stored as full date-time |
| End date-time | Yes | May be the next day (late-night muhurthams) |
| Muhurtham time | No |   |
| Venue name and address Yes |   |   |


| Field | Required Note |   |
| --- | --- | --- |
| Map link | No | Auto-generated from address if left empty |
| Dress code | No |   |
| Instructions | No | Shown to guests on the invitation page |
| Cover image | No |   |
| Livestream link | No | YouTube Live URL, set by Admin |

- Events list in chronological order as a schedule.

- Deleting an event (Admin only) is blocked while any of its tasks is In Progress or any of its expenses is Pending; the screen lists those items. Otherwise it shows what will change and asks for confirmation: To Do and Completed tasks become general tasks, Paid expenses move under "No event", photos move to the "Unsorted" album, and the event is removed from guests' invitations.

## Tasks

Tasks are the core of the daily tracker; Admins and Managers can create, edit and delete them.

| Field | Required Values |
| --- | --- |
| Title | Yes |
| Description / notes No |   |
| Related event | No Blank = general wedding task |
| Assignee | No One organiser; blank = unassigned |
| Due date | No |
| Priority | Yes Low, Medium (default), High |
| Status | Yes To Do (default), In Progress, Completed |

- Overdue is calculated (due date passed, not Completed), never set by hand.

- Views: all tasks, my tasks, by event; filters by status, priority, assignee, overdue.

- Assigning a task notifies the assignee (see Notifications).


- Each task shows a "Find nearby" button when relevant (see Vendors).

## Expenses and vendors

Expenses track what was actually spent, with no budget system; all organisers see all expenses.

## Expense fields

| Field | Required Note |
| --- | --- |
| Amount (INR) Yes |   |
| Date | Yes |
| Event | Yes |
| Task | No Link when the expense belongs to a tracked task |
| Vendor | No |
| Category | Yes e.g. Catering, Decor, Venue, Clothing, Jewellery, |
|   | Travel, Pooja, Other |
| Description | No |
| Paid by | Yes Organiser name or free text |
| Status | Yes Paid or Pending |
| Due date | If Pending Drives the dashboard's pending payments |
| Receipt | No Image or PDF upload |

Totals shown: overall spent, spent per event, spent per category, pending amount.

## Vendors

| Field | Note |
| --- | --- |
| Name, service type, phone, notes Name and service type required |   |
| Booking status | Enquired, Quoted, Booked, Advance paid, Fully |
|   | paid, Cancelled |
| Quotation amount, agreed cost | INR |


| Field | Note |
| --- | --- |
| Documents | Quotations, contracts, booking confirmations, |
|   | receipts |
| Wedding-day contact | Flag to include in the wedding-day contacts list |

- Vendor payments are recorded as expenses linked to the vendor, so the vendor page shows paid vs agreed cost.

- Find nearby (free): a button on each event and vendor category opens Google Maps searching "<service type> near <event venue>". No Google API key or billing in v1. Chosen vendors are saved manually as vendor records.

- Wedding-day contacts: one page listing flagged vendors and organisers with tap-to- call numbers.

## Guests, invitations and RSVP

One guest record is one household with a primary invitee; each household gets a unique link that is its only way into the app.

## Guest record

| Field | Required Note |   |
| --- | --- | --- |
| Primary guest name Yes |   | e.g. "Ramesh Sharma family" |
| Phone | Yes | Used for WhatsApp share; duplicate check |
| Email | No | Needed for email invites |
| Side | Yes | Bride or Groom |
| Allowed count | Yes | Primary guest + 1, + 2 … |
| Invited events | Yes | Main wedding event selected by default |
| Notes | No |   |
| Invitation status | Auto | Not sent → Sent → Link opened |
| RSVP per event | Guest | Pending (default) / Attending / Not attending + |
|   |   | number attending (≤ allowed count) |


## Managing guests

- Add, edit, assign to events: Admins and Managers. Delete and Excel/CSV import (with duplicate detection by phone): Admins.

- Bulk select guests to invite to an event or remove them from it.

- Search by name or phone; filter by event, side, RSVP status, invitation status (incl. "sent, never opened").

Invitation page ( /i/<token> , token = 32+ random characters)

- Greeting with the household name, bride and groom names, tagline and cover image.

- Only the events this household is invited to, each with date, time, venue, map link, dress code and instructions.

- RSVP form per event; guests can change their answers until an RSVP cutoff date set by an Admin.

- Links to the gallery and, during events, the livestream.

- First open is recorded; Admins can regenerate a household's link if it has been forwarded.

## Sending invitations

| Channel | Who | How |
| --- | --- | --- |
| Email, single guest Admin, Manager Send invite or reminder from the guest's row |   |   |
| Email, bulk | Admin | Send to all selected / all not-yet-invited; reminder |
|   |   | to everyone who hasn't RSVP'd |
| WhatsApp share Admin, Manager Button per guest opens WhatsApp with their |   |   |
|   |   | phone number and a pre-filled message containing |
|   |   | their link |
| Events share | Admin, Manager WhatsApp share of an event's details |   |

- Emails go through a send queue that respects the email provider's daily limit and spreads large batches over days.

- A household gets at most one reminder every 3 days, however many organisers press "remind".

- Households without email appear in a "Send via WhatsApp" list instead of being skipped.


## Wedding website

One simple website per wedding, with a public view anyone can open and a personalised view through each guest's unique link; only Admins edit, publish and unpublish it.

| Content | Public view /w/<wedding- | Personal view |
| --- | --- | --- |
|   | name> | /i/<token> |
| Couple names, title, tagline, cover | Yes | Yes |
| image, description |   |   |
| Wedding date and city | Yes | Yes |
| Livestream (during live events) | Yes | Yes |
| Event list (names, dates) | Optional, Admin toggle | Invited events only |
| Venue addresses, timings, dress | No | Invited events only |
| code, map links |   |   |
| RSVP form | No | Yes |
| Gallery | No | Yes |

- <wedding-name> is a unique short slug chosen at setup (e.g. ravi-weds-sneha ), editable by Admins.

- Hosted on the app's free-tier address in v1; no custom domain.

- Venue details stay off the public view so the shared link doesn't advertise when homes will be empty.

- Unpublished websites show a simple "coming soon" page; personal links keep working.

## Photo gallery and livestream

The gallery is private, split into an album per event, with guest photos and professional photos kept separate and no approval step.

## Guest photos

- Guests upload and view through their personal link; they see guest photos from all events.

- Each event has its own QR code (printed at the venue) that opens an upload-only page for that event; viewing still needs a personal link.


- Guests can delete only photos they uploaded. Uploads and deletes by guests are reported to Admins (see Notifications).

- Organisers can view, upload and download; Admins can delete any photo.

- Every photo records who uploaded it (household or organiser) and when.

- Limits: images only, 10 MB per file, 100 uploads per guest link; resized in the browser to about 2,000 px before upload.

## Professional photos

- An Admin creates the photographer's credentials (username and password) in member management.

- The photographer logs in with them to upload to the professional album of each event.

- Guests and family view professional albums with a shared password the Admin distributes; the Admin can change it at any time.

- Full-resolution sets stay with the photographer's own delivery link, added to the gallery as a link.

Downloads: single photos for everyone with view access; whole-album zip for organisers only.

Storage: photos in private object storage (Cloudflare R2), served through short-lived signed URLs; MongoDB holds only metadata.

## Livestream

- Admin adds an unlisted YouTube Live URL to each streamed event.

- The stream is embedded on the invitation page and wedding home, with a "Live now" banner between the event's start and end time.

- The YouTube channel is set up and test-streamed at least 4 weeks before the wedding.

## Notifications, activity log and exports

## Notifications

| Trigger | Recipient Channel |   |
| --- | --- | --- |
| Task assigned to you | Assignee In-app + one email |   |
| Organiser invite | Invitee | Email |


| Trigger | Recipient Channel |   |
| --- | --- | --- |
| Guest uploads or deletes | Admins | In-app, grouped into an hourly summary (e.g. |
| photos |   | "Sharma family uploaded 14 photos to Sangeet, |
|   |   | deleted 2") |
| RSVP received or changed | Admins | In-app |
| Password reset | User | Email |

A bell icon shows unread in-app notifications; no daily digest in v1.

Activity log: every create, edit and delete on events, tasks, expenses, vendors, guests, photos and members is logged with who, what, when and a one-line summary. Visible to all organisers; filter by person, area and date.

## Exports

- Per-event headcount: one button per event downloads attending households, names and counts as Excel or PDF for caterers and venues.

- Guest list: Excel export with filters applied.

- After the wedding (Admin): zip of all photos by album, expense list as Excel, guest list as Excel.

## Non-functional requirements and tech stack

## Requirements

- Mobile first: every screen usable at 360 px width; installable as a PWA.

- Security: HTTPS only; role checks on every API call; guest tokens of 32+ random characters, regenerable; signed URLs for all photos and documents; rate limits on login, RSVP and upload endpoints.

- Scale: 1,500 households, about 20 organisers, up to 300 concurrent guests during the wedding day uploads.

- Availability: best effort on free tiers; paid hosting considered for wedding week only (Jan 2028).

- Privacy: guest data and photos never public; no ads or third-party tracking.

## Tech stack


| Layer | Choice |
| --- | --- |
| Frontend | Next.js (App Router) with React and TypeScript, |
|   | Tailwind, PWA; one app on the Vercel free plan |
| Backend | Next.js API route handlers in the same app |
|   | (modular monolith on Node.js), Mongoose, a |
|   | scheduled job runner for the email queue and |
|   | notification summaries |
| Database MongoDB Atlas free tier (metadata only) |   |
| File storage Cloudflare R2, browser uploads via pre-signed |   |
|   | URLs |
| Email | Free transactional email tier with a send queue |
| Maps | Google Maps search URLs (no API key) |
| Livestream YouTube Live embed |   |

Free-tier limits change; verify each provider's current terms before building.

## Data model

The full data model, with every collection, field, index and constraint, is in Database Design v1; the endpoints are in API Design v1. [URL 🔗](https://claude.ai/artifact/D5u9ehpnXukME8x8QzF2LF)

## Release plan, out of scope and open risks

## Release plan

- 1. Phase 1, Nov 2026 – Apr 2027 (planning core): accounts, members, wedding setup, events, tasks, expenses, vendors, dashboard, notifications, activity log. Family starts using it in May 2027.

- 2. Phase 2, May – Sep 2027 (guests): wedding website, guest records, Excel/CSV import, event-wise invitations, invitation page, per-event RSVP, email queue and reminders, WhatsApp share, headcount export.

- 3. Phase 3, Oct – Dec 2027 (photos and wedding week): gallery, event QR codes, photographer area, livestream embed, after-wedding export, upload load test with a few hundred photos.


- 4. Jan 2028: feature freeze from Jan 1; bug fixes only until the wedding on Jan 28.

Out of scope for v1: budget planning, gift register, per-ceremony checklists, daily reminder digest, automated WhatsApp messages, in-app Google Places results, accommodation and travel, photo approval, multiple weddings per account, languages other than English, native mobile apps.

## Open risks

- Photographer credentials: decided: the photographer's upload login stays private; guests use a separate view-only password, so no guest can upload or delete professional photos.

- Email deliverability: without a custom domain, invites may land in spam; test with family Gmail accounts during Phase 2.

- Free backend hosting: free Java hosts often sleep when idle; decide on paid hosting for the wedding week.

- Storage: check R2 free-tier capacity against expected guest and professional uploads before Phase 3.

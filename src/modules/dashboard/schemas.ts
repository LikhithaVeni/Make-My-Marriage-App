import { z } from "zod";

// Response of GET /api/v1/dashboard: the shape in docs/API Design v1.md
// ("Dashboard"), extended as listed in docs/decisions.md (decision 40).

const id = z.string().min(1);
// Calendar date, e.g. "2028-01-28".
const date = z.iso.date();
// Instant with its offset, e.g. "2028-01-26T10:00:00+05:30".
const dateTime = z.iso.datetime({ offset: true });
const count = z.number().int().nonnegative();
// Money is integer paise (docs/Database Design v1.md).
const paise = z.number().int().nonnegative();

export const taskPrioritySchema = z.enum(["LOW", "MEDIUM", "HIGH"]);

export const dashboardSchema = z.object({
  // The date in Asia/Kolkata that daysLeft, overdue flags and due labels are
  // all measured from, so the cards never disagree about "today".
  today: date,
  countdown: z.object({
    date,
    daysLeft: z.number().int(),
    title: z.string().min(1),
    city: z.string().min(1),
    coverUrl: z.url().nullable(),
  }),
  // Up to 10 tasks assigned to the viewer, overdue first.
  myTasks: z
    .array(
      z.object({
        id,
        title: z.string().min(1),
        dueDate: date.nullable(),
        overdue: z.boolean(),
        priority: taskPrioritySchema,
        eventName: z.string().nullable(),
      }),
    )
    .max(10),
  // Overdue tasks are also counted in todo or inProgress.
  tasks: z.object({
    todo: count,
    inProgress: count,
    completed: count,
    overdue: count,
  }),
  upcomingEvents: z
    .array(
      z.object({
        id,
        name: z.string().min(1),
        startAt: dateTime,
        endAt: dateTime,
        venueName: z.string().min(1),
        dressCode: z.string().nullable(),
      }),
    )
    .max(3),
  totals: z.object({
    events: count,
    vendors: count,
    households: count,
    people: count,
  }),
  rsvp: z.object({
    replied: count,
    pending: count,
    byEvent: z.array(
      z.object({
        eventId: id,
        name: z.string().min(1),
        attendingPeople: count,
      }),
    ),
  }),
  money: z.object({
    spentPaise: paise,
    pendingPaise: paise,
    nextDue: z
      .object({ description: z.string().min(1), dueDate: date })
      .nullable(),
    // Nearest due first.
    pendingPayments: z
      .array(
        z.object({
          id,
          description: z.string().min(1),
          vendorName: z.string().nullable(),
          amountPaise: paise,
          dueDate: date,
        }),
      )
      .max(3),
  }),
  weddingDayContacts: z
    .array(
      z.object({
        id,
        name: z.string().min(1),
        role: z.string().min(1),
        // E.164, e.g. "+919876543210".
        phone: z.string().regex(/^\+[1-9]\d{6,14}$/),
      }),
    )
    .max(4),
  recentActivity: z
    .array(
      z.object({
        id,
        summary: z.string().min(1),
        actorName: z.string().min(1),
        at: dateTime,
      }),
    )
    .max(10),
  // Admins only.
  storage: z.object({ usedBytes: count }).optional(),
});

export type Dashboard = z.infer<typeof dashboardSchema>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;

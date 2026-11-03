import type { Dashboard } from "./schemas";

// Sample dashboard for building the UI before the modules behind it exist
// (docs/decisions.md, decision 42). It is a realistic mid-planning snapshot as
// of 3 November 2026 and is internally consistent: counts, sums and dates agree.
// Delete this file when getDashboard() reads real data; it ships in the bundle.
// Phone numbers use the unassigned +91 00000 range so the call buttons ring nobody.

export const SAMPLE_AS_OF = "2026-11-03";

export const sampleDashboard: Dashboard = {
  today: SAMPLE_AS_OF,
  countdown: {
    date: "2028-01-28",
    daysLeft: 451,
    title: "L & K's Wedding",
    city: "Hyderabad",
    coverUrl: null,
  },
  myTasks: [
    {
      id: "task_01",
      title: "Book mehendi artist for cousins",
      dueDate: "2026-10-28",
      overdue: true,
      priority: "HIGH",
      eventName: "Mehendi",
    },
    {
      id: "task_02",
      title: "Shortlist caterers for the Pelli lunch",
      dueDate: "2026-11-01",
      overdue: true,
      priority: "HIGH",
      eventName: "Pelli",
    },
    {
      id: "task_03",
      title: "Collect family guest lists from both sides",
      dueDate: "2026-11-10",
      overdue: false,
      priority: "MEDIUM",
      eventName: null,
    },
    {
      id: "task_04",
      title: "Visit ITC Kohenur for the Sangeet venue",
      dueDate: "2026-11-15",
      overdue: false,
      priority: "MEDIUM",
      eventName: "Sangeet",
    },
    {
      id: "task_05",
      title: "Finalise the invitation card design",
      dueDate: "2026-12-05",
      overdue: false,
      priority: "LOW",
      eventName: null,
    },
  ],
  tasks: { todo: 42, inProgress: 9, completed: 31, overdue: 4 },
  upcomingEvents: [
    {
      id: "event_haldi",
      name: "Haldi",
      startAt: "2028-01-26T09:00:00+05:30",
      endAt: "2028-01-26T12:00:00+05:30",
      venueName: "The Royal Pavilion",
      dressCode: "Traditional yellow",
    },
    {
      id: "event_mehendi",
      name: "Mehendi",
      startAt: "2028-01-26T16:00:00+05:30",
      endAt: "2028-01-26T20:00:00+05:30",
      venueName: "The Royal Pavilion",
      dressCode: "Green and festive",
    },
    {
      id: "event_sangeet",
      name: "Sangeet",
      startAt: "2028-01-27T19:30:00+05:30",
      endAt: "2028-01-27T23:30:00+05:30",
      venueName: "ITC Kohenur",
      dressCode: "Indo-western",
    },
  ],
  totals: { events: 5, vendors: 14, households: 1180, people: 3420 },
  rsvp: {
    replied: 640,
    pending: 540,
    byEvent: [
      { eventId: "event_haldi", name: "Haldi", attendingPeople: 420 },
      { eventId: "event_mehendi", name: "Mehendi", attendingPeople: 510 },
      { eventId: "event_sangeet", name: "Sangeet", attendingPeople: 860 },
      { eventId: "event_pelli", name: "Pelli", attendingPeople: 1540 },
      { eventId: "event_reception", name: "Reception", attendingPeople: 1820 },
    ],
  },
  money: {
    // ₹18,50,000 paid; ₹6,90,000 pending across the three payments below.
    spentPaise: 185_000_000,
    pendingPaise: 69_000_000,
    nextDue: { description: "Decor advance balance", dueDate: "2026-11-20" },
    pendingPayments: [
      {
        id: "expense_01",
        description: "Decor advance balance",
        vendorName: "Bloom Decor",
        amountPaise: 45_000_000,
        dueDate: "2026-11-20",
      },
      {
        id: "expense_02",
        description: "Catering advance",
        vendorName: "Royal Caterers",
        amountPaise: 20_000_000,
        dueDate: "2026-11-25",
      },
      {
        id: "expense_03",
        description: "Sound equipment booking",
        vendorName: "DJ Beats",
        amountPaise: 4_000_000,
        dueDate: "2026-12-01",
      },
    ],
  },
  weddingDayContacts: [
    { id: "contact_01", name: "Venu", role: "Admin", phone: "+910000000001" },
    {
      id: "contact_02",
      name: "Rajesh Verma",
      role: "Caterer lead",
      phone: "+910000000002",
    },
    {
      id: "contact_03",
      name: "Ananya Rao",
      role: "Decor and florals",
      phone: "+910000000003",
    },
    {
      id: "contact_04",
      name: "Studio Memory",
      role: "Photographer",
      phone: "+910000000004",
    },
  ],
  recentActivity: [
    {
      id: "activity_01",
      summary: "Priya completed 'Book the pandit'",
      actorName: "Priya",
      at: "2026-11-03T10:15:00+05:30",
    },
    {
      id: "activity_02",
      summary: "Venu added an expense of ₹45,000 for Decor",
      actorName: "Venu",
      at: "2026-11-02T18:40:00+05:30",
    },
    {
      id: "activity_03",
      summary:
        "Karthik assigned 'Visit ITC Kohenur for the Sangeet venue' to Venu",
      actorName: "Karthik",
      at: "2026-11-02T12:05:00+05:30",
    },
    {
      id: "activity_04",
      summary: "Lipika added the vendor Bloom Decor",
      actorName: "Lipika",
      at: "2026-11-01T20:30:00+05:30",
    },
    {
      id: "activity_05",
      summary: "Venu updated the Sangeet venue",
      actorName: "Venu",
      at: "2026-10-31T09:10:00+05:30",
    },
  ],
  storage: { usedBytes: 1_250_000_000 },
};

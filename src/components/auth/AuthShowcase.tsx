import { MandapScene } from "@/components/art/MandapScene";

// The left half of log in and sign up (from 1024px): the illustration, then a
// few lines on what's waiting. Everything named here is in the PRD.

const waiting = [
  "Today's tasks, and who's on each one",
  "Payments due this week, before anyone has to ask",
  "The countdown to the big day, for the whole family",
];

const steps = [
  { title: "Create your account", detail: "Your name, email and a password." },
  {
    title: "Set up your wedding",
    detail: "The couple's names, the date and the city.",
  },
  {
    title: "Invite the family",
    detail: "Each person gets their own login as Admin or Manager.",
  },
];

const highlights = [
  "Haldi to Reception",
  "Tasks and reminders",
  "Guests and RSVPs",
  "Vendors and payments",
  "Photos by QR code",
];

function Tick() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 size-5 shrink-0 text-accent"
    >
      <path d="m5 12 5 5 9-10" />
    </svg>
  );
}

export function AuthShowcase({ variant }: { variant: "login" | "signup" }) {
  return (
    <div className="hidden min-w-0 overflow-hidden rounded-card border border-border bg-surface lg:block">
      <div className="p-8">
        <MandapScene className="mx-auto max-w-sm" />

        {variant === "login" ? (
          <>
            <p className="mt-6 text-caption font-medium tracking-wider text-accent uppercase">
              Good to see you again
            </p>
            <p className="mt-2 font-display text-title text-text">
              Your wedding, right where you left it.
            </p>
            <ul className="mt-5 flex flex-col gap-3">
              {waiting.map((line) => (
                <li key={line} className="flex gap-3 text-text">
                  <Tick />
                  {line}
                </li>
              ))}
            </ul>
          </>
        ) : (
          <>
            <p className="mt-6 text-caption font-medium tracking-wider text-accent uppercase">
              Plan together, celebrate together
            </p>
            <p className="mt-2 font-display text-title text-text">
              Ready in three steps.
            </p>
            <ol className="mt-5 flex flex-col gap-4">
              {steps.map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span className="inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-small font-medium text-surface">
                    {i + 1}
                  </span>
                  <span>
                    <span className="block font-medium text-text">
                      {step.title}
                    </span>
                    <span className="block text-small text-text-muted">
                      {step.detail}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
            <ul className="mt-6 flex flex-wrap gap-2">
              {highlights.map((item) => (
                <li
                  key={item}
                  className="rounded-full border border-border bg-bg px-3 py-1 text-small text-text"
                >
                  {item}
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

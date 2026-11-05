import { LandingHeader } from "@/components/landing/LandingHeader";

const promises = [
  "Every ceremony, task and vendor in one place",
  "The couple and both families plan together",
  "Guest lists, payments and photos stay private",
];

/**
 * Sign up and log in look like the landing page: the same header, the
 * product's intro on the left and the form card on the right. On phones the
 * intro is hidden so the form sits right under the header.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <LandingHeader />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-8 md:px-8 md:py-16 lg:grid-cols-2 lg:py-20">
        <div className="hidden min-w-0 lg:block">
          <p className="text-caption font-medium tracking-wider text-accent uppercase">
            Private wedding workspace
          </p>
          <p className="mt-4 font-display text-display text-text">
            From Haldi to Reception, nothing slips through.
          </p>
          <p className="mt-4 max-w-lg text-text-muted">
            Make My Marriage is one private place where the couple and their
            families plan the wedding together.
          </p>
          <ul className="mt-8 flex flex-col gap-3">
            {promises.map((promise) => (
              <li key={promise} className="flex items-center gap-3 text-text">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-5 shrink-0 text-accent"
                >
                  <path d="m5 12 5 5 9-10" />
                </svg>
                {promise}
              </li>
            ))}
          </ul>
        </div>
        <main className="mx-auto w-full max-w-md lg:mr-0">{children}</main>
      </div>
    </>
  );
}

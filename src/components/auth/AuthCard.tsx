import { cardSurface } from "@/components/ui/Card";

interface AuthCardProps {
  title: string;
  intro?: string;
  children: React.ReactNode;
}

/**
 * A single centred card across both auth columns, for the short pages:
 * confirm your email, forgot password and choose a new password.
 */
export function AuthCard({ title, intro, children }: AuthCardProps) {
  return (
    <main className="mx-auto w-full max-w-md lg:col-span-2">
      <section
        aria-labelledby="auth-card-title"
        className={`p-6 md:p-8 ${cardSurface}`}
      >
        <h1 id="auth-card-title" className="font-display text-title text-text">
          {title}
        </h1>
        {intro && <p className="mt-1 text-text-muted">{intro}</p>}
        <div className="mt-6">{children}</div>
      </section>
    </main>
  );
}

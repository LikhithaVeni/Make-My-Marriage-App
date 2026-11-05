import { LandingHeader } from "@/components/landing/LandingHeader";

/**
 * Sign up and log in look like the landing page: the same header, then two
 * columns from 1024px. Each page fills them itself: its AuthShowcase (the
 * illustration and what's waiting) on the left, its form on the right.
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <LandingHeader />
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-8 md:px-8 md:py-12 lg:grid-cols-2">
        {children}
      </div>
    </>
  );
}

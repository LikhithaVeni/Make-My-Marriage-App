import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16 text-center">
      <h1 className="font-display text-title">Page not found</h1>
      <p className="mt-3 text-text-muted">
        This page doesn&apos;t exist or has moved.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-control font-medium text-accent hover:text-accent-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        Back to home
      </Link>
    </main>
  );
}

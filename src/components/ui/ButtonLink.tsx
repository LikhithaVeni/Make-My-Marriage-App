import Link from "next/link";

const variants = {
  primary: "bg-accent text-surface hover:bg-accent-hover",
  secondary: "border border-accent bg-surface text-accent hover:bg-accent-tint",
} as const;

interface ButtonLinkProps {
  href: string;
  variant?: keyof typeof variants;
  className?: string;
  children: React.ReactNode;
}

/**
 * A link styled as a button (docs/design-system.md, "Primary button" and
 * "Secondary button"): 44px tall, `rounded-control`. Use one primary per view.
 */
export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={`inline-flex min-h-11 items-center justify-center rounded-control px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${variants[variant]} ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}

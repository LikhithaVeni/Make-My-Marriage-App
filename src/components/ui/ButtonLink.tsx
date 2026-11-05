import Link from "next/link";

const variants = {
  primary: "bg-accent text-surface hover:bg-accent-hover",
  secondary: "border border-accent bg-surface text-accent hover:bg-accent-tint",
} as const;

export type ButtonVariant = keyof typeof variants;

/**
 * Classes for the design system's primary and secondary buttons
 * (docs/design-system.md): 44px tall, `rounded-control`. Use one primary per
 * view. Shared by ButtonLink and plain `<button>`s.
 */
export function buttonClass(variant: ButtonVariant = "primary"): string {
  return `inline-flex min-h-11 items-center justify-center rounded-control px-6 font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-70 ${variants[variant]}`;
}

interface ButtonLinkProps {
  href: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
}

/** A link styled as a button. */
export function ButtonLink({
  href,
  variant = "primary",
  className,
  children,
}: ButtonLinkProps) {
  return (
    <Link href={href} className={`${buttonClass(variant)} ${className ?? ""}`}>
      {children}
    </Link>
  );
}

import { AppError } from "@/platform/errors";

// Permission checks from docs/System Design v1.md ("Permission checks") and the
// caller rules in docs/API Design v1.md ("Callers and authentication rules").

export type Role = "ADMIN" | "MANAGER" | "PHOTOGRAPHER";

/** The signed-in user as loaded from their session, before any wedding rule is applied. */
export interface SessionContext {
  userId: string;
  emailVerified: boolean;
  /** null until the user creates or joins a wedding. */
  weddingId: string | null;
  role: Role | null;
}

/** A member acting inside their wedding: every service query filters by `weddingId`. */
export interface WeddingContext {
  userId: string;
  weddingId: string;
  role: Role;
}

/** A module's `policy.ts`: each action and the roles allowed to do it. */
export type Policy = Readonly<Record<string, readonly Role[]>>;

/**
 * Checks a wedding route's caller, in the order of API Design's rules:
 * no session → 401 UNAUTHENTICATED, unverified email → 403 EMAIL_NOT_VERIFIED,
 * no wedding yet → 403 NO_WEDDING, role not allowed → 403 FORBIDDEN.
 * Returns the context that services receive.
 */
export function authorize<P extends Policy>(
  session: SessionContext | null,
  policy: P,
  action: keyof P & string,
): WeddingContext {
  if (!session) {
    throw new AppError("UNAUTHENTICATED", 401, "Please log in to continue.");
  }
  if (!session.emailVerified) {
    throw new AppError(
      "EMAIL_NOT_VERIFIED",
      403,
      "Please verify your email address first.",
    );
  }
  if (!session.weddingId || !session.role) {
    throw new AppError("NO_WEDDING", 403, "Create or join a wedding first.");
  }
  // An action missing from the policy allows nobody.
  const allowed: readonly Role[] = policy[action] ?? [];
  if (!allowed.includes(session.role)) {
    throw new AppError(
      "FORBIDDEN",
      403,
      "Your role in this wedding can't do this.",
    );
  }
  return {
    userId: session.userId,
    weddingId: session.weddingId,
    role: session.role,
  };
}

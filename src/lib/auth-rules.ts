// Account field rules from docs/API Design v1.md ("Signup"), shared by the
// sign-up and log-in forms (instant feedback) and the auth API (the authority).
// Each check returns the message to show, or null when the value is fine.

export const NAME_MAX = 80;
export const PASSWORD_MIN = 10;
export const PASSWORD_MAX = 128;

// Deliberately loose: something@something.something. The verification email
// is the real test of an address.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function nameError(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) return "Enter your name";
  if (trimmed.length > NAME_MAX) return `Use at most ${NAME_MAX} characters`;
  return null;
}

export function emailError(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "Enter your email address";
  if (!EMAIL_PATTERN.test(trimmed)) return "Enter a valid email address";
  return null;
}

/** For logging in: any non-empty password may be tried. */
export function passwordEnteredError(password: string): string | null {
  return password ? null : "Enter your password";
}

/** For choosing a password: 10–128 characters and not the email address. */
export function newPasswordError(
  password: string,
  email: string,
): string | null {
  if (!password) return "Choose a password";
  if (password.length < PASSWORD_MIN)
    return `Use at least ${PASSWORD_MIN} characters`;
  if (password.length > PASSWORD_MAX)
    return `Use at most ${PASSWORD_MAX} characters`;
  if (password.trim().toLowerCase() === email.trim().toLowerCase())
    return "Don't use your email address as your password";
  return null;
}

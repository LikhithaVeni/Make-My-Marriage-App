// Phone numbers as typed in India, stored in E.164 ("+919876543210"), as
// Database Design stores phones and the dashboard's contacts expect.

/**
 * "98765 43210", "098765-43210", "+91 98765 43210" and "919876543210" all
 * become "+919876543210". A number with another country code ("+44 20 …")
 * is kept with its code. Anything else is null.
 */
export function parsePhone(typed: string): string | null {
  const trimmed = typed.trim();
  const digits = trimmed.replace(/[\s\-().]/g, "");
  if (!/^\+?\d+$/.test(digits)) return null;
  if (digits.startsWith("+")) {
    const rest = digits.slice(1);
    // Indian numbers have 10 digits after +91 (mobiles and landlines alike).
    if (rest.startsWith("91"))
      return /^91\d{10}$/.test(rest) ? `+${rest}` : null;
    return /^[1-9]\d{6,14}$/.test(rest) ? `+${rest}` : null;
  }
  // Indian mobiles start 6–9; a leading 0 or 91 is the trunk or country code.
  const local = digits.replace(/^(?:0|91)(?=[6-9]\d{9}$)/, "");
  return /^[6-9]\d{9}$/.test(local) ? `+91${local}` : null;
}

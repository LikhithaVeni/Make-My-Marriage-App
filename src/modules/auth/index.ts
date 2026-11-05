// Public entry point of the auth module: exports its service and types.
export {
  attachWeddingToSessions,
  getCurrentSession,
  login,
  logout,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  signup,
  SESSION_TTL_MS,
  verifyEmail,
  type AuthResult,
  type ClientInfo,
  type CurrentSession,
  type Membership,
  type MembershipLookup,
  type StartedSession,
  type WeddingSummary,
} from "./service";
export {
  forgotSchema,
  loginSchema,
  resetSchema,
  signupSchema,
  verifySchema,
} from "./schemas";
export type { LoginInput, SignupInput } from "./schemas";
export { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from "./cookie";

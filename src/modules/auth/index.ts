// Public entry point of the auth module: exports its service and types.
export {
  attachWeddingToSessions,
  endSessionsOf,
  findUserByEmail,
  findUsersByIds,
  getCurrentSession,
  login,
  logInUser,
  logout,
  markEmailVerified,
  requestPasswordReset,
  resendVerificationEmail,
  resetPassword,
  signup,
  updateAccount,
  SESSION_TTL_MS,
  verifyEmail,
  type AuthResult,
  type ClientInfo,
  type CurrentSession,
  type Membership,
  type MembershipLookup,
  type StartedSession,
  type UserProfile,
  type WeddingSummary,
} from "./service";
export {
  forgotSchema,
  loginSchema,
  resetSchema,
  signupSchema,
  updateAccountSchema,
  verifySchema,
} from "./schemas";
export type { LoginInput, SignupInput } from "./schemas";
export { clearSessionCookie, SESSION_COOKIE, setSessionCookie } from "./cookie";

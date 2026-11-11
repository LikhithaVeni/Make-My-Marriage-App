// Auth business logic: signup, login, logout and the current-user context
// (docs/API Design v1.md "Auth endpoints", System Design "Organiser
// sessions"). Callers outside this module reach it only through index.ts.
import "server-only";

import { createHash, randomBytes } from "node:crypto";

import bcrypt from "bcryptjs";
import type { Types } from "mongoose";

import { connectDb } from "@/platform/db";
import { sendEmail } from "@/platform/email";
import { AppError } from "@/platform/errors";
import { getPublicEnv } from "@/platform/public-env";
import { newPasswordError } from "@/lib/auth-rules";
import type { Role, SessionContext } from "@/platform/rbac";

import { authModels, type UserDoc } from "./model";
import type { LoginInput, SignupInput } from "./schemas";

const DAY_MS = 24 * 60 * 60_000;
export const SESSION_TTL_MS = 30 * DAY_MS;
const BCRYPT_COST = 12;
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60_000;
const VERIFY_TOKEN_TTL_MS = DAY_MS;
const RESET_TOKEN_TTL_MS = 60 * 60_000;
const DUPLICATE_KEY = 11000;

/** What signup, login and GET /auth/me return. */
export interface AuthResult {
  user: { id: string; name: string; email: string; emailVerified: boolean };
  wedding: WeddingSummary | null;
  role: Role | null;
}

export interface WeddingSummary {
  id: string;
  title: string;
  date: string;
  slug: string;
  /** The couple's initials, bride first, e.g. "LK". */
  monogram: string;
}

/** A user's place in a wedding, as the wedding module reports it. */
export interface Membership {
  role: Role;
  wedding: WeddingSummary;
}

/**
 * Looks up a user's membership. The wedding module supplies it: auth can't
 * import that module, because the wedding module already depends on auth.
 */
export type MembershipLookup = (userId: string) => Promise<Membership | null>;

const noMembership: MembershipLookup = async () => null;

/** Recorded on the session to help a user recognise their devices. */
export interface ClientInfo {
  ip: string;
  userAgent: string | null;
}

/** A new session: the cookie value is returned once and only its hash is stored. */
export interface StartedSession {
  result: AuthResult;
  token: string;
  expiresAt: Date;
}

export interface CurrentSession {
  context: SessionContext;
  result: AuthResult;
  /** Set when the 30-day expiry slid forward, so the cookie is renewed too. */
  extendedTo: Date | null;
}

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const randomToken = () => randomBytes(32).toString("base64url");

async function models() {
  return authModels(await connectDb());
}

function toResult(user: UserDoc, membership: Membership | null): AuthResult {
  return {
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
    },
    wedding: membership?.wedding ?? null,
    role: membership?.role ?? null,
  };
}

async function startSession(
  user: UserDoc,
  client: ClientInfo,
  now: Date,
  membership: Membership | null = null,
): Promise<StartedSession> {
  const { Session } = await models();
  const token = randomToken();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_MS);
  await Session.create({
    idHash: sha256(token),
    userId: user._id,
    // Copied so a request needs one lookup (Database Design).
    weddingId: membership?.wedding.id,
    role: membership?.role,
    expiresAt,
    userAgent: client.userAgent?.slice(0, 300),
    ip: client.ip,
  });
  return { result: toResult(user, membership), token, expiresAt };
}

/**
 * Points every session of a user at their wedding, e.g. right after they
 * create it, so the change shows on their next request on every device.
 */
export async function attachWeddingToSessions(
  userId: string,
  weddingId: string,
  role: Role,
): Promise<void> {
  const { Session } = await models();
  await Session.updateMany({ userId }, { $set: { weddingId, role } });
}

async function sendVerificationEmail(user: UserDoc, now: Date) {
  const { AuthToken } = await models();
  const token = randomToken();
  await AuthToken.create({
    userId: user._id,
    type: "VERIFY_EMAIL",
    tokenHash: sha256(token),
    expiresAt: new Date(now.getTime() + VERIFY_TOKEN_TTL_MS),
  });
  const link = `${getPublicEnv().appUrl}/verify?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Confirm your email for Make My Marriage",
    text: `Hi ${user.name},\n\nConfirm your email address to start planning:\n${link}\n\nThe link works for 24 hours.`,
  });
}

/**
 * Confirms the email behind a verification link. Each link works once and
 * for 24 hours: 404 NOT_FOUND for an unknown link, 410 TOKEN_USED or
 * TOKEN_EXPIRED otherwise.
 */
export async function verifyEmail(token: string, now = new Date()) {
  const { User } = await models();
  const record = await findUsableToken("VERIFY_EMAIL", token, now);
  await claimToken(record._id, now);
  await User.updateOne(
    { _id: record.userId, emailVerifiedAt: null },
    { $set: { emailVerifiedAt: now } },
  );
}

/** An emailed link's token record, if it can still be used. */
async function findUsableToken(
  type: "VERIFY_EMAIL" | "RESET_PASSWORD",
  token: string,
  now: Date,
) {
  const { AuthToken } = await models();
  const record = await AuthToken.findOne({ tokenHash: sha256(token), type });
  if (!record) {
    throw new AppError("NOT_FOUND", 404, "This link isn't valid.");
  }
  if (record.usedAt) {
    throw new AppError("TOKEN_USED", 410, "This link has already been used.");
  }
  if (record.expiresAt <= now) {
    throw new AppError("TOKEN_EXPIRED", 410, "This link has expired.");
  }
  return record;
}

/** Marks a link used, atomically, so two clicks at once can't both succeed. */
async function claimToken(id: Types.ObjectId, now: Date) {
  const { AuthToken } = await models();
  const claimed = await AuthToken.updateOne(
    { _id: id, usedAt: null },
    { $set: { usedAt: now } },
  );
  if (claimed.modifiedCount === 0) {
    throw new AppError("TOKEN_USED", 410, "This link has already been used.");
  }
}

/**
 * Emails a password reset link that works once, for an hour; any earlier
 * unused link stops working. Says nothing about whether the account exists:
 * the caller answers 202 either way.
 */
export async function requestPasswordReset(email: string, now = new Date()) {
  const { AuthToken, User } = await models();
  const user = await User.findOne({ email });
  if (!user) return;

  await AuthToken.updateMany(
    { userId: user._id, type: "RESET_PASSWORD", usedAt: null },
    { $set: { usedAt: now } },
  );
  const token = randomToken();
  await AuthToken.create({
    userId: user._id,
    type: "RESET_PASSWORD",
    tokenHash: sha256(token),
    expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
  });
  const link = `${getPublicEnv().appUrl}/reset?token=${token}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Make My Marriage password",
    text: `Hi ${user.name},

Choose a new password here:
${link}

The link works for 1 hour. If you didn't ask for this, you can ignore this email; your password stays the same.`,
  });
}

/**
 * Sets a new password from a reset link, ends every session of the user
 * (System Design) and starts a fresh one here. The link also proves the
 * email address, so it confirms an unverified one.
 */
export async function resetPassword(
  token: string,
  password: string,
  client: ClientInfo,
  now = new Date(),
  membershipOf: MembershipLookup = noMembership,
): Promise<StartedSession> {
  const { Session, User } = await models();
  const record = await findUsableToken("RESET_PASSWORD", token, now);
  const user = await User.findById(record.userId);
  if (!user) {
    throw new AppError("NOT_FOUND", 404, "This link isn't valid.");
  }
  const problem = newPasswordError(password, user.email);
  if (problem) {
    throw new AppError("VALIDATION_FAILED", 400, "Some fields are invalid.", {
      fields: { password: problem },
    });
  }

  await claimToken(record._id, now);
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: await bcrypt.hash(password, BCRYPT_COST),
        failedLogins: 0,
        emailVerifiedAt: user.emailVerifiedAt ?? now,
      },
      $unset: { lockedUntil: 1 },
    },
  );
  await Session.deleteMany({ userId: user._id });

  const updated = (await User.findById(user._id))!;
  const membership = await membershipOf(user._id.toString());
  return startSession(updated, client, now, membership);
}

/** Sends a fresh verification link; does nothing once the email is confirmed. */
export async function resendVerificationEmail(
  userId: string,
  now = new Date(),
) {
  const { User } = await models();
  const user = await User.findById(userId);
  if (!user || user.emailVerifiedAt) return;
  await sendVerificationEmail(user, now);
}

const emailTaken = () =>
  new AppError(
    "EMAIL_TAKEN",
    409,
    "An account with this email already exists.",
  );

/** Creates the account, sends the verification email and logs the user in. */
export async function signup(
  input: SignupInput,
  client: ClientInfo,
  now = new Date(),
): Promise<StartedSession> {
  const { User } = await models();
  if (await User.exists({ email: input.email })) throw emailTaken();

  let user: UserDoc;
  try {
    user = await User.create({
      name: input.name,
      email: input.email,
      passwordHash: await bcrypt.hash(input.password, BCRYPT_COST),
    });
  } catch (err) {
    // Two signups racing for the same email: the unique index decides.
    if ((err as { code?: unknown }).code === DUPLICATE_KEY) throw emailTaken();
    throw err;
  }

  await sendVerificationEmail(user, now);
  return startSession(user, client, now);
}

const invalidCredentials = () =>
  new AppError("INVALID_CREDENTIALS", 401, "Incorrect email or password.");

function accountLocked(until: Date, now: Date) {
  return new AppError(
    "ACCOUNT_LOCKED",
    423,
    "Too many incorrect attempts. Try again later.",
    {
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((until.getTime() - now.getTime()) / 1000),
      ),
    },
  );
}

// Compared against when the email is unknown, so a missing account takes as
// long to reject as a wrong password and can't be told apart by timing.
let dummyHash: Promise<string> | undefined;

/**
 * Logs in with email and password. Five wrong passwords in a row lock the
 * account for 15 minutes; the fifth attempt already answers ACCOUNT_LOCKED.
 */
export async function login(
  input: LoginInput,
  client: ClientInfo,
  now = new Date(),
  membershipOf: MembershipLookup = noMembership,
): Promise<StartedSession> {
  const { User } = await models();
  const user = await User.findOne({ email: input.email });
  if (!user) {
    dummyHash ??= bcrypt.hash(randomToken(), BCRYPT_COST);
    await bcrypt.compare(input.password, await dummyHash);
    throw invalidCredentials();
  }

  if (user.lockedUntil && user.lockedUntil > now) {
    throw accountLocked(user.lockedUntil, now);
  }

  if (!(await bcrypt.compare(input.password, user.passwordHash))) {
    const updated = await User.findByIdAndUpdate(
      user._id,
      { $inc: { failedLogins: 1 } },
      { returnDocument: "after" },
    );
    if ((updated?.failedLogins ?? 0) >= MAX_FAILED_LOGINS) {
      const lockedUntil = new Date(now.getTime() + LOCK_MS);
      await User.updateOne(
        { _id: user._id },
        { $set: { failedLogins: 0, lockedUntil } },
      );
      throw accountLocked(lockedUntil, now);
    }
    throw invalidCredentials();
  }

  await User.updateOne(
    { _id: user._id },
    { $set: { failedLogins: 0, lastLoginAt: now }, $unset: { lockedUntil: 1 } },
  );
  const membership = await membershipOf(user._id.toString());
  return startSession(user, client, now, membership);
}

/** Ends the session behind this cookie value, if it still exists. */
export async function logout(token: string): Promise<void> {
  const { Session } = await models();
  await Session.deleteOne({ idHash: sha256(token) });
}

/**
 * Loads the session behind a cookie value, or null when it is missing or
 * expired. The expiry slides to 30 days from now at most once a day. With
 * `membershipOf`, the wedding's details are loaded too.
 */
export async function getCurrentSession(
  token: string,
  now = new Date(),
  membershipOf?: MembershipLookup,
): Promise<CurrentSession | null> {
  const { Session, User } = await models();
  const session = await Session.findOne({
    idHash: sha256(token),
    expiresAt: { $gt: now },
  });
  if (!session) return null;

  const user = await User.findById(session.userId);
  if (!user) {
    await Session.deleteOne({ _id: session._id });
    return null;
  }

  let extendedTo: Date | null = null;
  if (session.expiresAt.getTime() - now.getTime() < SESSION_TTL_MS - DAY_MS) {
    extendedTo = new Date(now.getTime() + SESSION_TTL_MS);
    await Session.updateOne(
      { _id: session._id },
      { $set: { expiresAt: extendedTo } },
    );
  }

  const membership = membershipOf
    ? await membershipOf(user._id.toString())
    : null;
  return {
    context: {
      userId: user._id.toString(),
      emailVerified: Boolean(user.emailVerifiedAt),
      weddingId: session.weddingId?.toString() ?? null,
      role: session.role ?? null,
    },
    result: toResult(user, membership),
    extendedTo,
  };
}

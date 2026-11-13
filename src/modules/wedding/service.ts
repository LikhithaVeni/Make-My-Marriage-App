// Wedding business logic: creating a wedding, its members and their invites
// (docs/API Design v1.md "Create wedding" and "Wedding, website and member
// endpoints"; PRD F2 and "Member management"). Settings, website settings
// and the photographer account arrive later. Callers outside this module
// reach it only through index.ts.
import "server-only";

import { createHash, randomBytes } from "node:crypto";

import type { ClientSession } from "mongoose";

import { slugify, SLUG_MAX } from "@/lib/slug";
import {
  attachWeddingToSessions,
  endSessionsOf,
  findUserByEmail,
  findUsersByIds,
  markEmailVerified,
  type MembershipLookup,
} from "@/modules/auth";
import { connectDb } from "@/platform/db";
import { sendEmail } from "@/platform/email";
import { AppError } from "@/platform/errors";
import { getPublicEnv } from "@/platform/public-env";
import type { Role, SessionContext, WeddingContext } from "@/platform/rbac";

import {
  DEFAULT_TAGLINE,
  type InviteDoc,
  type InviteStatus,
  weddingModels,
  type WeddingDoc,
} from "./model";
import {
  type CreateWeddingInput,
  type InviteInput,
  SLUG_PATTERN,
  type UpdateMemberInput,
} from "./schemas";

const DUPLICATE_KEY = 11000;

/** A wedding as the API returns it. */
export interface WeddingView {
  id: string;
  brideName: string;
  groomName: string;
  title: string;
  date: string;
  city: string;
  slug: string;
  description: string | null;
  tagline: string;
  website: { published: boolean; showEventsPublicly: boolean };
}

async function models() {
  const mongoose = await connectDb();
  return { mongoose, ...weddingModels(mongoose) };
}

function toView(wedding: WeddingDoc): WeddingView {
  return {
    id: wedding._id.toString(),
    brideName: wedding.brideName,
    groomName: wedding.groomName,
    title: wedding.title,
    date: wedding.date,
    city: wedding.city,
    slug: wedding.slug,
    description: wedding.description ?? null,
    tagline: wedding.tagline,
    website: {
      published: wedding.website.published,
      showEventsPublicly: wedding.website.showEventsPublicly,
    },
  };
}

/** The couple's initials, bride first: "LK" for Likhitha and Kaushik. */
function monogramOf(wedding: Pick<WeddingDoc, "brideName" | "groomName">) {
  const initial = (name: string) => name.trim().charAt(0).toUpperCase();
  return initial(wedding.brideName) + initial(wedding.groomName);
}

/** The user's wedding and role, for the auth module's sessions. */
export const membershipOf: MembershipLookup = async (userId) => {
  const { Membership, Wedding } = await models();
  const membership = await Membership.findOne({ userId });
  if (!membership) return null;
  const wedding = await Wedding.findById(membership.weddingId);
  if (!wedding) return null;
  return {
    role: membership.role,
    wedding: {
      id: wedding._id.toString(),
      title: wedding.title,
      date: wedding.date,
      slug: wedding.slug,
      monogram: monogramOf(wedding),
    },
  };
};

/**
 * Up to three free addresses close to the one asked for, e.g.
 * "ravi-weds-sneha-2028" or "ravi-weds-sneha-hyderabad" (PRD F1: "slug taken
 * → suggest alternatives").
 */
async function suggestSlugs(slug: string, hints: string[] = []) {
  const { Wedding } = await models();
  const candidates = [
    ...hints.map((hint) => `${slug}-${slugify(hint)}`),
    ...[2, 3, 4, 5].map((n) => `${slug}-${n}`),
  ]
    .map((candidate) => candidate.slice(0, SLUG_MAX).replace(/-+$/, ""))
    .filter((candidate) => candidate !== slug && SLUG_PATTERN.test(candidate));
  const unique = [...new Set(candidates)];
  const taken = new Set(
    (await Wedding.find({ slug: { $in: unique } }, { slug: 1 })).map(
      (wedding) => wedding.slug,
    ),
  );
  return unique.filter((candidate) => !taken.has(candidate)).slice(0, 3);
}

/** Whether a website address is free; when it isn't, a few that are. */
export async function checkSlug(slug: string) {
  const { Wedding } = await models();
  if (!(await Wedding.exists({ slug }))) {
    return { slug, available: true, suggestions: [] as string[] };
  }
  return { slug, available: false, suggestions: await suggestSlugs(slug) };
}

/**
 * Creates the wedding with the caller as its Admin (PRD F1, steps 4–5). The
 * wedding and the membership are written in one transaction, so neither can
 * exist without the other.
 */
export async function createWedding(
  session: SessionContext,
  input: CreateWeddingInput,
): Promise<{ wedding: WeddingView; role: Role }> {
  if (!session.emailVerified) {
    throw new AppError(
      "EMAIL_NOT_VERIFIED",
      403,
      "Please verify your email address first.",
    );
  }

  const { mongoose, Wedding, Membership } = await models();
  const alreadyIn = new AppError(
    "ALREADY_IN_WEDDING",
    409,
    "You already belong to a wedding.",
  );
  if (
    session.weddingId ||
    (await Membership.exists({ userId: session.userId }))
  ) {
    throw alreadyIn;
  }

  const slugTaken = async () =>
    new AppError("SLUG_TAKEN", 409, "This web address is already taken.", {
      suggestions: await suggestSlugs(input.slug, [
        input.date.slice(0, 4),
        input.city,
      ]),
    });
  if (await Wedding.exists({ slug: input.slug })) throw await slugTaken();

  // Build the unique indexes before the first write, outside the transaction.
  await Promise.all([Wedding.init(), Membership.init()]);

  let wedding: WeddingDoc | undefined;
  const transaction = await mongoose.startSession();
  try {
    await transaction.withTransaction(async () => {
      [wedding] = await Wedding.create(
        [
          {
            brideName: input.brideName,
            groomName: input.groomName,
            title: input.title,
            date: input.date,
            city: input.city,
            slug: input.slug,
            description: input.description || undefined,
            tagline: input.tagline || DEFAULT_TAGLINE,
            createdBy: session.userId,
          },
        ],
        { session: transaction },
      );
      await Membership.create(
        [{ userId: session.userId, weddingId: wedding!._id, role: "ADMIN" }],
        { session: transaction },
      );
    });
  } catch (err) {
    if ((err as { code?: unknown }).code === DUPLICATE_KEY) {
      const field = Object.keys(
        (err as { keyPattern?: Record<string, unknown> }).keyPattern ?? {},
      )[0];
      throw field === "userId" ? alreadyIn : await slugTaken();
    }
    throw err;
  } finally {
    await transaction.endSession();
  }

  const created = wedding!;
  await attachWeddingToSessions(
    session.userId,
    created._id.toString(),
    "ADMIN",
  );
  return { wedding: toView(created), role: "ADMIN" };
}

// ---------------------------------------------------------------------------
// Members and invites

const INVITE_TTL_MS = 7 * 24 * 60 * 60_000;

const sha256 = (value: string) =>
  createHash("sha256").update(value).digest("hex");
const randomToken = () => randomBytes(32).toString("base64url");

/** A member as the members page shows them. */
export interface MemberView {
  userId: string;
  name: string;
  email: string;
  role: Role;
  relationLabel: string | null;
}

/** A pending or expired invite as the members page shows it. */
export interface InviteView {
  id: string;
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER";
  relationLabel: string | null;
  status: InviteStatus;
  expiresAt: string;
  invitedBy: string | null;
}

/** An invite as its link shows it, before the invitee has an account. */
export interface InvitePreview {
  name: string;
  email: string;
  role: "ADMIN" | "MANAGER";
  relationLabel: string | null;
  invitedBy: string | null;
  wedding: { title: string; date: string; monogram: string };
}

const notMember = () =>
  new AppError("NOT_FOUND", 404, "This person isn't a member of your wedding.");
const inviteNotFound = () =>
  new AppError("NOT_FOUND", 404, "This invite isn't pending any more.");
const lastAdmin = () =>
  new AppError(
    "LAST_ADMIN",
    409,
    "Your wedding needs at least one Admin. Make someone else an Admin first.",
  );

/** Stored as PENDING; past its expiry it shows as EXPIRED. */
function inviteStatus(invite: InviteDoc, now: Date): InviteStatus {
  return invite.status === "PENDING" && invite.expiresAt <= now
    ? "EXPIRED"
    : invite.status;
}

/** Ids from the URL; anything else is simply not found. */
function isObjectId(id: string): boolean {
  return /^[0-9a-f]{24}$/i.test(id);
}

/** Members (oldest first) and invites still waiting (newest first). */
export async function listMembers(ctx: WeddingContext, now = new Date()) {
  const { Membership, Invite } = await models();
  const memberships = await Membership.find({ weddingId: ctx.weddingId }).sort({
    createdAt: 1,
  });
  const invites = await Invite.find({
    weddingId: ctx.weddingId,
    status: "PENDING",
  }).sort({ createdAt: -1 });

  const users = await findUsersByIds([
    ...memberships.map((m) => m.userId.toString()),
    ...invites.map((i) => i.invitedBy.toString()),
  ]);
  const byId = new Map(users.map((user) => [user.id, user]));

  const members: MemberView[] = memberships.flatMap((membership) => {
    const user = byId.get(membership.userId.toString());
    if (!user) return [];
    return [
      {
        userId: user.id,
        name: user.name,
        email: user.email,
        role: membership.role,
        relationLabel: membership.relationLabel ?? null,
      },
    ];
  });
  const pending: InviteView[] = invites.map((invite) => ({
    id: invite._id.toString(),
    name: invite.name,
    email: invite.email,
    role: invite.role,
    relationLabel: invite.relationLabel ?? null,
    status: inviteStatus(invite, now),
    expiresAt: invite.expiresAt.toISOString(),
    invitedBy: byId.get(invite.invitedBy.toString())?.name ?? null,
  }));
  return { members, invites: pending };
}

async function sendInviteEmail(
  invite: Pick<InviteDoc, "email" | "name" | "role">,
  token: string,
  wedding: WeddingDoc,
  inviterName: string,
) {
  const link = `${getPublicEnv().appUrl}/invite/${token}`;
  const role = invite.role === "ADMIN" ? "an Admin" : "a Manager";
  await sendEmail({
    to: invite.email,
    subject: `${inviterName} invited you to help plan ${wedding.title}`,
    text: `Hi ${invite.name},\n\n${inviterName} has invited you to help plan ${wedding.title} on Make My Marriage, as ${role}.\n\nJoin here:\n${link}\n\nThe link works for 7 days.`,
  });
}

/**
 * Invites an organiser by email (PRD F2). One live invite per email: an
 * earlier pending one is cancelled, so only the newest link works.
 */
export async function createInvite(
  ctx: WeddingContext,
  inviterName: string,
  input: InviteInput,
  now = new Date(),
): Promise<InviteView> {
  const { Wedding, Membership, Invite } = await models();
  const wedding = await Wedding.findById(ctx.weddingId);
  if (!wedding) throw new AppError("NOT_FOUND", 404, "Wedding not found.");

  const existing = await findUserByEmail(input.email);
  if (
    existing &&
    (await Membership.exists({ userId: existing.id, weddingId: ctx.weddingId }))
  ) {
    throw new AppError(
      "ALREADY_IN_WEDDING",
      409,
      "This person is already a member of your wedding.",
    );
  }

  await Invite.updateMany(
    { weddingId: ctx.weddingId, email: input.email, status: "PENDING" },
    { $set: { status: "CANCELLED" } },
  );
  const token = randomToken();
  const invite = await Invite.create({
    weddingId: ctx.weddingId,
    email: input.email,
    name: input.name,
    role: input.role,
    relationLabel: input.relationLabel,
    tokenHash: sha256(token),
    expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
    invitedBy: ctx.userId,
  });
  await sendInviteEmail(invite, token, wedding, inviterName);

  return {
    id: invite._id.toString(),
    name: invite.name,
    email: invite.email,
    role: invite.role,
    relationLabel: invite.relationLabel ?? null,
    status: "PENDING",
    expiresAt: invite.expiresAt.toISOString(),
    invitedBy: inviterName,
  };
}

/** A new link and 7 more days for a pending or expired invite. */
export async function resendInvite(
  ctx: WeddingContext,
  inviterName: string,
  inviteId: string,
  now = new Date(),
): Promise<void> {
  if (!isObjectId(inviteId)) throw inviteNotFound();
  const { Wedding, Invite } = await models();
  const token = randomToken();
  const invite = await Invite.findOneAndUpdate(
    { _id: inviteId, weddingId: ctx.weddingId, status: "PENDING" },
    {
      $set: {
        tokenHash: sha256(token),
        expiresAt: new Date(now.getTime() + INVITE_TTL_MS),
      },
    },
    { returnDocument: "after" },
  );
  const wedding = await Wedding.findById(ctx.weddingId);
  if (!invite || !wedding) throw inviteNotFound();
  await sendInviteEmail(invite, token, wedding, inviterName);
}

/** Cancels a pending invite; its link stops working. */
export async function cancelInvite(
  ctx: WeddingContext,
  inviteId: string,
): Promise<void> {
  if (!isObjectId(inviteId)) throw inviteNotFound();
  const { Invite } = await models();
  const result = await Invite.updateOne(
    { _id: inviteId, weddingId: ctx.weddingId, status: "PENDING" },
    { $set: { status: "CANCELLED" } },
  );
  if (result.matchedCount === 0) throw inviteNotFound();
}

/**
 * The invite behind a link, if it can still be accepted. Unknown and
 * cancelled links are 404, so links can't be probed (API Design rule 4).
 */
async function findUsableInvite(token: string, now: Date) {
  const { Invite } = await models();
  const invite = await Invite.findOne({ tokenHash: sha256(token) });
  if (!invite || invite.status === "CANCELLED") {
    throw new AppError("NOT_FOUND", 404, "This invite link isn't valid.");
  }
  if (invite.status === "ACCEPTED") {
    throw new AppError("TOKEN_USED", 410, "This invite has already been used.");
  }
  if (inviteStatus(invite, now) === "EXPIRED") {
    throw new AppError(
      "TOKEN_EXPIRED",
      410,
      "This invite has expired. Ask whoever invited you to send it again.",
    );
  }
  return invite;
}

/** What an invite link shows: who invited whom, to which wedding. */
export async function previewInvite(
  token: string,
  now = new Date(),
): Promise<InvitePreview> {
  const invite = await findUsableInvite(token, now);
  const { Wedding } = await models();
  const wedding = await Wedding.findById(invite.weddingId);
  if (!wedding) {
    throw new AppError("NOT_FOUND", 404, "This invite link isn't valid.");
  }
  const [inviter] = await findUsersByIds([invite.invitedBy.toString()]);
  return {
    name: invite.name,
    email: invite.email,
    role: invite.role,
    relationLabel: invite.relationLabel ?? null,
    invitedBy: inviter?.name ?? null,
    wedding: {
      title: wedding.title,
      date: wedding.date,
      monogram: monogramOf(wedding),
    },
  };
}

/**
 * Joins the invited wedding (PRD F2, step 4). The caller must be signed in
 * with the invited email; the link proves that inbox, so it also confirms
 * the email. One wedding per user: someone already in a wedding gets
 * 409 EMAIL_IN_OTHER_WEDDING.
 */
export async function acceptInvite(
  user: { id: string; email: string },
  token: string,
  now = new Date(),
): Promise<{ weddingId: string; role: Role }> {
  const invite = await findUsableInvite(token, now);
  if (user.email !== invite.email) {
    throw new AppError(
      "FORBIDDEN",
      403,
      `This invite is for ${invite.email}. Log in with that email to accept it.`,
    );
  }

  const { mongoose, Membership, Invite } = await models();
  const inOtherWedding = () =>
    new AppError(
      "EMAIL_IN_OTHER_WEDDING",
      409,
      "This email already belongs to a wedding, so it can't join another.",
    );
  if (await Membership.exists({ userId: user.id })) throw inOtherWedding();

  await Promise.all([Membership.init(), Invite.init()]);
  const transaction = await mongoose.startSession();
  try {
    await transaction.withTransaction(async () => {
      const claimed = await Invite.updateOne(
        { _id: invite._id, status: "PENDING" },
        { $set: { status: "ACCEPTED", acceptedBy: user.id } },
        { session: transaction },
      );
      if (claimed.modifiedCount === 0) {
        throw new AppError(
          "TOKEN_USED",
          410,
          "This invite has already been used.",
        );
      }
      await Membership.create(
        [
          {
            userId: user.id,
            weddingId: invite.weddingId,
            role: invite.role,
            relationLabel: invite.relationLabel,
            invitedBy: invite.invitedBy,
          },
        ],
        { session: transaction },
      );
    });
  } catch (err) {
    if ((err as { code?: unknown }).code === DUPLICATE_KEY) {
      throw inOtherWedding();
    }
    throw err;
  } finally {
    await transaction.endSession();
  }

  const weddingId = invite.weddingId.toString();
  await markEmailVerified(user.id, now);
  await attachWeddingToSessions(user.id, weddingId, invite.role);
  return { weddingId, role: invite.role };
}

/**
 * Runs a change to a wedding's members in a transaction that also touches
 * the wedding itself. Two Admins demoting or removing each other at the same
 * moment then conflict, and the retry counts the Admins again, so the
 * wedding can't end up with none.
 */
async function withMembersLock(
  weddingId: string,
  work: (session: ClientSession) => Promise<void>,
): Promise<void> {
  const { mongoose, Wedding } = await models();
  const transaction = await mongoose.startSession();
  try {
    await transaction.withTransaction(async () => {
      await Wedding.updateOne(
        { _id: weddingId },
        { $currentDate: { updatedAt: true } },
        { session: transaction },
      );
      await work(transaction);
    });
  } finally {
    await transaction.endSession();
  }
}

/**
 * Changes a member's role or relation label (Admin only). Demoting the last
 * Admin is refused (PRD "Rules"). A role change logs the member out, so the
 * new role applies at their next request (API Design "Change role").
 */
export async function updateMember(
  ctx: WeddingContext,
  userId: string,
  input: UpdateMemberInput,
): Promise<void> {
  if (!isObjectId(userId)) throw notMember();
  const { Membership } = await models();
  const membership = await Membership.findOne({
    userId,
    weddingId: ctx.weddingId,
  });
  if (!membership) throw notMember();
  if (membership.role === "PHOTOGRAPHER" && input.role) {
    throw new AppError(
      "FORBIDDEN",
      403,
      "The photographer's role can't be changed.",
    );
  }
  const roleChanges = Boolean(input.role && input.role !== membership.role);

  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  if (roleChanges) set.role = input.role;
  if (input.relationLabel) set.relationLabel = input.relationLabel;
  if (input.relationLabel === "") unset.relationLabel = 1;

  await withMembersLock(ctx.weddingId, async (session) => {
    if (roleChanges && membership.role === "ADMIN") {
      const admins = await Membership.countDocuments(
        { weddingId: ctx.weddingId, role: "ADMIN" },
        { session },
      );
      if (admins <= 1) throw lastAdmin();
    }
    await Membership.updateOne(
      { _id: membership._id },
      { $set: set, $unset: unset },
      { session },
    );
  });

  if (roleChanges) await endSessionsOf(userId);
}

/**
 * Removes a member (Admin only) and logs them out straight away. The last
 * Admin can't be removed, nor remove themselves (PRD "Rules"). Their account
 * stays; with no wedding, logging in takes them to Create wedding. Once tasks
 * exist, a removed member's tasks become unassigned, not deleted.
 */
export async function removeMember(
  ctx: WeddingContext,
  userId: string,
): Promise<void> {
  if (!isObjectId(userId)) throw notMember();
  const { Membership } = await models();
  const membership = await Membership.findOne({
    userId,
    weddingId: ctx.weddingId,
  });
  if (!membership) throw notMember();

  await withMembersLock(ctx.weddingId, async (session) => {
    if (membership.role === "ADMIN") {
      const admins = await Membership.countDocuments(
        { weddingId: ctx.weddingId, role: "ADMIN" },
        { session },
      );
      if (admins <= 1) throw lastAdmin();
    }
    await Membership.deleteOne({ _id: membership._id }, { session });
  });

  await endSessionsOf(userId);
}

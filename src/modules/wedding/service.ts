// Wedding business logic: creating a wedding and the memberships that tie
// users to it (docs/API Design v1.md "Create wedding"). Settings, website
// settings, invites and the photographer account arrive later. Callers
// outside this module reach it only through index.ts.
import "server-only";

import { slugify, SLUG_MAX } from "@/lib/slug";
import { attachWeddingToSessions, type MembershipLookup } from "@/modules/auth";
import { connectDb } from "@/platform/db";
import { AppError } from "@/platform/errors";
import type { Role, SessionContext } from "@/platform/rbac";

import { DEFAULT_TAGLINE, weddingModels, type WeddingDoc } from "./model";
import { type CreateWeddingInput, SLUG_PATTERN } from "./schemas";

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

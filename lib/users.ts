import "server-only";
import bcrypt from "bcryptjs";
import { connectToDatabase } from "@/lib/mongodb";
import { User, type UserDocument } from "@/models/User";

// Never log passwords or hashes from this module.

const BCRYPT_COST = 12;

/**
 * Compared against when there is no user or no password, so a failed sign-in
 * takes as long as a real check and timing can't reveal which emails exist.
 */
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash("consider-timing-equalizer", BCRYPT_COST));

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/** What the rest of the app may know about a user. Never includes the hash. */
export interface PublicUser {
  id: string;
  name: string;
  email: string;
  image: string | null;
}

function toPublicUser(doc: UserDocument): PublicUser {
  return { id: doc._id.toString(), name: doc.name, email: doc.email, image: doc.image ?? null };
}

const isDuplicateKey = (error: unknown) => (error as { code?: number })?.code === 11000;

export type RegisterResult = { ok: true; user: PublicUser } | { ok: false; reason: "email_taken" };

/** Creates an email/password user. Only the bcrypt hash is stored. */
export async function registerUser(input: { name: string; email: string; password: string }): Promise<RegisterResult> {
  await connectToDatabase();
  const email = normalizeEmail(input.email);
  if (await User.exists({ email })) return { ok: false, reason: "email_taken" };

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_COST);
  try {
    const user = await User.create({ name: input.name, email, passwordHash });
    return { ok: true, user: toPublicUser(user) };
  } catch (error) {
    // Two registrations for the same email raced past the check above.
    if (isDuplicateKey(error)) return { ok: false, reason: "email_taken" };
    throw error;
  }
}

/** Returns the user if the email and password match, otherwise null (never says which was wrong). */
export async function verifyCredentials(email: string, password: string): Promise<PublicUser | null> {
  await connectToDatabase();
  const user = await User.findOne({ email: normalizeEmail(email) }).select("+passwordHash");
  const hash = user?.passwordHash ?? (await getDummyHash());
  const matches = await bcrypt.compare(password, hash);
  return matches && user?.passwordHash ? toPublicUser(user) : null;
}

export type GoogleSignInResult = { ok: true; user: PublicUser } | { ok: false; reason: "email_has_password_account" };

/**
 * Finds or creates the user for a Google account. Accounts are never linked by
 * email: emails aren't verified for password sign-ups, so linking would let
 * someone who pre-registered an address share the real owner's account.
 */
export async function findOrCreateGoogleUser(profile: {
  googleId: string;
  email: string;
  name?: string | null;
  image?: string | null;
}): Promise<GoogleSignInResult> {
  await connectToDatabase();
  const email = normalizeEmail(profile.email);
  const name = profile.name?.trim() || email.split("@")[0];

  const existing = await User.findOne({ googleId: profile.googleId });
  if (existing) {
    if (existing.name !== name || (profile.image && existing.image !== profile.image)) {
      existing.name = name;
      if (profile.image) existing.image = profile.image;
      await existing.save();
    }
    return { ok: true, user: toPublicUser(existing) };
  }

  if (await User.exists({ email })) return { ok: false, reason: "email_has_password_account" };

  try {
    const user = await User.create({ name, email, image: profile.image ?? undefined, googleId: profile.googleId });
    return { ok: true, user: toPublicUser(user) };
  } catch (error) {
    if (!isDuplicateKey(error)) throw error;
    // A concurrent first sign-in created it; use that one if it's this Google account.
    const raced = await User.findOne({ googleId: profile.googleId });
    return raced ? { ok: true, user: toPublicUser(raced) } : { ok: false, reason: "email_has_password_account" };
  }
}

export async function findUserIdByGoogleId(googleId: string): Promise<string | null> {
  await connectToDatabase();
  const user = await User.findOne({ googleId }).select("_id").lean();
  return user ? user._id.toString() : null;
}

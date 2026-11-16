import "server-only";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import { User, type UserDocument } from "@/models/User";
import type { AccountDTO } from "@/types/account";

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
}

function toPublicUser(doc: UserDocument): PublicUser {
  return { id: doc._id.toString(), name: doc.name, email: doc.email };
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

type Account = AccountDTO;

/** Session ids are MongoDB ObjectIds; anything else can't be a user. */
const isUserId = (id: string) => mongoose.isValidObjectId(id);

export async function getAccount(userId: string): Promise<Account | null> {
  if (!isUserId(userId)) return null;
  await connectToDatabase();
  const user = await User.findById(userId).select("name email avatarUrl").lean();
  return user ? { name: user.name, email: user.email, avatarUrl: user.avatarUrl ?? null } : null;
}

export async function updateName(userId: string, name: string): Promise<Account | null> {
  if (!isUserId(userId)) return null;
  await connectToDatabase();
  const user = await User.findByIdAndUpdate(userId, { $set: { name } }, { returnDocument: "after", runValidators: true })
    .select("name email avatarUrl")
    .lean();
  return user ? { name: user.name, email: user.email, avatarUrl: user.avatarUrl ?? null } : null;
}

export type ChangePasswordResult = { ok: true } | { ok: false; reason: "not_found" | "wrong_password" };

/**
 * Replaces the password only if the current one is right. The update also
 * matches the old hash, so two concurrent changes can't both succeed.
 */
export async function changePassword(userId: string, currentPassword: string, newPassword: string): Promise<ChangePasswordResult> {
  if (!isUserId(userId)) return { ok: false, reason: "not_found" };
  await connectToDatabase();
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) return { ok: false, reason: "not_found" };

  const oldHash = user.passwordHash;
  const matches = await bcrypt.compare(currentPassword, oldHash ?? (await getDummyHash()));
  if (!matches || !oldHash) return { ok: false, reason: "wrong_password" };

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_COST);
  const updated = await User.updateOne({ _id: user._id, passwordHash: oldHash }, { $set: { passwordHash } });
  return updated.modifiedCount === 1 ? { ok: true } : { ok: false, reason: "wrong_password" };
}

/** Saves a new profile picture. Returns the previous picture's public id (to delete), or null. */
export async function setAvatar(
  userId: string,
  image: { url: string; publicId: string },
): Promise<{ account: Account; previousPublicId: string | null } | null> {
  if (!isUserId(userId)) return null;
  await connectToDatabase();
  const before = await User.findByIdAndUpdate(userId, {
    $set: { avatarUrl: image.url, avatarPublicId: image.publicId },
  }).lean();
  if (!before) return null;
  return {
    account: { name: before.name, email: before.email, avatarUrl: image.url },
    previousPublicId: before.avatarPublicId && before.avatarPublicId !== image.publicId ? before.avatarPublicId : null,
  };
}

/** Removes the profile picture. Returns the removed picture's public id (to delete), or null. */
export async function removeAvatar(userId: string): Promise<{ account: Account; previousPublicId: string | null } | null> {
  if (!isUserId(userId)) return null;
  await connectToDatabase();
  const before = await User.findByIdAndUpdate(userId, { $unset: { avatarUrl: 1, avatarPublicId: 1 } }).lean();
  if (!before) return null;
  return { account: { name: before.name, email: before.email, avatarUrl: null }, previousPublicId: before.avatarPublicId ?? null };
}

/** Whether a user id from a session still has an account. */
export async function userExists(userId: string): Promise<boolean> {
  if (!/^[a-f\d]{24}$/i.test(userId)) return false;
  await connectToDatabase();
  return Boolean(await User.exists({ _id: userId }));
}

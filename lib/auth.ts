import "server-only";
import { auth } from "@clerk/nextjs/server";

/**
 * For Server Components and Server Actions: returns the Clerk user ID or
 * redirects to sign-in. Never accept a userId from the client.
 */
export async function requireUserId(): Promise<string> {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) return redirectToSignIn();
  return userId;
}

/** For Route Handlers: returns the Clerk user ID, or null so the caller can respond 401. */
export async function getApiUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}

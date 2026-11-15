import "server-only";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { auth } from "@/auth";

/** The signed-in user's id (our MongoDB User id) from the Auth.js session, or null. */
export async function getApiUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/**
 * For Server Components and Server Actions: returns the user id or redirects to
 * sign-in. Never accept a userId from the client.
 */
export async function requireUserId(): Promise<string> {
  // Pages: reading the session is per-request, and Auth.js generates random
  // CSRF tokens, which Next must not try to prerender.
  await connection();
  const userId = await getApiUserId();
  if (!userId) redirect("/sign-in");
  return userId;
}

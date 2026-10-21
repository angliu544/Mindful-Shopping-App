import "server-only";
import { redirect } from "next/navigation";
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
  const userId = await getApiUserId();
  if (!userId) redirect("/sign-in");
  return userId;
}

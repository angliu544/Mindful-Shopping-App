import NextAuth, { type NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { userExists, verifyCredentials } from "@/lib/users";
import { signInSchema } from "@/lib/validations";

/** How often a session re-checks that its account still exists. */
const VERIFY_SESSION_EVERY_MS = 5 * 60 * 1000;

/**
 * A sign-in cookie can outlive its account (deleted, or a different database).
 * Returning null makes Auth.js end the session and delete the cookie on every
 * path (pages, the proxy, prefetches), so nobody gets stuck signed in to an
 * account that isn't there. If the database can't be reached, the session is
 * kept: pages then show an error screen that offers Sign out.
 */
export async function verifySessionUser(token: JWT): Promise<JWT | null> {
  if (!token.sub) return token;
  const lastChecked = typeof token.verifiedAt === "number" ? token.verifiedAt : 0;
  if (Date.now() - lastChecked < VERIFY_SESSION_EVERY_MS) return token;
  try {
    if (!(await userExists(token.sub))) return null;
  } catch {
    return token;
  }
  return { ...token, verifiedAt: Date.now() };
}

/**
 * Email/password sign-in only. Sessions are JWTs (required for the Credentials
 * provider), and `session.user.id` is always our MongoDB User id. That id is
 * what owns the user's items.
 */
export const authConfig = {
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;
        // null => Auth.js reports a generic CredentialsSignin error.
        return verifyCredentials(parsed.data.email, parsed.data.password);
      },
    }),
  ],
  session: { strategy: "jwt" },
  pages: { signIn: "/sign-in", error: "/sign-in" },
  callbacks: {
    async jwt({ token, user }) {
      // `user` is only present at sign-in; afterwards the token already holds our id.
      if (user?.id) {
        token.sub = user.id;
        token.verifiedAt = Date.now();
        return token;
      }
      return verifySessionUser(token);
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

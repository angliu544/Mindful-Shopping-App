import NextAuth, { type NextAuthConfig } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { findOrCreateGoogleUser, findUserIdByGoogleId, userExists, verifyCredentials } from "@/lib/users";
import { signInSchema } from "@/lib/validations";

/** Error codes the sign-in page knows how to explain (see components/SignInForm.tsx). */
export const SIGN_IN_ERRORS = {
  usePassword: "UsePassword",
  googleEmailUnverified: "GoogleEmailUnverified",
} as const;

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
 * Google OAuth and email/password sign-in. Sessions are JWTs (required for the
 * Credentials provider), and `session.user.id` is always our MongoDB User id,
 * whichever way the user signed in. That id is what owns their items.
 */
export const authConfig = {
  providers: [
    Google, // reads AUTH_GOOGLE_ID / AUTH_GOOGLE_SECRET
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
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile?.email || profile.email_verified !== true) {
        return `/sign-in?error=${SIGN_IN_ERRORS.googleEmailUnverified}`;
      }
      const result = await findOrCreateGoogleUser({
        googleId: account.providerAccountId,
        email: profile.email,
        name: profile.name,
        image: typeof profile.picture === "string" ? profile.picture : null,
      });
      return result.ok ? true : `/sign-in?error=${SIGN_IN_ERRORS.usePassword}`;
    },
    async jwt({ token, user, account }) {
      // Only runs with `account` at sign-in; afterwards the token already holds our id.
      if (account?.provider === "google") {
        const id = await findUserIdByGoogleId(account.providerAccountId);
        if (!id) throw new Error("Google user missing after sign-in");
        token.sub = id;
        token.verifiedAt = Date.now();
        return token;
      }
      if (account?.provider === "credentials" && user?.id) {
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

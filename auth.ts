import NextAuth, { type NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { verifyCredentials } from "@/lib/users";
import { signInSchema } from "@/lib/validations";

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
    jwt({ token, user }) {
      // `user` is only present at sign-in; afterwards the token already holds our id.
      if (user?.id) token.sub = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

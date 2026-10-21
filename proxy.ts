import { NextResponse } from "next/server";
import { auth } from "@/auth";

// Optimistic redirects only. Every private page and route handler still
// verifies the session on the server (lib/auth.ts) before touching data.
const PRIVATE_PAGES = ["/upload", "/review", "/history", "/settings"];
const AUTH_PAGES = ["/sign-in", "/sign-up"];

const under = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname === p || pathname.startsWith(`${p}/`));

export default auth((req) => {
  const { pathname, search } = req.nextUrl;
  const signedIn = Boolean(req.auth?.user?.id);

  // Signed-in users go straight to their review cards.
  if (signedIn && (pathname === "/" || under(pathname, AUTH_PAGES))) {
    return NextResponse.redirect(new URL("/review", req.url));
  }

  if (!signedIn && under(pathname, PRIVATE_PAGES)) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(signInUrl);
  }
});

export const config = {
  // Pages only: API routes answer 401 themselves, and Auth.js handles /api/auth.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.[\\w]+$).*)"],
};

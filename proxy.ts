import { NextResponse } from "next/server";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

// Optimistic gate for pages only. Every private page and route handler still
// verifies the user on the server (see lib/auth.ts) before touching data.
// API routes are left to their handlers so signed-out callers get a JSON 401
// rather than a redirect to the sign-in page.
const isPrivateRoute = createRouteMatcher(["/upload(.*)", "/review(.*)", "/history(.*)", "/settings(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  // Signed-in users go straight to their review cards instead of the landing page.
  if (req.nextUrl.pathname === "/") {
    const { userId } = await auth();
    if (userId) return NextResponse.redirect(new URL("/review", req.url));
  }
  if (isPrivateRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    // Skip Next.js internals and static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};

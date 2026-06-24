import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

// ─── Auth middleware instance (edge-compatible) ───────────────────────────────
const { auth } = NextAuth(authConfig);

// ─── Route definitions ────────────────────────────────────────────────────────
const PROTECTED_ROUTES: RegExp[] = [
  /^\/cart/,
  /^\/checkout(\/.*)?$/,
  /^\/orders(\/.*)?$/,
  /^\/account(\/.*)?$/,
];

const ADMIN_ROUTES: RegExp[] = [/^\/admin(\/.*)?$/];

const AUTH_ROUTES: RegExp[] = [
  /^\/login$/,
  /^\/register$/,
];

// ─── Matcher ──────────────────────────────────────────────────────────────────
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons/|images/|api/webhooks/).*)",
  ],
};

// ─── Middleware ───────────────────────────────────────────────────────────────

export default auth((req) => {
  const { nextUrl } = req;
  const session = req.auth; // Auth.js automatically attaches the session here

  const pathname = nextUrl.pathname;
  const isAuthenticated = !!session?.user;
  // Type assertion for the custom role property
  const userRole = (session?.user as { role?: string })?.role;

  // ── 1. Admin route guard ─────────────────────────────────────────────────
  if (ADMIN_ROUTES.some((rx) => rx.test(pathname))) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (userRole !== "ADMIN") {
      const homeUrl = new URL("/", nextUrl.origin);
      homeUrl.searchParams.set("error", "unauthorized");
      return NextResponse.redirect(homeUrl);
    }
    return NextResponse.next();
  }

  // ── 2. Protected user routes ─────────────────────────────────────────────
  if (PROTECTED_ROUTES.some((rx) => rx.test(pathname))) {
    if (!isAuthenticated) {
      const loginUrl = new URL("/login", nextUrl.origin);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  // ── 3. Redirect authenticated users away from auth pages ─────────────────
  if (AUTH_ROUTES.some((rx) => rx.test(pathname))) {
    if (isAuthenticated) {
      const callbackUrl = nextUrl.searchParams.get("callbackUrl");
      const safeCallback =
        callbackUrl &&
        callbackUrl.startsWith("/") &&
        !callbackUrl.startsWith("//")
          ? callbackUrl
          : "/";
      return NextResponse.redirect(new URL(safeCallback, nextUrl.origin));
    }
    return NextResponse.next();
  }

  // ── 4. All other routes — pass through ──────────────────────────────────
  return NextResponse.next();
});
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/forgot-password", "/set-password", "/unauthorized"];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  if (!session?.user) {
    if (isPublic) return NextResponse.next();
    const loginUrl = new URL("/login", req.nextUrl);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Already authenticated: keep them out of the login screen.
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.nextUrl));
  }

  const role = session.user.role;

  if (pathname.startsWith("/geschaeftsstelle") && role !== "GESCHAEFTSSTELLE") {
    return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
  }

  if (pathname.startsWith("/stufenleiter") && role !== "STUFENLEITER") {
    return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
  }

  if (pathname.startsWith("/einsaetze/alle") && role === "MITGLIED") {
    return NextResponse.redirect(new URL("/unauthorized", req.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.\\w+$).*)"],
};

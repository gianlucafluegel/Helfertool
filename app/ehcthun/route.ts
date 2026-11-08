import { NextResponse } from "next/server";
import { BRAND_COOKIE } from "@/lib/brand";

// Einstiegsadresse: merkt sich die Marke und führt zur Anmeldung (bzw. ins
// Dashboard, falls schon angemeldet).
export function GET(request: Request) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.set(BRAND_COOKIE, "ehc", {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });
  return response;
}

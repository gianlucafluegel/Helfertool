import { cookies } from "next/headers";
import type { SessionMember } from "@/lib/auth";

const COOKIE_NAME = "htool_active_member";

/**
 * The cookie is UI convenience only (picks which member's name/hours show by
 * default) — it is never trusted as an authorization boundary. Every mutating
 * server action must independently verify a memberId against session.user.members.
 */
export async function getActiveMember(members: SessionMember[]): Promise<SessionMember | null> {
  if (members.length === 0) return null;

  const cookieStore = await cookies();
  const activeId = cookieStore.get(COOKIE_NAME)?.value;
  const fromCookie = members.find((m) => m.id === activeId);
  if (fromCookie) return fromCookie;

  return members.find((m) => m.isPrimary) ?? members[0];
}

export async function setActiveMemberCookie(memberId: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, memberId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

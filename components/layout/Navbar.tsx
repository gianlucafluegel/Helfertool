import Link from "next/link";
import Image from "next/image";
import clsx from "clsx";
import type { UserRole } from "@/generated/prisma/enums";
import type { SessionMember } from "@/lib/auth";
import { logout } from "@/lib/actions/auth";

// "Einsätze" and "Mein Konto" live in the in-page MemberTabs bar for
// MITGLIED/FUNKTIONAER instead of here, to match the prototype's layout.
// Funktionär's page structure is otherwise identical to Mitglied's — seeing
// who's doing an already-filled Einsatz happens by clicking into it, not
// via a separate nav item.
const NAV_LINKS: { href: string; label: string; roles: UserRole[] }[] = [
  { href: "/stufenleiter", label: "Stufenadmin", roles: ["STUFENLEITER"] },
  { href: "/geschaeftsstelle", label: "Geschäftsstelle", roles: ["GESCHAEFTSSTELLE"] },
];

export function Navbar({ role, member }: { role: UserRole; member: SessionMember | null }) {
  const links = NAV_LINKS.filter((link) => link.roles.includes(role));

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <Image
            src="/dragon-logo.png"
            alt="HC Dragon Thun"
            width={333}
            height={400}
            priority
            className="h-10 w-auto"
          />
          <span>
            <span className="block text-sm font-bold uppercase tracking-wide">
              Dragon Thun · Helfertool
            </span>
            {member && (
              <span className="block text-xs text-white/60">
                {member.firstName} {member.lastName}
              </span>
            )}
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={clsx(
                "rounded-full px-3 py-1.5 text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white",
              )}
            >
              {link.label}
            </Link>
          ))}
          <form action={logout}>
            <button
              type="submit"
              className="rounded-full px-3 py-1.5 text-sm font-medium text-white/70 hover:bg-white/10 hover:text-white"
            >
              Abmelden
            </button>
          </form>
        </nav>
      </div>
    </header>
  );
}

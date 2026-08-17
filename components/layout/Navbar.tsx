import Link from "next/link";
import clsx from "clsx";
import type { UserRole } from "@/generated/prisma/enums";
import { logout } from "@/lib/actions/auth";

const NAV_LINKS: { href: string; label: string; roles: UserRole[] }[] = [
  { href: "/einsaetze", label: "Einsätze", roles: ["MITGLIED", "FUNKTIONAER"] },
  { href: "/einsaetze/alle", label: "Alle Einsätze", roles: ["FUNKTIONAER"] },
  { href: "/mein-konto", label: "Mein Konto", roles: ["MITGLIED", "FUNKTIONAER"] },
  { href: "/stufenleiter", label: "Stufenadmin", roles: ["STUFENLEITER"] },
  { href: "/geschaeftsstelle", label: "Geschäftsstelle", roles: ["GESCHAEFTSSTELLE"] },
];

export function Navbar({ role }: { role: UserRole }) {
  const links = NAV_LINKS.filter((link) => link.roles.includes(role));

  return (
    <header className="bg-navy text-white">
      <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/dashboard" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold font-bold text-navy">
            D
          </span>
          <span>
            <span className="block text-sm font-bold uppercase tracking-wide">
              Dragon Thun · Helfertool
            </span>
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

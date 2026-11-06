import Link from "next/link";
import clsx from "clsx";
import type { UserRole } from "@/generated/prisma/enums";

const TABS = [
  { href: "/einsaetze", key: "einsaetze", label: "Spiele & Events" },
  { href: "/mein-konto", key: "konto", label: "Mein Stundenkonto" },
] as const;

export function MemberTabs({
  active,
  role,
}: {
  active: "einsaetze" | "konto";
  role?: UserRole;
}) {
  // Funktionäre haben kein Stundenkonto — ihr zweiter Tab sind nur die Kontaktdaten.
  const tabs = TABS.map((tab) =>
    role === "FUNKTIONAER" && tab.key === "konto"
      ? { ...tab, href: "/mein-konto/profil", label: "Meine Kontaktdaten" }
      : tab,
  );

  return (
    <div className="mb-5 flex gap-6 border-b border-border">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={clsx(
              "-mb-px border-b-2 pb-3 text-sm font-semibold transition-colors",
              isActive
                ? "border-gold text-text"
                : "border-transparent text-muted hover:text-text",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

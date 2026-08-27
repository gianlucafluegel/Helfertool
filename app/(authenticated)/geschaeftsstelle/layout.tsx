import Link from "next/link";
import type { ReactNode } from "react";

const TABS = [
  { href: "/geschaeftsstelle", label: "Übersicht" },
  { href: "/geschaeftsstelle/helfereinsaetze", label: "Helfereinsätze" },
  { href: "/geschaeftsstelle/members", label: "Mitglieder" },
  { href: "/geschaeftsstelle/mail-templates", label: "Mail-Vorlagen" },
  { href: "/geschaeftsstelle/reminders", label: "Reminder" },
  { href: "/geschaeftsstelle/datenbank", label: "Datenbank" },
];

export default function GeschaeftsstelleLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col gap-5">
      <nav className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-2">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="text-sm font-medium text-muted hover:text-navy"
          >
            {tab.label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}

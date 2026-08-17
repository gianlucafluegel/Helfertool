import Link from "next/link";
import type { ReactNode } from "react";

const TABS = [
  { href: "/geschaeftsstelle", label: "Übersicht" },
  { href: "/geschaeftsstelle/events", label: "Events" },
  { href: "/geschaeftsstelle/members", label: "Mitglieder" },
  { href: "/geschaeftsstelle/age-groups", label: "Stufen" },
  { href: "/geschaeftsstelle/locations", label: "Standorte" },
  { href: "/geschaeftsstelle/taetigkeiten", label: "Tätigkeiten" },
  { href: "/geschaeftsstelle/mail-templates", label: "Mail-Vorlagen" },
  { href: "/geschaeftsstelle/reminders", label: "Reminder" },
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

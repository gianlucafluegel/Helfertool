import Link from "next/link";
import type { ReactNode } from "react";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function StufenleiterLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  const assignments = session?.user
    ? await prisma.stufenleiterAssignment.findMany({
        where: { userId: session.user.id },
        include: { ageGroup: true },
        orderBy: { ageGroup: { sortOrder: "asc" } },
      })
    : [];

  const tabs = [
    { href: "/stufenleiter", label: "Übersicht" },
    ...assignments.map((a) => ({
      href: `/stufenleiter/${a.ageGroupId}`,
      label: a.ageGroup.name,
    })),
  ];

  return (
    <div className="flex flex-col gap-5">
      <nav className="flex flex-wrap gap-x-4 gap-y-2 border-b border-border pb-2">
        {tabs.map((tab) => (
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

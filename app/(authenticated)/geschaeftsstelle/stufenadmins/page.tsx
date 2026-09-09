import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreateStaffForm } from "../CreateStaffForm";
import { createStufenadmin } from "@/lib/actions/staff";

export default async function StufenadminsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const [ageGroups, allMembers] = await Promise.all([
    prisma.ageGroup.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
    prisma.member.findMany({
      where: { user: { role: "STUFENLEITER" } },
      include: {
        user: { include: { stufenleiterAssignments: { include: { ageGroup: true } } } },
      },
      orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const members = q
    ? allMembers.filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q.toLowerCase()),
      )
    : allMembers;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Neuen Stufenadmin erfassen
        </h2>
        <p className="mb-3 text-sm text-muted">
          Legt das Mitglied an und verschickt sofort eine Login-Einladung mit der Rolle
          Stufenleiter.
        </p>
        <CreateStaffForm
          action={createStufenadmin}
          submitLabel="Stufenadmin erfassen & einladen"
          successMessage="Stufenadmin wurde erstellt und eingeladen."
          ageGroups={ageGroups}
          showContactAndHours={false}
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Alle Stufenadmins
        </h2>
        <form className="mb-3 flex gap-2" action="/geschaeftsstelle/stufenadmins">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Stufenadmin suchen…"
            className="w-full max-w-sm rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-gold-hover"
          >
            Suchen
          </button>
          {q && (
            <Link
              href="/geschaeftsstelle/stufenadmins"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text hover:border-navy/40"
            >
              Zurücksetzen
            </Link>
          )}
        </form>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Soll-Std.</th>
                <th className="py-2 pr-3">E-Mail</th>
                <th className="py-2 pr-3">Team(s)</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className={`border-b border-border last:border-b-0 ${member.isActive ? "" : "opacity-50"}`}
                >
                  <td className="py-2 pr-3">
                    <Link
                      href={`/geschaeftsstelle/members/${member.id}`}
                      className="font-medium text-gold-hover hover:underline"
                    >
                      {member.firstName} {member.lastName}
                    </Link>
                    {!member.isActive && (
                      <Badge variant="neutral" className="ml-2">
                        inaktiv
                      </Badge>
                    )}
                  </td>
                  <td className="py-2 pr-3">{Number(member.targetHours)}</td>
                  <td className="py-2 pr-3">{member.email ?? "–"}</td>
                  <td className="py-2 pr-3">
                    {member.user?.stufenleiterAssignments.map((a) => a.ageGroup.name).join(", ") ||
                      "–"}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted">
                    {q ? "Keine Stufenadmins gefunden." : "Noch keine Stufenadmins erfasst."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ListSearchForm } from "@/components/ui/ListSearchForm";
import { Pagination } from "@/components/ui/Pagination";
import { matchesActiveFilter, paginate, parseListParams, type ListParams } from "@/lib/list-params";
import { CreateStaffForm } from "../CreateStaffForm";
import { createStufenadmin } from "@/lib/actions/staff";

export default async function StufenadminsPage({
  searchParams,
}: {
  searchParams: Promise<ListParams>;
}) {
  const { q, status, page: pageParam } = parseListParams(await searchParams);

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

  const filtered = allMembers.filter(
    (m) =>
      matchesActiveFilter(m.isActive, status) &&
      (!q || `${m.firstName} ${m.lastName}`.toLowerCase().includes(q.toLowerCase())),
  );
  const { items: members, page, totalPages, total } = paginate(filtered, pageParam);

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
        <ListSearchForm basePath="/geschaeftsstelle/stufenadmins" q={q} status={status} placeholder="Stufenadmin suchen…" />
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
                        archiviert
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
                    {q || status !== "aktiv" ? "Keine Stufenadmins gefunden." : "Noch keine Stufenadmins erfasst."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination basePath="/geschaeftsstelle/stufenadmins" q={q} status={status} page={page} totalPages={totalPages} total={total} />
      </Card>
    </div>
  );
}

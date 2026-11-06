import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { ListSearchForm } from "@/components/ui/ListSearchForm";
import { Pagination } from "@/components/ui/Pagination";
import { matchesActiveFilter, paginate, parseListParams, type ListParams } from "@/lib/list-params";
import { CreateStaffForm } from "../CreateStaffForm";
import { ManualHoursForm } from "../members/ManualHoursForm";
import { createFunktionaer } from "@/lib/actions/staff";

export default async function FunktionaerePage({
  searchParams,
}: {
  searchParams: Promise<ListParams>;
}) {
  const { q, status, page: pageParam } = parseListParams(await searchParams);

  const [locations, allMembers] = await Promise.all([
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({
      where: { user: { role: "FUNKTIONAER" } },
      orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);
  const activeMembers = allMembers.filter((m) => m.isActive);

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
          Neuen Funktionär erfassen
        </h2>
        <p className="mb-3 text-sm text-muted">
          Legt das Mitglied an und verschickt sofort eine Login-Einladung mit der Rolle
          Funktionär.
        </p>
        <CreateStaffForm
          action={createFunktionaer}
          submitLabel="Funktionär erfassen & einladen"
          successMessage="Funktionär wurde erstellt und eingeladen."
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Helferstunden manuell hinzufügen
        </h2>
        <p className="mb-3 text-sm text-muted">
          Für einen Einsatz, der nicht über das Tool lief — dieselben Angaben wie beim Erstellen
          eines Helfereinsatzes.
        </p>
        <ManualHoursForm
          members={activeMembers.map((m) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
          }))}
          locations={locations}
          memberLabel="Funktionär"
          defaultArea="FUNKTIONAER"
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Alle Funktionäre
        </h2>
        <ListSearchForm basePath="/geschaeftsstelle/funktionaere" q={q} status={status} placeholder="Funktionär suchen…" />
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="py-2 pr-3">Name</th>
                <th className="py-2 pr-3">Soll-Std.</th>
                <th className="py-2 pr-3">E-Mail</th>
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
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={3} className="py-4 text-center text-muted">
                    {q || status !== "aktiv" ? "Keine Funktionäre gefunden." : "Noch keine Funktionäre erfasst."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <Pagination basePath="/geschaeftsstelle/funktionaere" q={q} status={status} page={page} totalPages={totalPages} total={total} />
      </Card>
    </div>
  );
}

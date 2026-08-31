import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CreateMemberForm } from "./CreateMemberForm";
import { ManualHoursForm } from "./ManualHoursForm";

export default async function MembersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const [locations, activities, ageGroups] = await Promise.all([
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.activity.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.ageGroup.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const allMembers = await prisma.member.findMany({
    include: { user: true, ageGroup: true },
    orderBy: [{ isActive: "desc" }, { lastName: "asc" }, { firstName: "asc" }],
  });
  const activeMembers = allMembers.filter((m) => m.isActive);

  const members = q
    ? allMembers.filter((m) =>
        `${m.firstName} ${m.lastName}`.toLowerCase().includes(q.toLowerCase()),
      )
    : allMembers;

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Neues Mitglied erfassen
        </h2>
        <CreateMemberForm ageGroups={ageGroups} />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Helferstunden manuell hinzufügen
        </h2>
        <p className="mb-3 text-sm text-muted">
          Für einen Einsatz, der nicht über das Tool lief (z.B. vor Systemstart oder nachträglich
          korrigiert) — dieselben Angaben wie beim Erstellen eines Helfereinsatzes.
        </p>
        <ManualHoursForm
          members={activeMembers.map((m) => ({
            id: m.id,
            firstName: m.firstName,
            lastName: m.lastName,
          }))}
          locations={locations}
          activities={activities}
        />
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Alle Mitglieder
        </h2>
        <form className="mb-3 flex gap-2" action="/geschaeftsstelle/members">
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Mitglied suchen…"
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
              href="/geschaeftsstelle/members"
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
                <th className="py-2 pr-3">Stufe</th>
                <th className="py-2 pr-3">Soll-Std.</th>
                <th className="py-2 pr-3">Login</th>
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
                  <td className="py-2 pr-3">{member.ageGroup?.name ?? "–"}</td>
                  <td className="py-2 pr-3">{Number(member.targetHours)}</td>
                  <td className="py-2 pr-3">{member.user ? member.user.role : "kein Login"}</td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted">
                    {q ? (
                      "Keine Mitglieder gefunden."
                    ) : (
                      <>
                        Noch keine Mitglieder — importiere sie unter{" "}
                        <Link
                          href="/geschaeftsstelle/datenbank"
                          className="text-gold-hover hover:underline"
                        >
                          Datenbank
                        </Link>{" "}
                        oder erfasse sie oben manuell.
                      </>
                    )}
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

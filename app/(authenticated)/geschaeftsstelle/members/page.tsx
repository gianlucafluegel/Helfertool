import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { CreateMemberForm } from "./CreateMemberForm";
import { ManualHoursForm } from "./ManualHoursForm";

export default async function MembersPage() {
  const [locations, activities, ageGroups] = await Promise.all([
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.activity.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.ageGroup.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const members = await prisma.member.findMany({
    include: { user: true, ageGroup: true },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

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
          members={members.map((m) => ({ id: m.id, firstName: m.firstName, lastName: m.lastName }))}
          locations={locations}
          activities={activities}
        />
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Alle Mitglieder
          </h2>
          <a
            href="/api/exports/members"
            className="text-xs font-medium text-gold-hover hover:underline"
          >
            Liste mit Helferstunden exportieren (Excel)
          </a>
        </div>
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
                <tr key={member.id} className="border-b border-border last:border-b-0">
                  <td className="py-2 pr-3">
                    <Link
                      href={`/geschaeftsstelle/members/${member.id}`}
                      className="font-medium text-gold-hover hover:underline"
                    >
                      {member.firstName} {member.lastName}
                    </Link>
                  </td>
                  <td className="py-2 pr-3">{member.ageGroup?.name ?? "–"}</td>
                  <td className="py-2 pr-3">{Number(member.targetHours)}</td>
                  <td className="py-2 pr-3">{member.user ? member.user.role : "kein Login"}</td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted">
                    Noch keine Mitglieder — importiere sie unter{" "}
                    <Link href="/geschaeftsstelle/datenbank" className="text-gold-hover hover:underline">
                      Datenbank
                    </Link>{" "}
                    oder erfasse sie oben manuell.
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

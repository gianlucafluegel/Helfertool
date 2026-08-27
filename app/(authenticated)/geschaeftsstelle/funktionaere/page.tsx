import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { CreateStaffForm } from "../CreateStaffForm";
import { ManualHoursForm } from "../members/ManualHoursForm";
import { createFunktionaer } from "@/lib/actions/staff";

export default async function FunktionaerePage() {
  const [locations, activities, members] = await Promise.all([
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.activity.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.member.findMany({
      where: { user: { role: "FUNKTIONAER" } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

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
        <CreateStaffForm action={createFunktionaer} submitLabel="Funktionär erfassen & einladen" />
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
          members={members.map((m) => ({ id: m.id, firstName: m.firstName, lastName: m.lastName }))}
          locations={locations}
          activities={activities}
        />
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Alle Funktionäre
          </h2>
          <a
            href="/api/exports/members?role=FUNKTIONAER"
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
                <th className="py-2 pr-3">Alter</th>
                <th className="py-2 pr-3">Soll-Std.</th>
                <th className="py-2 pr-3">E-Mail</th>
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
                  <td className="py-2 pr-3">{member.age ?? "–"}</td>
                  <td className="py-2 pr-3">{Number(member.targetHours)}</td>
                  <td className="py-2 pr-3">{member.email ?? "–"}</td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted">
                    Noch keine Funktionäre erfasst.
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

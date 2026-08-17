import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { CreateAgeGroupForm } from "./CreateAgeGroupForm";
import { AgeGroupRow } from "./AgeGroupRow";

export default async function AgeGroupsPage() {
  const ageGroups = await prisma.ageGroup.findMany({ orderBy: { sortOrder: "asc" } });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Neue Stufe
        </h2>
        <CreateAgeGroupForm />
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Barbezug-Wahl</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody>
            {ageGroups.map((ag) => (
              <AgeGroupRow
                key={ag.id}
                id={ag.id}
                name={ag.name}
                isActive={ag.isActive}
                triggersBarbezugChoice={ag.triggersBarbezugChoice}
              />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

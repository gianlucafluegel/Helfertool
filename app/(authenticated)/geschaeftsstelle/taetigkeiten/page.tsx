import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { CreateActivityForm } from "./CreateActivityForm";
import { ActivityRow } from "./ActivityRow";

export default async function ActivitiesPage() {
  const activities = await prisma.activity.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Neue Tätigkeit
        </h2>
        <CreateActivityForm />
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Bereich</th>
              <th className="py-2 pr-3">Barbezug-Wahl</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody>
            {activities.map((a) => (
              <ActivityRow
                key={a.id}
                id={a.id}
                name={a.name}
                defaultArea={a.defaultArea}
                requiresPayoutChoice={a.requiresPayoutChoice}
                isActive={a.isActive}
              />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

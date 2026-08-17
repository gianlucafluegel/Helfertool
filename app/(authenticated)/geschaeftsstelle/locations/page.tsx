import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { CreateLocationForm } from "./CreateLocationForm";
import { LocationRow } from "./LocationRow";

export default async function LocationsPage() {
  const locations = await prisma.location.findMany({ orderBy: { name: "asc" } });

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Neuer Standort
        </h2>
        <CreateLocationForm />
      </Card>
      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase text-muted">
              <th className="py-2 pr-3">Name</th>
              <th className="py-2 pr-3">Adresse</th>
              <th className="py-2 pr-3">Status</th>
              <th className="py-2 pr-3" />
            </tr>
          </thead>
          <tbody>
            {locations.map((loc) => (
              <LocationRow
                key={loc.id}
                id={loc.id}
                name={loc.name}
                address={loc.address}
                isActive={loc.isActive}
              />
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { ReminderForm } from "@/components/reminders/ReminderForm";

export default async function GeschaeftsstelleRemindersPage() {
  const ageGroups = await prisma.ageGroup.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
        Reminder an definierbare Gruppen senden
      </h2>
      <p className="mb-3 text-sm text-muted">
        Wähle die Stufen und/oder Funktionäre aus, an die erinnert werden soll.
      </p>
      <ReminderForm
        availableAgeGroups={ageGroups.map((ag) => ({ id: ag.id, name: ag.name }))}
        showFunktionaereOption
      />
    </Card>
  );
}

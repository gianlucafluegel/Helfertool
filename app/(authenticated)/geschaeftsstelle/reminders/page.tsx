import { Card } from "@/components/ui/Card";
import { ReminderForm } from "@/components/reminders/ReminderForm";

export default function GeschaeftsstelleRemindersPage() {
  return (
    <Card>
      <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-muted">
        Reminder senden
      </h2>
      <p className="mb-3 text-sm text-muted">
        Sendet eine Erinnerung an alle Mitglieder mit hinterlegter E-Mail-Adresse.
      </p>
      <ReminderForm />
    </Card>
  );
}

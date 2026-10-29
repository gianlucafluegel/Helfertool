// Standardtext der Reminder-Vorlage vor Einführung der Einsatz-Liste. Wird
// nur erkannt, um eine unveränderte Vorlage automatisch auf den neuen
// Standard zu heben — eine von der Geschäftsstelle angepasste Vorlage bleibt
// unangetastet.
export const LEGACY_REMINDER_BODY =
  "Hallo {{vorname}} {{nachname}}\n\n" +
  "Für {{event}} am {{datum}} in {{standort}} sind noch nicht alle Helfereinsätze besetzt. " +
  "Bitte prüft, ob ihr unterstützen könnt, damit der Spielbetrieb gewährleistet ist.\n\n" +
  "Sportliche Grüsse\nHC Dragon Thun";

export const DEFAULT_REMINDER_BODY =
  "Hallo {{vorname}} {{nachname}}\n\n" +
  "Folgende Helfereinsätze sind noch nicht besetzt:\n\n" +
  "{{einsaetze}}\n\n" +
  "Bitte prüft, ob ihr unterstützen könnt, damit der Spielbetrieb gewährleistet ist. " +
  "Anmelden könnt ihr euch hier: {{link}}\n\n" +
  "Sportliche Grüsse\nHC Dragon Thun";

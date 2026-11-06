-- Reminder gelten neu pro Einsatz: Standardvorlage entsprechend anpassen. Nur
-- unveränderte Standardtexte werden ersetzt; angepasste Vorlagen bleiben.
UPDATE "MailTemplate"
SET "subject" = E'Erinnerung: Helfer gesucht – {{event}}',
    "bodyText" = E'Hallo {{vorname}} {{nachname}}\n\nFür folgenden Helfereinsatz werden noch Helfer gesucht:\n\n{{einsaetze}}\n\nBitte prüft, ob ihr unterstützen könnt. Anmelden könnt ihr euch hier: {{link}}\n\nSportliche Grüsse\nHC Dragon Thun'
WHERE "key" = 'REMINDER_UNFILLED'
  AND "subject" = E'Erinnerung: Noch offene Helfereinsätze'
  AND "bodyText" IN (E'Hallo {{vorname}} {{nachname}}\n\nFür {{event}} am {{datum}} in {{standort}} sind noch nicht alle Helfereinsätze besetzt. Bitte prüft, ob ihr unterstützen könnt, damit der Spielbetrieb gewährleistet ist.\n\nSportliche Grüsse\nHC Dragon Thun', E'Hallo {{vorname}} {{nachname}}\n\nFolgende Helfereinsätze sind noch nicht besetzt:\n\n{{einsaetze}}\n\nBitte prüft, ob ihr unterstützen könnt, damit der Spielbetrieb gewährleistet ist. Anmelden könnt ihr euch hier: {{link}}\n\nSportliche Grüsse\nHC Dragon Thun');

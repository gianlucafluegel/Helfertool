-- Hinweis auf die Abmeldefrist (7 Tage) in der Anmeldebestätigung. Nur die
-- unveränderte Standardvorlage wird aktualisiert; angepasste Texte bleiben.
UPDATE "MailTemplate"
SET "bodyText" = E'Hallo {{vorname}} {{nachname}}\n\nDanke für deine Anmeldung als {{taetigkeit}} beim Einsatz {{event}} am {{datum}} in {{standort}}.\n\nDeine Einsätze findest du jederzeit unter ''Mein Konto''. Du kannst dich dort bis 7 Tage vor dem Einsatz selbst abmelden. Danach melde dich bitte bei deinem Stufenleiter.\n\nSportliche Grüsse\nHC Dragon Thun'
WHERE "key" = 'SIGNUP_CONFIRMATION'
  AND "bodyText" = E'Hallo {{vorname}} {{nachname}}\n\nDanke für deine Anmeldung als {{taetigkeit}} beim Einsatz {{event}} am {{datum}} in {{standort}}.\n\nBei Fragen oder falls du dich abmelden musst, findest du deine Einsätze jederzeit unter ''Mein Konto''.\n\nSportliche Grüsse\nHC Dragon Thun';

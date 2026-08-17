# Helfertool HC Dragon Thun

Helfereinsatz-Verwaltung für den HC Dragon Thun: Geschäftsstelle, Stufenleiter,
Helfer/Mitglieder und Funktionäre verwalten und übernehmen Helfereinsätze rund um Spiele
und externe Events.

Stack: Next.js (App Router) · PostgreSQL + Prisma · Auth.js (Credentials) · nodemailer.

## Lokale Entwicklung

Voraussetzungen: Node 20.9+ (getestet mit Node 24), npm.

```bash
npm install
```

Lokale Postgres-Datenbank starten (Prisma's eingebauter Dev-Server, kein Docker nötig):

```bash
npx prisma dev --name helfertool -p 51213 -P 51214
```

Die ausgegebenen `DATABASE_URL`/`SHADOW_DATABASE_URL` in `.env` eintragen (siehe
`.env.example` für alle weiteren Variablen: `AUTH_SECRET`, `SMTP_*`, `SEED_ADMIN_EMAIL/PASSWORD`).

```bash
npx prisma migrate dev
npx prisma db seed
npm run dev
```

App läuft auf http://localhost:3000. Login mit den `SEED_ADMIN_EMAIL`/`SEED_ADMIN_PASSWORD`
Werten aus `.env` (Rolle Geschäftsstelle).

E-Mails werden nur verschickt, wenn `SMTP_HOST` gesetzt ist — für lokale Tests eignet sich
z.B. [Mailhog](https://github.com/mailhog/MailHog) oder der `mailhog`-Service aus
`docker-compose.yml`.

## Deployment (Docker Compose)

```bash
cp .env.example .env
# .env mit echten Werten befüllen (DATABASE_URL/POSTGRES_*, AUTH_SECRET, NEXTAUTH_URL, SMTP_*)
docker compose up --build -d
```

Der `app`-Container führt beim Start automatisch `prisma migrate deploy` aus, bevor der
Server startet (`docker-entrypoint.sh`). Erstmaliges Seeding (Stufen/Tätigkeiten/
Mail-Vorlagen/Admin-Login) manuell ausführen:

```bash
docker compose exec app npx prisma db seed
```

`AUTH_SECRET` generieren mit:

```bash
openssl rand -base64 32
```

## Projektstruktur

- `prisma/schema.prisma` – Datenmodell
- `lib/` – Auth, Prisma-Client, Business-Regeln (`lib/rules`), Mailversand (`lib/mail`),
  Server Actions (`lib/actions`)
- `app/(authenticated)/` – Rollenbereiche: `einsaetze/`, `mein-konto/`, `stufenleiter/`,
  `geschaeftsstelle/`
- `proxy.ts` – Next.js 16 Routing-Guard (ehem. `middleware.ts`) für Login/Rollen-Schutz

## Phase 1 vs. spätere Phasen

Diese Version deckt Kern-Funktionalität ab: Datenmodell, Login/Rollen, manuelle
Event-/Einsatzverwaltung, Anmeldung/Abmeldung, Stundenkonto, Bestätigungs-/Reminder-Mails,
CSV-Export pro Einsatz/Event. Excel-Import, Saison-Export, Mehrjahres-Archiv-Ansicht und
automatische Absage-Benachrichtigungen sind für eine spätere Phase vorgesehen (Datenmodell
ist bereits dafür vorbereitet, z.B. `Member.externalContactId`, `Event.externalRef`,
`ImportBatch`).

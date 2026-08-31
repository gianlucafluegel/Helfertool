import Link from "next/link";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type Zeitraum = "zukunft" | "vergangen" | "alle";

function buildHref(q: string | undefined, zeitraum: Zeitraum) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (zeitraum !== "zukunft") params.set("zeitraum", zeitraum);
  const qs = params.toString();
  return qs ? `/geschaeftsstelle?${qs}` : "/geschaeftsstelle";
}

export default async function GeschaeftsstelleOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; zeitraum?: string }>;
}) {
  const { q, zeitraum: zeitraumRaw } = await searchParams;
  const zeitraum: Zeitraum =
    zeitraumRaw === "vergangen" || zeitraumRaw === "alle" ? zeitraumRaw : "zukunft";
  const season = await getCurrentSeason();
  if (!season) {
    return <p className="text-sm text-muted">Keine aktive Saison konfiguriert.</p>;
  }

  const now = new Date();
  const dateFilter =
    zeitraum === "vergangen"
      ? { startDateTime: { lt: now } }
      : zeitraum === "alle"
        ? {}
        : { startDateTime: { gte: now } };

  const [statsEvents, listEvents] = await Promise.all([
    prisma.event.findMany({
      where: { seasonId: season.id, deletedAt: null, isManualEntry: false },
      include: {
        shiftSlots: {
          where: { deletedAt: null },
          include: { signups: { where: { status: "CONFIRMED" } } },
        },
      },
    }),
    prisma.event.findMany({
      where: {
        seasonId: season.id,
        deletedAt: null,
        isManualEntry: false,
        ...dateFilter,
        ...(q
          ? {
              OR: [
                { title: { contains: q, mode: "insensitive" } },
                { description: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        location: true,
        shiftSlots: {
          where: { deletedAt: null },
          include: { signups: { where: { status: "CONFIRMED" } } },
        },
      },
      orderBy: { startDateTime: "asc" },
    }),
  ]);

  const gameCount = statsEvents.filter((e) => e.type === "GAME").length;
  const externalCount = statsEvents.filter((e) => e.type === "EXTERNAL").length;
  let filled = 0;
  let open = 0;
  for (const e of statsEvents) {
    for (const s of e.shiftSlots) {
      if (s.signups.length >= s.capacity) filled += 1;
      else open += 1;
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card>
          <p className="text-2xl font-bold text-navy">{gameCount}</p>
          <p className="text-xs text-muted">Spiele</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-navy">{externalCount}</p>
          <p className="text-xs text-muted">Externe Events</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-status-filled-text">{filled}</p>
          <p className="text-xs text-muted">Einsätze besetzt</p>
        </Card>
        <Card>
          <p className="text-2xl font-bold text-status-open-text">{open}</p>
          <p className="text-xs text-muted">Einsätze offen</p>
        </Card>
      </div>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          Helfereinsätze suchen
        </h2>
        <form className="mb-4 flex gap-2" action="/geschaeftsstelle">
          <input type="hidden" name="zeitraum" value={zeitraum} />
          <input
            type="text"
            name="q"
            defaultValue={q ?? ""}
            placeholder="Titel oder Beschreibung durchsuchen…"
            className="w-full max-w-sm rounded-lg border border-border bg-white px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-gold-hover"
          >
            Suchen
          </button>
          {(q || zeitraum !== "zukunft") && (
            <Link
              href="/geschaeftsstelle"
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text hover:border-navy/40"
            >
              Zurücksetzen
            </Link>
          )}
        </form>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ["zukunft", "Zukünftig"],
              ["vergangen", "Vergangen"],
              ["alle", "Alle"],
            ] as const
          ).map(([value, label]) => (
            <Link
              key={value}
              href={buildHref(q, value)}
              className={clsx(
                "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
                zeitraum === value
                  ? "border-navy bg-navy text-white"
                  : "border-border bg-white text-text hover:border-navy/40",
              )}
            >
              {label}
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
          {q ? `Suchergebnisse für "${q}"` : "Alle Helfereinsätze"}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase text-muted">
                <th className="py-2 pr-3">Datum</th>
                <th className="py-2 pr-3">Titel</th>
                <th className="py-2 pr-3">Standort</th>
                <th className="py-2 pr-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {listEvents.map((event) => {
                const eventOpen = event.shiftSlots.filter(
                  (s) => s.signups.length < s.capacity,
                ).length;
                return (
                  <tr key={event.id} className="border-b border-border last:border-b-0">
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {event.startDateTime.toLocaleString("de-CH", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/geschaeftsstelle/helfereinsaetze/${event.id}`}
                        className="font-medium text-gold-hover hover:underline"
                      >
                        {event.title}
                      </Link>
                    </td>
                    <td className="py-2 pr-3">{event.location?.name ?? "–"}</td>
                    <td className="py-2 pr-3">
                      {event.status === "CANCELLED" ? (
                        <Badge variant="open">abgesagt</Badge>
                      ) : eventOpen > 0 ? (
                        <Badge variant="open">{eventOpen} offen</Badge>
                      ) : (
                        <Badge variant="filled">besetzt</Badge>
                      )}
                    </td>
                  </tr>
                );
              })}
              {listEvents.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-center text-muted">
                    Keine Helfereinsätze gefunden.
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

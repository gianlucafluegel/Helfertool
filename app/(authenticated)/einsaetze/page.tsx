import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { isShiftSlotVisible } from "@/lib/visibility";
import { FilterChipLink } from "@/components/ui/FilterChipLink";
import { LocationPinIcon } from "@/components/ui/LocationPinIcon";
import { EventSummaryCard } from "@/components/shifts/EventSummaryCard";
import { TeamFilterSelect } from "@/components/shifts/TeamFilterSelect";
import { MemberTabs } from "@/components/layout/MemberTabs";

type Filters = {
  standort?: string;
  stufe?: string;
  typ?: string;
  nurMeine?: string;
  von?: string;
  bis?: string;
};

function buildHref(current: Filters, patch: Partial<Filters>) {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(merged)) {
    if (value) params.set(key, value);
  }
  const qs = params.toString();
  return qs ? `/einsaetze?${qs}` : "/einsaetze";
}

export default async function EinsaetzePage({
  searchParams,
}: {
  searchParams: Promise<Filters>;
}) {
  const filters = await searchParams;
  const session = await auth();
  if (!session?.user) return null;

  const [season, locations, ageGroups] = await Promise.all([
    getCurrentSeason(),
    prisma.location.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.ageGroup.findMany({
      where: { isActive: true, visibleInTeamFilters: true },
      orderBy: { sortOrder: "asc" },
    }),
  ]);

  if (!season) {
    return <p className="text-sm text-muted">Keine aktive Saison konfiguriert.</p>;
  }

  const activeMember = session.user.member;

  // Man kann sich für einen bereits stattgefundenen Einsatz ohnehin nicht
  // mehr anmelden — vergangene Einsätze werden hier deshalb immer
  // ausgeblendet, auch wenn "Von" in der Vergangenheit liegt. Der
  // Datumsfilter läuft auf Event.date (ganzer Tag); ob eine einzelne Rolle
  // innerhalb eines heutigen Events schon begonnen hat, wird weiter unten
  // pro Rolle anhand der genauen Uhrzeit geprüft.
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const vonDate = filters.von ? new Date(filters.von) : null;
  const bisDate = filters.bis ? new Date(filters.bis) : null;
  const gte = vonDate && vonDate > todayStart ? vonDate : todayStart;

  const events = await prisma.event.findMany({
    where: {
      seasonId: season.id,
      deletedAt: null,
      isManualEntry: false,
      status: { not: "CANCELLED" },
      date: {
        gte,
        ...(bisDate ? { lt: new Date(bisDate.getTime() + 24 * 60 * 60 * 1000) } : {}),
      },
      ...(filters.standort ? { locationId: filters.standort } : {}),
      ...(filters.typ === "GAME" || filters.typ === "EXTERNAL" ? { type: filters.typ } : {}),
    },
    include: {
      location: true,
      shiftSlots: {
        where: { deletedAt: null },
        include: {
          activity: true,
          ageGroupRestrictions: { include: { ageGroup: true } },
          signups: { where: { status: "CONFIRMED" } },
        },
      },
    },
    orderBy: { date: "asc" },
  });

  const eventCards = events
    .map((event) => {
      let slots = event.shiftSlots.filter(
        (slot) => isShiftSlotVisible(slot, session.user.role) && slot.startDateTime >= now,
      );

      if (filters.stufe) {
        slots = slots.filter((slot) =>
          slot.ageGroupRestrictions.some((r) => r.ageGroupId === filters.stufe),
        );
      }

      if (filters.nurMeine === "1" && activeMember) {
        slots = slots.filter((slot) => slot.signups.some((s) => s.memberId === activeMember.id));
      }

      return { event, hasVisibleSlots: slots.length > 0 };
    })
    .filter(({ hasVisibleSlots }) => hasVisibleSlots)
    .map(({ event }) => event);

  return (
    <div className="flex flex-col gap-5">
      <MemberTabs active="einsaetze" />

      <div className="flex flex-wrap gap-2">
        <FilterChipLink
          active={!filters.standort}
          href={buildHref(filters, { standort: undefined })}
          icon={<LocationPinIcon />}
        >
          Alle
        </FilterChipLink>
        {locations.map((loc) => (
          <FilterChipLink
            key={loc.id}
            active={filters.standort === loc.id}
            href={buildHref(filters, { standort: loc.id })}
            icon={<LocationPinIcon />}
          >
            {loc.name}
          </FilterChipLink>
        ))}
      </div>

      <TeamFilterSelect
        ageGroups={ageGroups}
        value={filters.stufe ?? ""}
        baseHref={buildHref(filters, { stufe: undefined })}
      />

      <div className="flex flex-wrap gap-2">
        <FilterChipLink active={!filters.typ} href={buildHref(filters, { typ: undefined })}>
          Alle Events
        </FilterChipLink>
        <FilterChipLink active={filters.typ === "GAME"} href={buildHref(filters, { typ: "GAME" })}>
          Spiele
        </FilterChipLink>
        <FilterChipLink
          active={filters.typ === "EXTERNAL"}
          href={buildHref(filters, { typ: "EXTERNAL" })}
        >
          Externe Events
        </FilterChipLink>
      </div>

      <form action="/einsaetze" className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="standort" value={filters.standort ?? ""} />
        <input type="hidden" name="stufe" value={filters.stufe ?? ""} />
        <input type="hidden" name="typ" value={filters.typ ?? ""} />
        <input type="hidden" name="nurMeine" value={filters.nurMeine ?? ""} />
        <div className="flex flex-col gap-1">
          <label htmlFor="von" className="text-xs font-medium text-muted">
            Von
          </label>
          <input
            id="von"
            name="von"
            type="date"
            defaultValue={filters.von ?? ""}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="bis" className="text-xs font-medium text-muted">
            Bis
          </label>
          <input
            id="bis"
            name="bis"
            type="date"
            defaultValue={filters.bis ?? ""}
            className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm"
          />
        </div>
        <button
          type="submit"
          className="rounded-full border border-border bg-white px-3.5 py-1.5 text-sm font-semibold text-text hover:border-navy/40"
        >
          Filtern
        </button>
        {(filters.von || filters.bis) && (
          <FilterChipLink href={buildHref(filters, { von: undefined, bis: undefined })}>
            Datumsfilter zurücksetzen
          </FilterChipLink>
        )}
      </form>

      {activeMember && (
        <FilterChipLink
          active={filters.nurMeine === "1"}
          href={buildHref(filters, { nurMeine: filters.nurMeine === "1" ? undefined : "1" })}
          className="self-start"
        >
          Nur meine Einsätze ({activeMember.firstName})
        </FilterChipLink>
      )}

      {eventCards.length === 0 && (
        <p className="text-sm text-muted">Keine Einsätze für diese Filter gefunden.</p>
      )}

      {eventCards.map((event) => (
        <EventSummaryCard
          key={event.id}
          eventId={event.id}
          title={event.title}
          locationName={event.location?.name ?? event.locationText ?? null}
          date={event.date}
        />
      ))}
    </div>
  );
}

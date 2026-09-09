import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { isShiftSlotVisible } from "@/lib/visibility";
import { FilterChipLink } from "@/components/ui/FilterChipLink";
import { LocationPinIcon } from "@/components/ui/LocationPinIcon";
import { EventCard } from "@/components/shifts/EventCard";
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
  // ausgeblendet, auch wenn "Von" in der Vergangenheit liegt.
  const now = new Date();
  const vonDate = filters.von ? new Date(filters.von) : null;
  const bisDate = filters.bis ? new Date(filters.bis) : null;

  const events = await prisma.event.findMany({
    where: {
      seasonId: season.id,
      deletedAt: null,
      isManualEntry: false,
      status: { not: "CANCELLED" },
      startDateTime: {
        gte: vonDate && vonDate > now ? vonDate : now,
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
    orderBy: { startDateTime: "asc" },
  });

  // Structure matches the Mitglied page exactly — Funktionär (and above) see
  // who's doing an already-filled Einsatz by clicking into it ("Ansehen"),
  // not via names shown inline in the list.
  const canViewOccupant = session.user.role !== "MITGLIED";

  const eventCards = events
    .map((event) => {
      let slots = event.shiftSlots.filter((slot) => isShiftSlotVisible(slot, session.user.role));

      if (filters.stufe) {
        slots = slots.filter((slot) =>
          slot.ageGroupRestrictions.some((r) => r.ageGroupId === filters.stufe),
        );
      }

      if (filters.nurMeine === "1" && activeMember) {
        slots = slots.filter((slot) =>
          slot.signups.some((s) => s.memberId === activeMember.id),
        );
      }

      return {
        event,
        slots: slots.map((slot) => ({ ...slot, creditHours: Number(slot.creditHours) })),
      };
    })
    .filter(({ slots }) => slots.length > 0);

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

      <div className="flex flex-wrap gap-2">
        <FilterChipLink
          active={!filters.stufe}
          activeVariant="blue"
          href={buildHref(filters, { stufe: undefined })}
        >
          Alle Teams
        </FilterChipLink>
        {ageGroups.map((ag) => (
          <FilterChipLink
            key={ag.id}
            active={filters.stufe === ag.id}
            activeVariant="blue"
            href={buildHref(filters, { stufe: ag.id })}
          >
            {ag.name}
          </FilterChipLink>
        ))}
      </div>

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

      {eventCards.map(({ event, slots }) => (
        <EventCard
          key={event.id}
          title={event.title}
          startDateTime={event.startDateTime}
          endDateTime={event.endDateTime}
          locationName={event.location?.name ?? event.locationText ?? null}
          requirements={event.requirements}
          shiftSlots={slots}
          showOccupant={false}
          activeMemberId={activeMember?.id ?? null}
          allowSelfCancel
          canViewOccupant={canViewOccupant}
        />
      ))}
    </div>
  );
}

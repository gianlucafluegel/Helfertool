import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentSeason } from "@/lib/season";
import { getMemberAgeGroupId } from "@/lib/member";
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
    prisma.ageGroup.findMany({ where: { isActive: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  if (!season) {
    return <p className="text-sm text-muted">Keine aktive Saison konfiguriert.</p>;
  }

  const activeMember = session.user.member;
  const memberAgeGroupId = activeMember
    ? await getMemberAgeGroupId(activeMember.id, season.id)
    : null;

  const events = await prisma.event.findMany({
    where: {
      seasonId: season.id,
      deletedAt: null,
      status: { not: "CANCELLED" },
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

  const canSeeOccupants = session.user.role === "FUNKTIONAER";

  const eventCards = events
    .map((event) => {
      let slots = event.shiftSlots.filter((slot) =>
        isShiftSlotVisible(slot, session.user.role, memberAgeGroupId),
      );

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

      return { event, slots };
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
          Alle Stufen
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

      {activeMember && (
        <FilterChipLink
          active={filters.nurMeine === "1"}
          href={buildHref(filters, { nurMeine: filters.nurMeine === "1" ? undefined : "1" })}
          className="self-start"
        >
          Nur meine Einsätze ({activeMember.firstName})
        </FilterChipLink>
      )}

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

      {eventCards.length === 0 && (
        <p className="text-sm text-muted">Keine Einsätze für diese Filter gefunden.</p>
      )}

      {eventCards.map(({ event, slots }) => (
        <EventCard
          key={event.id}
          title={event.title}
          startDateTime={event.startDateTime}
          locationName={event.location?.name ?? null}
          shiftSlots={slots}
          showOccupant={canSeeOccupants}
          activeMemberId={activeMember?.id ?? null}
          allowSelfCancel
        />
      ))}
    </div>
  );
}

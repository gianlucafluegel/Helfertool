"use client";

import { useRouter } from "next/navigation";

export function TeamFilterSelect({
  ageGroups,
  value,
  baseHref,
}: {
  ageGroups: { id: string; name: string }[];
  value: string;
  /** Href mit allen anderen aktiven Filtern, aber ohne "stufe" (z.B. "/einsaetze?standort=X"). */
  baseHref: string;
}) {
  const router = useRouter();

  function handleChange(newStufe: string) {
    const url = new URL(baseHref, "http://dummy");
    if (newStufe) url.searchParams.set("stufe", newStufe);
    router.push(`${url.pathname}${url.search}`);
  }

  return (
    <select
      value={value}
      onChange={(e) => handleChange(e.target.value)}
      className="rounded-lg border border-border bg-white px-3 py-1.5 text-sm font-semibold text-text"
    >
      <option value="">Alle Teams</option>
      {ageGroups.map((ag) => (
        <option key={ag.id} value={ag.id}>
          {ag.name}
        </option>
      ))}
    </select>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { buildListHref, type ActiveFilter } from "@/lib/list-params";

const FILTERS: [ActiveFilter, string][] = [
  ["aktiv", "Aktiv"],
  ["archiviert", "Archiviert"],
  ["alle", "Alle"],
];

export function ListSearchForm({
  basePath,
  q,
  status,
  placeholder,
}: {
  basePath: string;
  q?: string;
  status: ActiveFilter;
  placeholder: string;
}) {
  const router = useRouter();

  return (
    <div className="mb-3 flex flex-col gap-3">
      <form
        className="flex gap-2"
        action={basePath}
        onSubmit={(event) => {
          event.preventDefault();
          const value = String(new FormData(event.currentTarget).get("q") ?? "").trim();
          router.push(buildListHref(basePath, { q: value || undefined, status }), { scroll: false });
        }}
      >
        <input
          key={q ?? ""}
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder={placeholder}
          className="w-full max-w-sm rounded-lg border border-border bg-white px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-full bg-gold px-4 py-2 text-sm font-semibold text-navy hover:bg-gold-hover"
        >
          Suchen
        </button>
        {(q || status !== "aktiv") && (
          <Link
            href={basePath}
            scroll={false}
            className="rounded-full border border-border px-4 py-2 text-sm font-medium text-text hover:border-navy/40"
          >
            Zurücksetzen
          </Link>
        )}
      </form>
      <div className="flex flex-wrap gap-2">
        {FILTERS.map(([value, label]) => (
          <Link
            key={value}
            href={buildListHref(basePath, { q, status: value })}
            scroll={false}
            className={clsx(
              "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition-colors",
              status === value
                ? "border-navy bg-navy text-white"
                : "border-border bg-white text-text hover:border-navy/40",
            )}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

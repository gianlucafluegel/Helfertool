import Link from "next/link";
import clsx from "clsx";
import { buildListHref, type ActiveFilter } from "@/lib/list-params";

function pageWindow(page: number, totalPages: number): (number | "…")[] {
  const wanted = new Set([1, totalPages, page - 1, page, page + 1]);
  const pages = [...wanted].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  pages.forEach((p, i) => {
    if (i > 0 && p - pages[i - 1] > 1) result.push("…");
    result.push(p);
  });
  return result;
}

export function Pagination({
  basePath,
  q,
  status,
  page,
  totalPages,
  total,
}: {
  basePath: string;
  q?: string;
  status: ActiveFilter;
  page: number;
  totalPages: number;
  total: number;
}) {
  if (totalPages <= 1) {
    return <p className="mt-3 text-xs text-muted">{total} {total === 1 ? "Eintrag" : "Einträge"}</p>;
  }

  const href = (p: number) => buildListHref(basePath, { q, status, page: p });
  const linkClass = "rounded-full border px-3 py-1 text-sm font-medium transition-colors";

  return (
    <nav className="mt-3 flex flex-wrap items-center gap-2" aria-label="Seiten">
      {page > 1 && (
        <Link href={href(page - 1)} scroll={false} className={clsx(linkClass, "border-border text-text hover:border-navy/40")}>
          ← Zurück
        </Link>
      )}
      {pageWindow(page, totalPages).map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-muted">
            …
          </span>
        ) : (
          <Link
            key={p}
            href={href(p)}
            scroll={false}
            aria-current={p === page ? "page" : undefined}
            className={clsx(
              linkClass,
              p === page
                ? "border-navy bg-navy text-white"
                : "border-border text-text hover:border-navy/40",
            )}
          >
            {p}
          </Link>
        ),
      )}
      {page < totalPages && (
        <Link href={href(page + 1)} scroll={false} className={clsx(linkClass, "border-border text-text hover:border-navy/40")}>
          Weiter →
        </Link>
      )}
      <span className="ml-1 text-xs text-muted">
        Seite {page} von {totalPages} · {total} Einträge
      </span>
    </nav>
  );
}

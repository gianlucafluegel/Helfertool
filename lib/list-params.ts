export type ActiveFilter = "aktiv" | "archiviert" | "alle";

export const LIST_PAGE_SIZE = 20;

export type ListParams = { q?: string; status?: string; page?: string };

export function parseListParams(params: ListParams) {
  const status: ActiveFilter =
    params.status === "archiviert" || params.status === "alle" ? params.status : "aktiv";
  const page = Math.max(1, Math.floor(Number(params.page)) || 1);
  return { q: params.q?.trim() || undefined, status, page };
}

export function matchesActiveFilter(isActive: boolean, status: ActiveFilter): boolean {
  return status === "alle" || (status === "aktiv" ? isActive : !isActive);
}

export function paginate<T>(items: T[], page: number, pageSize = LIST_PAGE_SIZE) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);
  return {
    items: items.slice((current - 1) * pageSize, current * pageSize),
    page: current,
    totalPages,
    total: items.length,
  };
}

/** Baut die URL einer Listenansicht; Standardwerte (aktiv, Seite 1) bleiben weg. */
export function buildListHref(
  basePath: string,
  params: { q?: string; status?: ActiveFilter; page?: number },
): string {
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.status && params.status !== "aktiv") search.set("status", params.status);
  if (params.page && params.page > 1) search.set("page", String(params.page));
  const qs = search.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

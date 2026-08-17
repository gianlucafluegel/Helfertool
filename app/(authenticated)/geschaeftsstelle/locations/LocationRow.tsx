"use client";

import { useTransition } from "react";
import { toggleLocationActive } from "@/lib/actions/catalog";

export function LocationRow({
  id,
  name,
  address,
  isActive,
}: {
  id: string;
  name: string;
  address: string | null;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-2 pr-3 font-medium text-text">{name}</td>
      <td className="py-2 pr-3 text-muted">{address ?? "–"}</td>
      <td className="py-2 pr-3 text-muted">{isActive ? "Aktiv" : "Inaktiv"}</td>
      <td className="py-2 pr-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => toggleLocationActive(id))}
          className="text-xs font-medium text-gold-hover hover:underline"
        >
          {isActive ? "Deaktivieren" : "Aktivieren"}
        </button>
      </td>
    </tr>
  );
}

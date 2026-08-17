"use client";

import { useTransition } from "react";
import { toggleActivityActive } from "@/lib/actions/catalog";

export function ActivityRow({
  id,
  name,
  defaultArea,
  requiresPayoutChoice,
  isActive,
}: {
  id: string;
  name: string;
  defaultArea: string | null;
  requiresPayoutChoice: boolean;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-2 pr-3 font-medium text-text">{name}</td>
      <td className="py-2 pr-3 text-muted">
        {defaultArea === "FUNKTIONAER" ? "Funktionär" : "Helfer"}
      </td>
      <td className="py-2 pr-3 text-muted">{requiresPayoutChoice ? "Ja" : "–"}</td>
      <td className="py-2 pr-3 text-muted">{isActive ? "Aktiv" : "Inaktiv"}</td>
      <td className="py-2 pr-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => toggleActivityActive(id))}
          className="text-xs font-medium text-gold-hover hover:underline"
        >
          {isActive ? "Deaktivieren" : "Aktivieren"}
        </button>
      </td>
    </tr>
  );
}

"use client";

import { useTransition } from "react";
import { toggleAgeGroupActive } from "@/lib/actions/catalog";

export function AgeGroupRow({
  id,
  name,
  isActive,
  triggersBarbezugChoice,
}: {
  id: string;
  name: string;
  isActive: boolean;
  triggersBarbezugChoice: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <tr className="border-b border-border last:border-b-0">
      <td className="py-2 pr-3 font-medium text-text">{name}</td>
      <td className="py-2 pr-3 text-muted">{triggersBarbezugChoice ? "Ja" : "–"}</td>
      <td className="py-2 pr-3 text-muted">{isActive ? "Aktiv" : "Inaktiv"}</td>
      <td className="py-2 pr-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => toggleAgeGroupActive(id))}
          className="text-xs font-medium text-gold-hover hover:underline"
        >
          {isActive ? "Deaktivieren" : "Aktivieren"}
        </button>
      </td>
    </tr>
  );
}

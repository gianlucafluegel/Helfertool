"use client";

import { useState, useTransition } from "react";
import { inviteMemberLogin } from "@/lib/actions/members";
import { Button } from "@/components/ui/Button";

export function InviteLoginForm({
  memberId,
  ageGroups,
  currentRole,
}: {
  memberId: string;
  ageGroups: { id: string; name: string }[];
  currentRole?: string;
}) {
  const [role, setRole] = useState(currentRole ?? "MITGLIED");
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="flex flex-col gap-3"
      action={(formData) => {
        setMessage(null);
        startTransition(async () => {
          const result = await inviteMemberLogin(memberId, formData);
          setMessage(result.error ?? "Einladung versendet.");
        });
      }}
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-text" htmlFor="role">
          Rolle
        </label>
        <select
          id="role"
          name="role"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
        >
          <option value="MITGLIED">Mitglied / Helfer</option>
          <option value="FUNKTIONAER">Funktionär</option>
          <option value="STUFENLEITER">Stufenleiter</option>
          <option value="GESCHAEFTSSTELLE">Geschäftsstelle</option>
        </select>
      </div>

      {role === "STUFENLEITER" && (
        <div>
          <p className="mb-1 text-sm font-medium text-text">Zuständig für Team(s)</p>
          <div className="flex flex-wrap gap-3">
            {ageGroups.map((ag) => (
              <label key={ag.id} className="flex items-center gap-1.5 text-sm">
                <input type="checkbox" name="stufenleiterAgeGroupIds" value={ag.id} />
                {ag.name}
              </label>
            ))}
          </div>
        </div>
      )}

      {message && <p className="text-sm text-muted">{message}</p>}
      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Wird gesendet…" : currentRole ? "Login aktualisieren / neu einladen" : "Login erstellen & einladen"}
      </Button>
    </form>
  );
}

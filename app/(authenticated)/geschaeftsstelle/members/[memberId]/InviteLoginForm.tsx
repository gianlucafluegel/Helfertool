"use client";

import { useState, useTransition } from "react";
import { inviteMemberLogin } from "@/lib/actions/members";
import { ALLOWED_INVITE_ROLES } from "@/lib/rules/staff-roles";
import { Button } from "@/components/ui/Button";
import type { UserRole } from "@/generated/prisma/enums";

const ROLE_LABELS: Record<UserRole, string> = {
  MITGLIED: "Mitglied / Helfer",
  FUNKTIONAER: "Funktionär",
  STUFENLEITER: "Stufenleiter",
  GESCHAEFTSSTELLE: "Geschäftsstelle",
};

export function InviteLoginForm({
  memberId,
  ageGroups,
  currentRole,
}: {
  memberId: string;
  ageGroups: { id: string; name: string }[];
  currentRole?: UserRole;
}) {
  const roleOptions = ALLOWED_INVITE_ROLES[currentRole ?? "MITGLIED"].map((value) => ({
    value,
    label: ROLE_LABELS[value],
  }));
  const [role, setRole] = useState(roleOptions[0].value);
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
      {roleOptions.length > 1 ? (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-text" htmlFor="role">
            Rolle
          </label>
          <select
            id="role"
            name="role"
            value={role}
            onChange={(e) => setRole(e.target.value as UserRole)}
            className="rounded-lg border border-border bg-white px-3 py-2 text-sm"
          >
            {roleOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <>
          <input type="hidden" name="role" value={roleOptions[0].value} />
          <p className="text-sm text-muted">Rolle: {roleOptions[0].label}</p>
        </>
      )}

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

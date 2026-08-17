import type { SessionMember } from "@/lib/auth";
import { switchActiveMember } from "@/lib/actions/member-switch";

export function MemberSwitcher({
  members,
  activeMemberId,
}: {
  members: SessionMember[];
  activeMemberId: string | null;
}) {
  if (members.length === 0) return null;

  return (
    <div className="mx-auto flex max-w-3xl flex-wrap gap-2 px-4 pt-4">
      {members.map((member) => {
        const active = member.id === activeMemberId;
        const setActive = switchActiveMember.bind(null, member.id);
        return (
          <form key={member.id} action={setActive}>
            <button
              type="submit"
              className={
                active
                  ? "rounded-full border-2 border-gold bg-gold px-4 py-2 text-sm font-semibold text-navy"
                  : "rounded-full border border-border bg-white px-4 py-2 text-sm font-medium text-text hover:border-navy/30"
              }
            >
              {member.firstName} {member.lastName}
            </button>
          </form>
        );
      })}
    </div>
  );
}

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/Card";
import { ProfileForm } from "./ProfileForm";

export default async function ProfilPage() {
  const session = await auth();
  if (!session?.user) return null;

  const activeMember = session.user.member;
  if (!activeMember) {
    return <p className="text-sm text-muted">Kein Mitgliedsprofil mit deinem Login verknüpft.</p>;
  }

  const member = await prisma.member.findUnique({ where: { id: activeMember.id } });
  if (!member) return null;

  return (
    <div className="flex flex-col gap-5">
      <h1 className="text-base font-semibold text-text">
        Kontaktangaben {member.firstName} {member.lastName}
      </h1>
      <Card>
        <ProfileForm
          memberId={member.id}
          email={member.email ?? ""}
          phone={member.phone ?? ""}
          iban={member.iban ?? ""}
        />
      </Card>
    </div>
  );
}

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getActiveMember } from "@/lib/active-member";
import { Navbar } from "@/components/layout/Navbar";
import { MemberSwitcher } from "@/components/layout/MemberSwitcher";

export default async function AuthenticatedLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const activeMember = await getActiveMember(session.user.members);

  return (
    <div className="flex min-h-screen flex-1 flex-col bg-page-bg">
      <Navbar role={session.user.role} />
      <MemberSwitcher members={session.user.members} activeMemberId={activeMember?.id ?? null} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}

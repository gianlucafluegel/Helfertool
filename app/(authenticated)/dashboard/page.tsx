import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

const ROLE_HOME: Record<string, string> = {
  GESCHAEFTSSTELLE: "/geschaeftsstelle",
  STUFENLEITER: "/stufenleiter",
  FUNKTIONAER: "/einsaetze",
  MITGLIED: "/einsaetze",
};

export default async function DashboardPage() {
  const session = await auth();
  redirect(ROLE_HOME[session?.user.role ?? "MITGLIED"] ?? "/einsaetze");
}

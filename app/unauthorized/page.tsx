import Link from "next/link";
import { Card } from "@/components/ui/Card";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-page-bg px-4">
      <Card className="max-w-sm text-center">
        <h1 className="mb-2 text-lg font-semibold text-navy">Kein Zugriff</h1>
        <p className="mb-4 text-sm text-muted">
          Du hast keine Berechtigung, um diese Seite zu sehen.
        </p>
        <Link href="/dashboard" className="text-sm font-medium text-gold-hover hover:underline">
          Zurück zum Dashboard
        </Link>
      </Card>
    </div>
  );
}

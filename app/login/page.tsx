import { Suspense } from "react";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-page-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gold font-bold text-navy">
            D
          </div>
          <div>
            <p className="text-sm font-bold uppercase tracking-wide text-navy">
              Dragon Thun · Helfertool
            </p>
            <p className="text-xs text-muted">Anmelden</p>
          </div>
        </div>
        <Card>
          <Suspense>
            <LoginForm />
          </Suspense>
        </Card>
      </div>
    </div>
  );
}

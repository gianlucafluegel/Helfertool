import { Suspense } from "react";
import Image from "next/image";
import { Card } from "@/components/ui/Card";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-page-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <Image
            src="/dragon-logo.png"
            alt="HC Dragon Thun"
            width={333}
            height={400}
            priority
            className="h-10 w-auto"
          />
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

import { Card } from "@/components/ui/Card";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-page-bg px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-lg font-semibold text-navy">Passwort vergessen</h1>
        <Card>
          <ForgotPasswordForm />
        </Card>
      </div>
    </div>
  );
}

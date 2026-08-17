import { Card } from "@/components/ui/Card";
import { SetPasswordForm } from "./SetPasswordForm";

export default async function SetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; purpose?: string }>;
}) {
  const { token, purpose } = await searchParams;

  return (
    <div className="flex min-h-screen flex-1 items-center justify-center bg-page-bg px-4">
      <div className="w-full max-w-sm">
        <h1 className="mb-6 text-lg font-semibold text-navy">Passwort setzen</h1>
        <Card>
          {token ? (
            <SetPasswordForm token={token} purpose={purpose ?? "ACCOUNT_SETUP"} />
          ) : (
            <p className="text-sm text-status-open-text">Kein gültiger Link angegeben.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

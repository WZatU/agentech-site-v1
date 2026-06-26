import { AccountDashboard } from "@/components/account-dashboard";

export default function AccountPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-12 text-slate-950 lg:px-8 lg:py-16">
      <div className="mx-auto max-w-6xl">
        <AccountDashboard />
      </div>
    </main>
  );
}

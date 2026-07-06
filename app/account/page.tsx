import { AccountDashboard } from "@/components/account-dashboard";

export default function AccountPage() {
  return (
    <main className="account-white-page min-h-screen bg-[#f6f8fc] px-4 py-8 text-slate-950 sm:px-6 lg:px-8 lg:py-12">
      <div className="mx-auto max-w-6xl">
        <AccountDashboard />
      </div>
    </main>
  );
}

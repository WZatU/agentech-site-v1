import { AccountDashboard } from "@/components/account-dashboard";

export default function AccountPage() {
  return (
    <main className="account-white-page min-h-screen bg-[#f3f6fb] px-5 py-10 text-slate-950 sm:px-6 lg:px-8 lg:py-14">
      <div className="mx-auto max-w-7xl">
        <AccountDashboard />
      </div>
    </main>
  );
}

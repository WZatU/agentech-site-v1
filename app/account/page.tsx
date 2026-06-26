import { AccountDashboard } from "@/components/account-dashboard";

export default function AccountPage() {
  return (
    <main className="account-white-page account-illustrated-page min-h-screen bg-transparent px-5 py-10 text-slate-950 sm:px-6 lg:px-8 lg:py-14">
      <div className="relative z-[2] mx-auto max-w-5xl">
        <AccountDashboard />
      </div>
    </main>
  );
}

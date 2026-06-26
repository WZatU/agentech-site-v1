import { AdminInvoicesDashboard } from "@/components/admin-invoices-dashboard";

export default function AdminInvoicesPage() {
  return (
    <main className="account-white-page min-h-screen bg-[#f3f6fb] px-5 py-10 text-slate-950 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminInvoicesDashboard />
      </div>
    </main>
  );
}

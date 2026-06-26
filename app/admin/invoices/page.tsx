import { AdminInvoicesDashboard } from "@/components/admin-invoices-dashboard";

export default function AdminInvoicesPage() {
  return (
    <main className="min-h-screen bg-slate-100 px-6 py-10 text-slate-950 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <AdminInvoicesDashboard />
      </div>
    </main>
  );
}

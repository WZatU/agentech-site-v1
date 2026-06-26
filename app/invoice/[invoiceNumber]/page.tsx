import { InvoiceDetail } from "@/components/invoice-detail";

type InvoicePageProps = {
  params: Promise<{
    invoiceNumber: string;
  }>;
};

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { invoiceNumber } = await params;

  return (
    <main className="account-white-page min-h-screen bg-[#f3f6fb] px-4 py-10 text-slate-950 lg:px-8">
      <InvoiceDetail invoiceNumber={invoiceNumber} />
    </main>
  );
}

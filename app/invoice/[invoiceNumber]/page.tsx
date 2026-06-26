import { InvoiceDetail } from "@/components/invoice-detail";

type InvoicePageProps = {
  params: Promise<{
    invoiceNumber: string;
  }>;
};

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { invoiceNumber } = await params;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 lg:px-8">
      <InvoiceDetail invoiceNumber={invoiceNumber} />
    </main>
  );
}

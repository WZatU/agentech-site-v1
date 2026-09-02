import { HistoryBackButton } from "@/components/history-back-button";
import { PreorderForm } from "@/components/preorder-form";

type PreorderPageProps = {
  searchParams: Promise<{
    product?: string;
  }>;
};

export default async function PreorderPage({ searchParams }: PreorderPageProps) {
  const { product } = await searchParams;
  const selectedProduct = product || "Agentech Robot";

  return (
    <main className="mx-auto max-w-5xl px-6 py-12 lg:px-8 lg:py-16">
      <HistoryBackButton fallbackHref="/agentech-robotic" className="text-xs font-semibold uppercase tracking-[0.18em] text-slate transition hover:text-white" />
      <div className="mt-8">
        <PreorderForm product={selectedProduct} />
      </div>
    </main>
  );
}

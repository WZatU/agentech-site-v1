const productPrices: Record<string, { label: string; total: number }> = {
  "AEGIS PRO": { label: "AEGIS PRO", total: 4490 },
  "AEGIS ULTRA": { label: "AEGIS ULTRA", total: 9990 },
  "MASTER EDU": { label: "MASTER EDU", total: 27990 },
  "MASTER ULTRA": { label: "MASTER ULTRA", total: 49990 }
};

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0
  }).format(amount);
}

export function getProductPrice(product: string) {
  return productPrices[product.trim().toUpperCase()] ?? null;
}

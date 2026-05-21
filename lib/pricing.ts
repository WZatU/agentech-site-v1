export type ProductPrice = {
  product: string;
  basePrice: number;
  packagePrice: number;
  total: number;
  label: string;
};

const productPrices: Record<string, ProductPrice> = {
  "AEGIS PRO": {
    product: "AEGIS PRO",
    basePrice: 4490,
    packagePrice: 0,
    total: 4490,
    label: "AEGIS PRO"
  },
  "AEGIS ULTRA": {
    product: "AEGIS ULTRA",
    basePrice: 9990,
    packagePrice: 3000,
    total: 12990,
    label: "AEGIS ULTRA + skill package"
  },
  "MASTER EDU": {
    product: "MASTER EDU",
    basePrice: 27990,
    packagePrice: 10000,
    total: 37990,
    label: "MASTER EDU + skill package"
  },
  "MASTER ULTRA": {
    product: "MASTER ULTRA",
    basePrice: 49990,
    packagePrice: 15000,
    total: 64990,
    label: "MASTER ULTRA + skill package"
  }
};

export function getProductPrice(product: string) {
  return productPrices[product.trim().toUpperCase()] ?? null;
}

export function formatUsd(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2
  }).format(amount);
}

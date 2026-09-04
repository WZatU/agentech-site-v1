"use client";

import Image from "next/image";
import { useState } from "react";
import { moveProductIndex } from "@/lib/robotics-product-browser";

type ProductAccent = "navi" | "aegis" | "master";

type RoboticsProduct = {
  readonly name: string;
  readonly price: string;
  readonly package: readonly string[];
  readonly image: string;
  readonly imageFit: string;
  readonly imageClass: string;
  readonly accent: ProductAccent;
  readonly summary: string;
};

type RoboticsSection = {
  readonly title: string;
  readonly rows: readonly (readonly [string, ...string[]])[];
};

const accentText: Record<ProductAccent, string> = {
  navi: "text-[#8fd8c8]",
  aegis: "text-[#a8bdd6]",
  master: "text-[#c9b8f2]"
};

function ArrowIcon({ direction }: { direction: "left" | "right" }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-2">
      <path
        d={direction === "left" ? "M15 5 8 12l7 7" : "m9 5 7 7-7 7"}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function RoboticsMobileProductBrowser({
  products,
  sections
}: {
  products: readonly RoboticsProduct[];
  sections: readonly RoboticsSection[];
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const product = products[activeIndex];

  function selectAdjacentProduct(direction: -1 | 1) {
    setActiveIndex((currentIndex) => moveProductIndex(currentIndex, direction, products.length));
  }

  if (!product) return null;

  return (
    <div data-robotics-mobile-product-browser className="mt-10 md:hidden">
      <div
        data-robotics-mobile-product-navigation
        className="mb-5 grid grid-cols-[44px_minmax(0,1fr)_44px] items-center gap-3"
      >
        <button
          type="button"
          aria-label="Previous product"
          onClick={() => selectAdjacentProduct(-1)}
          className="grid h-11 w-11 place-items-center rounded-full border border-[#1b5f91]/70 bg-[#04101a] text-[#91dfff] transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#91dfff]"
        >
          <ArrowIcon direction="left" />
        </button>

        <div aria-live="polite" aria-atomic="true" className="min-w-0 text-center">
          <p className="font-technical text-[10px] uppercase tracking-[0.2em] text-slate-500">
            Product {String(activeIndex + 1).padStart(2, "0")} / {String(products.length).padStart(2, "0")}
          </p>
          <p className="font-interface mt-1 truncate text-sm font-semibold tracking-[0.08em] text-white">
            {product.name}
          </p>
        </div>

        <button
          type="button"
          aria-label="Next product"
          onClick={() => selectAdjacentProduct(1)}
          className="grid h-11 w-11 place-items-center rounded-full border border-[#1b5f91]/70 bg-[#04101a] text-[#91dfff] transition active:scale-95 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#91dfff]"
        >
          <ArrowIcon direction="right" />
        </button>
      </div>

      <article key={product.name} data-robotics-mobile-product-card className="overflow-hidden rounded-[20px] border border-[#1b5f91]/70 bg-[#020509]">
        <div data-robotics-product-image className="relative h-64 overflow-hidden bg-white">
          <Image
            src={product.image}
            alt={product.name}
            fill
            sizes="100vw"
            className={`${product.imageFit} ${product.imageClass}`}
            priority={activeIndex === 0}
          />
        </div>

        <div className="px-5 py-6">
          <p className={`font-technical text-xs font-semibold leading-[1.5] tracking-[0.18em] ${accentText[product.accent]}`}>
            {product.package.map((line) => (
              <span key={line} className="block">
                {line}
              </span>
            ))}
          </p>
          <h3 className="font-display mt-3 break-words text-3xl font-semibold tracking-[0.04em] text-white">
            {product.name}
          </h3>
          <p data-robotics-product-price className="font-technical mt-3 text-3xl font-semibold tracking-[0.03em] text-slate-100">
            {product.price}
          </p>
          <p className="font-interface mt-4 text-sm leading-7 text-slate-400">
            {product.summary}
          </p>
        </div>
      </article>

      <div data-robotics-mobile-specifications className="mt-6 overflow-hidden rounded-[20px] border border-[#1b5f91]/70 bg-[#020509]">
        {sections.map((section) => (
          <section
            key={section.title}
            aria-labelledby={`mobile-${section.title.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`}
            className="border-t border-[#1b5f91]/70 first:border-t-0"
          >
            <h4
              id={`mobile-${section.title.toLowerCase().replaceAll(" ", "-").replaceAll("&", "and")}`}
              className="bg-[#04101a] px-5 py-5 text-xs font-semibold uppercase tracking-[0.2em] text-[#91dfff]"
            >
              {section.title}
            </h4>
            <dl>
              {section.rows.map(([label, ...values]) => (
                <div key={label} className="border-t border-white/10 px-5 py-4 first:border-t-0">
                  <dt className="font-interface text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    {label}
                  </dt>
                  <dd
                    data-robotics-mobile-spec-value
                    className={`font-technical mt-2 break-words text-sm font-medium leading-6 tracking-[0.06em] ${accentText[product.accent]}`}
                  >
                    {values[activeIndex]}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <div role="group" className="mt-5 flex items-center justify-center gap-2" aria-label="Product position">
        {products.map((item, index) => (
          <button
            key={item.name}
            type="button"
            aria-label={`Show ${item.name}`}
            aria-current={index === activeIndex ? "true" : undefined}
            onClick={() => setActiveIndex(index)}
            className={`h-2 rounded-full transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#91dfff] ${index === activeIndex ? "w-7 bg-[#91dfff]" : "w-2 bg-white/20"}`}
          />
        ))}
      </div>
    </div>
  );
}

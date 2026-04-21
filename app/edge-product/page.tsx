import Image from "next/image";

const edgeProductImages = [
  {
    src: "/assets/edge-products/edge-product-01.png",
    alt: "Agentech immersive interface concept",
    title: "Interface Exploration"
  },
  {
    src: "/assets/edge-products/edge-product-02.png",
    alt: "Agentech concept vehicle interface",
    title: "Vehicle Systems Concept"
  },
  {
    src: "/assets/edge-products/edge-product-03.png",
    alt: "Agentech holographic mobility prototype",
    title: "Embodied Product Study"
  }
] as const;

export default function EdgeProductPage() {
  return (
    <>
      <section>
        <div className="mx-auto max-w-7xl px-6 pb-8 pt-16 lg:px-8 lg:pb-10 lg:pt-20">
          <h1 className="text-4xl font-semibold uppercase tracking-[0.22em] text-white md:text-6xl">
            UNDER CONSTRUCTION
          </h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-16 pt-6 lg:px-8 lg:pb-24 lg:pt-8">
        <div className="space-y-16 md:space-y-20">
          {edgeProductImages.map((image, index) => (
            <article key={image.src}>
              <div className="relative overflow-hidden rounded-[24px] bg-[#05080b]">
                <Image
                  src={image.src}
                  alt={image.alt}
                  width={1536}
                  height={1024}
                  className="h-auto w-full"
                  priority={index === 0}
                />
                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/30 to-transparent" />
              </div>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

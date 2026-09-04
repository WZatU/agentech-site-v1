import Image from "next/image";

type BrandMarkProps = {
  scale?: "sm" | "lg";
  stacked?: boolean;
};

export function BrandMark({ scale = "sm", stacked = false }: BrandMarkProps) {
  const isLarge = scale === "lg";

  if (!stacked) {
    return (
      <div className="flex items-center">
        <Image
          data-site-brand-image
          src="/assets/logo/AGENTECH-white.png"
          alt="Agentech"
          width={1000}
          height={101}
          className={isLarge ? "h-auto w-72 md:w-96" : "h-auto w-36"}
          priority
        />
      </div>
    );
  }

  return (
    <div className="space-y-2 text-center">
      <Image
        data-site-brand-image
        src="/assets/logo/AGENTECH-white.png"
        alt="Agentech"
        width={1000}
        height={101}
        className={isLarge ? "mx-auto h-auto w-72 md:w-96" : "mx-auto h-auto w-36"}
        priority
      />
      <div className="flex items-center justify-center gap-3">
        <span className={`${isLarge ? "w-12" : "w-8"} h-px bg-white/12`} />
        <span className={`${isLarge ? "w-12" : "w-8"} h-px bg-white/12`} />
      </div>
    </div>
  );
}

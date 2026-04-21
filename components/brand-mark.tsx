import { company } from "@/lib/site-data";

type BrandMarkProps = {
  scale?: "sm" | "lg";
  stacked?: boolean;
};

export function BrandMark({ scale = "sm", stacked = false }: BrandMarkProps) {
  const isLarge = scale === "lg";

  if (!stacked) {
    return (
      <div className="flex items-center gap-4">
        <div className={`brand-tag uppercase ${isLarge ? "text-5xl tracking-[0.12em] md:text-7xl" : "text-lg tracking-[0.12em]"}`}>
          AGENTECH
        </div>
        <div className="text-[9px] uppercase tracking-[0.22em] text-white/46 md:text-[10px]">
          {company.tagline}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2 text-center">
      <div
        className={`brand-tag uppercase ${
          isLarge
            ? "text-5xl tracking-[0.12em] md:text-7xl"
            : "text-lg tracking-[0.12em]"
        }`}
      >
        AGENTECH
      </div>
      <div className="flex items-center justify-center gap-3">
        <span className={`${isLarge ? "w-12" : "w-8"} h-px bg-white/12`} />
        <div className={`${isLarge ? "text-sm tracking-[0.22em]" : "text-[10px] tracking-[0.2em]"} uppercase text-white/52`}>
          {company.tagline}
        </div>
        <span className={`${isLarge ? "w-12" : "w-8"} h-px bg-white/12`} />
      </div>
    </div>
  );
}

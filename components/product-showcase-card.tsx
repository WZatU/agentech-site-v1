import Image from "next/image";

type ProductShowcaseCardProps = {
  label: string;
  name: string;
  summary: string;
  details: string;
  image: string;
  specs: string[];
  status: string;
};

export function ProductShowcaseCard({
  label,
  name,
  summary,
  details,
  image,
  specs,
  status
}: ProductShowcaseCardProps) {
  return (
    <article className="surface overflow-hidden">
      <div className="relative h-[360px] border-b border-white/8 bg-black md:h-[420px]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.06),_transparent_38%)]" />
        <div className="absolute inset-0 opacity-25 [background:repeating-linear-gradient(to_bottom,transparent_0,transparent_26px,rgba(112,201,255,0.03)_27px,transparent_54px)]" />
        <div className="absolute inset-0 flex items-center justify-center p-8 md:p-10">
          <div className="relative h-full w-full">
            <Image
              src={image}
              alt={name}
              fill
              className="object-contain object-center"
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black to-transparent" />
      </div>

      <div className="grid gap-6 p-6 lg:grid-cols-[1fr,0.78fr]">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="data-label">{label}</p>
            <span className="rounded-full border border-[#4bc5ff]/20 bg-[#07111a] px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-[#7dd6ff]">
              {status}
            </span>
          </div>
          <h3 className="mt-4 text-3xl font-semibold text-white">{name}</h3>
          <p className="mt-4 text-base leading-7 text-white">{summary}</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-slate">{details}</p>
        </div>

        <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
          <p className="text-[11px] uppercase tracking-[0.22em] text-slate">Focus</p>
          <div className="mt-4 flex flex-wrap gap-3">
            {specs.map((spec) => (
              <span
                key={spec}
                className="rounded-full border border-white/10 bg-black px-4 py-2 text-sm text-slate"
              >
                {spec}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

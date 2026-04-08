import Link from "next/link";

type PageHeroProps = {
  eyebrow: string;
  title: string;
  description: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
};

export function PageHero({
  eyebrow,
  title,
  description,
  primaryCta,
  secondaryCta
}: PageHeroProps) {
  return (
    <section className="relative overflow-hidden border-b border-[#363d45]/70">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,196,255,0.08),_transparent_32%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="max-w-4xl animate-rise">
          <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate">{eyebrow}</p>
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-white md:text-6xl">{title}</h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate">{description}</p>
          {(primaryCta || secondaryCta) && (
            <div className="mt-8 flex flex-wrap gap-4">
              {primaryCta ? (
                <Link
                  href={primaryCta.href}
                  className="rounded-full bg-white px-5 py-3 text-sm font-medium text-ink transition hover:bg-mist"
                >
                  {primaryCta.label}
                </Link>
              ) : null}
              {secondaryCta ? (
                <Link
                  href={secondaryCta.href}
                  className="rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  {secondaryCta.label}
                </Link>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

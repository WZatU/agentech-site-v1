import { ExploreShowcase } from "@/components/explore-showcase";
import { company, exploreMetrics, exploreSignals } from "@/lib/site-data";

export default function ExplorePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-[#363d45]/70">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(124,196,255,0.08),_transparent_32%)]" />
        <div className="relative mx-auto max-w-7xl px-6 py-12 lg:px-8 lg:py-16">
          <div className="max-w-4xl animate-rise">
            <p className="text-xs font-medium uppercase tracking-[0.24em] text-slate">Explore</p>
            <h1 className="mt-4 max-w-3xl text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-6xl">
              A quieter view into how Agentech is operating.
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate sm:text-lg sm:leading-8">
              Selected system signals, deployment activity, and a direct line for serious business conversations.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate">
                External preview
              </div>
              <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs uppercase tracking-[0.22em] text-slate">
                Operating signals
              </div>
            </div>
          </div>
        </div>
      </section>

      <ExploreShowcase metrics={exploreMetrics} />

      <section className="border-y border-[#363d45]/70 bg-black">
        <div className="mx-auto grid max-w-7xl gap-6 px-6 py-14 lg:grid-cols-[0.9fr,1.1fr] lg:gap-10 lg:px-8 lg:py-20">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate">Signals</p>
            <div className="mt-5 space-y-3 lg:mt-6 lg:space-y-4">
              {exploreSignals.map((item) => (
                <div
                  key={item}
                  className="rounded-[20px] border border-white/10 bg-white/[0.025] px-5 py-4 backdrop-blur-sm lg:rounded-[24px] lg:px-6 lg:py-5"
                >
                  <p className="text-base text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <article className="relative overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03] p-6 shadow-panel backdrop-blur-md lg:rounded-[30px] lg:p-8">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(148,184,214,0.08),transparent_24%)]" />
            <p className="text-sm uppercase tracking-[0.24em] text-slate">Business Contact</p>
            <h2 className="mt-4 text-2xl font-semibold text-white sm:text-3xl">For partnerships or collaboration.</h2>
            <p className="mt-4 max-w-xl text-base leading-7 text-slate sm:leading-8">
              Reach out directly and we can continue through a more structured process if there is fit.
            </p>
            <a
              href={`mailto:${company.inquiryEmail}`}
              className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-ink transition hover:bg-mist lg:mt-8"
            >
              {company.inquiryEmail}
            </a>
          </article>
        </div>
      </section>
    </>
  );
}

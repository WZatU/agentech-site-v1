import { ExploreShowcase } from "@/components/explore-showcase";
import { PageHero } from "@/components/page-hero";
import { company, exploreMetrics, exploreSignals } from "@/lib/site-data";

export default function ExplorePage() {
  return (
    <>
      <PageHero
        eyebrow="Explore"
        title="A quieter view into how Agentech is operating."
        description="Selected system signals, deployment activity, and a direct line for serious business conversations."
      />

      <ExploreShowcase metrics={exploreMetrics} />

      <section className="border-y border-[#363d45]/70 bg-black">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-20 lg:grid-cols-[0.9fr,1.1fr] lg:px-8">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-slate">Signals</p>
            <div className="mt-6 space-y-4">
              {exploreSignals.map((item) => (
                <div
                  key={item}
                  className="rounded-[24px] border border-white/10 bg-white/[0.025] px-6 py-5 backdrop-blur-sm"
                >
                  <p className="text-base text-white">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <article className="relative overflow-hidden rounded-[30px] border border-white/10 bg-white/[0.03] p-8 shadow-panel backdrop-blur-md">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_82%_18%,rgba(148,184,214,0.08),transparent_24%)]" />
            <p className="text-sm uppercase tracking-[0.24em] text-slate">Business Contact</p>
            <h2 className="mt-4 text-3xl font-semibold text-white">For partnerships or collaboration.</h2>
            <p className="mt-4 max-w-xl text-base leading-8 text-slate">
              Reach out directly and we can continue through a more structured process if there is fit.
            </p>
            <a
              href={`mailto:${company.inquiryEmail}`}
              className="mt-8 inline-flex rounded-full bg-white px-5 py-3 text-sm font-medium text-ink transition hover:bg-mist"
            >
              {company.inquiryEmail}
            </a>
          </article>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { AgentechGalaxyHero } from "@/components/agentech-galaxy-hero";
import { EmailCaptureForm } from "@/components/forms";
import { company, homeTracks } from "@/lib/site-data";

export default function HomePage() {
  return (
    <>
      <AgentechGalaxyHero title={company.name.toUpperCase()} subtitle={company.heroBody}>
        <Link
          href="/explore"
          className="rounded-full bg-white px-5 py-3 text-sm font-medium text-ink transition hover:bg-mist"
        >
          Explore
        </Link>
        <Link
          href="/talents"
          className="rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Talents
        </Link>
      </AgentechGalaxyHero>

      <section className="section-rule">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8" />
      </section>

      <section className="mx-auto max-w-7xl px-6 py-4 lg:px-8">
        <div className="divide-y divide-[#363d45]/70">
          {homeTracks.map((track) => (
            <article
              key={track.title}
              className="grid gap-6 py-12 md:grid-cols-[1fr,1.2fr,auto] md:items-start md:py-16"
            >
              <p className="text-sm uppercase tracking-[0.24em] text-slate">{track.title}</p>
              <p className="max-w-2xl text-lg leading-8 text-white">{track.description}</p>
              <Link href={track.href} className="text-sm text-slate transition hover:text-white">
                View
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section-rule">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-16 lg:grid-cols-[0.9fr,1.1fr] lg:px-8">
          <div className="max-w-xl">
            <p className="text-sm uppercase tracking-[0.24em] text-slate">Contact</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">
              Leave your contact.
            </h2>
            <p className="mt-4 text-base leading-8 text-slate">
              If you want to talk with Agentech, leave your email and we will reach back when the contact workflow is ready.
            </p>
          </div>
          <div className="max-w-2xl">
            <EmailCaptureForm
              label="Your Contact"
              placeholder="name@company.com"
              buttonLabel="Submit Contact"
              helperText="Placeholder wiring: connect this to your inbound contact sheet, CRM, or founder inbox."
            />
          </div>
        </div>
      </section>
    </>
  );
}

import { PageHero } from "@/components/page-hero";
import { aboutIntro, leadership, supportTeam } from "@/lib/site-data";

export default function AboutPage() {
  const teamMembers: Array<{ name: string; role: string; bio?: string }> = [
    ...leadership.map((member) => ({
      ...member,
      name:
        {
          Bill: "Bill Wang",
          David: "David Wang",
          Wesley: "Wesley Fan",
          Gaoxin: "Xin Gao"
        }[member.name] ?? member.name
    })),
    ...supportTeam.map((member) => ({
      ...member,
      name:
        {
          Lydia: "Léa Li"
        }[member.name] ?? member.name
    }))
  ];

  return (
    <>
      <PageHero eyebrow="About Us" title={aboutIntro.title} description={aboutIntro.body} />

      <section className="mx-auto max-w-7xl px-6 py-20 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm uppercase tracking-[0.24em] text-slate">Team</p>
          <h2 className="mt-4 text-3xl font-semibold text-white md:text-4xl">Core leadership and technical members.</h2>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {teamMembers.map((member) => (
            <article key={member.name} className="surface min-h-[220px] p-8">
              <p className="data-label">{member.role}</p>
              <h3 className="mt-4 text-3xl font-semibold text-white">{member.name}</h3>
              {member.bio ? (
                <p className="mt-4 max-w-xl text-base leading-8 text-slate">{member.bio}</p>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import { documentationRepositories } from "@/lib/product-docs";

export const metadata: Metadata = {
  title: "Product Documents",
  description: "Internal Agentech product documentation portal.",
  robots: {
    index: false,
    follow: false
  }
};

const accentClasses = {
  cyan: {
    text: "text-[#1fb7ff]",
    border: "border-[#1fb7ff]/70",
    glow: "shadow-[0_0_70px_rgba(31,183,255,0.12)]",
    bg: "from-[#062033]/85"
  },
  violet: {
    text: "text-[#bd65ff]",
    border: "border-[#bd65ff]/70",
    glow: "shadow-[0_0_70px_rgba(189,101,255,0.13)]",
    bg: "from-[#211038]/85"
  },
  blue: {
    text: "text-[#5f86ff]",
    border: "border-[#5f86ff]/70",
    glow: "shadow-[0_0_70px_rgba(95,134,255,0.13)]",
    bg: "from-[#0b1b3f]/85"
  }
} as const;

export default function ProductDocumentsPage() {
  return (
    <div className="min-h-screen bg-black text-white">
      <section className="relative overflow-hidden border-b border-[#1b5f91]/70 bg-[radial-gradient(circle_at_top_right,rgba(31,183,255,0.2),transparent_34%),linear-gradient(180deg,#05080d_0%,#000_100%)]">
        <div className="pointer-events-none absolute inset-0 opacity-30 [background-image:linear-gradient(rgba(31,183,255,0.14)_1px,transparent_1px),linear-gradient(90deg,rgba(31,183,255,0.14)_1px,transparent_1px)] [background-size:54px_54px]" />
        <div className="mx-auto max-w-7xl px-6 py-14 lg:px-8 lg:py-20">
          <div className="flex flex-wrap items-center gap-5">
            <Image
              src="/assets/logo/AGENTECH-products.png"
              alt="Agentech Products"
              width={320}
              height={80}
              className="h-10 w-auto object-contain md:h-12"
              priority
            />
            <span className="border border-[#1fb7ff]/70 bg-[#04111c]/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[#1fb7ff] shadow-[0_0_28px_rgba(31,183,255,0.16)]">
              Hidden Internal Draft
            </span>
          </div>

          <div className="mt-12 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#1fb7ff]">Agentech Docs</p>
              <h1 className="font-display mt-4 text-4xl font-semibold tracking-tight text-white md:text-6xl">
                Product Documentation
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-white/68">
                A company documentation index for turning existing code, automation, teaching material, APIs, robot capabilities, and internal tools into reusable product assets.
              </p>
              <div className="mt-8 grid max-w-xl grid-cols-3 border border-white/10 bg-black/45">
                <div className="border-r border-white/10 p-4">
                  <p className="font-technical text-2xl font-semibold text-white">03</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">Doc Areas</p>
                </div>
                <div className="border-r border-white/10 p-4">
                  <p className="font-technical text-2xl font-semibold text-white">24+</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">Sections</p>
                </div>
                <div className="p-4">
                  <p className="font-technical text-2xl font-semibold text-white">MD</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.16em] text-white/45">Source</p>
                </div>
              </div>
            </div>

            <div className="relative min-h-[24rem] overflow-hidden border border-[#1b5f91]/70 bg-[#020509]/92 shadow-[0_0_70px_rgba(31,183,255,0.1)]">
              <Image
                src="/assets/documents/documentationworkflow.jpg"
                alt="AI documentation workflow dashboard"
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                className="object-cover opacity-70"
                priority
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,#020509_0%,rgba(2,5,9,0.88)_48%,rgba(2,5,9,0.22)_100%)]" />
              <div className="relative p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#1fb7ff]">Documentation Workflow</p>
                <pre className="mt-4 max-w-md overflow-x-auto border border-white/10 bg-black/70 p-4 font-mono text-sm leading-7 text-white/86">
{`Write Markdown
-> Push to GitHub
-> Review
-> Merge
-> Website links to docs`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[280px_1fr] lg:px-8 lg:py-14">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <nav className="border border-[#1b5f91]/70 bg-[#020509] p-4 shadow-[0_0_55px_rgba(31,183,255,0.08)]">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#1fb7ff]">Repositories</p>
            <div className="mt-4 space-y-1">
              {documentationRepositories.map((repo) => (
                <a
                  key={repo.id}
                  href={`#${repo.id}`}
                  className="block border border-transparent px-3 py-2 text-sm font-medium text-white/68 transition hover:border-[#1fb7ff]/60 hover:bg-[#071827] hover:text-white"
                >
                  {repo.name}
                </a>
              ))}
            </div>
          </nav>
        </aside>

        <div className="space-y-6">
          {documentationRepositories.map((repo, index) => {
            const accent = accentClasses[repo.accent];
            return (
            <details
              key={repo.id}
              id={repo.id}
              open={index === 0}
              className={`group scroll-mt-28 overflow-hidden border ${accent.border} bg-[linear-gradient(180deg,rgba(8,18,27,0.78),rgba(1,3,7,0.98))] ${accent.glow}`}
            >
              <summary className={`relative grid cursor-pointer list-none gap-6 bg-gradient-to-br ${accent.bg} to-black p-6 marker:hidden md:p-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-stretch`}>
                <div className="max-w-3xl">
                  <p className={`font-mono text-xs uppercase tracking-[0.18em] ${accent.text}`}>{repo.repository}</p>
                  <h2 className="font-display mt-3 text-2xl font-semibold tracking-tight text-white md:text-3xl">{repo.name}</h2>
                  <p className="mt-4 text-base leading-8 text-white/72">{repo.summary}</p>
                  <div className="mt-8 flex items-center gap-3">
                    <a
                    href={repo.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={`border ${accent.border} bg-black/30 px-4 py-2 text-sm font-semibold ${accent.text} transition hover:bg-white hover:text-black hover:shadow-[0_0_26px_rgba(255,255,255,0.22)]`}
                  >
                    GitHub
                  </a>
                  <span className="border border-white/15 bg-black/30 px-3 py-2 text-sm font-semibold text-white/68 transition hover:border-white hover:bg-white hover:text-black group-open:bg-white group-open:text-black group-open:hover:bg-[#1fb7ff]">
                    Details
                  </span>
                  </div>
                </div>

                <div className={`relative min-h-48 overflow-hidden border ${accent.border} bg-black/45`}>
                  <Image
                    src={repo.image}
                    alt={repo.imageAlt}
                    fill
                    sizes="(min-width: 1024px) 340px, 100vw"
                    className={`${repo.imageFit === "contain" ? "object-contain p-8" : "object-cover"} opacity-88 transition duration-500 group-hover:scale-[1.03]`}
                    priority={index === 0}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06),rgba(0,0,0,0.58))]" />
                  <div className="absolute bottom-0 left-0 right-0 border-t border-white/10 bg-black/50 px-4 py-3 backdrop-blur-sm">
                    <p className={`text-xs font-semibold uppercase tracking-[0.16em] ${accent.text}`}>
                      Documentation Repository
                    </p>
                  </div>
                </div>
              </summary>

              <div className="border-t border-[#1b5f91]/70 px-6 pb-6 pt-7 md:px-8 md:pb-8">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="border border-white/12 bg-black/42 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Repository</p>
                  <a
                    href={repo.githubUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-words font-mono text-sm text-white transition hover:text-[#1fb7ff]"
                  >
                    {repo.githubUrl.replace("https://github.com/", "github.com/")}
                  </a>
                </div>
                <div className="border border-white/12 bg-black/42 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Docs Source</p>
                  <a
                    href={repo.docsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 block break-words font-mono text-sm text-white transition hover:text-[#1fb7ff]"
                  >
                    {repo.docsPath}
                  </a>
                </div>
              </div>

              <div className="mt-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">README Preview</p>
                <div className="mt-4 border border-white/12 bg-black/55 p-4">
                  <pre className="overflow-x-auto font-mono text-sm leading-7 text-white/78">
{`${repo.repository}/
|-- README.md
${repo.readmeTree.map((item, index) => `${index === repo.readmeTree.length - 1 ? "`--" : "|--"} ${item}`).join("\n")}`}
                  </pre>
                </div>
              </div>

              <div className="mt-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">Documentation Contents</p>
                <div className="mt-4 grid gap-4">
                  {repo.docs.map((doc) => (
                    <section key={doc.title} className="border border-[#1b5f91]/55 bg-[#06111b] p-4">
                      <h3 className="text-base font-semibold text-white">{doc.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-white/66">{doc.description}</p>
                    </section>
                  ))}
                </div>
              </div>
              </div>
            </details>
          )})}
        </div>
      </section>
    </div>
  );
}

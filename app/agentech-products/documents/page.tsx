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

export default function ProductDocumentsPage() {
  return (
    <div className="min-h-screen bg-[#f6f8fb] text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 lg:px-8">
          <div className="flex flex-wrap items-center gap-4">
            <Image
              src="/assets/logo/AGENTECH-products.png"
              alt="Agentech Products"
              width={320}
              height={80}
              className="h-9 w-auto object-contain"
              priority
            />
            <span className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              Hidden Internal Draft
            </span>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[#44669a]">Agentech Docs</p>
              <h1 className="mt-4 text-4xl font-semibold tracking-tight text-slate-950 md:text-6xl">
                Product Documentation
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                A company documentation index for turning existing code, automation, teaching material, APIs, robot capabilities, and internal tools into reusable product assets.
              </p>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Documentation Workflow</p>
              <pre className="mt-4 overflow-x-auto rounded-md bg-slate-950 p-4 text-sm leading-7 text-slate-100">
{`Write Markdown
-> Push to GitHub
-> Review
-> Merge
-> Website links to docs`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-10 lg:grid-cols-[280px_1fr] lg:px-8">
        <aside className="lg:sticky lg:top-24 lg:h-fit">
          <nav className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
            <p className="px-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Repositories</p>
            <div className="mt-4 space-y-1">
              {documentationRepositories.map((repo) => (
                <a
                  key={repo.id}
                  href={`#${repo.id}`}
                  className="block rounded-md px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-950"
                >
                  {repo.name}
                </a>
              ))}
            </div>
          </nav>
        </aside>

        <div className="space-y-6">
          {documentationRepositories.map((repo) => (
            <article key={repo.id} id={repo.id} className="scroll-mt-28 rounded-lg border border-slate-200 bg-white p-6 shadow-sm md:p-8">
              <div className="flex flex-wrap items-start justify-between gap-5">
                <div>
                  <p className="font-mono text-xs text-[#44669a]">{repo.repository}</p>
                  <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950">{repo.name}</h2>
                  <p className="mt-4 max-w-3xl text-base leading-8 text-slate-600">{repo.summary}</p>
                </div>
                <a
                  href={repo.githubUrl}
                  className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-950 hover:text-slate-950"
                >
                  GitHub
                </a>
              </div>

              <div className="mt-7 grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Local Path</p>
                  <p className="mt-2 break-words font-mono text-sm text-slate-950">{repo.localPath}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Docs Source</p>
                  <p className="mt-2 break-words font-mono text-sm text-slate-950">{repo.docsPath}</p>
                </div>
              </div>

              <div className="mt-7">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Documented Areas</p>
                <ul className="mt-4 grid gap-3 md:grid-cols-2">
                  {repo.sections.map((section) => (
                    <li key={section} className="rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-slate-700">
                      {section}
                    </li>
                  ))}
                </ul>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}

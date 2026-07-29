import Image from "next/image";
import Link from "next/link";
import { aegisFunctions } from "@/lib/aegis-sdk-reference";
import { agentechLibraryTasks } from "@/lib/agentech-library-tasks";
import { getEaicHubTaskPath } from "@/lib/eaic-hub";

const footerStats = [
  ["Dry-run first", "Test safely before execution"],
  ["10s max per command", "Keep commands short and stable"],
  ["Emergency stop available", "You can stop the robot anytime"],
  ["Speed capped", "Built-in limits for safety"]
];

function StepIcon({ index }: { index: number }) {
  const icons = [
    <svg key="code" viewBox="0 0 64 64" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="8" y="10" width="48" height="40" rx="4" />
      <path d="M20 32l8-8M20 32l8 8M44 24l-8 8M44 40l-8-8" />
      <path d="M14 18h4M24 18h4M34 18h4" />
    </svg>,
    <svg key="cube" viewBox="0 0 64 64" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M32 6l24 13v27L32 58 8 46V19L32 6z" />
      <path d="M8 19l24 13 24-13M32 32v26" />
      <path d="M20 13l24 13M44 13L20 26" />
    </svg>,
    <svg key="upload" viewBox="0 0 64 64" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M32 8v32M20 20l12-12 12 12" />
      <path d="M14 38v12h36V38" />
      <path d="M10 50h44" />
    </svg>,
    <svg key="shield" viewBox="0 0 64 64" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M32 6l21 8v15c0 14-8.5 23-21 29-12.5-6-21-15-21-29V14l21-8z" />
      <path d="M22 33l7 7 14-16" />
    </svg>,
    <svg key="live" viewBox="0 0 64 64" className="h-14 w-14" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="16" width="38" height="32" rx="5" />
      <path d="M47 27l8-5v20l-8-5" />
      <circle cx="28" cy="32" r="8" />
      <path d="M25 29l7 3-7 3v-6z" fill="currentColor" stroke="none" />
      <path d="M42 49h13v7H42z" />
    </svg>
  ];

  return (
    <div className="grid h-20 w-20 shrink-0 place-items-center rounded-[8px] border border-current/30 bg-white text-center transition group-hover:bg-current/10 group-hover:ring-4 group-hover:ring-current/20">
      {icons[index]}
    </div>
  );
}

export function AgentechLibraryHome() {
  return (
    <div className="agentech-library-page min-h-screen bg-[#fbfdff] text-[#07142e]">
      <style>{`
        body:has(.agentech-library-page) {
          background: #fbfdff !important;
          color: #07142e;
        }

        body:has(.agentech-library-page)::before,
        body:has(.agentech-library-page)::after {
          display: none;
        }

        body:has(.agentech-library-page) main.flex-1 {
          background: #fbfdff;
        }
      `}</style>
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-8 lg:py-10">
        <header className="flex items-start justify-between gap-5">
          <Link href="/" aria-label="Go to Agentech homepage" className="inline-flex items-center py-1">
            <Image
              src="/assets/logo/AGENTECH.png"
              alt="Agentech"
              width={1000}
              height={101}
              sizes="(min-width: 640px) 184px, 168px"
              className="h-auto w-[10.5rem] sm:w-[11.5rem]"
              priority
            />
          </Link>
          <Link
            href="/account"
            className="rounded-[8px] border border-[#9cd9df] bg-white px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#008a7a] shadow-sm transition hover:border-[#008a7a]"
          >
            Developer Access
          </Link>
        </header>

        <section className="mt-10 grid items-center gap-8 lg:grid-cols-[0.86fr_1.14fr]">
          <div>
            <h1 className="font-extrabold tracking-normal text-[#07142e]">
              <span className="block w-[min(84vw,20rem)] sm:w-[22rem] lg:w-[23rem]">
                <Image
                  src="/assets/products/agentech-library/eaic-logo.png"
                  alt="EAIC"
                  width={1880}
                  height={434}
                  sizes="(min-width: 1024px) 368px, (min-width: 640px) 352px, 84vw"
                  className="h-auto w-full"
                  priority
                />
              </span>
              <span className="mt-3 block text-[3.5rem] leading-[0.94] sm:text-[4.6rem] lg:text-[5.25rem]">HUB.</span>
            </h1>
            <p className="mt-5 max-w-sm text-lg font-semibold leading-8 text-[#111d35]">
              Developer tools for Aegis, Navi, and Master SDK references, plus supported previews, submissions, and supervised live runs.
            </p>
          </div>
          <div className="relative min-h-[330px] overflow-hidden rounded-[8px] bg-white lg:min-h-[390px]">
            <Image
              src="/assets/products/agentech-library/dog-blueprint.png"
              alt="Blueprint sketch of the Aegis robot dog"
              fill
              sizes="(min-width: 1024px) 650px, 100vw"
              className="object-contain object-center"
              priority
            />
          </div>
        </section>

        <section className="relative mt-10">
          <div className="pointer-events-none absolute left-0 right-0 top-10 hidden h-[calc(100%-4rem)] lg:block">
            <div className="absolute left-10 top-0 h-[2px] w-28 bg-[#008a6c]" />
            <div className="absolute right-6 top-8 h-28 w-20 rounded-r-[36px] border-y-4 border-r-4 border-[#008a6c]" />
            <div className="absolute left-6 top-[13.5rem] h-28 w-20 rounded-l-[36px] border-y-4 border-l-4 border-[#145cff]" />
            <div className="absolute right-6 top-[26.5rem] h-28 w-20 rounded-r-[36px] border-y-4 border-r-4 border-[#6c2bd9]" />
          </div>

          <div className="relative mx-auto grid max-w-[860px] gap-0">
            {agentechLibraryTasks.map((task, index) => (
              <div key={task.slug} className="relative pb-9 last:pb-0">
                <Link
                  href={getEaicHubTaskPath(task.slug)}
                  className="group relative z-10 grid min-h-[142px] grid-cols-1 items-center gap-5 rounded-[8px] border border-[#dce7f2] bg-white p-5 shadow-[0_18px_42px_rgba(12,31,58,0.08)] transition hover:-translate-y-1 hover:border-current sm:grid-cols-[auto_1fr_auto] sm:gap-6 sm:p-6"
                  style={{ color: task.accent }}
                >
                  <div className="grid h-14 w-14 place-items-center rounded-[8px] font-mono text-2xl font-bold text-white shadow-lg" style={{ background: task.accent }}>
                    {task.number}
                  </div>
                  <div className="flex min-w-0 items-center gap-5 sm:gap-6">
                    <StepIcon index={index} />
                    <div className="min-w-0">
                      <h2 className="text-2xl font-extrabold tracking-normal text-[#07142e] sm:text-3xl">{task.title}</h2>
                      <p className="mt-2 max-w-md text-base font-semibold leading-7 text-[#17243b] sm:text-lg">{task.summary}</p>
                    </div>
                  </div>
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-current text-2xl font-bold transition group-hover:bg-current/10 group-hover:text-current">
                    -&gt;
                  </div>
                </Link>
                {index < agentechLibraryTasks.length - 1 ? (
                  <div className="absolute bottom-1 left-1/2 z-0 flex -translate-x-1/2 flex-col items-center" aria-hidden="true">
                    <span className="h-8 w-[3px] rounded-full" style={{ background: task.accent }} />
                    <span
                      className="mt-[-2px] h-4 w-4 rotate-45 border-b-[3px] border-r-[3px]"
                      style={{ borderColor: agentechLibraryTasks[index + 1].accent }}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 grid gap-px overflow-hidden rounded-[8px] border border-[#dce7f2] bg-[#dce7f2] shadow-[0_12px_28px_rgba(12,31,58,0.06)] md:grid-cols-4">
          {footerStats.map(([title, body], index) => (
            <div key={title} className="bg-white p-5">
              <p className={`font-mono text-sm font-bold uppercase ${index === 2 ? "text-[#ff5a1f]" : "text-[#005bd6]"}`}>{title}</p>
              <p className="mt-3 text-sm font-semibold leading-6 text-[#23304a]">{body}</p>
            </div>
          ))}
        </section>

        <p className="mt-5 text-center font-mono text-xs uppercase tracking-[0.16em] text-[#6b7a90]">
          {aegisFunctions.length} Aegis reference cards, with Navi and Master in View SDK.
        </p>
      </main>
    </div>
  );
}

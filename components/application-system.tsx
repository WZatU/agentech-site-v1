import Link from "next/link";
import { applicationIntro, applicationTracks } from "@/lib/site-data";

type ApplicationSystemProps = {
  mode?: "compact" | "full";
};

export function ApplicationSystem({ mode = "full" }: ApplicationSystemProps) {
  const tracks = mode === "compact" ? applicationTracks.slice(0, 3) : applicationTracks;

  return (
    <section className="mx-auto max-w-5xl px-6 py-20 lg:px-8">
      <div className="max-w-2xl">
        <p className="text-sm uppercase tracking-[0.24em] text-slate">{applicationIntro.eyebrow}</p>
        <h2 className="mt-4 text-3xl font-semibold text-white md:text-5xl">{applicationIntro.title}</h2>
        <p className="mt-5 text-base leading-8 text-slate md:text-lg">{applicationIntro.body}</p>
      </div>

      {mode === "compact" ? (
        <div className="mt-10">
          <Link
            href="/career"
            className="inline-flex rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Open Career
          </Link>
        </div>
      ) : null}

      <div className="mt-16 space-y-20">
        {tracks.map((track) => (
          <article key={track.id} id={track.id} className="scroll-mt-28">
            <div className="max-w-2xl">
              <p className="data-label">{track.title}</p>
              <h3 className="mt-4 text-3xl font-semibold text-white md:text-4xl">{track.title}</h3>
              <p className="mt-4 text-base text-slate">{track.summary}</p>
            </div>

            <div className="mt-8 surface p-8">
              <div className="space-y-8">
                <div>
                  <p className="data-label">Basic Info</p>
                  <div className="mt-4 space-y-3">
                    {track.fields.map((field) => (
                      <div
                        key={field}
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate"
                      >
                        {field}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="data-label">Attachment</p>
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-slate">
                    {track.asset}
                  </div>
                </div>

                <div>
                  <p className="data-label">Questions</p>
                  <div className="mt-4 space-y-3">
                    {track.questions.map((question) => (
                      <div key={question} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                        <p className="text-base text-white">{question}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {mode === "full" ? (
                  <div className="pt-2">
                    <div className="inline-flex rounded-full border border-white/12 bg-white/5 px-5 py-3 text-sm font-medium text-white">
                      Start Your Application
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

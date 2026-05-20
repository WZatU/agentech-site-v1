import Link from "next/link";
import { AgentechGalaxyHero } from "@/components/agentech-galaxy-hero";
import { company } from "@/lib/site-data";

export default function HomePage() {
  return (
    <>
      <AgentechGalaxyHero title={company.name.toUpperCase()} titleImage="/assets/logo/AGENTECH.png" />

      <section className="border-t border-[#363d45]/70 px-6 py-10 lg:px-8">
        <div className="mx-auto flex max-w-7xl justify-end">
          <div className="flex flex-col items-end gap-5">
            <Link
              href="/about"
              className="text-sm font-medium uppercase tracking-[0.22em] text-slate transition hover:text-white"
            >
              About
            </Link>
            <Link
              href="/news"
              className="text-sm font-medium uppercase tracking-[0.22em] text-slate transition hover:text-white"
            >
              News
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

import Link from "next/link";
import { AgentechGalaxyHero } from "@/components/agentech-galaxy-hero";
import { company } from "@/lib/site-data";

export default function HomePage() {
  return (
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
  );
}

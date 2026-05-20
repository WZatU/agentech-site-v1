import Image from "next/image";
import { AgentechGalaxyHero } from "@/components/agentech-galaxy-hero";
import { company } from "@/lib/site-data";

const partnerLogos = [
  { src: "/assets/partners/faraday_future_gray.png", alt: "Faraday Future" },
  { src: "/assets/partners/Learning_Tree_gray.png", alt: "Learning Tree" },
  { src: "/assets/partners/legionglobal_gray.png", alt: "Legion Global" },
  { src: "/assets/partners/Sequoia_foundation_gray.png", alt: "Sequoia Forest Foundation" },
  { src: "/assets/partners/Sequoia_gray.png", alt: "Sequoia" }
] as const;

export default function HomePage() {
  const rollingLogos = [...partnerLogos, ...partnerLogos];

  return (
    <>
      <AgentechGalaxyHero title={company.name.toUpperCase()} titleImage="/assets/logo/AGENTECH.png" />

      <section className="border-t border-[#363d45]/70 py-10">
        <div className="overflow-hidden">
          <div className="logo-roll flex w-max items-center gap-16">
            {rollingLogos.map((logo, index) => (
              <div
                key={`${logo.src}-${index}`}
                className="flex h-24 w-48 shrink-0 items-center justify-center opacity-70 grayscale transition hover:opacity-100"
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={240}
                  height={120}
                  className="max-h-20 w-auto object-contain"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

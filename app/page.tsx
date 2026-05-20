import Image from "next/image";
import { AgentechGalaxyHero } from "@/components/agentech-galaxy-hero";
import { company } from "@/lib/site-data";

const partnerLogos = [
  { src: "/assets/partners/faraday_future_gray.png", alt: "Faraday Future" },
  { src: "/assets/partners/Learning_Tree_gray.png", alt: "Learning Tree" },
  { src: "/assets/partners/legionglobal_gray.png", alt: "Legion Global" },
  { src: "/assets/partners/Sequoia_foundation_gray.png", alt: "Sequoia Forest Foundation" },
  { src: "/assets/partners/Sequoia_gray.png", alt: "Sequoia" },
  { src: "/assets/partners/241_gray.png", alt: "241" }
] as const;

export default function HomePage() {
  const rollingLogos = [...partnerLogos, ...partnerLogos];

  return (
    <AgentechGalaxyHero
      title={company.name.toUpperCase()}
      titleImage="/assets/logo/AGENTECH.png"
      bottomContent={
        <div className="w-full overflow-hidden">
          <div className="logo-roll flex w-max items-center gap-16">
            {rollingLogos.map((logo, index) => (
              <div
                key={`${logo.src}-${index}`}
                className="flex h-14 w-32 shrink-0 items-center justify-center opacity-70 grayscale transition hover:opacity-100 sm:h-16 sm:w-40 md:h-20 md:w-48"
              >
                <Image
                  src={logo.src}
                  alt={logo.alt}
                  width={240}
                  height={120}
                  className="max-h-12 w-auto object-contain sm:max-h-14 md:max-h-16"
                />
              </div>
            ))}
          </div>
        </div>
      }
    />
  );
}

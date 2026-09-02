"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

type EducationProgram = {
  slug: string;
  grade: string;
  title: string;
  subtitle: string;
  image: string;
  cardImage?: string;
};

type HighSchoolSlide = {
  src: string;
  alt: string;
  imageClassName: string;
};

type EducationProgramTabsProps = {
  programs: readonly EducationProgram[];
  initialTab: TabId;
  initialAutoRotate: boolean;
};

type TabId = "high-school" | "grade-k-8";

const immersionSlug = "agentech-ff-eai-robotics-future-founder-immersion-program";

const tabs: Array<{ id: TabId; label: string }> = [
  { id: "high-school", label: "HIGH SCHOOL" },
  { id: "grade-k-8", label: "GRADE K-8" }
];

const tabAutoRotateDurationMs = 9000;
const tabAutoRotateDurationCss = "9s";
const highSchoolCampImage = "/assets/ff-robotics/future-robotics-founder-program-group.png";
const k8LearningImage = "/assets/education/navi-learning-banner.png";

export function EducationProgramTabs({ programs, initialTab, initialAutoRotate }: EducationProgramTabsProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);
  const [autoRotate, setAutoRotate] = useState(initialAutoRotate);

  const immersionProgram = useMemo(
    () => programs.find((program) => program.slug === immersionSlug),
    [programs]
  );
  const k8Programs = useMemo(
    () => programs.filter((program) => program.slug !== immersionSlug),
    [programs]
  );

  const rememberPathway = useCallback((tabId: TabId) => {
    const url = new URL(window.location.href);
    url.searchParams.set("pathway", tabId);
    url.hash = "program-pathways";
    router.replace(`${url.pathname}${url.search}${url.hash}`, { scroll: false });
  }, [router]);

  useEffect(() => {
    if (!autoRotate) {
      return;
    }

    const timer = window.setTimeout(() => {
      const nextTab = activeTab === "high-school" ? "grade-k-8" : "high-school";
      setActiveTab(nextTab);
      rememberPathway(nextTab);
    }, tabAutoRotateDurationMs);

    return () => window.clearTimeout(timer);
  }, [activeTab, autoRotate, rememberPathway]);

  function selectTab(tabId: TabId) {
    setActiveTab(tabId);
    setAutoRotate(false);
    rememberPathway(tabId);
  }

  return (
    <section
      id="program-pathways"
      data-education-pathway={activeTab}
      className="relative z-10 mx-auto max-w-7xl px-4 pb-16 pt-12 sm:px-6 lg:px-8 lg:pb-24 lg:pt-16"
    >
      <div className="overflow-hidden rounded-xl border border-[#174766] bg-[#02070b] shadow-[0_30px_90px_rgba(0,0,0,0.34)]">
        <div className="border-b border-[#284354] bg-[#061722] px-6 py-5 sm:px-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-[#80d8f4]">Program pathways</p>
        </div>
        <div className="grid grid-cols-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`relative min-h-20 border-r border-[#24323b] px-4 py-5 text-center text-xs font-semibold uppercase tracking-[0.15em] transition last:border-r-0 sm:text-sm ${
                  isActive ? "bg-[#07131b] text-[#e4edf5]" : "bg-[#03070a] text-[#6f8193] hover:bg-[#061019] hover:text-[#b8c6d2]"
                }`}
              >
                {tab.label}
                {isActive ? (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 overflow-hidden bg-[#122c3d]">
                    <span
                      key={`${tab.id}-${autoRotate ? "auto" : "manual"}`}
                      className="block h-full origin-left bg-[#80d8f4] shadow-[0_0_12px_rgba(128,216,244,0.8)]"
                      style={{
                        animation: autoRotate ? `education-tab-progress ${tabAutoRotateDurationCss} linear forwards` : "none",
                        transform: autoRotate ? undefined : "scaleX(1)"
                      }}
                    />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="pt-10 lg:pt-14">
        {activeTab === "high-school" && immersionProgram ? (
          <HighSchoolPanel program={immersionProgram} />
        ) : (
          <GradeK8Panel programs={k8Programs} />
        )}
      </div>
    </section>
  );
}

function HighSchoolPanel({ program }: { program: EducationProgram }) {
  return (
    <div className="grid overflow-hidden rounded-xl border border-[#174766] bg-[#03070a] shadow-[0_30px_90px_rgba(0,0,0,0.3)] lg:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
      <HighSchoolMediaCarousel program={program} />

      <div className="flex flex-col border-t border-[#24323b] p-7 sm:p-9 lg:min-h-[520px] lg:border-l lg:border-t-0 lg:p-10">
        <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#80d8f4]">{program.grade}</p>
        <h2 className="font-display mt-5 text-3xl font-semibold leading-[1.12] tracking-[-0.055em] text-[#e4edf5] md:text-[2.65rem]">
          EAI Robotics Future Founder Immersion Program
        </h2>

        <div className="mt-7 grid gap-4 text-sm leading-7 text-[#91a2b5] sm:text-base">
          <p>
            An immersive robotics and AI founder-track program for high school students ready to build,
            lead, and think beyond the classroom.
          </p>
          <p>Build with robotics, embodied intelligence, and AI-native tools.</p>
          <p>Explore product thinking, technical leadership, and future-founder habits.</p>
          <p>Create portfolio-ready work through a focused immersion experience.</p>
        </div>

        <div className="pt-11 lg:mt-auto lg:flex lg:justify-end lg:pt-12">
          <Link
            href={`/agentech-education/${program.slug}`}
            data-theme-primary-action
            className="inline-flex min-h-11 items-center justify-center gap-3 whitespace-nowrap rounded-xl bg-[#e6edf2] px-5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#071017] transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#83c8ef]"
          >
            Explore program <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

function HighSchoolMediaCarousel({ program }: { program: EducationProgram }) {
  const [activeSlide, setActiveSlide] = useState(0);
  const [isAutoplaying, setIsAutoplaying] = useState(true);

  const slides: HighSchoolSlide[] = [
    {
      src: program.image,
      alt: `${program.title} logo`,
      imageClassName: "object-contain p-8 sm:p-10"
    },
    {
      src: highSchoolCampImage,
      alt: "AI robotics future founder students in a robotics lab",
      imageClassName: "object-contain"
    }
  ];

  useEffect(() => {
    if (!isAutoplaying) {
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (prefersReducedMotion.matches) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, 3600);

    return () => window.clearTimeout(timer);
  }, [activeSlide, isAutoplaying, slides.length]);

  function selectSlide(index: number) {
    setActiveSlide(index);
    setIsAutoplaying(false);
  }

  function resumeAutoplay() {
    setIsAutoplaying(true);
    setActiveSlide((current) => (current + 1) % slides.length);
  }

  return (
    <div
      className="group relative min-h-[360px] overflow-hidden bg-[#06131c] transition sm:min-h-[440px] lg:min-h-[520px]"
      aria-roledescription="carousel"
      aria-label="High school program media"
    >
      <Link
        href={`/agentech-education/${program.slug}`}
        className="absolute inset-0 z-10"
        aria-label={`Explore ${program.title}`}
      />

      {slides.map((slide, index) => (
        <Image
          key={slide.src}
          src={slide.src}
          alt={slide.alt}
          data-education-program-logo={index === 0 ? "true" : undefined}
          fill
          sizes="(min-width: 1024px) 52vw, 92vw"
          className={`${slide.imageClassName} transition duration-700 ease-out ${
            activeSlide === index ? "scale-100 opacity-100" : "scale-[1.01] opacity-0"
          } group-hover:scale-[1.015]`}
          priority={index === 0}
        />
      ))}

      <div className="absolute inset-x-0 bottom-5 z-20 flex items-center justify-center gap-2">
        {slides.map((slide, index) => (
          <button
            key={`${slide.src}-dot`}
            type="button"
            aria-label={`Show slide ${index + 1}`}
            aria-current={activeSlide === index}
            onClick={() => selectSlide(index)}
            className={`h-2.5 rounded-full border border-[#31566d] transition ${
              activeSlide === index ? "w-7 bg-[#80d8f4]" : "w-2.5 bg-[#07131b] hover:bg-[#123247]"
            }`}
          />
        ))}
        <button
          type="button"
          aria-label="Resume high school image autoplay"
          onClick={resumeAutoplay}
          className={`grid h-7 w-7 place-items-center rounded-full border border-[#31566d] bg-[#07131b] transition hover:border-[#80d8f4] hover:bg-[#0b1d29] ${
            isAutoplaying ? "opacity-25" : "opacity-55 hover:opacity-85"
          }`}
        >
          <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-[#80d8f4]" />
        </button>
      </div>
    </div>
  );
}

function GradeK8Panel({ programs }: { programs: readonly EducationProgram[] }) {
  return (
    <div className="space-y-7">
      <Link
        href="/agentech-education/what-can-we-learn-from-navi"
        aria-label="Explore what K-8 students can learn from Navi"
        data-education-navi-card
        className="group relative block min-h-[190px] overflow-hidden rounded-xl border border-[#174766] bg-black shadow-[0_24px_70px_rgba(0,0,0,0.32)] transition duration-300 hover:-translate-y-0.5 hover:border-[#31566d] hover:shadow-[0_30px_90px_rgba(0,0,0,0.46)]"
      >
        <Image
          data-education-navi-media
          src={k8LearningImage}
          alt="K-8 students exploring AI, coding, and robotics projects"
          fill
          sizes="(min-width: 1024px) 1180px, 100vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div data-education-navi-overlay className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.88)_26%,rgba(0,0,0,0.56)_52%,rgba(0,0,0,0.18)_78%,rgba(0,0,0,0)_100%)]" />
        <div className="relative z-10 flex min-h-[178px] max-w-2xl flex-col justify-center px-6 py-6 sm:px-8 lg:px-10">
          <p data-education-navi-kicker className="mb-3 text-[10px] font-medium uppercase tracking-[0.22em] text-[#80d8f4]">Navi learning system</p>
          <h3 data-education-navi-title className="font-display text-3xl font-semibold leading-tight tracking-[-0.05em] text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.72)] md:text-4xl">
            What can we learn from Navi?
          </h3>
        </div>
      </Link>

      <div className="grid overflow-hidden rounded-xl border border-[#174766] bg-[#03070a] lg:grid-cols-[0.78fr_1.22fr]">
        <div className="border-b border-[#24323b] p-7 sm:p-9 lg:border-b-0 lg:border-r lg:p-10">
          <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-[#80d8f4]">Summer camps</p>
          <h2 className="font-display mt-5 text-4xl font-semibold leading-tight tracking-[-0.055em] text-[#e4edf5] md:text-5xl">
            Hands-on AI learning for younger builders.
          </h2>
          <p className="mt-6 text-base leading-8 text-[#91a2b5]">
            Creativity, coding, robotics, and teamwork programs that help K-8 students turn curiosity
            into real projects.
          </p>
        </div>

        <div className="divide-y divide-[#24323b]">
          {programs.map((program) => (
            <Link
              key={program.slug}
              href={`/agentech-education/${program.slug}`}
              className="group grid overflow-hidden bg-[#02070b] transition hover:bg-[#07131b] sm:grid-cols-[220px_1fr]"
            >
              <div className="relative aspect-[4/3] border-b border-[#24323b] bg-[#06131c] sm:aspect-auto sm:min-h-[190px] sm:border-b-0 sm:border-r">
                <Image
                  src={program.cardImage ?? program.image}
                  alt={`${program.grade} class advertisement`}
                  fill
                  sizes="(min-width: 1024px) 240px, 100vw"
                  className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
                />
              </div>
              <div className="flex flex-col justify-center px-6 py-7 sm:px-8">
                <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[#80d8f4]">{program.grade}</p>
                <h3 className="font-display mt-3 text-2xl font-semibold leading-tight tracking-[-0.045em] text-[#e4edf5]">{program.title}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#8193a6]">{program.subtitle}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.13em] text-[#83c8ef]">
                  View program <span aria-hidden="true">→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

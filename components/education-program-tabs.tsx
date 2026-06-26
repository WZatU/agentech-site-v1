"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

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

export function EducationProgramTabs({ programs }: EducationProgramTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("high-school");
  const [autoRotate, setAutoRotate] = useState(true);

  const immersionProgram = useMemo(
    () => programs.find((program) => program.slug === immersionSlug),
    [programs]
  );
  const k8Programs = useMemo(
    () => programs.filter((program) => program.slug !== immersionSlug),
    [programs]
  );

  useEffect(() => {
    if (!autoRotate) {
      return;
    }

    const timer = window.setTimeout(() => {
      setActiveTab((current) => (current === "high-school" ? "grade-k-8" : "high-school"));
    }, tabAutoRotateDurationMs);

    return () => window.clearTimeout(timer);
  }, [activeTab, autoRotate]);

  function selectTab(tabId: TabId) {
    setActiveTab(tabId);
    setAutoRotate(false);
  }

  return (
    <section className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8 lg:pb-24 lg:pt-10">
      <div className="border-b border-[#e5e5e5]">
        <div className="grid grid-cols-2">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={`relative px-4 pb-5 pt-2 text-center text-sm font-semibold transition sm:text-base md:text-xl ${
                  isActive ? "text-[#202124]" : "text-[#6b7280] hover:text-[#202124]"
                }`}
              >
                {tab.label}
                {isActive ? (
                  <span className="absolute inset-x-0 bottom-[-1px] h-1 overflow-hidden bg-[#dfe1e5]">
                    <span
                      key={`${tab.id}-${autoRotate ? "auto" : "manual"}`}
                      className="block h-full origin-left bg-[#1a73e8]"
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

      <div className="pt-14 lg:pt-20">
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
    <div className="grid items-stretch gap-10 lg:grid-cols-[minmax(0,0.95fr)_minmax(360px,0.75fr)] lg:gap-16">
      <HighSchoolMediaCarousel program={program} />

      <div className="flex flex-col lg:min-h-[520px]">
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#5f6368]">{program.grade}</p>
        <h2 className="mt-4 text-3xl font-semibold leading-[1.12] text-[#202124] md:text-[2.65rem]">
          EAI Robotics Future Founder Immersion Program
        </h2>

        <div className="mt-7 grid gap-4 text-base leading-7 text-[#3c4043]">
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
            className="inline-flex items-center justify-center whitespace-nowrap rounded-[10px] bg-[#1a73e8] px-5 py-3 text-base font-semibold text-white shadow-[0_2px_6px_rgba(26,115,232,0.34)] transition hover:bg-[#185abc] hover:shadow-[0_3px_9px_rgba(26,115,232,0.4)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8] active:translate-y-px"
          >
            Explore high school program
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
      imageClassName: "object-contain p-8 invert sm:p-10"
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
      className="group relative min-h-[360px] overflow-hidden rounded-[28px] bg-[#f5f5f7] transition hover:bg-[#f0f0f2] sm:min-h-[440px] lg:min-h-[520px]"
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
            className={`h-2.5 rounded-full transition ${
              activeSlide === index ? "w-7 bg-[#202124]/45" : "w-2.5 bg-[#202124]/20 hover:bg-[#202124]/36"
            }`}
          />
        ))}
        <button
          type="button"
          aria-label="Resume high school image autoplay"
          onClick={resumeAutoplay}
          className={`grid h-7 w-7 place-items-center rounded-full bg-[#202124]/10 transition hover:bg-[#202124]/16 ${
            isAutoplaying ? "opacity-25" : "opacity-55 hover:opacity-85"
          }`}
        >
          <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-[#202124]" />
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
        className="group relative block min-h-[178px] overflow-hidden rounded-[24px] bg-black shadow-[0_16px_45px_rgba(15,23,42,0.08)] transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.16)]"
      >
        <Image
          src={k8LearningImage}
          alt="K-8 students exploring AI, coding, and robotics projects"
          fill
          sizes="(min-width: 1024px) 1180px, 100vw"
          className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.94)_0%,rgba(0,0,0,0.88)_26%,rgba(0,0,0,0.56)_52%,rgba(0,0,0,0.18)_78%,rgba(0,0,0,0)_100%)]" />
        <div className="relative z-10 flex min-h-[178px] max-w-2xl flex-col justify-center px-6 py-6 sm:px-8 lg:px-10">
          <h3 className="text-3xl font-semibold leading-tight !text-white drop-shadow-[0_2px_14px_rgba(0,0,0,0.72)] md:text-4xl">
            What can we learn from Navi?
          </h3>
        </div>
      </Link>

      <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
        <div className="lg:pt-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#5f6368]">Summer camps</p>
          <h2 className="mt-4 text-4xl font-semibold leading-tight tracking-[-0.01em] text-[#202124] md:text-5xl">
            Hands-on AI learning for younger builders.
          </h2>
          <p className="mt-6 text-lg leading-8 text-[#5f6368]">
            Creativity, coding, robotics, and teamwork programs that help K-8 students turn curiosity
            into real projects.
          </p>
        </div>

        <div className="space-y-5">
          {programs.map((program) => (
            <Link
              key={program.slug}
              href={`/agentech-education/${program.slug}`}
              className="group grid overflow-hidden rounded-[24px] bg-[#f5f5f7] transition hover:bg-[#f0f0f2] sm:grid-cols-[240px_1fr]"
            >
              <div className="relative aspect-[4/3] bg-[#f5f5f7] sm:aspect-auto sm:min-h-[190px]">
                <Image
                  src={program.cardImage ?? program.image}
                  alt={`${program.grade} class advertisement`}
                  fill
                  sizes="(min-width: 1024px) 240px, 100vw"
                  className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
                />
              </div>
              <div className="flex flex-col justify-center px-6 py-7 sm:px-8">
                <p className="text-sm font-semibold text-[#5f6368]">{program.grade}</p>
                <h3 className="mt-2 text-2xl font-semibold leading-tight text-[#202124]">{program.title}</h3>
                <p className="mt-3 line-clamp-3 text-sm leading-6 text-[#5f6368]">{program.subtitle}</p>
                <span className="mt-5 text-sm font-semibold text-[#1a73e8]">View program</span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

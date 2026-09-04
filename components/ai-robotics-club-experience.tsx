import Link from "next/link";
import { SUMMER_SCHOOL_GRADES } from "@/lib/summer-school";

type ClubLocale = "en" | "zh";

const clubExperienceCopy = {
  en: {
    navigationLabel: "On-page navigation",
    navigation: [
      ["Program", "#program-details"],
      ["Skills", "#skills"],
      ["Curriculum", "#curriculum"],
      ["FAQ", "#faq"],
      ["Apply", "#quick-apply"],
    ],
    facts: [
      ["Grades", "9–12"],
      ["Experience", "Beginner to advanced"],
      ["Format", "Weekly team challenges"],
      ["Outcome", "Documented portfolio work"],
    ],
    quickEyebrow: "Quick application · Step 1 of 2",
    quickTitle: "Start with three details.",
    quickBody: "We will carry these answers into the full application so you do not have to enter them twice.",
    name: "Student name",
    namePlaceholder: "Student name",
    grade: "Grade",
    projects: "Project experience",
    projectsPlaceholder: "A short note is enough. Beginners can write “No prior project.”",
    continue: "Continue application",
    mobileApply: "Apply to AI & Robotics Club",
    faqEyebrow: "Application FAQ",
    faqTitle: "Know what happens before you apply.",
    faqs: [
      ["Does a student need prior robotics experience?", "No. The application accepts beginner, intermediate, and advanced students. The program begins with foundations and advances through real engineering challenges."],
      ["What will students work on?", "The curriculum covers AI agents, computer vision, embodied AI, autonomous navigation, hardware, research, teamwork, and technical documentation."],
      ["What happens after the quick application?", "Your three answers are carried into the full application. A signed-in account is required only when you continue working on or submit the full form."],
    ],
  },
  zh: {
    navigationLabel: "页面导航",
    navigation: [
      ["项目介绍", "#program-details"],
      ["核心能力", "#skills"],
      ["课程内容", "#curriculum"],
      ["常见问题", "#faq"],
      ["申请", "#quick-apply"],
    ],
    facts: [
      ["适合年级", "9–12 年级"],
      ["经验要求", "零基础至进阶"],
      ["项目形式", "每周团队工程挑战"],
      ["学习产出", "可记录的作品集成果"],
    ],
    quickEyebrow: "快速申请 · 共两步",
    quickTitle: "先填写三项基本信息。",
    quickBody: "这些内容会自动带入正式申请表，无需重复填写。",
    name: "学生姓名",
    namePlaceholder: "学生姓名",
    grade: "年级",
    projects: "项目经验",
    projectsPlaceholder: "简单描述即可；零基础学生可以填写“暂无项目经验”。",
    continue: "继续填写正式申请",
    mobileApply: "申请 AI & Robotics Club",
    faqEyebrow: "申请常见问题",
    faqTitle: "申请前先了解完整流程。",
    faqs: [
      ["学生需要机器人基础吗？", "不需要。正式申请接受零基础、中级和进阶学生；课程从基础开始，并逐步进入真实工程挑战。"],
      ["学生会学习哪些内容？", "课程涵盖 AI 智能体、计算机视觉、具身智能、自主导航、硬件、研究方法、团队协作和工程文档。"],
      ["快速申请之后会发生什么？", "三项基本信息会自动带入正式申请表。只有继续填写或提交正式表单时才需要登录账户。"],
    ],
  },
} as const;

const fieldClass =
  "w-full rounded-xl border border-[#d8d3ca] bg-white px-3 py-2.5 text-sm text-[#111111] outline-none transition placeholder:text-[#77746d] focus:border-[#111111] focus:ring-4 focus:ring-black/5";

export function ClubSectionNavigation({ locale }: { locale: ClubLocale }) {
  const copy = clubExperienceCopy[locale];

  return (
    <nav
      data-club-section-navigation="true"
      aria-label={copy.navigationLabel}
      className="sticky top-[84px] z-30 mt-7 rounded-[22px] border border-[#d8d3ca] bg-[#fbfaf7]/95 p-1.5 shadow-[0_12px_34px_rgba(17,17,17,0.08)] backdrop-blur sm:rounded-full"
    >
      <div className="flex items-center justify-center gap-1">
        {copy.navigation.map(([label, href]) => (
          <Link
            key={href}
            href={href}
            className="rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.1em] !text-[#4f4d48] transition hover:bg-[#111111] hover:!text-white"
          >
            {label}
          </Link>
        ))}
      </div>
    </nav>
  );
}

export function ClubHeroFacts({ locale }: { locale: ClubLocale }) {
  const copy = clubExperienceCopy[locale];

  return (
    <dl data-club-surface className="mt-8 grid overflow-hidden rounded-[22px] border border-[#d8d3ca] bg-[#fbfaf7] sm:grid-cols-2 lg:grid-cols-4">
      {copy.facts.map(([label, value], index) => (
        <div
          key={label}
          className={`p-4 ${index > 0 ? "border-t border-[#d8d3ca] sm:border-t-0 sm:border-l" : ""} ${index === 2 ? "sm:border-l-0 sm:border-t lg:border-l lg:border-t-0" : ""}`}
        >
          <dt data-club-fact-label className="font-technical text-[10px] font-medium uppercase tracking-[0.18em] !text-[#77746d]">{label}</dt>
          <dd data-club-fact-value className="font-technical mt-2 text-sm font-medium !text-[#171717]">{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function ClubQuickApplication({ locale }: { locale: ClubLocale }) {
  const copy = clubExperienceCopy[locale];

  return (
    <aside data-club-surface id="quick-apply" className="scroll-mt-32 rounded-[30px] border border-[#d8d3ca] bg-[#fbfaf7] p-5 shadow-[0_24px_70px_rgba(17,17,17,0.12)]">
      <form
        data-club-quick-application="true"
        action="/ai-robotics-club/apply"
        method="get"
        className="rounded-[24px] border border-[#d8d3ca] bg-[#eeece7] p-5"
      >
        <p data-club-application-progress className="font-technical text-xs font-medium uppercase tracking-[0.2em] !text-[#62615d]">{copy.quickEyebrow}</p>
        <h2 data-club-application-title className="font-interface mt-3 text-2xl font-bold tracking-tight !text-[#171717]">{copy.quickTitle}</h2>
        <p className="mt-2 text-sm leading-6 !text-[#62615d]">{copy.quickBody}</p>

        <div className="mt-5 grid gap-4">
          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] !text-[#62615d]">{copy.name}</span>
            <input required className={fieldClass} name="name" autoComplete="name" placeholder={copy.namePlaceholder} />
          </label>

          <fieldset>
            <legend className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] !text-[#62615d]">{copy.grade}</legend>
            <div className="grid grid-cols-4 gap-2">
              {SUMMER_SCHOOL_GRADES.map((grade, index) => (
                <label key={grade} className="cursor-pointer">
                  <input className="peer sr-only" type="radio" name="grade" value={grade} defaultChecked={index === 0} />
                  <span data-club-grade-option className="font-technical block rounded-full border border-[#d8d3ca] bg-white px-2 py-2 text-center text-xs font-medium !text-[#171717] transition peer-checked:border-[#111111] peer-checked:bg-[#111111] peer-checked:!text-white">
                    {grade}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>

          <label>
            <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.16em] !text-[#62615d]">{copy.projects}</span>
            <textarea className={`${fieldClass} min-h-24 resize-y`} name="projects" placeholder={copy.projectsPlaceholder} />
          </label>
        </div>

        <button
          data-club-primary-action
          type="submit"
          className="mt-5 inline-flex w-full justify-center rounded-full bg-[#111111] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#33312d]"
        >
          {copy.continue}
        </button>
      </form>
    </aside>
  );
}

export function ClubFaq({ locale }: { locale: ClubLocale }) {
  const copy = clubExperienceCopy[locale];

  return (
    <section id="faq" className="mt-20 scroll-mt-32">
      <div className="grid gap-8 lg:grid-cols-[0.75fr_1.25fr]">
        <div>
          <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#62615d]">{copy.faqEyebrow}</p>
          <h2 className="font-display mt-4 text-3xl font-semibold tracking-tight !text-[#171717] md:text-5xl">{copy.faqTitle}</h2>
        </div>
        <div className="grid gap-3">
          {copy.faqs.map(([question, answer]) => (
            <details data-club-surface key={question} className="group rounded-[22px] border border-[#d8d3ca] bg-[#fbfaf7] p-5">
              <summary className="cursor-pointer list-none pr-8 text-base font-semibold !text-[#171717] marker:hidden">
                {question}
                <span className="float-right transition group-open:rotate-45" aria-hidden="true">+</span>
              </summary>
              <p className="mt-3 max-w-3xl text-sm leading-7 !text-[#62615d]">{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ClubMobileApply({ locale }: { locale: ClubLocale }) {
  const copy = clubExperienceCopy[locale];

  return (
    <Link
      data-club-mobile-apply="true"
      data-club-primary-action
      href="#quick-apply"
      className="mt-5 inline-flex w-full justify-center rounded-full bg-[#111111] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(17,17,17,0.2)] md:hidden"
    >
      {copy.mobileApply}
    </Link>
  );
}

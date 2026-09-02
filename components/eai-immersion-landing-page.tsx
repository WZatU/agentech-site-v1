"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  heroMedia,
  programJourneyDays,
  type ProgramDay
} from "@/lib/program-journey-data";
import { eaiImmersionCourseCode } from "@/lib/education-courses";
import { eaiPriceSummary, eaiZhPriceSummary } from "@/lib/eai-immersion-options";

type Language = "en" | "zh";

const guideHrefs: Record<Language, string> = {
  en: "/assets/program-guides/agentech-ff-eai-robotics-future-founder-program-guide-en.pdf?v=20260702-two-sessions",
  zh: "/assets/program-guides/agentech-ff-eai-robotics-future-founder-program-guide-zh.pdf?v=20260702-two-sessions"
};

const guideDownloadNames: Record<Language, string> = {
  en: "agentech-ff-eai-robotics-future-founder-program-guide-en.pdf",
  zh: "agentech-ff-eai-robotics-future-founder-program-guide-zh.pdf"
};

const enrollmentHref = `/enroll?course=${eaiImmersionCourseCode}`;

const flyerHrefs: Record<Language, string> = {
  en: "/assets/program-flyers/eai-robotics-future-founder-immersion-program-flyer-en.png?v=20260702-two-sessions",
  zh: "/assets/program-flyers/eai-robotics-future-founder-immersion-program-flyer-zh.png?v=20260702-two-sessions"
};

const flyerPreviewSrcs: Record<Language, string> = {
  en: "/assets/program-flyers/eai-robotics-future-founder-immersion-program-flyer-en.png",
  zh: "/assets/program-flyers/eai-robotics-future-founder-immersion-program-flyer-zh.png"
};

const flyerDownloadNames: Record<Language, string> = {
  en: "eai-robotics-future-founder-immersion-program-flyer-en.png",
  zh: "eai-robotics-future-founder-immersion-program-flyer-zh.png"
};

type LocalizedDayCopy = Pick<ProgramDay, "day" | "title" | "tagline" | "morning" | "afternoon" | "evening" | "body">;

const zhJourneyCopy: LocalizedDayCopy[] = [
  {
    day: "第一期 / 第 1 天",
    title: "发现机器人创业机会",
    tagline: "从真实问题开始",
    morning: ["第一期开营", "机器人公司环境导览", "问题发现工作坊"],
    afternoon: ["机器人平台体验", "团队组建", "创业挑战选择"],
    evening: ["创始人炉边对谈：机器人创业为什么难"],
    body: "学生以未来创始人的视角进入第一期。他们会走进真实机器人公司环境，组建团队，并选择一个可以在 5 天内转化为创业概念的问题。"
  },
  {
    day: "第一期 / 第 2 天",
    title: "做出第一个能力原型",
    tagline: "创业项目需要证明有东西能跑起来",
    morning: ["具身智能基础", "机器人系统架构", "能力地图"],
    afternoon: ["编程工作坊", "仿真冲刺", "第一次原型评审"],
    evening: ["每日 Demo 与导师反馈"],
    body: "团队学习具身智能的语言，并把它连接到第一个可展示能力。重点不是重复 AI 概念，而是快速建立早期技术证明。"
  },
  {
    day: "第一期 / 第 3 天",
    title: "把技术转成产品",
    tagline: "当用户需要它 技术才变得有价值",
    morning: ["用户问题定义", "市场发现", "产品承诺"],
    afternoon: ["工程师带领的技能工作坊", "原型改进", "商业模式草图"],
    evening: ["嘉宾分享：真实世界中的机器人"],
    body: "学生把原型连接到客户问题、用户故事和简单商业模式。第一期会把创始人思维和技术构建紧密结合。"
  },
  {
    day: "第一期 / 第 4 天",
    title: "Hackathon 启动：构建冲刺",
    tagline: "第一个 Demo 在限制中成型",
    morning: ["范围锁定", "硬件与安全评审", "Demo 成功标准"],
    afternoon: ["小型 Hackathon 启动", "构建、测试、调试", "导师检查"],
    evening: ["路演提纲与风险评审"],
    body: "第一期 Hackathon 从更短、更聚焦的冲刺开始。团队锁定范围、稳定原型，并准备讲清楚技术和创业逻辑。"
  },
  {
    day: "第一期 / 第 5 天",
    title: "第一期 Demo Day",
    tagline: "路演创业想法 回答技术问题",
    morning: ["最终构建锁定", "Demo 彩排", "技术问答准备"],
    afternoon: ["小型 Hackathon 展示", "创始人式路演", "奖项与复盘"],
    evening: ["后续路径说明"],
    body: "第一期以紧凑的 Hackathon 展示和创始人式路演结束。学生会带走一个机器人创业故事、原型证据和可继续发展的反馈。"
  },
  {
    day: "第二期 / 第 1 天",
    title: "定位自主能力产品机会",
    tagline: "第二期从新的视角重新开始",
    morning: ["第二期开营", "自主能力应用场景工作坊", "AI 产品简报"],
    afternoon: ["工作流地图", "团队组建", "产品挑战选择"],
    evening: ["专家炉边对谈：真实世界中的自主能力"],
    body: "第二期对新学生是独立完整体验，对两期联报学生则不会重复第一期。团队聚焦 AI 机器人产品机会、自主能力闭环和工作流价值。"
  },
  {
    day: "第二期 / 第 2 天",
    title: "构建 AI 产品闭环",
    tagline: "自主能力不是单点技巧 而是一套闭环",
    morning: ["感知与规划", "数据与评估", "自主能力闭环设计"],
    afternoon: ["系统集成冲刺", "场景测试", "技术评审"],
    evening: ["每日 Demo 与迭代记录"],
    body: "学生围绕感知、决策、行动和反馈构建系统。第二期更强调产品可靠性、场景测试和可衡量的改进。"
  },
  {
    day: "第二期 / 第 3 天",
    title: "测试 迭代 定位",
    tagline: "失败被看见 产品才会变好",
    morning: ["可靠性测试", "失败模式评审", "产品指标"],
    afternoon: ["迭代冲刺", "用户场景验证", "发布故事线"],
    evening: ["路演辅导：产品定位"],
    body: "团队对 AI 机器人产品想法进行压力测试，并通过反馈持续改进。两期联报学生会进入不同的内容弧线：自主能力、指标和产品定位。"
  },
  {
    day: "第二期 / 第 4 天",
    title: "发布冲刺启动",
    tagline: "快速构建 然后让产品被理解",
    morning: ["发布范围锁定", "路线图与风险评审", "评审标准"],
    afternoon: ["小型 Hackathon 启动", "产品构建冲刺", "导师检查"],
    evening: ["Demo 彩排与最终测试"],
    body: "第二期 Hackathon 在第 4 天进入产品发布冲刺。团队稳定构建、准备证据，并在 Demo Day 前做出清晰取舍。"
  },
  {
    day: "第二期 / 第 5 天",
    title: "第二期 Demo Day",
    tagline: "发布产品愿景",
    morning: ["最终 Demo", "产品展示", "技术问答"],
    afternoon: ["投资人式路演", "奖项公布", "闭营仪式"],
    evening: ["Networking", "结业证书", "校友邀请"],
    body: "第二期以面向产品自主能力、工作流价值和发布叙事的 Demo Day 收束。参加两期的学生会带走两条不同的项目成长线。"
  }
];

const copy = {
  en: {
    languageLabel: "Switch page language to Chinese",
    hero: {
      logoLeft: "AGENTECH",
      logoRight: "FF",
      kicker: "EAI Robotics Future Founder Immersion Program",
      title: <>EAI Robotics.<br />Future Founder.<br /><span className="text-white/86">Immersion Program.</span></>,
      tagline: "Two 5-Day Sessions. Real Robots. Real Engineers. Real Startup Experience.",
      body: "Choose Session 1, Session 2, or both. Each 5-day session is a complete founder-level AI robotics immersion with its own mini hackathon and pitch.",
      guideCta: "Download Program Guide",
      applyCta: "Apply Interest",
      stats: ["Session 1: Early July 2026", "Session 2: Late July 2026", eaiPriceSummary]
    },
    overview: {
      title: "Two standalone sessions. One founder-level robotics immersion.",
      paragraphs: [
        "The program is now structured as two independent 5-day sessions. Students may join Session 1, Session 2, or both, and each pathway is designed to produce a meaningful project outcome.",
        "Session 1 focuses on robotics venture building. Session 2 focuses on AI robotics product and autonomy. Students who join both experience two distinct arcs rather than repeating the same material."
      ],
      pillarLabel: "Program pillar",
      highlights: [
        {
          title: "Session 1: Robotics Venture Lab",
          body: "Students identify a real robotics problem, build a prototype, shape a business model, and pitch a venture concept."
        },
        {
          title: "Session 2: AI Robotics Product Lab",
          body: "Students build around autonomy loops, scenario testing, product metrics, and launch-ready storytelling."
        },
        {
          title: "One Session or Both",
          body: "Each session stands alone for new students, while both-session students gain non-repeating projects, mentors, and demo-day moments."
        }
      ]
    },
    signatureMoments: {
      eyebrow: "Signature Moments",
      title: "Three defining moments.",
      body: "Both 5-day sessions are built around moments that change how students see robotics, company building, product thinking, and their own future.",
      playLabel: "Resume signature moments autoplay",
      items: [
        {
          eyebrow: "Mentors & Guests",
          title: "Meet the people building the future.",
          subtitle: "Engineers, founders, executives, professors, and investors show students how the real world is built.",
          body: "Selected fireside chats and critique sessions turn the program into a direct encounter with people working at the edge of AI robotics, products, capital, and research.",
          mediaUrl: "/assets/ff-robotics/signature-mentors-ai-branded-founders.png",
          mediaAlt: "AI-redrawn robotics founders and engineers in branded black and white clothing inside a modern lab office",
          dark: false
        },
        {
          eyebrow: "Hackathon",
          title: "Two shorter hackathons, one per session.",
          subtitle: "Each session ends with a focused build sprint, demo, technical Q&A, and founder-style pitch.",
          body: "Students make tradeoffs, debug under time pressure, and learn how strong teams turn uncertainty into a working demo and a clear story.",
          mediaUrl: "/assets/ff-robotics/day-9-ai-branded-hackathon.png",
          mediaAlt: "AI-redrawn late-night robotics hackathon room with students and mentors working under dramatic lighting",
          dark: true
        },
        {
          eyebrow: "Outcomes",
          title: "Students leave with more than memories.",
          subtitle: "A project story, founder-style pitch, portfolio material, and a pathway to keep going after the program.",
          body: "Students who attend one session leave with a complete project arc. Students who attend both leave with two distinct project stories they can continue through Agentech AI Club, internship, or research pathways.",
          mediaUrl: "/assets/ff-robotics/day-10-ai-branded-demo-day.png",
          mediaAlt: "AI-redrawn robotics demo day presentation with students, mentors, and a humanoid robot",
          dark: false
        }
      ]
    },
    journey: {
      eyebrow: "Two 5-Day Journeys",
      title: "Two standalone sessions. No repeated path.",
      body: "Each session moves from discovery to build sprint to demo day. Session 1 and Session 2 are parallel, not prerequisite-based.",
      scheduleLabels: ["Morning", "Afternoon", "Evening"],
      timelineStages: ["Challenge", "Deep Work", "Expert Review"],
      timelineNote: "The path narrows from broad challenge discovery into one focused use case that can be built, tested, and explained.",
      hackathonBadge: "Hackathon begins",
      countdownNumber: "24",
      countdownLabel: "hours to demo day"
    },
    mentors: {
      title: "Meet the people building the future.",
      body: "Throughout the program, students may meet engineers, founders, executives, professors, and robotics experts through selected fireside chats and guest sessions.",
      roles: ["AI Engineer", "Robotics Engineer", "Startup Founder", "FF Executive", "University Professor", "Investor / Venture Advisor"],
      note: "May include selected sessions, critique, or fireside conversations."
    },
    hackathon: {
      eyebrow: "Hackathon & Final Pitch",
      title: "One hackathon per session.",
      body: "Each final sprint challenges students to combine AI, robotics, product thinking, teamwork, and presentation skills into one focused project.",
      judgingLabel: "Judging categories",
      categories: ["Technical Execution", "Creativity", "Real-World Value", "Teamwork", "Final Pitch"]
    },
    outcomes: {
      eyebrow: "Student Outcomes",
      title: "Students leave with more than memories.",
      items: [
        "One completed AI robotics project per session attended",
        "Mini hackathon and demo-day presentation",
        "Founder-style pitch experience for each selected session",
        "Certificate of completion",
        "Project portfolio material",
        "Exposure to real engineering workflow",
        "Invitation to continue through Agentech AI Club / Internship / Research Pathway"
      ]
    },
    guide: {
      eyebrow: "Download Program Guide",
      title: "Explore the full program structure.",
      body: "Explore both 5-day session structures, session options, pricing, outcomes, and application details.",
      button: "Download PDF",
      coverKicker: "Program Guide",
      coverTitle: <>EAI Robotics<br />Future Founder<br />Immersion Program</>,
      coverBody: "Two 5-day sessions, mentor moments, mini hackathons, final pitches, and student outcomes."
    },
    finalCta: {
      kicker: "Agentech × FF",
      title: "Ready to begin the journey?",
      apply: "Apply Interest",
      footer: "EAI Robotics Future Founder Immersion Program",
      flyerLabel: "Program flyer",
      flyerButton: "Download Flyer"
    }
  },
  zh: {
    languageLabel: "Switch page language to English",
    hero: {
      logoLeft: "智能体科技有限公司",
      logoRight: "法拉第未来",
      kicker: "具身智能机器人未来创始人沉浸项目",
      title: <>具身智能机器人<br />未来创始人<br /><span className="text-white/86">沉浸项目</span></>,
      tagline: "两期 5 天 真实机器人 真实工程师 真实创业体验",
      body: "学生可选择第一期、第二期，或两期联报。每一期都是独立完整的 5 天创始人级别 AI 机器人沉浸体验，并有各自的小型 Hackathon 与路演。",
      guideCta: "下载项目手册",
      applyCta: "提交兴趣",
      stats: ["第一期：2026 年 7 月上旬", "第二期：2026 年 7 月下旬", eaiZhPriceSummary]
    },
    overview: {
      title: "两期独立体验 同一个创始人级别机器人沉浸项目",
      paragraphs: [
        "项目现在调整为两期独立的 5 天体验。学生可以只参加第一期、只参加第二期，或两期联报，每一种路径都能形成完整的项目成果。",
        "第一期聚焦机器人创业构建，第二期聚焦 AI 机器人产品与自主能力。两期联报的学生会经历两条不同项目线，而不是重复同样内容。"
      ],
      pillarLabel: "项目支柱",
      highlights: [
        {
          title: "第一期：机器人创业实验室",
          body: "学生发现真实机器人问题，构建原型，形成商业模式，并完成创业概念路演。"
        },
        {
          title: "第二期：AI 机器人产品实验室",
          body: "学生围绕自主能力闭环、场景测试、产品指标和发布叙事进行构建。"
        },
        {
          title: "一期或两期 都有收获",
          body: "每一期都对新学生独立完整；两期联报学生则会获得不重复的项目、导师反馈和 Demo Day 体验。"
        }
      ]
    },
    signatureMoments: {
      eyebrow: "核心亮点",
      title: "三个真正改变学生的时刻",
      body: "两期 5 天体验都会围绕关键时刻展开 让学生重新理解机器人 公司建设 产品思维 和自己的未来",
      playLabel: "继续自动播放核心亮点",
      items: [
        {
          eyebrow: "导师与嘉宾",
          title: "与正在创造未来的人同行",
          subtitle: "工程师 创始人 高管 教授 投资人 让学生看到真实世界如何运转",
          body: "精选炉边对谈与项目反馈 会让学生直接接触 AI 机器人 产品 资本 与研究前沿的真实建设者。",
          mediaUrl: "/assets/ff-robotics/signature-mentors-ai-branded-founders.png",
          mediaAlt: "AI 重绘的机器人创始人与工程师身着黑白品牌服装 在现代实验室办公空间交流",
          dark: false
        },
        {
          eyebrow: "Hackathon",
          title: "每一期都有一次更聚焦的 Hackathon",
          subtitle: "每一期最后都包含构建冲刺 Demo 技术问答 和创始人式路演",
          body: "学生会在时间压力下做取舍 做调试 做表达 学会把不确定性变成一个可演示的项目和清晰的故事。",
          mediaUrl: "/assets/ff-robotics/day-9-ai-branded-hackathon.png",
          mediaAlt: "AI 重绘的深夜机器人 Hackathon 空间 学生与导师在戏剧化灯光下冲刺开发",
          dark: true
        },
        {
          eyebrow: "学生收获",
          title: "学生带走的不只是回忆",
          subtitle: "项目故事 创始人式路演 作品集材料 以及项目结束后的持续路径",
          body: "只参加一期的学生会完成一条完整项目线。两期联报学生会带走两个不同项目故事，并连接到 Agentech AI Club 实习或研究路径。",
          mediaUrl: "/assets/ff-robotics/day-10-ai-branded-demo-day.png",
          mediaAlt: "AI 重绘的机器人 Demo Day 学生在导师与家庭面前展示最终项目",
          dark: false
        }
      ]
    },
    journey: {
      eyebrow: "两期 5 天旅程",
      title: "两期独立体验 内容不重复",
      body: "每一期都会从发现问题走向构建冲刺和 Demo Day。第一期与第二期是并列体验，而不是先修关系。",
      scheduleLabels: ["上午", "下午", "晚间"],
      timelineStages: ["真实问题", "深度构建", "专家评审"],
      timelineNote: "路径会从宽泛的问题发现，逐步收敛到一个能够被构建、测试和讲清楚的应用场景。",
      hackathonBadge: "Hackathon 开始",
      countdownNumber: "24",
      countdownLabel: "小时到 Demo Day"
    },
    mentors: {
      title: "与正在创造未来的人同行",
      body: "在项目过程中，学生可能通过精选炉边对谈和嘉宾课程，接触工程师、创始人、高管、教授和机器人领域专家。",
      roles: ["AI 工程师", "机器人工程师", "创业公司创始人", "FF 高管", "大学教授", "投资人 / 创投顾问"],
      note: "可能包括精选分享、项目反馈或炉边对谈。"
    },
    hackathon: {
      eyebrow: "Hackathon 与最终路演",
      title: "每一期都有一次 Hackathon",
      body: "每一次最终冲刺都要求学生把 AI、机器人、产品思维、团队协作与表达能力，整合成一个聚焦项目。",
      judgingLabel: "评审维度",
      categories: ["技术完成度", "创造力", "现实价值", "团队协作", "最终路演"]
    },
    outcomes: {
      eyebrow: "学生收获",
      title: "学生带走的不只是回忆",
      items: [
        "每期完成一个 AI 机器人项目",
        "小型 Hackathon 与 Demo Day 展示",
        "每个所选期次都有创始人式路演体验",
        "项目结业证书",
        "可用于作品集的项目材料",
        "真实工程工作流体验",
        "继续进入 Agentech AI Club / 实习 / 研究路径的机会"
      ]
    },
    guide: {
      eyebrow: "下载项目手册",
      title: "查看完整项目结构",
      body: "了解两期 5 天结构、期数选择、价格、学生收获与后续申请信息。",
      button: "下载 PDF",
      coverKicker: "项目手册",
      coverTitle: <>具身智能机器人<br />未来创始人<br />沉浸项目</>,
      coverBody: "两期 5 天旅程、导师交流、小型 Hackathon、最终路演与学生收获。"
    },
    finalCta: {
      kicker: "Agentech × FF",
      title: "准备开始这段旅程",
      apply: "提交兴趣",
      footer: "EAI Robotics Future Founder Immersion Program",
      flyerLabel: "项目海报",
      flyerButton: "下载海报"
    }
  }
};

export function EaiImmersionLandingPage() {
  const [language, setLanguage] = useState<Language>("en");
  const text = copy[language];
  const guideHref = guideHrefs[language];
  const guideDownloadName = guideDownloadNames[language];
  const days = useMemo(
    () =>
      language === "en"
        ? programJourneyDays
        : programJourneyDays.map((day, index) => ({
            ...day,
            ...zhJourneyCopy[index]
          })),
    [language]
  );

  function toggleLanguage() {
    setLanguage((current) => (current === "en" ? "zh" : "en"));
  }

  return (
    <div
      lang={language === "zh" ? "zh-CN" : "en"}
      data-ff-theme-page
      className={`ff-immersion min-h-screen bg-[#f5f4f1] text-[#111111] ${language === "zh" ? "ff-zh" : ""}`}
    >
      <AgentechCursorTrace />
      <LanguageToggle language={language} onToggle={toggleLanguage} label={text.languageLabel} />
      <HeroSection language={language} text={text.hero} guideHref={guideHref} guideDownloadName={guideDownloadName} />
      <ProgramOverview language={language} text={text.overview} />
      <SignatureMomentsSection language={language} text={text.signatureMoments} />
      <DayJourneySection language={language} text={text.journey} days={days} />
      <ProgramGuideSection language={language} text={text.guide} guideHref={guideHref} guideDownloadName={guideDownloadName} />
      <FinalCTA language={language} text={text.finalCta} />
    </div>
  );
}

type TracePoint = {
  x: number;
  y: number;
  time: number;
  velocity: number;
};

function AgentechCursorTrace() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointsRef = useRef<TracePoint[]>([]);
  const lastPointRef = useRef<TracePoint | null>(null);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;

    if (!canvas) {
      return;
    }

    const activeCanvas = canvas;
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (prefersReducedMotion.matches) {
      return;
    }

    const context = activeCanvas.getContext("2d");

    if (!context) {
      return;
    }

    const drawingContext = context;
    const trailLifetime = 720;
    const minimumDistance = 4;

    function resizeCanvas() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      activeCanvas.width = Math.floor(window.innerWidth * dpr);
      activeCanvas.height = Math.floor(window.innerHeight * dpr);
      activeCanvas.style.width = `${window.innerWidth}px`;
      activeCanvas.style.height = `${window.innerHeight}px`;
      drawingContext.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function recordPoint(event: PointerEvent) {
      if (event.pointerType !== "mouse" && event.pointerType !== "pen") {
        return;
      }

      const now = performance.now();
      const lastPoint = lastPointRef.current;
      const dx = lastPoint ? event.clientX - lastPoint.x : 0;
      const dy = lastPoint ? event.clientY - lastPoint.y : 0;
      const distance = Math.hypot(dx, dy);

      if (lastPoint && distance < minimumDistance) {
        return;
      }

      const elapsed = lastPoint ? Math.max(now - lastPoint.time, 1) : 16;
      const velocity = Math.min(distance / elapsed, 1.35);
      const point = {
        x: event.clientX,
        y: event.clientY,
        time: now,
        velocity
      };

      pointsRef.current.push(point);
      lastPointRef.current = point;
    }

    function clearTrace() {
      pointsRef.current = [];
      lastPointRef.current = null;
      drawingContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }

    function draw(now: number) {
      drawingContext.clearRect(0, 0, window.innerWidth, window.innerHeight);
      pointsRef.current = pointsRef.current.filter((point) => now - point.time < trailLifetime);

      const points = pointsRef.current;

      for (let index = 1; index < points.length; index += 1) {
        const previous = points[index - 1];
        const current = points[index];
        const age = (now - current.time) / trailLifetime;
        const life = Math.max(0, 1 - age);
        const alpha = life * life;

        if (alpha <= 0.01) {
          continue;
        }

        drawingContext.save();
        drawingContext.lineCap = "round";
        drawingContext.lineJoin = "round";
        drawingContext.shadowBlur = 10;
        drawingContext.shadowColor = `rgba(124, 196, 255, ${alpha * 0.2})`;
        drawingContext.strokeStyle = `rgba(22, 31, 39, ${alpha * 0.14})`;
        drawingContext.lineWidth = 3.4 + current.velocity * 1.2;
        drawingContext.beginPath();
        drawingContext.moveTo(previous.x, previous.y);
        drawingContext.lineTo(current.x, current.y);
        drawingContext.stroke();

        const highlight = drawingContext.createLinearGradient(previous.x, previous.y, current.x, current.y);
        highlight.addColorStop(0, `rgba(234, 241, 246, ${alpha * 0.18})`);
        highlight.addColorStop(0.48, `rgba(124, 196, 255, ${alpha * 0.5})`);
        highlight.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.2})`);
        drawingContext.shadowBlur = 6;
        drawingContext.shadowColor = `rgba(124, 196, 255, ${alpha * 0.34})`;
        drawingContext.strokeStyle = highlight;
        drawingContext.lineWidth = 1.1 + current.velocity * 0.42;
        drawingContext.beginPath();
        drawingContext.moveTo(previous.x, previous.y);
        drawingContext.lineTo(current.x, current.y);
        drawingContext.stroke();
        drawingContext.restore();
      }

      frameRef.current = window.requestAnimationFrame(draw);
    }

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("pointermove", recordPoint);
    window.addEventListener("pointerleave", clearTrace);
    window.addEventListener("blur", clearTrace);
    frameRef.current = window.requestAnimationFrame(draw);

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", recordPoint);
      window.removeEventListener("pointerleave", clearTrace);
      window.removeEventListener("blur", clearTrace);

      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[45] hidden md:block"
    />
  );
}

function LanguageToggle({
  language,
  label,
  onToggle
}: {
  language: Language;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onToggle}
      className="fixed right-4 top-[88px] z-[80] inline-flex items-center gap-2 rounded-[10px] border border-white/16 bg-black px-4 py-3 text-sm font-semibold leading-none text-white shadow-[0_4px_14px_rgba(0,0,0,0.26)] transition hover:bg-[#1f1f1f] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black sm:right-6"
    >
      <span className={language === "en" ? "text-white" : "text-white/60"}>EN</span>
      <span className="text-white/44">/</span>
      <span className={language === "zh" ? "text-white" : "text-white/60"}>中</span>
    </button>
  );
}

function HeroSection({
  language,
  text,
  guideHref,
  guideDownloadName
}: {
  language: Language;
  text: typeof copy.en.hero;
  guideHref: string;
  guideDownloadName: string;
}) {
  return (
    <section className="ff-hero relative isolate min-h-[calc(100svh-120px)] overflow-hidden bg-black text-white">
      <div
        data-ff-hero-media
        className="ff-hero-media absolute inset-0 bg-no-repeat"
        style={{ backgroundImage: `url(${heroMedia.mediaUrl})` }}
        aria-hidden="true"
      />
      <div data-ff-hero-depth className="ff-hero-depth absolute inset-0" aria-hidden="true" />
      <div data-ff-hero-overlay className="ff-hero-overlay absolute inset-0" aria-hidden="true" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-120px)] max-w-7xl flex-col justify-center px-6 py-20 lg:px-8">
        <div className="ff-reveal w-full max-w-[342px] sm:max-w-4xl">
          <div className={`mb-10 flex items-center gap-4 text-sm font-semibold uppercase text-white/86 ${language === "zh" ? "tracking-[0.08em]" : "tracking-[0.26em]"}`}>
            <span>{text.logoLeft}</span>
            <span className="h-8 w-px bg-white/62" aria-hidden="true" />
            <span>{text.logoRight}</span>
          </div>
          <p className="mb-6 max-w-full break-words text-[0.68rem] font-semibold uppercase leading-5 tracking-[0.08em] text-white/62 sm:text-sm sm:tracking-[0.24em]">
            {text.kicker}
          </p>
          <h1
            className={`font-display max-w-5xl font-bold tracking-normal text-white ${
              language === "zh"
                ? "text-[3.15rem] leading-[1.02] sm:text-[4.6rem] lg:text-[5.7rem]"
                : "text-5xl leading-[0.95] sm:text-7xl lg:text-8xl"
            }`}
          >
            {text.title}
          </h1>
          <p className={`${language === "zh" ? "max-w-full text-xl leading-9 md:max-w-3xl md:text-2xl md:leading-10" : "max-w-full text-xl leading-8 md:max-w-2xl md:text-2xl md:leading-9"} mt-8 text-white/78`}>
            {text.tagline}
          </p>
          <p className={`${language === "zh" ? "max-w-full text-base leading-8 md:max-w-3xl md:text-lg md:leading-9" : "max-w-full text-base leading-7 md:max-w-3xl md:text-lg md:leading-8"} mt-5 text-white/58`}>
            {text.body}
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={guideHref} download={guideDownloadName} className="ff-button-light w-full sm:w-auto">
              {text.guideCta}
            </a>
            <Link href={enrollmentHref} className="ff-button-ghost w-full sm:w-auto">
              {text.applyCta}
            </Link>
          </div>
        </div>
      </div>

      <div className="relative z-10 mx-auto grid max-w-7xl gap-px bg-white/12 px-6 lg:grid-cols-3 lg:px-8">
        {text.stats.map((item) => (
          <div key={item} className={`font-technical bg-black/52 px-1 py-5 text-[0.7rem] font-medium uppercase leading-5 text-white/64 backdrop-blur sm:text-sm ${language === "zh" ? "tracking-[0.08em]" : "tracking-[0.08em] sm:tracking-[0.18em]"}`}>
            {item}
          </div>
        ))}
      </div>
    </section>
  );
}

function ProgramOverview({ language, text }: { language: Language; text: typeof copy.en.overview }) {
  return (
    <section className="bg-[#f5f4f1] px-6 py-24 text-[#111111] lg:px-8 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="ff-reveal grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
          <h2 className={sectionHeadingClass(language)}>
            {text.title}
          </h2>
          <div className={`${language === "zh" ? "text-lg leading-9" : "text-lg leading-8"} max-w-2xl text-[#5f6368]`}>
            {text.paragraphs.map((paragraph) => (
              <p key={paragraph} className="mt-5 first:mt-0">
                {paragraph}
              </p>
            ))}
          </div>
        </div>

        <div className="mt-16 grid gap-4 md:grid-cols-3">
          {text.highlights.map((highlight) => (
            <article key={highlight.title} className="ff-reveal rounded-[22px] border border-black/8 bg-white/68 p-7 shadow-[0_28px_80px_rgba(17,17,17,0.08)]">
              <p className={`text-xs font-semibold uppercase text-[#1a73e8] ${language === "zh" ? "tracking-[0.12em]" : "tracking-[0.22em]"}`}>{text.pillarLabel}</p>
              <h3 className={`${language === "zh" ? "text-[1.65rem] leading-snug" : "text-2xl leading-tight"} font-display mt-5 font-semibold text-[#111111]`}>{highlight.title}</h3>
              <p className={`${language === "zh" ? "leading-8" : "leading-7"} mt-4 text-sm text-[#5f6368]`}>{highlight.body}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SignatureMomentsSection({ language, text }: { language: Language; text: typeof copy.en.signatureMoments }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoplaying, setIsAutoplaying] = useState(true);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!isAutoplaying || prefersReducedMotion.matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % text.items.length);
    }, 5200);

    return () => window.clearInterval(timer);
  }, [isAutoplaying, text.items.length]);

  function selectMoment(index: number) {
    setActiveIndex(index);
    setIsAutoplaying(false);
  }

  function resumeAutoplay() {
    setIsAutoplaying(true);
  }

  return (
    <section
      className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#f5f4f1_0%,#ebe9e4_18%,#ebe9e4_82%,#f5f4f1_100%)] px-4 py-24 text-[#111111] sm:px-6 lg:px-8 lg:py-32"
      aria-roledescription="carousel"
      aria-label={text.eyebrow}
    >
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_14%,rgba(26,115,232,0.11),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.82),transparent_26%),radial-gradient(circle_at_50%_112%,rgba(17,17,17,0.08),transparent_38%)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(17,17,17,0.12),transparent)]" aria-hidden="true" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,rgba(17,17,17,0.10),transparent)]" aria-hidden="true" />

      <div className="relative mx-auto max-w-7xl">
        <div className="ff-reveal mb-10 grid gap-8 lg:grid-cols-[0.88fr_1.12fr] lg:items-end">
          <div>
            <p className={`text-sm font-semibold uppercase text-[#6d6a63] ${language === "zh" ? "tracking-[0.12em]" : "tracking-[0.24em]"}`}>{text.eyebrow}</p>
            <h2 className={sectionHeadingClass(language)}>
              {text.title}
            </h2>
          </div>
          <p className={`${language === "zh" ? "leading-9" : "leading-8"} max-w-2xl text-lg text-[#5f6368]`}>
            {text.body}
          </p>
        </div>

        <div className="ff-reveal relative rounded-[34px] border border-white/70 bg-white/35 p-1 shadow-[0_44px_130px_rgba(17,17,17,0.16)] backdrop-blur-sm">
          <div className="pointer-events-none absolute -inset-8 -z-10 rounded-[42px] bg-[radial-gradient(circle_at_50%_0%,rgba(255,255,255,0.78),transparent_46%),radial-gradient(circle_at_76%_78%,rgba(26,115,232,0.13),transparent_34%)]" aria-hidden="true" />
          <div className="pointer-events-none absolute inset-0 rounded-[34px] ring-1 ring-black/[0.035]" aria-hidden="true" />
          <div className="overflow-hidden rounded-[30px]">
            <div
              className="flex transition-transform duration-[900ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ transform: `translate3d(-${activeIndex * 100}%, 0, 0)` }}
            >
              {text.items.map((item) => (
                <article
                  key={item.title}
                  className={`grid min-h-[640px] w-full shrink-0 overflow-hidden ${
                    item.dark ? "bg-[#050505] text-white lg:grid-cols-[0.9fr_1.1fr]" : "bg-[#fbfaf7] text-[#111111] lg:grid-cols-[0.94fr_1.06fr]"
                  }`}
                >
                  <div className="flex flex-col justify-between p-8 sm:p-10 lg:p-14">
                    <div>
                      <p className={`text-xs font-semibold uppercase ${language === "zh" ? "tracking-[0.12em]" : "tracking-[0.24em]"} ${item.dark ? "text-white/46" : "text-[#1a73e8]"}`}>
                        {item.eyebrow}
                      </p>
                      <h3
                        className={`${language === "zh" ? "text-4xl leading-[1.12] md:text-[3.35rem]" : "text-5xl leading-[1.02] md:text-6xl"} font-display mt-6 max-w-2xl font-bold tracking-normal ${
                          item.dark ? "text-white" : "text-[#111111]"
                        }`}
                      >
                        {item.title}
                      </h3>
                      <p className={`${language === "zh" ? "text-lg leading-9 md:text-xl" : "text-xl leading-8"} mt-6 max-w-xl font-semibold ${item.dark ? "text-white/78" : "text-[#303030]"}`}>
                        {item.subtitle}
                      </p>
                    </div>
                    <p className={`${language === "zh" ? "leading-8" : "leading-7"} mt-10 max-w-xl text-base ${item.dark ? "text-white/58" : "text-[#5f6368]"}`}>
                      {item.body}
                    </p>
                  </div>
                  <div className={`relative min-h-[360px] overflow-hidden ${item.dark ? "bg-[#111111]" : "bg-[#deddd8]"}`}>
                    <div
                      className="absolute inset-0 bg-cover bg-center transition duration-700"
                      style={{ backgroundImage: `url(${item.mediaUrl})` }}
                      role="img"
                      aria-label={item.mediaAlt}
                    />
                    <div className={`absolute inset-0 ${item.dark ? "bg-[linear-gradient(90deg,rgba(0,0,0,0.34)_0%,rgba(0,0,0,0.08)_100%)]" : "bg-black/8"}`} />
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-7 flex flex-col items-center gap-3">
          <div className="flex items-center justify-center gap-3">
            {text.items.map((item, index) => (
              <button
                key={item.title}
                type="button"
                aria-label={`${item.eyebrow} ${index + 1}`}
                aria-current={index === activeIndex}
                onClick={() => selectMoment(index)}
                className={`h-2.5 rounded-full transition-all duration-300 ${
                  index === activeIndex ? "w-8 bg-[#111111] opacity-75" : "w-2.5 bg-[#111111] opacity-[0.22] hover:opacity-[0.45]"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            aria-label={text.playLabel}
            onClick={resumeAutoplay}
            className={`grid h-7 w-7 place-items-center rounded-full transition ${isAutoplaying ? "opacity-[0.24]" : "opacity-[0.48] hover:opacity-[0.85]"}`}
          >
            <span className="ml-0.5 h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-[#111111]" aria-hidden="true" />
          </button>
        </div>
      </div>
    </section>
  );
}

function DayJourneySection({
  language,
  text,
  days
}: {
  language: Language;
  text: typeof copy.en.journey;
  days: ProgramDay[];
}) {
  return (
    <section id="journey" className="bg-[#ecebe7] px-4 py-20 text-[#111111] sm:px-6 lg:px-8 lg:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="ff-reveal mb-12 max-w-4xl lg:mb-16">
          <p className={`text-sm font-semibold uppercase text-[#6d6a63] ${language === "zh" ? "tracking-[0.12em]" : "tracking-[0.24em]"}`}>{text.eyebrow}</p>
          <h2 className={largeHeadingClass(language)}>
            {text.title}
          </h2>
          <p className={`${language === "zh" ? "leading-9" : "leading-8"} mt-6 max-w-2xl text-lg text-[#5f6368]`}>
            {text.body}
          </p>
        </div>

        <div className="space-y-6 lg:space-y-8">
          {days.map((day) => (
            <DayJourneyCard key={day.day} day={day} language={language} text={text} />
          ))}
        </div>
      </div>
    </section>
  );
}

function DayJourneyCard({ day, language, text }: { day: ProgramDay; language: Language; text: typeof copy.en.journey }) {
  if (day.layout === "wide-media") {
    return <WideMediaDayCard day={day} language={language} text={text} />;
  }

  if (day.layout === "overlay") {
    return <OverlayDayCard day={day} language={language} text={text} />;
  }

  if (day.layout === "split") {
    return <SplitScreenDayCard day={day} language={language} text={text} />;
  }

  if (day.layout === "video-top") {
    return <VideoTopDayCard day={day} language={language} text={text} />;
  }

  if (day.layout === "timeline") {
    return <TimelineDayCard day={day} language={language} text={text} />;
  }

  if (day.layout === "floating") {
    return <FloatingDayCard day={day} language={language} text={text} />;
  }

  if (day.layout === "dark") {
    return <DarkDayCard day={day} language={language} text={text} />;
  }

  if (day.layout === "bright") {
    return <BrightDayCard day={day} language={language} text={text} />;
  }

  return <ClassicDayCard day={day} language={language} text={text} reverse={day.layout === "text-right"} />;
}

function WideMediaDayCard({ day, language, text }: { day: ProgramDay; language: Language; text: typeof copy.en.journey }) {
  return (
    <article className="ff-reveal min-h-[calc(100svh-104px)] overflow-hidden rounded-[30px] bg-[#fbfaf7] shadow-[0_34px_110px_rgba(17,17,17,0.10)]">
      <MediaPanel day={day} className="min-h-[430px] sm:min-h-[500px] lg:min-h-[58svh]" />
      <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[0.78fr_1.22fr] lg:p-14">
        <DayText day={day} language={language} compact />
        <ScheduleColumns day={day} labels={text.scheduleLabels} language={language} />
      </div>
    </article>
  );
}

function ClassicDayCard({ day, language, text, reverse = false }: { day: ProgramDay; language: Language; text: typeof copy.en.journey; reverse?: boolean }) {
  return (
    <article className="ff-reveal grid min-h-[calc(100svh-104px)] overflow-hidden rounded-[30px] bg-[#fbfaf7] shadow-[0_34px_110px_rgba(17,17,17,0.10)] lg:grid-cols-2">
      <div className={`flex flex-col justify-between p-8 sm:p-10 lg:p-14 ${reverse ? "lg:order-2" : ""}`}>
        <DayText day={day} language={language} />
        <ScheduleColumns day={day} labels={text.scheduleLabels} language={language} />
      </div>
      <MediaPanel day={day} className={`min-h-[360px] lg:min-h-full ${reverse ? "lg:order-1" : ""}`} />
    </article>
  );
}

function OverlayDayCard({ day, language, text }: { day: ProgramDay; language: Language; text: typeof copy.en.journey }) {
  return (
    <article className="ff-reveal relative min-h-[calc(100svh-104px)] overflow-hidden rounded-[30px] bg-black text-white shadow-[0_34px_110px_rgba(17,17,17,0.20)]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${day.mediaUrl})` }}
        role="img"
        aria-label={day.mediaAlt}
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.82)_0%,rgba(0,0,0,0.42)_48%,rgba(0,0,0,0.18)_100%)]" />
      <div className="relative flex min-h-[calc(100svh-104px)] max-w-3xl flex-col justify-end p-8 sm:p-10 lg:p-14">
        <DayText day={day} language={language} dark />
        <ScheduleColumns day={day} labels={text.scheduleLabels} language={language} dark />
      </div>
    </article>
  );
}

function SplitScreenDayCard({ day, language, text }: { day: ProgramDay; language: Language; text: typeof copy.en.journey }) {
  return (
    <article className="ff-reveal grid min-h-[calc(100svh-104px)] overflow-hidden rounded-[30px] bg-[#111111] text-white shadow-[0_34px_110px_rgba(17,17,17,0.18)] lg:grid-cols-2">
      <MediaPanel day={day} className="min-h-[360px] lg:min-h-full" dark />
      <div className="flex flex-col justify-between border-t border-white/12 p-8 sm:p-10 lg:border-l lg:border-t-0 lg:p-14">
        <DayText day={day} language={language} dark />
        <ScheduleColumns day={day} labels={text.scheduleLabels} language={language} dark />
      </div>
    </article>
  );
}

function VideoTopDayCard({ day, language, text }: { day: ProgramDay; language: Language; text: typeof copy.en.journey }) {
  return (
    <article className="ff-reveal min-h-[calc(100svh-104px)] overflow-hidden rounded-[30px] bg-[#fbfaf7] shadow-[0_34px_110px_rgba(17,17,17,0.10)]">
      <MediaPanel day={day} className="min-h-[48svh]" />
      <div className="grid gap-8 p-8 sm:p-10 lg:grid-cols-[0.8fr_1.2fr] lg:p-14">
        <DayText day={day} language={language} compact />
        <ScheduleColumns day={day} labels={text.scheduleLabels} language={language} />
      </div>
    </article>
  );
}

function TimelineDayCard({ day, language, text }: { day: ProgramDay; language: Language; text: typeof copy.en.journey }) {
  const stages = [
    { label: text.timelineStages[0], items: day.morning },
    { label: text.timelineStages[1], items: day.afternoon },
    { label: text.timelineStages[2], items: day.evening }
  ];

  return (
    <article className="ff-reveal grid min-h-[calc(100svh-104px)] overflow-hidden rounded-[30px] bg-[#fbfaf7] shadow-[0_34px_110px_rgba(17,17,17,0.10)] lg:grid-cols-[0.85fr_1.15fr]">
      <div className="flex flex-col justify-between p-8 sm:p-10 lg:p-14">
        <DayText day={day} language={language} />
        <p className={`${language === "zh" ? "leading-8" : "leading-7"} mt-8 text-sm text-[#5f6368]`}>
          {text.timelineNote}
        </p>
      </div>
      <div className="grid content-center gap-8 border-t border-black/8 p-8 sm:p-10 lg:border-l lg:border-t-0 lg:p-14">
        {stages.map((stage, index) => (
          <div key={stage.label} className="grid gap-5 md:grid-cols-[96px_1fr] md:items-start">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-[#111111] text-sm font-semibold text-white">
                {index + 1}
              </span>
              <span className="h-px flex-1 bg-black/16 md:hidden" />
            </div>
            <div className="border-t border-black/12 pt-5 md:border-t-0 md:pt-0">
              <p className={`text-xs font-semibold uppercase text-[#1a73e8] ${language === "zh" ? "tracking-[0.12em]" : "tracking-[0.22em]"}`}>{stage.label}</p>
              <ul className={`${language === "zh" ? "leading-8" : "leading-7"} mt-3 grid gap-2 text-base text-[#333333]`}>
                {stage.items.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </article>
  );
}

function FloatingDayCard({ day, language, text }: { day: ProgramDay; language: Language; text: typeof copy.en.journey }) {
  return (
    <article className="ff-reveal relative min-h-[calc(100svh-104px)] overflow-hidden rounded-[30px] bg-[#111111] shadow-[0_34px_110px_rgba(17,17,17,0.18)]">
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(${day.mediaUrl})` }}
        role="img"
        aria-label={day.mediaAlt}
      />
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.06)_0%,rgba(0,0,0,0.48)_100%)]" />
      <div className="relative flex min-h-[calc(100svh-104px)] items-end justify-end p-5 sm:p-8 lg:p-12">
        <div className="max-w-xl rounded-[26px] border border-white bg-[#fbfaf7] p-7 text-[#111111] shadow-[0_30px_90px_rgba(0,0,0,0.28)] sm:p-9">
          <DayText day={day} language={language} compact />
          <ScheduleColumns day={day} labels={text.scheduleLabels} language={language} compact />
        </div>
      </div>
    </article>
  );
}

function DarkDayCard({ day, language, text }: { day: ProgramDay; language: Language; text: typeof copy.en.journey }) {
  return (
    <article className="ff-reveal relative grid min-h-[calc(100svh-104px)] overflow-hidden rounded-[30px] bg-[#050505] text-white shadow-[0_34px_120px_rgba(0,0,0,0.35)] lg:grid-cols-[0.95fr_1.05fr]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_16%,rgba(26,115,232,0.28),transparent_34%),linear-gradient(180deg,#050505_0%,#111111_100%)]" />
      <div className="relative flex flex-col justify-between p-8 sm:p-10 lg:p-14">
        <div>
          <p className={`mb-6 inline-flex rounded-full border border-white/18 px-4 py-2 text-xs font-semibold uppercase text-white/68 ${language === "zh" ? "tracking-[0.12em]" : "tracking-[0.24em]"}`}>
            {text.hackathonBadge}
          </p>
          <DayText day={day} language={language} dark />
        </div>
        <ScheduleColumns day={day} labels={text.scheduleLabels} language={language} dark />
      </div>
      <div className="relative min-h-[420px] p-5 sm:p-8 lg:p-10">
        <MediaPanel day={day} className="h-full min-h-[420px] rounded-[24px]" dark />
        <div className="absolute right-10 top-10 rounded-[18px] border border-white/16 bg-black/46 px-5 py-4 text-right backdrop-blur-md">
          <p className="font-technical text-4xl font-medium tracking-normal text-white">{text.countdownNumber}</p>
          <p className={`text-xs font-semibold uppercase text-white/56 ${language === "zh" ? "tracking-[0.08em]" : "tracking-[0.22em]"}`}>{text.countdownLabel}</p>
        </div>
      </div>
    </article>
  );
}

function BrightDayCard({ day, language, text }: { day: ProgramDay; language: Language; text: typeof copy.en.journey }) {
  return (
    <article className="ff-reveal grid min-h-[calc(100svh-104px)] overflow-hidden rounded-[30px] bg-white text-[#111111] shadow-[0_34px_110px_rgba(17,17,17,0.12)] lg:grid-cols-[1.05fr_0.95fr]">
      <div className="flex flex-col justify-between p-8 sm:p-10 lg:p-14">
        <DayText day={day} language={language} />
        <ScheduleColumns day={day} labels={text.scheduleLabels} language={language} />
      </div>
      <div className="relative min-h-[420px] overflow-hidden bg-[#f3f5f7]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${day.mediaUrl})` }}
          role="img"
          aria-label={day.mediaAlt}
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.68)_100%)]" />
      </div>
    </article>
  );
}

function DayText({ day, language, dark = false, compact = false }: { day: ProgramDay; language: Language; dark?: boolean; compact?: boolean }) {
  return (
    <div>
      <p className={`text-sm font-semibold uppercase ${language === "zh" ? "tracking-[0.12em]" : "tracking-[0.22em]"} ${dark ? "text-white/56" : "text-[#6d6a63]"}`}>
        {day.day}
      </p>
      <h3
        className={`font-display mt-4 font-bold ${
          language === "zh" ? "leading-[1.12] tracking-normal" : "leading-[1.02] tracking-normal"
        } ${dark ? "text-white" : "text-[#111111]"} ${
          compact
            ? language === "zh" ? "text-4xl md:text-[3.1rem]" : "text-4xl md:text-5xl"
            : language === "zh" ? "text-4xl md:text-[3.35rem]" : "text-5xl md:text-6xl"
        }`}
      >
        {day.title}
      </h3>
      <p className={`${language === "zh" ? "text-lg leading-9 md:text-xl" : "text-xl leading-8"} mt-5 font-semibold ${dark ? "text-white/82" : "text-[#303030]"}`}>{day.tagline}</p>
      <p className={`${language === "zh" ? "leading-8" : "leading-7"} mt-5 max-w-2xl text-base ${dark ? "text-white/62" : "text-[#5f6368]"}`}>{day.body}</p>
    </div>
  );
}

function ScheduleColumns({
  day,
  labels,
  language,
  dark = false,
  compact = false
}: {
  day: ProgramDay;
  labels: readonly string[];
  language: Language;
  dark?: boolean;
  compact?: boolean;
}) {
  const groups = [
    { label: labels[0], items: day.morning },
    { label: labels[1], items: day.afternoon },
    { label: labels[2], items: day.evening }
  ];

  return (
    <div className={`mt-10 grid gap-6 ${compact ? "" : "md:grid-cols-3"}`}>
      {groups.map((group) => (
        <div key={group.label} className={`border-t pt-5 ${dark ? "border-white/18" : "border-black/12"}`}>
          <p className={`text-xs font-semibold uppercase ${language === "zh" ? "tracking-[0.12em]" : "tracking-[0.22em]"} ${dark ? "text-white/50" : "text-[#6d6a63]"}`}>
            {group.label}
          </p>
          <ul className={`${language === "zh" ? "leading-7" : "leading-6"} mt-3 grid gap-2 text-sm ${dark ? "text-white/74" : "text-[#333333]"}`}>
            {group.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function MediaPanel({ day, className = "", dark = false }: { day: ProgramDay; className?: string; dark?: boolean }) {
  return (
    <div className={`relative overflow-hidden ${dark ? "bg-[#101010]" : "bg-[#d9d8d3]"} ${className}`}>
      <div
        className="absolute inset-0 bg-cover bg-center transition duration-700 hover:scale-[1.015]"
        style={{ backgroundImage: `url(${day.mediaUrl})`, backgroundPosition: day.mediaPosition ?? "center" }}
        role="img"
        aria-label={day.mediaAlt}
      />
      <div className={`absolute inset-0 ${dark ? "bg-black/20" : "bg-black/4"}`} />
    </div>
  );
}

function ProgramGuideSection({
  language,
  text,
  guideHref,
  guideDownloadName
}: {
  language: Language;
  text: typeof copy.en.guide;
  guideHref: string;
  guideDownloadName: string;
}) {
  return (
    <section id="program-guide" className="bg-[#e8e7e2] px-6 py-24 text-[#111111] lg:px-8 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div className="ff-reveal">
          <p className={`text-sm font-semibold uppercase text-[#6d6a63] ${language === "zh" ? "tracking-[0.12em]" : "tracking-[0.24em]"}`}>{text.eyebrow}</p>
          <h2 className={sectionHeadingClass(language)}>
            {text.title}
          </h2>
          <p className={`${language === "zh" ? "leading-9" : "leading-8"} mt-6 max-w-xl text-lg text-[#5f6368]`}>
            {text.body}
          </p>
          <a href={guideHref} download={guideDownloadName} className="mt-9 inline-flex items-center justify-center rounded-[10px] bg-[#111111] px-5 py-3 text-base font-semibold text-white shadow-[0_3px_10px_rgba(17,17,17,0.22)] transition hover:bg-[#2a2a2a]">
            {text.button}
          </a>
        </div>
        <div className="ff-reveal flex justify-center lg:justify-end">
          <div className="relative aspect-[0.72] w-full max-w-[420px] rounded-[26px] border border-black/8 bg-[#f4f0e8] p-7 shadow-[0_34px_110px_rgba(17,17,17,0.18)]">
            <div className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.22em] text-[#111111]">
              <span>AGENTECH</span>
              <span className="h-7 w-px bg-black/22" aria-hidden="true" />
              <span>FF</span>
            </div>
            <div className="mt-14 border-t border-black/14 pt-14">
              <p className={`text-xs font-semibold uppercase text-[#1a73e8] ${language === "zh" ? "tracking-[0.12em]" : "tracking-[0.24em]"}`}>{text.coverKicker}</p>
              <h3 className={`${language === "zh" ? "text-4xl leading-[1.12] tracking-normal" : "text-5xl leading-[0.98] tracking-normal"} font-display mt-5 font-bold`}>
                {text.coverTitle}
              </h3>
            </div>
            <div className={`${language === "zh" ? "leading-7" : "leading-6"} absolute inset-x-7 bottom-7 border-t border-black/14 pt-5 text-sm text-[#5f6368]`}>
              {text.coverBody}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FinalCTA({ language, text }: { language: Language; text: typeof copy.en.finalCta }) {
  const flyerHref = flyerHrefs[language];
  const flyerPreviewSrc = flyerPreviewSrcs[language];
  const flyerDownloadName = flyerDownloadNames[language];
  const flyerAlt = language === "zh" ? "中文版项目海报预览" : "English program flyer preview";

  return (
    <section id="contact" className="bg-[#f5f4f1] px-6 py-24 text-[#111111] lg:px-8 lg:py-32">
      <div className="ff-reveal mx-auto max-w-5xl text-center">
        <p className={`text-sm font-semibold uppercase text-[#6d6a63] ${language === "zh" ? "tracking-[0.12em]" : "tracking-[0.24em]"}`}>{text.kicker}</p>
        <h2 className={largeHeadingClass(language)}>
          {text.title}
        </h2>
        <div className="mt-10 flex justify-center">
          <Link href={enrollmentHref} className="inline-flex items-center justify-center rounded-[10px] bg-[#1a73e8] px-5 py-3 text-base font-semibold text-white shadow-[0_2px_6px_rgba(26,115,232,0.34)] transition hover:bg-[#185abc] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8]">
            {text.apply}
          </Link>
        </div>
        <p className="mt-16 text-sm font-semibold uppercase tracking-[0.24em] text-[#6d6a63]">
          {text.footer}
        </p>
        <div className="mt-10 flex flex-col items-center text-[#8a867d]">
          <p className={`text-xs font-semibold uppercase text-[#6d6a63] ${language === "zh" ? "tracking-[0.12em]" : "tracking-[0.22em]"}`}>{text.flyerLabel}</p>
          <div className="mt-5 w-full max-w-[260px] rounded-[18px] border border-black/10 bg-white/55 p-3 shadow-[0_18px_60px_rgba(17,17,17,0.12)] backdrop-blur">
            <div className="overflow-hidden rounded-[12px] bg-[#111111] shadow-[0_10px_30px_rgba(17,17,17,0.16)]">
              <Image
                src={flyerPreviewSrc}
                width={1024}
                height={1536}
                alt={flyerAlt}
                className="h-auto w-full"
              />
            </div>
          </div>
          <a
            href={flyerHref}
            download={flyerDownloadName}
            className="mt-5 inline-flex min-w-[176px] items-center justify-center bg-[#111111] px-6 py-3 text-sm font-semibold text-white shadow-[0_5px_16px_rgba(17,17,17,0.22)] transition [clip-path:polygon(10px_0,calc(100%-10px)_0,100%_10px,100%_calc(100%-10px),calc(100%-10px)_100%,10px_100%,0_calc(100%-10px),0_10px)] hover:bg-[#2a2a2a] hover:shadow-[0_7px_20px_rgba(17,17,17,0.28)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111] active:translate-y-px"
          >
            {text.flyerButton}
          </a>
        </div>
      </div>
    </section>
  );
}

function sectionHeadingClass(language: Language) {
  return `${language === "zh" ? "text-4xl leading-[1.12] tracking-normal md:text-6xl" : "text-4xl leading-[1.02] tracking-normal md:text-6xl"} font-display max-w-3xl font-bold text-[#111111]`;
}

function largeHeadingClass(language: Language) {
  return `${language === "zh" ? "leading-[1.12] tracking-normal" : "leading-[1.02] tracking-normal"} font-display mt-5 text-5xl font-bold text-[#111111] md:text-7xl`;
}

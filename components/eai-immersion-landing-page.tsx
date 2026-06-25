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

type Language = "en" | "zh";

const guideHrefs: Record<Language, string> = {
  en: "/assets/program-guides/agentech-ff-eai-robotics-future-founder-program-guide-en.pdf",
  zh: "/assets/program-guides/agentech-ff-eai-robotics-future-founder-program-guide-zh.pdf"
};

const guideDownloadNames: Record<Language, string> = {
  en: "agentech-ff-eai-robotics-future-founder-program-guide-en.pdf",
  zh: "agentech-ff-eai-robotics-future-founder-program-guide-zh.pdf"
};

const enrollmentHref = `/enroll?course=${eaiImmersionCourseCode}`;

const flyerHrefs: Record<Language, string> = {
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
    day: "第 1 天",
    title: "走进未来",
    tagline: "一切从好奇心开始",
    morning: ["开营仪式", "项目介绍", "认识导师团队"],
    afternoon: ["FF 实验室与设施体验", "团队组建", "认识你的机器人"],
    evening: ["创始人炉边对谈"],
    body: "学生将在真实公司的环境中进入 AI 机器人世界。他们会认识导师、探索实验室、组建团队，并从学习者开始转向建设者。"
  },
  {
    day: "第 2 天",
    title: "像 AI 工程师一样思考",
    tagline: "理解智能机器如何思考",
    morning: ["AI 基础", "Embodied AI 概览", "机器人系统架构"],
    afternoon: ["编程工作坊", "仿真环境入门", "第一次工程冲刺"],
    evening: ["每日 Demo 与复盘"],
    body: "学生学习 AI、机器人与具身智能的基础语言。目标不只是理解概念，而是开始用工程师的方式拆解问题。"
  },
  {
    day: "第 3 天",
    title: "构建第一个机器人技能",
    tagline: "每个机器人能力 都从一个技能开始",
    morning: ["计算机视觉基础", "传感器与感知", "Skill Graph 入门"],
    afternoon: ["工程师带领的技能工作坊", "构建一个简单机器人技能", "在仿真环境中测试"],
    evening: ["嘉宾分享：真实世界中的机器人"],
    body: "学生开始构建可复用的机器人技能，理解感知、规划和执行如何在一个具身智能系统中连接起来。"
  },
  {
    day: "第 4 天",
    title: "让 AI 连接现实",
    tagline: "当想法开始移动 现实就发生了",
    morning: ["硬件与机器人集成", "安全与测试流程", "真实机器人控制基础"],
    afternoon: ["部署到机器人", "测试、调试、改进", "工程评审"],
    evening: ["实验室开放时间"],
    body: "学生从仿真走向物理世界。他们会理解为什么真实机器人比演示更难，也会看到工程纪律为什么重要。"
  },
  {
    day: "第 5 天",
    title: "像创始人一样设计",
    tagline: "优秀工程师解决问题 优秀创始人发现问题",
    morning: ["产品思维", "用户问题", "市场发现"],
    afternoon: ["商业模式工作坊", "创业财务基础", "融资基础入门"],
    evening: ["VC / 创始人炉边对谈"],
    body: "学生会看到技术只是公司建设的一部分。他们将探索客户需求、定价、商业模式，以及融资的基本逻辑。"
  },
  {
    day: "第 6 天",
    title: "更快地一起推进",
    tagline: "创新是一项团队运动",
    morning: ["团队冲刺计划", "项目范围评审", "工程站会"],
    afternoon: ["项目开发", "导师 Office Hours", "中期技术检查"],
    evening: ["团队 Demo 练习"],
    body: "团队在工程师导师的帮助下加速项目推进。学生会学习真实团队如何规划、分工、协作调试并汇报进展。"
  },
  {
    day: "第 7 天",
    title: "解决真实问题",
    tagline: "技术的价值 来自它解决真实问题的能力",
    morning: ["真实机器人挑战", "产线 / 工作流视角", "应用场景选择"],
    afternoon: ["项目深度工作", "技术评审", "用户场景测试"],
    evening: ["CTO / 专家炉边对谈"],
    body: "学生将项目连接到真实运营挑战中。他们会细化使用场景、测试假设，并理解机器人如何在真实环境中创造价值。"
  },
  {
    day: "第 8 天",
    title: "打磨你的产品",
    tagline: "细节让产品真正成立",
    morning: ["测试与调试", "产品打磨", "Demo 故事线"],
    afternoon: ["路演辅导", "演示设计", "Hackathon 准备"],
    evening: ["Hackathon 启动"],
    body: "团队为最终挑战做准备。他们会改进原型、打磨叙事，并把技术项目转化成可以被展示和理解的产品。"
  },
  {
    day: "第 9 天",
    title: "在压力下完成构建",
    tagline: "快速构建 更快学习",
    morning: ["Hackathon 冲刺", "导师检查", "快速原型"],
    afternoon: ["Hackathon 开发", "测试与调试", "最终提交准备"],
    evening: ["最终构建锁定", "Demo 彩排"],
    body: "两天 Hackathon 正式开始。团队在压力下取舍、解决意外问题，并为最终 Demo 做最后准备。"
  },
  {
    day: "第 10 天",
    title: "发布你的未来",
    tagline: "旅程才刚刚开始",
    morning: ["最终 Demo", "产品展示", "技术问答"],
    afternoon: ["投资人式路演", "奖项公布", "闭营仪式"],
    evening: ["Networking", "结业证书", "校友邀请"],
    body: "学生向导师、工程师、嘉宾和家人展示他们的作品。项目结束不是毕业，而是他们进入 AI、机器人、研究、创业与真实世界影响力道路的开始。"
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
      tagline: "10 Days. Real Robots. Real Engineers. Real Startup Experience.",
      body: "A 10-day journey where students build, pitch, and launch an AI robotics startup inside a real robotics company.",
      guideCta: "Download Program Guide",
      applyCta: "Apply Interest",
      stats: ["10-day founder journey", "Inside a robotics company", "Final demo and pitch"]
    },
    overview: {
      title: "Not a summer camp. A founder-level robotics immersion.",
      paragraphs: [
        "This 10-day program brings high school students into a real robotics company environment, combining AI education, embodied robotics, engineering mentorship, startup thinking, financial literacy, and a two-day hackathon.",
        "Students do not simply learn AI. They experience how an AI robotics startup is built, from idea, to prototype, to demo, to pitch."
      ],
      pillarLabel: "Program pillar",
      highlights: [
        {
          title: "Learn AI & Embodied Intelligence",
          body: "Students build a working language for AI, robotics, perception, planning, and real-world deployment."
        },
        {
          title: "Build with Engineers",
          body: "Mentored work sessions mirror how technical teams scope, test, debug, and improve robotics systems."
        },
        {
          title: "Pitch Like a Founder",
          body: "Students connect technology to user needs, business models, financial thinking, and investor-style storytelling."
        }
      ]
    },
    signatureMoments: {
      eyebrow: "Signature Moments",
      title: "Three defining moments.",
      body: "The 10-day journey is built around the moments that change how students see robotics, company building, and their own future.",
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
          title: "Two days to build what comes next.",
          subtitle: "The final sprint compresses AI robotics, product thinking, teamwork, and pitch pressure into one build cycle.",
          body: "Students make tradeoffs, debug under time pressure, and learn how strong teams turn uncertainty into a working demo and a clear story.",
          mediaUrl: "/assets/ff-robotics/day-9-ai-branded-hackathon.png",
          mediaAlt: "AI-redrawn late-night robotics hackathon room with students and mentors working under dramatic lighting",
          dark: true
        },
        {
          eyebrow: "Outcomes",
          title: "Students leave with more than memories.",
          subtitle: "A demo, a founder-style pitch, portfolio material, and a pathway to keep going after the program.",
          body: "The final output is not just participation. Students leave with a project story they can continue through Agentech AI Club, internship, or research pathways.",
          mediaUrl: "/assets/ff-robotics/day-10-ai-branded-demo-day.png",
          mediaAlt: "AI-redrawn robotics demo day presentation with students, mentors, and a humanoid robot",
          dark: false
        }
      ]
    },
    journey: {
      eyebrow: "The 10-Day Journey",
      title: "Build, pitch, and launch.",
      body: "Each day moves students closer to a complete robotics venture, from curiosity and technical foundations to demo day.",
      scheduleLabels: ["Morning", "Afternoon", "Evening"],
      timelineStages: ["Challenge", "Deep Work", "Expert Review"],
      timelineNote: "The path narrows from broad challenge discovery into one focused use case that can be built, tested, and explained.",
      hackathonBadge: "Hackathon begins",
      countdownNumber: "48",
      countdownLabel: "hours to final lock"
    },
    mentors: {
      title: "Meet the people building the future.",
      body: "Throughout the program, students may meet engineers, founders, executives, professors, and robotics experts through selected fireside chats and guest sessions.",
      roles: ["AI Engineer", "Robotics Engineer", "Startup Founder", "FF Executive", "University Professor", "Investor / Venture Advisor"],
      note: "May include selected sessions, critique, or fireside conversations."
    },
    hackathon: {
      eyebrow: "Hackathon & Final Pitch",
      title: "Two days to build what comes next.",
      body: "The final hackathon challenges students to combine AI, robotics, product thinking, teamwork, and presentation skills into one final project.",
      judgingLabel: "Judging categories",
      categories: ["Technical Execution", "Creativity", "Real-World Value", "Teamwork", "Final Pitch"]
    },
    outcomes: {
      eyebrow: "Student Outcomes",
      title: "Students leave with more than memories.",
      items: [
        "A completed AI robotics project",
        "Final demo presentation",
        "Founder-style pitch experience",
        "Certificate of completion",
        "Project portfolio material",
        "Exposure to real engineering workflow",
        "Invitation to continue through Agentech AI Club / Internship / Research Pathway"
      ]
    },
    guide: {
      eyebrow: "Download Program Guide",
      title: "Explore the full program structure.",
      body: "Explore the full program structure, daily journey, outcomes, and application details.",
      button: "Download PDF",
      coverKicker: "Program Guide",
      coverTitle: <>EAI Robotics<br />Future Founder<br />Immersion Program</>,
      coverBody: "10-day journey, mentor sessions, hackathon, final pitch, and student outcomes."
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
      tagline: "10 天 真实机器人 真实工程师 真实创业体验",
      body: "一段 10 天的沉浸式旅程：学生在真实机器人公司环境中，完成从构想到原型、演示与路演的具身智能机器人创业项目。",
      guideCta: "下载项目手册",
      applyCta: "提交兴趣",
      stats: ["10 天创始人旅程", "走进真实机器人公司", "最终演示与路演"]
    },
    overview: {
      title: "这不是普通夏令营 而是创始人级别的机器人沉浸项目",
      paragraphs: [
        "这个 10 天项目把高中生带入真实机器人公司的环境中，融合 AI 教育、具身智能机器人、工程师导师制、创业思维、财务素养与两天 Hackathon。",
        "学生不只是学习 AI。他们会体验一个 AI 机器人创业项目如何从想法走向原型、演示和路演。"
      ],
      pillarLabel: "项目支柱",
      highlights: [
        {
          title: "学习 AI 与具身智能",
          body: "学生建立 AI、机器人、感知、规划与真实部署的基础语言。"
        },
        {
          title: "与工程师一起构建",
          body: "导师制工作坊模拟真实技术团队如何定义范围、测试、调试和改进机器人系统。"
        },
        {
          title: "像创始人一样路演",
          body: "学生把技术连接到用户需求、商业模式、财务思维与投资人式表达。"
        }
      ]
    },
    signatureMoments: {
      eyebrow: "核心亮点",
      title: "三个真正改变学生的时刻",
      body: "这 10 天不是日程堆叠 而是围绕三个关键时刻展开 让学生重新理解机器人 公司建设 和自己的未来",
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
          title: "用两天 做出下一个可能",
          subtitle: "把 AI 机器人 产品思维 团队协作 和路演压力 压缩进一次真实冲刺",
          body: "学生会在时间压力下做取舍 做调试 做表达 学会把不确定性变成一个可演示的项目和清晰的故事。",
          mediaUrl: "/assets/ff-robotics/day-9-ai-branded-hackathon.png",
          mediaAlt: "AI 重绘的深夜机器人 Hackathon 空间 学生与导师在戏剧化灯光下冲刺开发",
          dark: true
        },
        {
          eyebrow: "学生收获",
          title: "学生带走的不只是回忆",
          subtitle: "Demo 创始人式路演 作品集材料 以及项目结束后的持续路径",
          body: "最终成果不只是参加过一个项目。学生会带走一个可以继续发展的项目故事，并连接到 Agentech AI Club 实习或研究路径。",
          mediaUrl: "/assets/ff-robotics/day-10-ai-branded-demo-day.png",
          mediaAlt: "AI 重绘的机器人 Demo Day 学生在导师与家庭面前展示最终项目",
          dark: false
        }
      ]
    },
    journey: {
      eyebrow: "10 天旅程",
      title: "构建 路演 发布",
      body: "每一天都把学生向完整机器人创业项目推进一步：从好奇心和技术基础，走向最终 Demo Day。",
      scheduleLabels: ["上午", "下午", "晚间"],
      timelineStages: ["真实问题", "深度构建", "专家评审"],
      timelineNote: "路径会从宽泛的问题发现，逐步收敛到一个能够被构建、测试和讲清楚的应用场景。",
      hackathonBadge: "Hackathon 开始",
      countdownNumber: "48",
      countdownLabel: "小时到最终锁定"
    },
    mentors: {
      title: "与正在创造未来的人同行",
      body: "在项目过程中，学生可能通过精选炉边对谈和嘉宾课程，接触工程师、创始人、高管、教授和机器人领域专家。",
      roles: ["AI 工程师", "机器人工程师", "创业公司创始人", "FF 高管", "大学教授", "投资人 / 创投顾问"],
      note: "可能包括精选分享、项目反馈或炉边对谈。"
    },
    hackathon: {
      eyebrow: "Hackathon 与最终路演",
      title: "用两天 做出下一个可能",
      body: "最终 Hackathon 要求学生把 AI、机器人、产品思维、团队协作与表达能力，整合成一个完整项目。",
      judgingLabel: "评审维度",
      categories: ["技术完成度", "创造力", "现实价值", "团队协作", "最终路演"]
    },
    outcomes: {
      eyebrow: "学生收获",
      title: "学生带走的不只是回忆",
      items: [
        "一个完成的 AI 机器人项目",
        "最终 Demo 展示",
        "创始人式路演体验",
        "项目结业证书",
        "可用于作品集的项目材料",
        "真实工程工作流体验",
        "继续进入 Agentech AI Club / 实习 / 研究路径的机会"
      ]
    },
    guide: {
      eyebrow: "下载项目手册",
      title: "查看完整项目结构",
      body: "了解完整项目安排、每日旅程、学生收获与后续申请信息。",
      button: "下载 PDF",
      coverKicker: "项目手册",
      coverTitle: <>具身智能机器人<br />未来创始人<br />沉浸项目</>,
      coverBody: "10 天旅程、导师课程、Hackathon、最终路演与学生收获。"
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
    <div lang={language === "zh" ? "zh-CN" : "en"} className={`ff-immersion min-h-screen bg-[#f5f4f1] text-[#111111] ${language === "zh" ? "ff-zh" : ""}`}>
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
    <section className="relative isolate min-h-[calc(100svh-120px)] overflow-hidden bg-black text-white">
      <div
        className="ff-hero-media absolute inset-0 bg-no-repeat opacity-[0.68]"
        style={{ backgroundImage: `url(${heroMedia.mediaUrl})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.88)_0%,rgba(0,0,0,0.58)_42%,rgba(0,0,0,0.18)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black to-transparent" />

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-120px)] max-w-7xl flex-col justify-center px-6 py-20 lg:px-8">
        <div className="ff-reveal max-w-4xl">
          <div className={`mb-10 flex items-center gap-4 text-sm font-semibold uppercase text-white/86 ${language === "zh" ? "tracking-[0.08em]" : "tracking-[0.26em]"}`}>
            <span>{text.logoLeft}</span>
            <span className="h-8 w-px bg-white/62" aria-hidden="true" />
            <span>{text.logoRight}</span>
          </div>
          <p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-white/62 sm:text-sm sm:tracking-[0.24em]">
            {text.kicker}
          </p>
          <h1
            className={`max-w-5xl font-[var(--font-display)] font-extrabold tracking-normal text-white ${
              language === "zh"
                ? "text-[3.15rem] leading-[1.02] sm:text-[4.6rem] lg:text-[5.7rem]"
                : "text-5xl leading-[0.95] sm:text-7xl lg:text-8xl"
            }`}
          >
            {text.title}
          </h1>
          <p className={`${language === "zh" ? "max-w-3xl text-xl leading-9 md:text-2xl md:leading-10" : "max-w-2xl text-xl leading-8 md:text-2xl md:leading-9"} mt-8 text-white/78`}>
            {text.tagline}
          </p>
          <p className={`${language === "zh" ? "max-w-3xl text-base leading-8 md:text-lg md:leading-9" : "max-w-3xl text-base leading-7 md:text-lg md:leading-8"} mt-5 text-white/58`}>
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
          <div key={item} className={`bg-black/52 py-5 text-sm font-semibold uppercase text-white/64 backdrop-blur ${language === "zh" ? "tracking-[0.08em]" : "tracking-[0.18em]"}`}>
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
              <h3 className={`${language === "zh" ? "text-[1.65rem] leading-snug" : "text-2xl leading-tight"} mt-5 font-semibold text-[#111111]`}>{highlight.title}</h3>
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
                        className={`${language === "zh" ? "text-4xl leading-[1.12] md:text-[3.35rem]" : "text-5xl leading-[1.02] md:text-6xl"} mt-6 max-w-2xl font-[var(--font-display)] font-extrabold tracking-normal ${
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
          <p className="font-[var(--font-display)] text-4xl font-extrabold tracking-normal text-white">{text.countdownNumber}</p>
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
        className={`mt-4 font-[var(--font-display)] font-extrabold ${
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
              <h3 className={`${language === "zh" ? "text-4xl leading-[1.12] tracking-normal" : "text-5xl leading-[0.98] tracking-normal"} mt-5 font-[var(--font-display)] font-extrabold`}>
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
                src={flyerHref}
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
  return `${language === "zh" ? "text-4xl leading-[1.12] tracking-normal md:text-6xl" : "text-4xl leading-[1.02] tracking-normal md:text-6xl"} max-w-3xl font-[var(--font-display)] font-extrabold text-[#111111]`;
}

function largeHeadingClass(language: Language) {
  return `${language === "zh" ? "leading-[1.12] tracking-normal" : "leading-[1.02] tracking-normal"} mt-5 font-[var(--font-display)] text-5xl font-extrabold text-[#111111] md:text-7xl`;
}

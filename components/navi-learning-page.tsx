"use client";

import Image from "next/image";
import { useState } from "react";
import { HistoryBackButton } from "@/components/history-back-button";

type Language = "en" | "zh";

type NaviLesson = {
  title: Record<Language, string>;
  eyebrow: Record<Language, string>;
  body: Record<Language, string>;
  image?: string;
  visual?: "blocks" | "buddy" | "skillGraph" | "printTop" | "companion" | "growth";
  tone: "mint" | "sky" | "sun" | "coral" | "violet" | "lime";
};

const copy = {
  en: {
    languageLabel: "Switch page language to Chinese",
    pill: "AI natives grow up with Navi",
    title: "What can we learn from Navi?",
    body: "Navi turns AI into something children can see, touch, remix, and grow with: games, stories, robot motion, 3D printed personalities, and Agentech AI Skill Graphs built on top.",
    chips: ["code", "play", "move", "create", "care"],
    introKicker: "A parent-friendly map",
    introTitle: "Not a toy demo. A tiny robot world kids can build on.",
    introBody:
      "Each card below answers the same question parents keep asking: what can this little dog do? The short answer is that Navi can become a coding coach, game partner, movement lab, diary maker, and AI companion as its skill graph grows.",
    finalKicker: "Why Agentech cares",
    finalTitle: "Skills stack into confidence.",
    finalBody:
      "We are not only showing children a robot. We are helping them understand how sensing, language, motion, memory, and creativity connect. That is the foundation of an AI-native childhood.",
    layers: ["primitive motors", "atomic actions", "behaviors", "tasks", "agentic workflows", "missions"]
  },
  zh: {
    languageLabel: "Switch page language to English",
    pill: "AI 原住民和 Navi 一起长大",
    title: "我们能从 Navi 学到什么？",
    body: "Navi 把 AI 变成孩子能看见、摸到、改造并一起成长的东西：游戏、故事、机器人动作、3D 打印个性外壳，以及 Agentech 构建在其上的 AI Skill Graphs。",
    chips: ["编程", "游戏", "运动", "创造", "陪伴"],
    introKicker: "给家长看的学习地图",
    introTitle: "不是玩具演示，而是孩子可以参与构建的小小机器人世界。",
    introBody:
      "下面每张卡都回答同一个问题：这只小狗到底能做什么？简单来说，随着 skill graph 成长，Navi 可以成为编程教练、游戏伙伴、运动实验室、成长日记和 AI 陪伴。",
    finalKicker: "为什么 Agentech 在意这件事",
    finalTitle: "技能叠起来，就变成信心。",
    finalBody:
      "我们展示给孩子的不只是一台机器人。我们帮助他们理解感知、语言、运动、记忆和创造力如何连接起来。这是 AI 原住民童年的基础。",
    layers: ["基础电机动作", "原子动作", "行为", "任务", "智能体工作流", "使命"]
  }
};

const projectLessons: NaviLesson[] = [
  {
    title: { en: "Brain Blocks", zh: "Brain Blocks" },
    eyebrow: { en: "Block coding", zh: "积木编程" },
    body: {
      en: "Kids snap logic blocks together, test the idea, then watch Navi turn the plan into motion.",
      zh: "孩子把逻辑积木拼在一起，先测试想法，再看 Navi 把计划变成动作。"
    },
    image: "/assets/education/navi-skills/brain-blocks-navi.png",
    tone: "mint"
  },
  {
    title: { en: "Buddy Vibe Coding", zh: "Buddy Vibe Coding" },
    eyebrow: { en: "Prompt to program", zh: "从提示到程序" },
    body: {
      en: "Students describe a trick, a game, or a helper routine, then refine it like talking to a creative teammate.",
      zh: "学生描述一个动作、游戏或助手流程，再像和创意队友聊天一样持续修改。"
    },
    image: "/assets/education/navi-skills/buddy-vibe-coding-navi.png",
    tone: "violet"
  },
  {
    title: { en: "Math Race", zh: "Math Race" },
    eyebrow: { en: "Numbers in motion", zh: "运动中的数学" },
    body: {
      en: "Arithmetic becomes a race course, so speed, strategy, and math practice happen in the same moment.",
      zh: "算术变成一条赛道，让速度、策略和数学练习同时发生。"
    },
    image: "/assets/education/navi-skills/math-race.png",
    tone: "sun"
  },
  {
    title: { en: "Maze Escape", zh: "Maze Escape" },
    eyebrow: { en: "Navigation", zh: "路径导航" },
    body: {
      en: "Navi learns to read a path, make choices, and recover when the route gets tricky.",
      zh: "Navi 学会读路径、做选择，并在路线变复杂时重新调整。"
    },
    image: "/assets/education/navi-skills/maze-escape.png",
    tone: "sky"
  },
  {
    title: { en: "Rainbow Road Racer", zh: "Rainbow Road Racer" },
    eyebrow: { en: "Color and control", zh: "颜色与控制" },
    body: {
      en: "Students tune a playful race skill where sensing, timing, and steering all matter.",
      zh: "学生调试一个有趣的赛车技能，在其中理解感知、时机和转向。"
    },
    image: "/assets/education/navi-skills/rainbow-road-racer.png",
    tone: "coral"
  },
  {
    title: { en: "Line Racer V2", zh: "Line Racer V2" },
    eyebrow: { en: "Computer vision", zh: "计算机视觉" },
    body: {
      en: "A simple line becomes a lesson in cameras, feedback, and smooth robot behavior.",
      zh: "一条简单的线，变成摄像头、反馈和流畅机器人行为的入门课。"
    },
    image: "/assets/education/navi-skills/line-racer-v2.png",
    tone: "lime"
  },
  {
    title: { en: "Cone Crusher 3000", zh: "Cone Crusher 3000" },
    eyebrow: { en: "Avoid and chase", zh: "避障与追踪" },
    body: {
      en: "Obstacle games help kids understand sensors, distance, and safe robot decisions.",
      zh: "障碍游戏帮助孩子理解传感器、距离，以及机器人如何安全做决定。"
    },
    image: "/assets/education/navi-skills/cone-crusher-3000.png",
    tone: "sky"
  },
  {
    title: { en: "Hop Champion", zh: "Hop Champion" },
    eyebrow: { en: "Motion design", zh: "动作设计" },
    body: {
      en: "Jumping challenges make balance, motors, rhythm, and physics feel like a playground.",
      zh: "跳跃挑战让平衡、电机、节奏和物理变得像操场一样好玩。"
    },
    image: "/assets/education/navi-skills/hop-champion.png",
    tone: "mint"
  },
  {
    title: { en: "Goooal", zh: "Goooal" },
    eyebrow: { en: "Team play", zh: "团队运动" },
    body: {
      en: "Soccer turns robotics into a teamwork lesson: aim, kick, retry, celebrate.",
      zh: "足球把机器人变成团队合作课：瞄准、踢球、重试、庆祝。"
    },
    image: "/assets/education/navi-skills/goooal.png",
    tone: "sun"
  },
  {
    title: { en: "Recycle Rangers", zh: "Recycle Rangers" },
    eyebrow: { en: "Care for the world", zh: "关心世界" },
    body: {
      en: "Kids build sorting and cleanup games while learning that AI can help real communities.",
      zh: "孩子通过分类和清理游戏，理解 AI 也可以帮助真实社区。"
    },
    image: "/assets/education/navi-skills/recycle-rangers.png",
    tone: "lime"
  },
  {
    title: { en: "Taboo, Categories, 20 Questions", zh: "Taboo、Categories、20 Questions" },
    eyebrow: { en: "Language games", zh: "语言游戏" },
    body: {
      en: "Navi can become a word-game partner that practices vocabulary, memory, and quick thinking.",
      zh: "Navi 可以成为词语游戏伙伴，练习词汇、记忆和快速思考。"
    },
    image: "/assets/education/navi-skills/taboo.png",
    tone: "violet"
  },
  {
    title: { en: "Red Light, Green Light", zh: "一二三木头人" },
    eyebrow: { en: "Rules and reaction", zh: "规则与反应" },
    body: {
      en: "Classic playground rules become robot state machines that kids can see, hear, and debug.",
      zh: "经典游戏变成机器人状态机，孩子能看见、听见并调试规则。"
    },
    image: "/assets/education/navi-skills/red-light-green-light-navi.png",
    tone: "coral"
  },
  {
    title: { en: "3D Printed Tops", zh: "3D 打印上装" },
    eyebrow: { en: "Make Navi yours", zh: "让 Navi 变成你的" },
    body: {
      en: "A Navi shell can become a dog, fox, cat, or classroom mascot through student-designed 3D printed tops.",
      zh: "学生设计 3D 打印上装，让 Navi 变成小狗、狐狸、小猫或班级 mascot。"
    },
    image: "/assets/education/navi-skills/navi-3d-printed-tops.png",
    tone: "sun"
  },
  {
    title: { en: "A Growing Companion", zh: "一起长大的陪伴" },
    eyebrow: { en: "AI native diary", zh: "AI 原住民日记" },
    body: {
      en: "With safe sensors and parent-approved workflows, Navi can help capture photos, stories, milestones, and daily reflections.",
      zh: "在安全传感器和家长允许的流程下，Navi 可以帮助记录照片、故事、里程碑和每天的心情。"
    },
    image: "/assets/education/navi-skills/navi-growing-companion.png",
    tone: "sky"
  },
  {
    title: { en: "Run, Jump, Grow", zh: "跑、跳、长大" },
    eyebrow: { en: "Body and data", zh: "身体与数据" },
    body: {
      en: "A future Navi skill can cheer on running, jumping, and outdoor play while turning progress into friendly feedback.",
      zh: "未来的 Navi skill 可以为跑步、跳跃和户外游戏加油，并把进步变成友好的反馈。"
    },
    image: "/assets/education/navi-skills/navi-run-jump-grow.png",
    tone: "mint"
  },
  {
    title: { en: "AI Skill Graphs", zh: "AI Skill Graphs" },
    eyebrow: { en: "Agentech layer", zh: "Agentech 层" },
    body: {
      en: "Agentech builds skill graphs on top of Navi: small abilities combine into useful routines kids can understand.",
      zh: "Agentech 在 Navi 上构建 skill graphs：把小能力组合成孩子能理解、能使用的日常流程。"
    },
    image: "/assets/education/navi-skills/navi-skill-graph-library.png",
    tone: "violet"
  }
];

const toneClasses = {
  coral: "border-[#ff9b82] bg-[#fff4f0]",
  lime: "border-[#a9d66d] bg-[#f5ffe8]",
  mint: "border-[#71d5bc] bg-[#effdf8]",
  sky: "border-[#78bdf2] bg-[#eef8ff]",
  sun: "border-[#f4c95d] bg-[#fff9e8]",
  violet: "border-[#b9a1ff] bg-[#f5f0ff]"
};

const layerLevels = ["L0.0", "L0.5", "L1.0", "L1.5", "L2.0", "L2.5"];

function BlocksVisual({ language }: { language: Language }) {
  const labels =
    language === "zh"
      ? ["当 Navi 看到颜色", "向前走", "向左转", "说 真棒"]
      : ["when Navi sees color", "move forward", "turn left", "say great job"];

  return (
    <div className="navi-visual navi-visual-blocks" aria-hidden="true">
      {labels.map((label, index) => (
        <span key={label} className={`navi-block navi-block-${index + 1}`}>
          {label}
        </span>
      ))}
    </div>
  );
}

function BuddyVisual({ language }: { language: Language }) {
  return (
    <div className="navi-visual navi-visual-buddy" aria-hidden="true">
      <div className="navi-chat navi-chat-user">
        {language === "zh" ? "Navi 可以玩数学游戏吗？" : "Can Navi play a math game?"}
      </div>
      <div className="navi-chat navi-chat-buddy">
        {language === "zh" ? "可以 一起做一个竞赛技能" : "Yes. Let us make a race skill."}
      </div>
      <div className="navi-code-lines">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

function SkillGraphVisual({ language }: { language: Language }) {
  const nodes = language === "zh" ? ["看见", "思考", "移动", "说话", "记住"] : ["see", "think", "move", "talk", "remember"];

  return (
    <div className="navi-visual navi-visual-graph" aria-hidden="true">
      {nodes.map((node, index) => (
        <span key={node} className={`navi-node navi-node-${index + 1}`}>
          {node}
        </span>
      ))}
      <span className="navi-graph-line navi-graph-line-1" />
      <span className="navi-graph-line navi-graph-line-2" />
      <span className="navi-graph-line navi-graph-line-3" />
      <span className="navi-graph-line navi-graph-line-4" />
    </div>
  );
}

function PrintTopVisual({ language }: { language: Language }) {
  return (
    <div className="navi-visual navi-visual-print" aria-hidden="true">
      <Image
        src="/assets/robotics/ff-navi-white.jpg"
        alt=""
        width={700}
        height={520}
        className="navi-print-dog"
      />
      <span className="navi-print-shell">{language === "zh" ? "狐狸外壳" : "fox top"}</span>
      <span className="navi-print-shell navi-print-shell-cat">{language === "zh" ? "小猫外壳" : "cat top"}</span>
      <span className="navi-printer-lines" />
    </div>
  );
}

function CompanionVisual({ language }: { language: Language }) {
  return (
    <div className="navi-visual navi-visual-companion" aria-hidden="true">
      <Image
        src="/assets/education/navi-learning-banner.png"
        alt=""
        width={1200}
        height={520}
        className="navi-companion-image"
      />
      <span className="navi-photo-card">{language === "zh" ? "今天的故事" : "today's story"}</span>
      <span className="navi-photo-card navi-photo-card-small">{language === "zh" ? "心情 明亮" : "mood: bright"}</span>
    </div>
  );
}

function GrowthVisual({ language }: { language: Language }) {
  return (
    <div className="navi-visual navi-visual-growth" aria-hidden="true">
      <div className="navi-track">
        <span />
        <span />
        <span />
      </div>
      <div className="navi-growth-stats">
        <strong>{language === "zh" ? "跳高" : "jump"}</strong>
        <span>+12%</span>
      </div>
      <div className="navi-growth-stats navi-growth-stats-run">
        <strong>{language === "zh" ? "跑步" : "run"}</strong>
        <span>2.4 mi</span>
      </div>
    </div>
  );
}

function LessonVisual({ language, lesson }: { language: Language; lesson: NaviLesson }) {
  if (lesson.image) {
    return (
      <Image
        src={lesson.image}
        alt={`${lesson.title[language]} Navi project cover`}
        fill
        sizes="(min-width: 1280px) 260px, (min-width: 640px) 42vw, 100vw"
        className="object-cover transition duration-700 ease-out group-hover:scale-[1.06]"
      />
    );
  }

  if (lesson.visual === "blocks") return <BlocksVisual language={language} />;
  if (lesson.visual === "buddy") return <BuddyVisual language={language} />;
  if (lesson.visual === "skillGraph") return <SkillGraphVisual language={language} />;
  if (lesson.visual === "printTop") return <PrintTopVisual language={language} />;
  if (lesson.visual === "companion") return <CompanionVisual language={language} />;
  return <GrowthVisual language={language} />;
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

export function NaviLearningPage() {
  const [language, setLanguage] = useState<Language>("en");
  const text = copy[language];

  function toggleLanguage() {
    setLanguage((current) => (current === "en" ? "zh" : "en"));
  }

  return (
    <main
      lang={language === "zh" ? "zh-CN" : "en"}
      className={`navi-kids-page min-h-screen bg-[#f7fbff] text-[#14213d] ${language === "zh" ? "ff-zh" : ""}`}
    >
      <LanguageToggle language={language} onToggle={toggleLanguage} label={text.languageLabel} />
      <section className="relative min-h-[clamp(580px,86svh,760px)] overflow-hidden bg-[#07111f]">
        <Image
          src="/assets/education/navi-learning-banner.png"
          alt="Navi helping children explore AI learning projects"
          fill
          sizes="100vw"
          className="navi-hero-image object-cover opacity-[0.88]"
          priority
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,16,31,0.94)_0%,rgba(6,16,31,0.78)_42%,rgba(6,16,31,0.24)_100%)]" />
        <div className="relative z-10 mx-auto flex min-h-[clamp(580px,86svh,760px)] max-w-7xl flex-col justify-center px-5 py-14 sm:px-8 lg:px-10">
          <HistoryBackButton fallbackHref="/agentech-education" className="navi-back-link mb-8 w-fit" />
          <p className="navi-pill w-fit">{text.pill}</p>
          <h1 className="font-display navi-hero-title mt-5 max-w-4xl font-extrabold text-white">
            {text.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-white/[0.82] sm:text-xl">
            {text.body}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {text.chips.map((item) => (
              <span key={item} className="navi-hero-chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 sm:px-8 lg:px-10 lg:py-20">
        <div className="max-w-3xl">
          <p className="navi-section-kicker">{text.introKicker}</p>
          <h2 className="font-display mt-3 text-4xl font-extrabold leading-tight text-[#14213d] sm:text-5xl">
            {text.introTitle}
          </h2>
          <p className="mt-5 text-lg leading-8 text-[#526178]">
            {text.introBody}
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          {projectLessons.map((lesson, index) => (
            <article
              key={lesson.title.en}
              className={`navi-feature-card group border ${toneClasses[lesson.tone]}`}
              style={{ ["--navi-delay" as string]: `${(index % 6) * 70}ms` }}
            >
              <div className="navi-feature-media">
                <LessonVisual language={language} lesson={lesson} />
              </div>
              <div className="navi-feature-copy">
                <p>{lesson.eyebrow[language]}</p>
                <h3>{lesson.title[language]}</h3>
                <span>{lesson.body[language]}</span>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="bg-[#14213d] px-5 py-16 text-white sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <div>
            <p className="navi-section-kicker navi-section-kicker-dark">{text.finalKicker}</p>
            <h2 className="font-display mt-3 text-4xl font-extrabold leading-tight text-white sm:text-5xl">
              {text.finalTitle}
            </h2>
            <p className="mt-5 text-lg leading-8 text-white/[0.76]">
              {text.finalBody}
            </p>
          </div>
          <div className="navi-layer-board">
            {text.layers.map((layer, index) => (
              <div key={layerLevels[index]} className="navi-layer-row">
                <strong>{layerLevels[index]}</strong>
                <span>{layer}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

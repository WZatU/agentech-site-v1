import Image from "next/image";
import Link from "next/link";

const clubImages = [
  "/assets/talents/club/club-1.png",
  "/assets/talents/club/club-2.png",
  "/assets/talents/club/club-3.png",
  "/assets/talents/club/club-4.png",
  "/assets/talents/club/club-5.png"
];

const learnSections = [
  {
    title: "机器人系统结构",
    body: "学生将理解机器人由传感器、控制器、电机、机械结构、算法与反馈系统共同组成。不再把机器人看成黑盒，而是真正理解各个系统之间如何协同工作。"
  },
  {
    title: "传感器采样与数据分析",
    body: "学生将学习距离传感器、颜色传感器、陀螺仪、摄像头等输入设备如何采集数据，并通过测试记录、误差分析与阈值调整，让机器人更准确地理解环境。"
  },
  {
    title: "控制逻辑与算法测试",
    body: "学生将练习 if / else 条件逻辑、状态机、路径规划、避障逻辑、任务流程与基础自动化算法，让机器人能够根据规则自主完成任务。"
  },
  {
    title: "AI 辅助开发与调试",
    body: "学生将学习如何使用 AI 工具进行思路生成、错误解释、代码优化与方案改进，同时保持独立判断能力与批判性思维，而不是盲目依赖 AI。"
  },
  {
    title: "工程搭建与原型迭代",
    body: "学生将从基础机器人搭建开始，逐步进行结构优化、传感器安装、线路管理、电机控制与系统整合，建立真实工程项目经验。"
  },
  {
    title: "机器人竞赛策略",
    body: "学生将学习如何分析比赛规则、拆解任务目标、优化得分策略、进行模拟训练、现场调试与团队分工。"
  }
];

const coreAbilities = [
  {
    title: "系统思维能力",
    body: "学生会从一个机器人看到背后的完整系统：输入是什么，机器人如何处理信息，输出是什么，失败发生在哪里。"
  },
  {
    title: "数据理解能力",
    body: "通过传感器采样、测试记录与误差分析，学生会理解机器人不是凭感觉行动，而是根据数据做出判断。"
  },
  {
    title: "算法与逻辑能力",
    body: "学生会逐步理解规则如何驱动智能行为，建立条件逻辑、状态切换、路径规划与自动化思维。"
  },
  {
    title: "工程调试能力",
    body: "机器人项目一定会失败。真正的学习发生在失败之后，学生将学习如何定位问题、记录现象、验证假设并持续优化方案。"
  },
  {
    title: "团队协作能力",
    body: "学生会承担机械结构、编程开发、传感器测试、算法优化、比赛策略、项目展示等不同角色。"
  },
  {
    title: "表达与展示能力",
    body: "学生最终需要能够清晰解释自己的项目：解决了什么问题，机器人如何工作，做了哪些测试，如何完成优化。"
  }
];

const projectOutputs = [
  "工程 notebook",
  "技术海报",
  "Demo 视频",
  "测试记录",
  "比赛策略计划",
  "项目展示材料"
];

function FormPreview() {
  return (
    <aside className="rounded-[30px] border border-[#d9e1ea] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
      <div className="rounded-[24px] border border-[#dbe3ed] bg-[#f8fafc] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] !text-[#334155]">申请表预览</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight !text-[#0b1220]">AI Robotics Club</h2>
        <div className="mt-5 grid gap-3">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] !text-[#475569]">学生姓名</p>
            <div className="h-10 rounded-xl border border-[#cbd5e1] bg-white" />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] !text-[#475569]">年级</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-full bg-[#0b1220] px-3 py-2 text-center text-xs font-semibold text-white">9</div>
              <div className="rounded-full border border-[#cbd5e1] bg-white px-3 py-2 text-center text-xs font-semibold !text-[#0b1220]">10</div>
              <div className="rounded-full border border-[#cbd5e1] bg-white px-3 py-2 text-center text-xs font-semibold !text-[#0b1220]">11</div>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] !text-[#475569]">项目经验</p>
            <div className="h-20 rounded-xl border border-[#cbd5e1] bg-white" />
          </div>
        </div>
      </div>
      <Link
        href="/ai-robotics-club/apply"
        className="mt-5 inline-flex w-full justify-center rounded-full border border-[#0b1220] bg-white px-6 py-3 text-sm font-bold !text-black transition hover:bg-black hover:!text-white"
      >
        立即申请
      </Link>
    </aside>
  );
}

export default function AiRoboticsClubChinesePage() {
  return (
    <section className="min-h-screen bg-white px-6 py-16 text-[#0b1220] lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/talents"
            className="talent-back-button inline-flex rounded-full border px-5 py-2.5 text-sm font-semibold transition"
          >
            返回 Agentech Talents
          </Link>
          <div className="inline-flex rounded-full border border-[#d9e1ea] bg-white p-1 text-sm font-bold shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <Link href="/ai-robotics-club" className="rounded-full px-4 py-2 !text-[#0b1220] transition hover:bg-[#f1f5f9]">
              English
            </Link>
            <Link href="/ai-robotics-club/zh" className="rounded-full bg-[#0b1220] px-4 py-2 text-white">
              中文
            </Link>
          </div>
        </div>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[1fr_390px]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#334155]">AI Robotics Club</p>
            <h1 className="mt-5 max-w-5xl text-4xl font-semibold tracking-[0.04em] !text-black md:text-6xl">
              机器人竞赛与工程研发会员计划
            </h1>
            <p className="mt-6 max-w-3xl text-xl font-semibold leading-8 !text-[#111827]">
              加入真正的 AI 机器人研发团队。
            </p>
            <p className="mt-4 max-w-4xl text-base leading-8 !text-[#334155] md:text-lg">
              从机器人搭建到算法、测试与比赛，真正理解机器人如何工作。不只是机器人兴趣班，而是一套长期工程训练计划。
            </p>
          </div>

          <FormPreview />
        </div>

        <div className="mt-14 overflow-hidden rounded-[28px] border border-[#d9e1ea] bg-[#f8fafc] shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
          <Image
            src={clubImages[0]}
            alt="AI Robotics Club 项目预览"
            width={1800}
            height={1100}
            priority
            className="h-auto w-full object-cover"
          />
        </div>

        <section className="mt-16 grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#475569]">主介绍</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight !text-black md:text-5xl">
              学生会真正理解机器人为什么能工作、为什么会失败，以及如何不断优化系统。
            </h2>
          </div>
          <div className="space-y-6 text-base leading-8 !text-[#334155]">
            <p>
              很多机器人课程只是让学生照着搭、跟着做。在 AI Robotics Club，我们更希望学生真正理解机器人如何感知环境、传感器数据到底代表什么、算法如何做出判断、机器人为什么会失败，以及如何通过测试与调试不断优化系统。
            </p>
            <p>
              学生每周都会围绕真实工程任务推进学习。从基础机器人搭建开始，逐步进入传感器采样、自动避障、路径规划、算法测试、比赛策略与项目展示。
            </p>
            <p className="font-semibold !text-[#0b1220]">
              在整个项目结束后，学生不仅仅完成一个机器人作品，更会建立可以长期迁移的工程思维与问题解决能力。
            </p>
          </div>
        </section>

        <section className="mt-16 rounded-[30px] bg-[#0b1220] p-8 text-white md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#cbd5e1]">学生成长与能力提升</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight !text-white md:text-5xl">
                六大核心能力成长。
              </h2>
              <p className="mt-5 text-base leading-8 !text-[#dbe4ef]">
                用机器人培养系统思维、数据能力与工程创造力。
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {coreAbilities.map((ability) => (
                <article key={ability.title} className="rounded-2xl border border-white/10 bg-white/[0.06] p-4">
                  <h3 className="font-semibold !text-white">{ability.title}</h3>
                  <p className="mt-2 text-sm leading-6 !text-[#dbe4ef]">{ability.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <div className="mt-14 grid gap-5 lg:grid-cols-2">
          {clubImages.slice(1).map((image, index) => (
            <div key={image} className="overflow-hidden rounded-[24px] border border-[#d9e1ea] bg-[#f8fafc] shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
              <Image
                src={image}
                alt={`AI Robotics Club 视觉 ${index + 2}`}
                width={1400}
                height={900}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        <section className="mt-16">
          <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#475569]">学生将学习什么</p>
          <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {learnSections.map((section) => (
              <article key={section.title} className="rounded-[24px] border border-[#d9e1ea] bg-white p-6 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
                <h3 className="text-xl font-semibold !text-black">{section.title}</h3>
                <p className="mt-4 text-sm leading-7 !text-[#334155]">{section.body}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-14 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-[28px] border border-[#d9e1ea] bg-white p-8 shadow-[0_14px_34px_rgba(15,23,42,0.06)]">
            <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#475569]">工程日志与项目展示</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight !text-black">项目成果可以成为可展示的作品材料。</h2>
            <p className="mt-5 text-base leading-8 !text-[#334155]">
              学生会持续记录设计过程、测试结果、失败原因、优化方案与数据分析，最终形成可用于竞赛、面试、科学展览、作品集表达与未来学术发展的项目材料。
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {projectOutputs.map((item) => (
              <div key={item} className="rounded-2xl border border-[#d9e1ea] bg-[#f8fafc] px-5 py-4 text-sm font-bold !text-[#0b1220]">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-14 rounded-[30px] border border-[#d9e1ea] bg-white p-8 shadow-[0_20px_55px_rgba(15,23,42,0.08)] md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#475569]">行动召唤</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight !text-black md:text-4xl">
                让孩子用 AI 创造未来。
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 !text-[#334155]">
                学生每周推进真实工程任务，完成阶段成果，逐步打造可展示、可升级、可参赛的机器人项目。欢迎联系我们预约名额或与课程顾问进一步沟通。
              </p>
            </div>
            <div className="flex items-center lg:justify-end">
              <Link
                href="/ai-robotics-club/apply"
                className="inline-flex w-full justify-center rounded-full border border-[#0b1220] bg-white px-8 py-4 text-base font-bold !text-black transition hover:bg-black hover:!text-white lg:w-auto"
              >
                立即申请
              </Link>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

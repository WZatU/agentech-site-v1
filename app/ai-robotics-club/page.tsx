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
    title: "Robotics System Architecture",
    body: "Students learn that robots are made up of sensors, controllers, motors, mechanical structures, algorithms, and feedback systems. Instead of seeing a robot as a black box, they begin understanding how each subsystem works together."
  },
  {
    title: "Sensor Sampling & Data Analysis",
    body: "Students explore how distance sensors, color sensors, gyroscopes, cameras, and other input devices collect data. Through testing logs, error analysis, and threshold tuning, they learn how robots interpret the environment more accurately."
  },
  {
    title: "Control Logic & Algorithm Testing",
    body: "Students practice if/else logic, state machines, path planning, obstacle avoidance, task sequencing, and basic automation algorithms that allow robots to complete tasks autonomously."
  },
  {
    title: "AI-Assisted Development & Debugging",
    body: "Students learn how to use AI tools to brainstorm ideas, explain errors, optimize code, and improve designs while still maintaining independent judgment and critical thinking."
  },
  {
    title: "Engineering Construction & Prototype Iteration",
    body: "Beginning with basic robot assembly, students improve structures, integrate sensors, manage wiring, optimize motor control, and combine subsystems into complete engineering projects."
  },
  {
    title: "Robotics Competition Strategy",
    body: "Students learn how to analyze competition rules, break down objectives, optimize scoring strategies, simulate match conditions, debug on-site, and coordinate team roles."
  }
];

const coreAbilities = [
  {
    title: "Systems Thinking",
    body: "Students learn to see the complete system behind a robot: input, processing, output, and where failure occurs. This trains them to break complex problems into manageable modules."
  },
  {
    title: "Data Literacy",
    body: "Through sensor sampling, testing logs, and error analysis, students learn that robots do not act based on feelings. They act based on data."
  },
  {
    title: "Algorithmic & Logical Thinking",
    body: "Students learn how rules drive intelligent behavior, from obstacle avoidance to backup workflows, path planning, and automation thinking."
  },
  {
    title: "Engineering Debugging",
    body: "Robotics projects inevitably fail. Students learn how to locate problems, record observations, test hypotheses, and improve solutions."
  },
  {
    title: "Teamwork & Collaboration",
    body: "Students take on roles across mechanical structure, programming, sensor testing, algorithm optimization, competition strategy, and project presentation."
  },
  {
    title: "Communication & Presentation",
    body: "Students learn to explain what problem they solved, how their robot works, what tests they performed, what failed, and how the system improved."
  }
];

const projectOutputs = [
  "Engineering notebooks",
  "Technical posters",
  "Demo videos",
  "Testing logs",
  "Competition strategy plans",
  "Project presentation materials"
];

function FormPreview() {
  return (
    <aside className="rounded-[30px] border border-[#d9e1ea] bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.14)]">
      <div className="rounded-[24px] border border-[#dbe3ed] bg-[#f8fafc] p-5">
        <p className="text-xs font-bold uppercase tracking-[0.2em] !text-[#334155]">Club Application Preview</p>
        <h2 className="mt-3 text-2xl font-semibold tracking-tight !text-[#0b1220]">AI & Robotics Club</h2>
        <div className="mt-5 grid gap-3">
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] !text-[#475569]">Student Name</p>
            <div className="h-10 rounded-xl border border-[#cbd5e1] bg-white" />
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] !text-[#475569]">Grade</p>
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-full bg-[#0b1220] px-3 py-2 text-center text-xs font-semibold text-white">9</div>
              <div className="rounded-full border border-[#cbd5e1] bg-white px-3 py-2 text-center text-xs font-semibold !text-[#0b1220]">10</div>
              <div className="rounded-full border border-[#cbd5e1] bg-white px-3 py-2 text-center text-xs font-semibold !text-[#0b1220]">11</div>
            </div>
          </div>
          <div>
            <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.16em] !text-[#475569]">Project Experience</p>
            <div className="h-20 rounded-xl border border-[#cbd5e1] bg-white" />
          </div>
        </div>
      </div>
      <Link
        href="/ai-robotics-club/apply"
        className="mt-5 inline-flex w-full justify-center rounded-full border border-[#0b1220] bg-white px-6 py-3 text-sm font-bold !text-black transition hover:bg-black hover:!text-white"
      >
        Apply Now
      </Link>
    </aside>
  );
}

export default function AiRoboticsClubPage() {
  return (
    <section className="min-h-screen bg-white px-6 py-16 text-[#0b1220] lg:px-8 lg:py-20">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/talents"
            className="talent-back-button inline-flex rounded-full border px-5 py-2.5 text-sm font-semibold transition"
          >
            Back to Agentech Talents
          </Link>
          <div className="inline-flex rounded-full border border-[#d9e1ea] bg-white p-1 text-sm font-bold shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
            <Link href="/ai-robotics-club" className="rounded-full bg-[#0b1220] px-4 py-2 text-white">
              English
            </Link>
            <Link href="/ai-robotics-club/zh" className="rounded-full px-4 py-2 !text-[#0b1220] transition hover:bg-[#f1f5f9]">
              中文
            </Link>
          </div>
        </div>

        <div className="mt-14 grid items-start gap-10 lg:grid-cols-[1fr_390px]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#334155]">AI Robotics Club</p>
            <h1 className="mt-5 max-w-5xl text-4xl font-semibold uppercase tracking-[0.1em] !text-black md:text-6xl">
              Robotics Competition & Engineering Membership Program
            </h1>
            <p className="mt-6 max-w-3xl text-xl font-semibold leading-8 !text-[#111827]">
              Join a real AI robotics engineering team.
            </p>
            <p className="mt-4 max-w-4xl text-base leading-8 !text-[#334155] md:text-lg">
              From robot construction to algorithms, testing, and competition, students learn how real robots work. This is not just a robotics class. It is a long-term engineering training program.
            </p>
          </div>

          <FormPreview />
        </div>

        <div className="mt-14 overflow-hidden rounded-[28px] border border-[#d9e1ea] bg-[#f8fafc] shadow-[0_20px_55px_rgba(15,23,42,0.08)]">
          <Image
            src={clubImages[0]}
            alt="AI Robotics Club project preview"
            width={1800}
            height={1100}
            priority
            className="h-auto w-full object-cover"
          />
        </div>

        <section className="mt-16 grid gap-10 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#475569]">Main Introduction</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight !text-black md:text-5xl">
              Students learn to understand why robots work, why they fail, and how to improve them.
            </h2>
          </div>
          <div className="space-y-6 text-base leading-8 !text-[#334155]">
            <p>
              Many robotics classes simply teach students to follow instructions and assemble. At AI Robotics Club, we want students to truly understand how robots perceive the environment, what sensor data actually represents, how algorithms make decisions, why robots fail, and how testing and debugging lead to improvement.
            </p>
            <p>
              Each week, students work through real engineering challenges. Starting from foundational robot construction, they gradually progress into sensor sampling, autonomous obstacle avoidance, path planning, algorithm testing, competition strategy, and project presentation.
            </p>
            <p className="font-semibold !text-[#0b1220]">
              By the end of the program, students will not only complete a robotics project. They will develop a transferable engineering mindset and long-term problem-solving abilities.
            </p>
          </div>
        </section>

        <section className="mt-16 rounded-[30px] bg-[#0b1220] p-8 text-white md:p-10">
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div>
              <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#cbd5e1]">Student Growth & Skill Development</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight !text-white md:text-5xl">
                Six core abilities students will develop.
              </h2>
              <p className="mt-5 text-base leading-8 !text-[#dbe4ef]">
                Using robotics to develop systems thinking, data literacy, and engineering creativity.
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
                alt={`AI Robotics Club visual ${index + 2}`}
                width={1400}
                height={900}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>

        <section className="mt-16">
          <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#475569]">What Students Will Learn</p>
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
            <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#475569]">Engineering Documentation</p>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight !text-black">Projects become portfolio-ready work.</h2>
            <p className="mt-5 text-base leading-8 !text-[#334155]">
              Students continuously document designs, testing results, failures, improvements, and data analysis. Final outcomes may include materials that can be showcased for competitions, interviews, science showcases, and future academic opportunities.
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
              <p className="text-sm font-bold uppercase tracking-[0.24em] !text-[#475569]">Call to Action</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-tight !text-black md:text-4xl">
                Help your child build the future with AI.
              </h2>
              <p className="mt-5 max-w-3xl text-base leading-8 !text-[#334155]">
                Students progress through real engineering challenges every week, complete milestone-based achievements, and gradually build robotics projects that can be showcased, upgraded, and prepared for competition.
              </p>
            </div>
            <div className="flex items-center lg:justify-end">
              <Link
                href="/ai-robotics-club/apply"
                className="inline-flex w-full justify-center rounded-full border border-[#0b1220] bg-white px-8 py-4 text-base font-bold !text-black transition hover:bg-black hover:!text-white lg:w-auto"
              >
                Apply Now
              </Link>
            </div>
          </div>
        </section>
      </div>
    </section>
  );
}

export type InternshipLanguage = "en" | "zh";

export type InternshipRoleContent = {
  overview: string[];
  responsibilities: string[];
  requirements: string[];
  preferred: string[];
  helpfulCourses?: string[];
  exampleProjects?: string[];
  applicationMaterials?: string[];
};

export type InternshipRole = {
  slug: string;
  title: string;
  eyebrow: string;
  schedule: string;
  tags: string[];
  summary: string;
  content: Record<InternshipLanguage, InternshipRoleContent>;
};

export const internshipRoles: InternshipRole[] = [
  {
    slug: "intelligent-hardware-development-intern",
    title: "Intelligent Hardware Development Intern",
    eyebrow: "Hardware Systems",
    schedule: "Internship",
    tags: ["Robotics hardware", "Sensors", "Prototyping"],
    summary: "Support the design, assembly, testing, and iteration of intelligent hardware systems for robotics and embodied AI products.",
    content: {
      en: {
        overview: [
          "Agentech is looking for an Intelligent Hardware Development Intern to support robotics and intelligent device prototyping. This role is for builders who enjoy working across mechanical design, electronics, sensors, test benches, and real-world iteration.",
          "You will work with the team to turn product ideas into reliable physical systems, document experiments, and help improve the hardware foundation behind Agentech robotics."
        ],
        responsibilities: [
          "Assist with hardware prototype assembly, wiring, sensor integration, and system bring-up.",
          "Support testing for motors, batteries, controllers, cameras, sensors, and embedded modules.",
          "Create clear test notes, issue reports, assembly records, and iteration logs.",
          "Collaborate with software and robotics teammates to validate hardware behavior in real scenarios.",
          "Research components, vendors, materials, and reference designs for future prototypes."
        ],
        requirements: [
          "Current student or recent graduate in engineering, robotics, electrical engineering, mechanical engineering, computer engineering, or a related field.",
          "Comfortable using basic lab tools and debugging physical systems carefully.",
          "Familiar with at least one area such as CAD, embedded systems, circuit basics, sensors, robotics kits, 3D printing, or manufacturing.",
          "Able to communicate progress clearly and keep organized documentation.",
          "Curious, careful, hands-on, and willing to learn through iteration."
        ],
        preferred: [
          "Experience with Arduino, Raspberry Pi, ESP32, STM32, ROS, CAD tools, PCB tools, or robot platforms.",
          "Portfolio, project photos, GitHub, lab notes, competition work, or hardware demos.",
          "Interest in embodied intelligence, AI agents, consumer robotics, or educational robotics."
        ]
      },
      zh: {
        overview: [
          "Agentech 正在招募智能硬件开发实习生，参与机器人与智能设备原型的设计、组装、测试和迭代。这个岗位适合喜欢动手、愿意同时接触机械结构、电子模块、传感器、测试平台和真实产品问题的同学。",
          "你将和团队一起把产品想法变成可运行、可测试、可持续优化的硬件系统，并帮助完善 Agentech 机器人产品的硬件基础。"
        ],
        responsibilities: [
          "协助硬件原型组装、接线、传感器集成和系统调试。",
          "参与电机、电池、控制器、摄像头、传感器和嵌入式模块的测试。",
          "整理测试记录、问题报告、装配记录和迭代文档。",
          "与软件和机器人方向成员合作，在真实场景中验证硬件表现。",
          "调研元器件、供应商、材料和参考方案，支持后续原型开发。"
        ],
        requirements: [
          "工程、机器人、电子工程、机械工程、计算机工程或相关专业在读学生或应届毕业生。",
          "能够使用基础实验工具，并能耐心、细致地排查硬件问题。",
          "熟悉 CAD、嵌入式系统、电路基础、传感器、机器人套件、3D 打印或制造流程中的至少一项。",
          "能够清晰沟通进展，并保持有条理的项目文档。",
          "具备好奇心、责任心、动手能力，并愿意在迭代中学习。"
        ],
        preferred: [
          "有 Arduino、Raspberry Pi、ESP32、STM32、ROS、CAD、PCB 或机器人平台经验。",
          "有作品集、项目照片、GitHub、实验记录、竞赛经历或硬件演示。",
          "对具身智能、AI Agent、消费级机器人或教育机器人感兴趣。"
        ]
      }
    }
  },
  {
    slug: "robotics-ai-software-engineering-intern",
    title: "Robotics, AI, and Software Engineering Intern",
    eyebrow: "Robotics Software",
    schedule: "Internship",
    tags: ["Robotics", "AI agents", "Full-stack"],
    summary: "Support robotics, intelligent automation, software development, AI-assisted workflows, data, sensors, and web development.",
    content: {
      en: {
        overview: [
          "Agentech is looking for motivated interns to support work in robotics, intelligent automation, software development, and company technology infrastructure. Projects may involve robot movement and control, sensor-based decision making, data collection and analysis, website development, AI-assisted workflows, and practical engineering tools.",
          "This internship is designed for students who want hands-on experience with real company projects and are interested in applying classroom knowledge to robotics, software, AI, data, and automation systems."
        ],
        responsibilities: [
          "Develop and improve robot movement, following, navigation, and control logic.",
          "Use sensor data to support robot positioning, movement decisions, and system behavior.",
          "Write Python scripts for testing, automation, data processing, or robotics functions.",
          "Support website development and company digital platforms.",
          "Organize and analyze robot or system data, then communicate findings clearly.",
          "Create charts, reports, or simple dashboards to explain technical performance.",
          "Assist with AI tools, automation workflows, and internal productivity systems.",
          "Write clear documentation for code, tests, workflows, and technical processes."
        ],
        requirements: [
          "Basic programming experience, especially in Python.",
          "Interest in robotics, artificial intelligence, software engineering, or automation.",
          "Ability to learn independently and solve problems carefully.",
          "Good communication habits and willingness to document work clearly.",
          "Helpful experience includes JavaScript, HTML, CSS, React, data analysis, sensors, AI or machine learning basics, Git/GitHub, website development, or technical writing."
        ],
        preferred: [
          "Python programming",
          "Website development",
          "Data analysis",
          "Robotics, AI, sensors, Git/GitHub, or technical writing experience"
        ],
        helpfulCourses: [
          "Python Programming",
          "Web Development",
          "Data Structures and Algorithms",
          "Robotics",
          "Control Systems",
          "Artificial Intelligence",
          "Machine Learning",
          "Computer Vision",
          "Data Science or Data Analysis",
          "Statistics",
          "Linear Algebra",
          "Sensor Systems",
          "Software Engineering",
          "Human-Computer Interaction",
          "Technical Writing"
        ],
        exampleProjects: [
          "Improve robot movement, following, or navigation behavior.",
          "Build Python tools to test robot control logic.",
          "Analyze sensor data or robot movement data.",
          "Build or update website pages for company projects.",
          "Create simple dashboards or technical reports.",
          "Automate repetitive engineering or documentation tasks.",
          "Research AI, robotics, or software methods useful to company development."
        ],
        applicationMaterials: [
          "Resume; school, major, and expected graduation date.",
          "Relevant courses completed and programming languages or tools used.",
          "Project links, GitHub, portfolio, or code samples if available.",
          "Weekly availability and a short explanation of interest in Agentech."
        ]
      },
      zh: {
        overview: [
          "Agentech 正在招聘有动力、有学习能力的实习生，参与公司在机器人、智能自动化、软件开发和技术平台建设方面的项目。工作内容可能包括机器人运动与控制、基于传感器数据的决策、数据收集与分析、网站开发、AI 辅助工作流程，以及实用工程工具的开发。",
          "这个实习岗位适合希望参与真实公司项目的学生，尤其适合对机器人、软件工程、人工智能、数据分析和自动化系统感兴趣的同学。"
        ],
        responsibilities: [
          "开发和改进机器人运动、跟随、导航与控制逻辑。",
          "使用传感器数据支持机器人定位、移动决策和系统行为。",
          "编写 Python 脚本，用于测试、自动化、数据处理或机器人相关功能。",
          "支持公司网站和数字平台的开发与维护。",
          "整理和分析机器人或系统运行数据，并清楚表达分析结果。",
          "制作图表、报告或简单数据看板，用于展示技术表现。",
          "协助 AI 工具、自动化流程和内部效率工具的开发。",
          "编写清晰的代码说明、测试记录、工作流程和技术文档。"
        ],
        requirements: [
          "具备基础编程经验，尤其是 Python。",
          "对机器人、人工智能、软件工程或自动化方向有兴趣。",
          "能够自主学习，并认真分析和解决问题。",
          "具备良好的沟通能力和文档整理习惯。",
          "有 JavaScript、HTML、CSS、React、数据分析、传感器、AI 或机器学习基础、Git/GitHub、网站开发或技术写作经验者优先。"
        ],
        preferred: [
          "Python 编程",
          "网站开发",
          "数据分析",
          "机器人、AI、传感器、Git/GitHub 或技术写作经验"
        ],
        helpfulCourses: [
          "Python 编程",
          "网站开发",
          "数据结构与算法",
          "机器人学",
          "控制系统",
          "人工智能",
          "机器学习",
          "计算机视觉",
          "数据科学或数据分析",
          "统计学",
          "线性代数",
          "传感器系统",
          "软件工程",
          "人机交互",
          "技术写作"
        ],
        exampleProjects: [
          "改进机器人移动、跟随或导航行为。",
          "编写 Python 工具，用于测试机器人控制逻辑。",
          "分析传感器数据或机器人运动数据。",
          "建设或更新公司项目相关网页。",
          "创建简单数据看板或技术报告。",
          "自动化重复性的工程或文档工作。",
          "调研对公司发展有帮助的 AI、机器人或软件技术方法。"
        ],
        applicationMaterials: [
          "简历；学校、专业和预计毕业时间。",
          "已完成的相关课程，以及掌握的编程语言和技术工具。",
          "项目链接、GitHub、作品集或代码样例，如有。",
          "每周可实习时间，以及简短说明为什么对 Agentech 感兴趣。"
        ]
      }
    }
  },
  {
    slug: "algorithm-research-intern",
    title: "Algorithm and Research Intern",
    eyebrow: "Mathematics, Algorithms, and Research",
    schedule: "Internship",
    tags: ["Math", "Algorithms", "Research"],
    summary: "Explore mathematical foundations, robot perception, simulation, multi-agent systems, and research prototypes for AI-native physical systems.",
    content: {
      en: {
        overview: [
          "Agentech builds intelligent systems that interact with the physical world, including robotics, robot perception, multi-agent systems, AI workflow automation, smart city robotics, and AI-native education tools.",
          "We move fast and treat AI tooling as a core part of how we build. This role is for students who enjoy mathematical thinking, research-backed engineering, and turning vague technical ideas into working prototypes.",
          "You will work directly with the engineering team on real projects, from early prototyping to shipping."
        ],
        responsibilities: [
          "Contribute to robot perception and vision systems that help physical systems understand their environment.",
          "Build simulation pipelines, experiments, benchmarks, notebooks, or prototype implementations.",
          "Explore multi-agent coordination, AI workflow automation, and intelligent robotics workflows.",
          "Support intelligent hardware and robotics prototyping with math, algorithms, and practical engineering judgment.",
          "Help build AI-native education tools that turn complex technical ideas into usable learning experiences.",
          "Read papers, summarize methods, compare tradeoffs, and implement promising ideas in code."
        ],
        requirements: [
          "Comfortable with general computer workflows and online collaboration tools such as Google Docs, Google Sheets, Zoom, Notion, Slack, and related productivity platforms.",
          "Comfortable with Python, Git, and Linux; able to build and debug end-to-end systems independently.",
          "Experience using tools such as Cursor, Claude, ChatGPT, or similar AI systems in real projects.",
          "Able to take a vague problem and turn it into a working prototype.",
          "Background in linear algebra, probability, and optimization; able to read papers and implement ideas.",
          "Writes clearly, asks strong questions, and collaborates effectively with teammates."
        ],
        preferred: [
          "Experience with robotics or computer vision, including ROS, OpenCV, simulation, hardware, or related tools.",
          "Familiarity with LLM tooling or agent frameworks.",
          "Portfolio of side projects, GitHub repositories, or demos.",
          "Experience with Arduino, ESP32, sensors, OLED modules, or robotics hardware."
        ],
        helpfulCourses: [
          "Linear Algebra",
          "Probability",
          "Optimization",
          "Robotics",
          "Computer Vision",
          "Artificial Intelligence",
          "Machine Learning",
          "Simulation",
          "Control Systems",
          "Algorithms"
        ],
        exampleProjects: [
          "Prototype a robot perception or vision system.",
          "Build a simulation pipeline for robotics testing.",
          "Test multi-agent coordination ideas in a small working demo.",
          "Automate an AI workflow used by the engineering team.",
          "Implement a paper idea and evaluate whether it can become a practical system.",
          "Create a research-backed demo for smart city robotics or AI-native education."
        ],
        applicationMaterials: [
          "Projects, GitHub repositories, demos, papers, notebooks, or portfolio links if available.",
          "A short note describing a hard technical problem you worked on and how you approached it.",
          "Relevant math, AI, robotics, or systems courses.",
          "Weekly availability and a short explanation of interest in Agentech."
        ]
      },
      zh: {
        overview: [
          "Agentech 正在构建能够与物理世界互动的智能系统，方向包括机器人、机器人感知、多智能体系统、AI 工作流自动化、智慧城市机器人，以及 AI 原生教育工具。",
          "我们节奏很快，并把 AI 工具视为核心构建方式的一部分。这个岗位适合喜欢数学思维、研究型工程，并愿意把模糊技术问题转化为可运行原型的同学。",
          "你将直接和工程团队合作，参与真实项目，从早期原型到最终交付。"
        ],
        responsibilities: [
          "参与机器人感知和视觉系统开发，帮助物理系统理解周围环境。",
          "搭建仿真流程、实验、基准测试、Notebook 或原型实现。",
          "探索多智能体协同、AI 工作流自动化和智能机器人工作流程。",
          "用数学、算法和工程判断支持智能硬件与机器人原型开发。",
          "参与 AI 原生教育工具建设，把复杂技术概念转化为可使用的学习体验。",
          "阅读论文、总结方法、比较技术取舍，并将有价值的想法实现为代码。"
        ],
        requirements: [
          "熟悉常见电脑工作流和线上协作工具，例如 Google Docs、Google Sheets、Zoom、Notion、Slack 及相关效率平台。",
          "熟悉 Python、Git 和 Linux，能够独立构建和调试端到端系统。",
          "有在真实项目中使用 Cursor、Claude、ChatGPT 或类似 AI 系统的经验。",
          "能够把模糊问题拆解并做成可运行原型。",
          "具备线性代数、概率论和优化基础，能够阅读论文并实现其中的想法。",
          "表达清晰，能提出好问题，并能与团队高效协作。"
        ],
        preferred: [
          "有机器人或计算机视觉经验，例如 ROS、OpenCV、仿真、硬件或相关工具。",
          "熟悉 LLM 工具或 Agent 框架。",
          "有个人项目、GitHub 仓库、Demo 或作品集。",
          "有 Arduino、ESP32、传感器、OLED 模块或机器人硬件经验。"
        ],
        helpfulCourses: [
          "线性代数",
          "概率论",
          "优化",
          "机器人学",
          "计算机视觉",
          "人工智能",
          "机器学习",
          "仿真",
          "控制系统",
          "算法"
        ],
        exampleProjects: [
          "搭建机器人感知或视觉系统原型。",
          "构建用于机器人测试的仿真流程。",
          "用小型 Demo 验证多智能体协同想法。",
          "自动化工程团队使用的 AI 工作流。",
          "实现论文中的方法，并评估它是否可以成为实际系统。",
          "为智慧城市机器人或 AI 原生教育创建研究驱动的 Demo。"
        ],
        applicationMaterials: [
          "项目、GitHub 仓库、Demo、论文、Notebook 或作品集链接，如有。",
          "简短说明一个你处理过的困难技术问题，以及你的解决思路。",
          "相关数学、AI、机器人或系统课程。",
          "每周可实习时间，以及简短说明为什么对 Agentech 感兴趣。"
        ]
      }
    }
  }
];

export function getInternshipRole(slug: string) {
  return internshipRoles.find((role) => role.slug === slug);
}

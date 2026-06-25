from __future__ import annotations

from pathlib import Path

from PIL import Image
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image as RLImage,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "public" / "assets" / "program-guides"
TMP_DIR = ROOT / "tmp" / "pdfs"
AGENTECH_WORDMARK = ROOT / "public" / "assets" / "logo" / "AGENTECH-black.png"
FF_MARK_SOURCE = ROOT / "public" / "assets" / "partners" / "faraday_future_gray.png"
FF_MARK_CLEAN = TMP_DIR / "ff-mark-transparent.png"
FONT_ARIAL_UNICODE = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")

BG = colors.HexColor("#faf4ed")
CARD = colors.HexColor("#fffaf3")
INK = colors.HexColor("#575279")
MUTED = colors.HexColor("#797593")
LINE = colors.HexColor("#dfdad9")
ACCENT = colors.HexColor("#286983")
ROSE = colors.HexColor("#b4637a")
GOLD = colors.HexColor("#ea9d34")
FOAM = colors.HexColor("#56949f")
IRIS = colors.HexColor("#907aa9")
SILVER = colors.HexColor("#f2e9e1")
DARK = colors.HexColor("#191724")

DAY_MEDIA = [
    ROOT / "public" / "assets" / "ff-robotics" / "day-1-ai-branded-lab-arrival.png",
    ROOT / "public" / "assets" / "ff-robotics" / "ff-official-x2-chip-jetson.jpg",
    ROOT / "public" / "assets" / "ff-robotics" / "ff-official-x2-head-closeup.jpg",
    ROOT / "public" / "assets" / "ff-robotics" / "ff-official-master-product.jpg",
    ROOT / "public" / "assets" / "ff-robotics" / "day-5-ai-branded-founder-workshop.png",
    ROOT / "public" / "assets" / "ff-robotics" / "day-6-ai-branded-engineering-sprint.png",
    ROOT / "public" / "assets" / "ff-robotics" / "ff-official-aegis-robot-dog.jpg",
    ROOT / "public" / "assets" / "ff-robotics" / "day-8-ai-branded-product-polish.png",
    ROOT / "public" / "assets" / "ff-robotics" / "day-9-ai-branded-hackathon.png",
    ROOT / "public" / "assets" / "ff-robotics" / "day-10-ai-branded-demo-day.png",
]

MEDIA_CROPS = [TMP_DIR / f"day-{idx + 1:02d}-guide.jpg" for idx in range(10)]


EN_DAYS = [
    {
        "day": "Day 1",
        "title": "Welcome to the Future",
        "tagline": "Everything starts with curiosity.",
        "body": "Students enter the world of AI robotics through a real company environment. They meet mentors, explore the lab, form teams, and begin their journey from learner to builder.",
        "morning": ["Opening Ceremony", "Program Orientation", "Meet the Mentors"],
        "afternoon": ["FF Lab & Facility Experience", "Team Formation", "Meet Your Robot"],
        "evening": ["Founder Fireside Chat"],
        "focus": "Observe how a robotics company is organized, how teams communicate, and how engineering culture shapes product ambition.",
        "output": "Program badge, team assignment, lab orientation notes, and a first reflection on a robotics startup idea.",
        "founder": "A founder begins by entering the world as it is, noticing real systems, real constraints, and real people.",
    },
    {
        "day": "Day 2",
        "title": "Think Like an AI Engineer",
        "tagline": "Learn how intelligent machines think.",
        "body": "Students learn the basic language of AI, robotics, and embodied intelligence. The goal is not only to understand concepts, but to begin thinking like an engineer.",
        "morning": ["AI Fundamentals", "Embodied AI Overview", "Robot System Architecture"],
        "afternoon": ["Programming Workshop", "Simulation Introduction", "First Engineering Sprint"],
        "evening": ["Daily Demo & Reflection"],
        "focus": "Connect AI concepts to perception, planning, control, and the practical limits of real robot systems.",
        "output": "A first simulation workflow, a vocabulary map, and a team note on what makes embodied AI different from screen-based AI.",
        "founder": "Technical clarity becomes strategic clarity. Students learn to ask what the robot must sense, decide, and do.",
    },
    {
        "day": "Day 3",
        "title": "Build Your First Skill",
        "tagline": "Every robot begins with a single skill.",
        "body": "Students begin building reusable robot skills. They learn how perception, planning, and action connect together inside an embodied AI system.",
        "morning": ["Computer Vision Basics", "Sensors & Perception", "Skill Graph Introduction"],
        "afternoon": ["Engineer-Led Skill Workshop", "Build a Simple Robot Skill", "Test in Simulation"],
        "evening": ["Guest Talk: Robotics in the Real World"],
        "focus": "Translate sensor input into useful robot behavior and understand why reusable skills matter.",
        "output": "A simple robot skill tested in simulation, with notes on failure cases and improvement paths.",
        "founder": "A product is built from small, repeatable capabilities that can be tested, improved, and explained.",
    },
    {
        "day": "Day 4",
        "title": "Connect AI to Reality",
        "tagline": "Ideas become reality when they move.",
        "body": "Students move from simulation into the physical world. They learn why real robots are harder than demos, and why engineering discipline matters.",
        "morning": ["Hardware & Robot Integration", "Safety and Testing Workflow", "Real Robot Control Basics"],
        "afternoon": ["Deploy to Robot", "Test, Debug, Improve", "Engineering Review"],
        "evening": ["Lab Open Hour"],
        "focus": "Experience the gap between simulation and real hardware, including safety, latency, calibration, and debugging.",
        "output": "A deployment checklist, an engineering review log, and a revised prototype plan.",
        "founder": "Reality is the strongest investor. The system either works in the world, or it teaches the team what to fix.",
    },
    {
        "day": "Day 5",
        "title": "Design Like a Founder",
        "tagline": "Great engineers solve problems. Great founders find them.",
        "body": "Students learn that technology is only part of the company-building process. They explore customer needs, pricing, business models, and the basics of fundraising.",
        "morning": ["Product Thinking", "User Problems", "Market Discovery"],
        "afternoon": ["Business Model Workshop", "Financial Literacy for Startups", "Startup Financing Basics"],
        "evening": ["VC / Founder Fireside Chat"],
        "focus": "Move from a technical idea to a user problem, a market context, and a basic business model.",
        "output": "A one-page problem statement, target user definition, early pricing hypothesis, and business model sketch.",
        "founder": "A strong founder does not start with a feature. A strong founder starts with a painful problem.",
    },
    {
        "day": "Day 6",
        "title": "Move Faster Together",
        "tagline": "Innovation is a team sport.",
        "body": "Teams accelerate their projects with engineer mentorship. Students learn how real teams plan, divide tasks, debug together, and communicate progress.",
        "morning": ["Team Sprint Planning", "Project Scope Review", "Engineering Stand-up"],
        "afternoon": ["Project Development", "Mentor Office Hours", "Midpoint Technical Check"],
        "evening": ["Team Demo Practice"],
        "focus": "Practice sprint planning, role division, engineering communication, and focused execution under constraints.",
        "output": "A sprint board, midpoint demo, mentor feedback notes, and a refined project scope.",
        "founder": "Speed is not chaos. Speed comes from shared priorities, clear ownership, and fast feedback.",
    },
    {
        "day": "Day 7",
        "title": "Solve Real Problems",
        "tagline": "Technology matters when it solves something real.",
        "body": "Students connect their projects to real operational challenges. They refine use cases, test assumptions, and learn how robotics can create value in real environments.",
        "morning": ["Real-World Robotics Challenges", "Production Line / Workflow Perspective", "Use Case Selection"],
        "afternoon": ["Project Deep Work", "Technical Review", "User Scenario Testing"],
        "evening": ["CTO / Expert Fireside Chat"],
        "focus": "Understand robotics value through workflow, reliability, cost, safety, and operational fit.",
        "output": "A selected use case, scenario test notes, and a value proposition statement.",
        "founder": "The best technical answer is not always the best business answer. The use case decides.",
    },
    {
        "day": "Day 8",
        "title": "Polish Your Product",
        "tagline": "Details make products great.",
        "body": "Teams prepare for the final challenge. They improve their prototype, sharpen their story, and transform a technical project into a presentable product.",
        "morning": ["Testing & Debugging", "Product Polish", "Demo Storyline"],
        "afternoon": ["Pitch Coaching", "Presentation Design", "Hackathon Preparation"],
        "evening": ["Hackathon Kickoff"],
        "focus": "Turn a working prototype into a demo that can be understood by engineers, users, families, and guests.",
        "output": "A polished demo flow, pitch outline, slide draft, and hackathon task list.",
        "founder": "A good demo is not a trick. It is a clear promise about what the product can become.",
    },
    {
        "day": "Day 9",
        "title": "Build Under Pressure",
        "tagline": "Build fast. Learn faster.",
        "body": "The two-day hackathon begins. Teams work under pressure, make tradeoffs, solve unexpected problems, and prepare their final demo.",
        "morning": ["Hackathon Sprint", "Mentor Check-ins", "Rapid Prototyping"],
        "afternoon": ["Hackathon Development", "Testing & Debugging", "Final Submission Prep"],
        "evening": ["Final Build Lock", "Demo Rehearsal"],
        "focus": "Make fast decisions, stabilize the build, and separate must-have functionality from nice-to-have ideas.",
        "output": "A final prototype submission, demo rehearsal notes, and a last risk list.",
        "founder": "Pressure reveals priorities. Teams learn what to cut, what to protect, and what to explain clearly.",
    },
    {
        "day": "Day 10",
        "title": "Launch Your Future",
        "tagline": "Your journey has just begun.",
        "body": "Students present their work to mentors, engineers, guests, and families. The program ends not as a graduation, but as the beginning of a longer path into AI, robotics, research, entrepreneurship, and real-world impact.",
        "morning": ["Final Demo", "Product Presentation", "Technical Q&A"],
        "afternoon": ["Investor-Style Pitch", "Awards", "Closing Ceremony"],
        "evening": ["Networking", "Certificate", "Alumni Invitation"],
        "focus": "Present technical work with confidence, answer questions, and connect the project to a future pathway.",
        "output": "Final demo, founder-style pitch, certificate, portfolio material, and alumni pathway invitation.",
        "founder": "Launch is not the end. It is the first public signal that the team can build, learn, and continue.",
    },
]


ZH_DAYS = [
    {
        "day": "第 1 天",
        "title": "走进未来",
        "tagline": "一切从好奇心开始",
        "body": "学生将在真实公司的环境中进入 AI 机器人世界。他们会认识导师、探索实验室、组建团队，并从学习者开始转向建设者。",
        "morning": ["开营仪式", "项目介绍", "认识导师团队"],
        "afternoon": ["FF 实验室与设施体验", "团队组建", "认识你的机器人"],
        "evening": ["创始人炉边对谈"],
        "focus": "观察一家机器人公司如何组织团队、沟通项目，以及工程文化如何影响产品野心。",
        "output": "项目身份牌、团队分组、实验室参观笔记，以及关于机器人创业想法的第一次反思。",
        "founder": "创始人的第一步，是进入真实世界，观察真实系统、真实限制和真实的人。",
    },
    {
        "day": "第 2 天",
        "title": "像 AI 工程师一样思考",
        "tagline": "理解智能机器如何思考",
        "body": "学生学习 AI、机器人与具身智能的基础语言。目标不只是理解概念，而是开始用工程师的方式拆解问题。",
        "morning": ["AI 基础", "Embodied AI 概览", "机器人系统架构"],
        "afternoon": ["编程工作坊", "仿真环境入门", "第一次工程冲刺"],
        "evening": ["每日 Demo 与复盘"],
        "focus": "把 AI 概念连接到感知、规划、控制，以及真实机器人系统的实际限制。",
        "output": "第一个仿真工作流、核心概念地图，以及团队对具身智能与屏幕端 AI 差异的记录。",
        "founder": "技术清晰度会变成战略清晰度。学生会开始追问机器人必须感知什么、判断什么、执行什么。",
    },
    {
        "day": "第 3 天",
        "title": "构建第一个机器人技能",
        "tagline": "每个机器人能力 都从一个技能开始",
        "body": "学生开始构建可复用的机器人技能，理解感知、规划和执行如何在一个具身智能系统中连接起来。",
        "morning": ["计算机视觉基础", "传感器与感知", "Skill Graph 入门"],
        "afternoon": ["工程师带领的技能工作坊", "构建一个简单机器人技能", "在仿真环境中测试"],
        "evening": ["嘉宾分享 真实世界中的机器人"],
        "focus": "把传感器输入转化成可用的机器人行为，并理解可复用技能为什么重要。",
        "output": "一个在仿真环境中测试过的简单机器人技能，以及失败原因和改进路径记录。",
        "founder": "产品由一个个可重复、可测试、可解释的小能力构成。",
    },
    {
        "day": "第 4 天",
        "title": "让 AI 连接现实",
        "tagline": "当想法开始移动 现实就发生了",
        "body": "学生从仿真走向物理世界。他们会理解为什么真实机器人比演示更难，也会看到工程纪律为什么重要。",
        "morning": ["硬件与机器人集成", "安全与测试流程", "真实机器人控制基础"],
        "afternoon": ["部署到机器人", "测试、调试、改进", "工程评审"],
        "evening": ["实验室开放时间"],
        "focus": "体验仿真与真实硬件之间的差距，包括安全、延迟、校准和调试。",
        "output": "部署检查清单、工程评审记录，以及修订后的原型计划。",
        "founder": "现实是最强的投资人。系统能否在真实世界中运行，会直接告诉团队下一步该修什么。",
    },
    {
        "day": "第 5 天",
        "title": "像创始人一样设计",
        "tagline": "优秀工程师解决问题 优秀创始人发现问题",
        "body": "学生会看到技术只是公司建设的一部分。他们将探索客户需求、定价、商业模式，以及融资的基本逻辑。",
        "morning": ["产品思维", "用户问题", "市场发现"],
        "afternoon": ["商业模式工作坊", "创业财务基础", "融资基础入门"],
        "evening": ["VC / 创始人炉边对谈"],
        "focus": "从技术想法走向用户问题、市场场景和初步商业模式。",
        "output": "一页问题陈述、目标用户定义、早期定价假设和商业模式草图。",
        "founder": "强创始人不是从功能开始，而是从足够痛的问题开始。",
    },
    {
        "day": "第 6 天",
        "title": "更快地一起推进",
        "tagline": "创新是一项团队运动",
        "body": "团队在工程师导师的帮助下加速项目推进。学生会学习真实团队如何规划、分工、协作调试并汇报进展。",
        "morning": ["团队冲刺计划", "项目范围评审", "工程站会"],
        "afternoon": ["项目开发", "导师 Office Hours", "中期技术检查"],
        "evening": ["团队 Demo 练习"],
        "focus": "练习冲刺计划、角色分工、工程沟通，以及在限制条件下集中推进。",
        "output": "冲刺看板、中期 Demo、导师反馈记录，以及更新后的项目范围。",
        "founder": "速度不是混乱。速度来自共同优先级、清晰负责人和快速反馈。",
    },
    {
        "day": "第 7 天",
        "title": "解决真实问题",
        "tagline": "技术的价值 来自它解决真实问题的能力",
        "body": "学生将项目连接到真实运营挑战中。他们会细化使用场景、测试假设，并理解机器人如何在真实环境中创造价值。",
        "morning": ["真实机器人挑战", "产线 / 工作流视角", "应用场景选择"],
        "afternoon": ["项目深度工作", "技术评审", "用户场景测试"],
        "evening": ["CTO / 专家炉边对谈"],
        "focus": "从工作流、可靠性、成本、安全和运营适配度理解机器人价值。",
        "output": "确定的应用场景、场景测试记录，以及价值主张陈述。",
        "founder": "最好的技术答案不一定是最好的商业答案。应用场景会决定方向。",
    },
    {
        "day": "第 8 天",
        "title": "打磨你的产品",
        "tagline": "细节让产品真正成立",
        "body": "团队为最终挑战做准备。他们会改进原型、打磨叙事，并把技术项目转化成可以被展示和理解的产品。",
        "morning": ["测试与调试", "产品打磨", "Demo 故事线"],
        "afternoon": ["路演辅导", "演示设计", "Hackathon 准备"],
        "evening": ["Hackathon 启动"],
        "focus": "把可以运行的原型转化为工程师、用户、家长和嘉宾都能理解的 Demo。",
        "output": "打磨后的 Demo 流程、路演提纲、幻灯片初稿和 Hackathon 任务清单。",
        "founder": "好的 Demo 不是表演技巧，而是一个关于产品未来的清晰承诺。",
    },
    {
        "day": "第 9 天",
        "title": "在压力下完成构建",
        "tagline": "快速构建 更快学习",
        "body": "两天 Hackathon 正式开始。团队在压力下取舍、解决意外问题，并为最终 Demo 做最后准备。",
        "morning": ["Hackathon 冲刺", "导师检查", "快速原型"],
        "afternoon": ["Hackathon 开发", "测试与调试", "最终提交准备"],
        "evening": ["最终构建锁定", "Demo 彩排"],
        "focus": "快速决策、稳定构建，并区分必须完成的功能和可以放弃的想法。",
        "output": "最终原型提交、Demo 彩排记录和最后风险清单。",
        "founder": "压力会显露优先级。团队会学习什么该砍掉、什么必须守住、什么必须讲清楚。",
    },
    {
        "day": "第 10 天",
        "title": "发布你的未来",
        "tagline": "旅程才刚刚开始",
        "body": "学生向导师、工程师、嘉宾和家人展示他们的作品。项目结束不是毕业，而是他们进入 AI、机器人、研究、创业与真实世界影响力道路的开始。",
        "morning": ["最终 Demo", "产品展示", "技术问答"],
        "afternoon": ["投资人式路演", "奖项公布", "闭营仪式"],
        "evening": ["交流环节", "结业证书", "校友邀请"],
        "focus": "自信展示技术作品、回答问题，并把项目连接到未来路径。",
        "output": "最终 Demo、创始人式路演、结业证书、作品集材料和校友路径邀请。",
        "founder": "发布不是终点，而是团队能够构建、学习并持续前进的第一个公开信号。",
    },
]


EN_TOPIC_DETAILS = {
    "Opening Ceremony": ["Program goals and culture", "How the 10-day journey works", "Lab safety expectations", "Team collaboration norms", "Final demo standards"],
    "Program Orientation": ["Daily rhythm and milestones", "Tool accounts and workspaces", "Mentor feedback process", "Portfolio expectations", "How to document progress"],
    "Meet the Mentors": ["AI mentor roles", "Robotics mentor roles", "Founder mentor roles", "Office-hour etiquette", "How to ask strong technical questions"],
    "FF Lab & Facility Experience": ["Robotics lab stations", "Perception and sensing demos", "Hardware testing areas", "Data collection workflow", "How company labs reduce risk"],
    "Team Formation": ["Strengths and interests map", "Role selection", "Team agreement", "Decision-making process", "Project theme matching"],
    "Meet Your Robot": ["Robot anatomy", "Sensor map", "Actuator and joint overview", "Battery and safety basics", "Possible mission ideas"],
    "Founder Fireside Chat": ["Founder origin story", "Market timing", "Building the first team", "Raising early capital", "Resilience through uncertainty"],
    "AI Fundamentals": ["Machine learning concepts", "Neural networks", "Embeddings and representation", "Model evaluation", "Failure modes and bias"],
    "Embodied AI Overview": ["Perception-action loop", "World models", "Affordances", "Planning and control", "Sim-to-real transfer"],
    "Robot System Architecture": ["Sensor layer", "Compute layer", "Middleware and APIs", "Control loops", "Telemetry and logs"],
    "Programming Workshop": ["Python workflow", "APIs and data structures", "Version control basics", "Debugging routines", "Notebook versus script workflow"],
    "Simulation Introduction": ["Digital twin concept", "Scene setup", "Robot model loading", "Virtual sensors", "Scenario testing"],
    "First Engineering Sprint": ["Task breakdown", "Issue tracking", "Pair programming", "Sprint demo", "Blocker reporting"],
    "Daily Demo & Reflection": ["Demo ritual", "Learning log", "Peer feedback", "Risk list", "Next-step planning"],
    "Computer Vision Basics": ["Image pixels and channels", "Edge detection", "Object detection", "Segmentation", "Accuracy and confidence metrics"],
    "Sensors & Perception": ["Camera input", "Depth sensing", "IMU basics", "Lidar concepts", "Sensor fusion"],
    "Skill Graph Introduction": ["Skill nodes", "Preconditions", "Triggers", "Action chains", "Recovery paths"],
    "Engineer-Led Skill Workshop": ["Read a sample skill", "Modify parameters", "Test robot behavior", "Study failure cases", "Mentor code review"],
    "Build a Simple Robot Skill": ["Target selection", "State machine design", "Perception hook", "Action command", "Success condition"],
    "Test in Simulation": ["Scenario variations", "Log reading", "Regression checks", "Performance notes", "Bug report writing"],
    "Guest Talk: Robotics in the Real World": ["Deployment stories", "Safety lessons", "Customer needs", "Product constraints", "Robotics career paths"],
    "Hardware & Robot Integration": ["Actuator map", "Sensor wiring", "Compute modules", "Latency budget", "Power management"],
    "Safety and Testing Workflow": ["Test zones", "Emergency stop protocol", "Checklist design", "Fault isolation", "Responsible escalation"],
    "Real Robot Control Basics": ["Coordinate frames", "Velocity commands", "Motion limits", "Teleoperation", "Controller tuning"],
    "Deploy to Robot": ["Package build", "Configuration handoff", "Network setup", "Launch sequence", "Rollback plan"],
    "Test, Debug, Improve": ["Reproduce the bug", "Inspect logs", "Adjust parameters", "Retest", "Document results"],
    "Engineering Review": ["Design rationale", "Risk review", "Mentor questions", "Next actions", "Acceptance criteria"],
    "Lab Open Hour": ["Optional mentor help", "Prototype cleanup", "Experiment time", "Team sync", "Reflection notes"],
    "Product Thinking": ["Problem framing", "User job", "Product promise", "Minimum viable product", "Success metric"],
    "User Problems": ["Interview design", "Pain-point discovery", "Use-case framing", "Persona sketch", "Evidence quality"],
    "Market Discovery": ["Market map", "Alternative solutions", "Adoption barriers", "Stakeholder roles", "Competitor scan"],
    "Business Model Workshop": ["Value chain", "Pricing logic", "Cost structure", "Sales channel", "Revenue assumptions"],
    "Financial Literacy for Startups": ["Unit economics", "Burn rate", "Gross margin", "Runway", "Funding tradeoffs"],
    "Startup Financing Basics": ["Angel versus VC", "SAFE notes", "Dilution", "Milestone financing", "Pitch materials"],
    "VC / Founder Fireside Chat": ["Fundraising narrative", "Investor questions", "Timing", "Team credibility", "Ethical responsibility"],
    "Team Sprint Planning": ["Scope definition", "Milestones", "Role ownership", "Bug triage", "Daily goals"],
    "Project Scope Review": ["Must-have versus nice-to-have", "Technical feasibility", "Demo boundary", "Risk ranking", "Mentor sign-off"],
    "Engineering Stand-up": ["Yesterday, today, blockers", "Dependency check", "Decision log", "Time-boxing", "Team accountability"],
    "Project Development": ["Feature implementation", "Module integration", "Testing", "Demo interface", "Documentation"],
    "Mentor Office Hours": ["Technical choices", "Architecture questions", "Pitch logic", "Failure unblocking", "Next milestone planning"],
    "Midpoint Technical Check": ["Prototype readiness", "Sensor and data health", "Integration risk", "Demo quality", "Pass-fail criteria"],
    "Team Demo Practice": ["Timing", "Narration", "Live backup plan", "Team handoff", "Audience questions"],
    "Real-World Robotics Challenges": ["Safety", "Reliability", "Edge cases", "Maintenance", "Environment variability"],
    "Production Line / Workflow Perspective": ["Workflow mapping", "Human-robot handoff", "Throughput", "Bottlenecks", "Quality control"],
    "Use Case Selection": ["Impact", "Feasibility", "Data access", "User access", "Pitch fit"],
    "Project Deep Work": ["Implementation", "Refactoring", "Testing", "Integration", "Stabilization"],
    "Technical Review": ["Architecture", "Failure modes", "Evaluation metrics", "Mentor critique", "Revision plan"],
    "User Scenario Testing": ["Scenario script", "Observation", "Success criteria", "Failure notes", "Iteration plan"],
    "CTO / Expert Fireside Chat": ["Technical roadmap", "Hiring technical talent", "Product architecture", "Scaling systems", "Responsible deployment"],
    "Testing & Debugging": ["Test matrix", "Log analysis", "Root cause", "Regression testing", "Demo reliability"],
    "Product Polish": ["Interface copy", "Physical setup", "Experience flow", "Edge cases", "Final checklist"],
    "Demo Storyline": ["Hook", "Problem", "Solution", "Proof", "Closing ask"],
    "Pitch Coaching": ["Audience lens", "Product narrative", "Objection handling", "Traction proxy", "Founder presence"],
    "Presentation Design": ["Slide hierarchy", "Visual proof", "Concise copy", "Data chart", "Rehearsal flow"],
    "Hackathon Preparation": ["Scope lock", "Team roles", "Asset list", "Risk plan", "Time-boxing"],
    "Hackathon Kickoff": ["Rules", "Judging criteria", "Timeline", "Team commitments", "First sprint"],
    "Hackathon Sprint": ["Rapid planning", "Execution blocks", "Mentor checkpoints", "Daily target", "Risk cut"],
    "Mentor Check-ins": ["Short update", "Problem escalation", "Decision support", "Technical feedback", "Pitch feedback"],
    "Rapid Prototyping": ["Paper prototype", "Code stub", "Sensor mock", "Demo harness", "Fast testing"],
    "Hackathon Development": ["Integration", "Interface", "Data pipeline", "Robot behavior", "Slide sync"],
    "Final Submission Prep": ["Asset packaging", "README", "Backup demo video", "Run sheet", "Submission checklist"],
    "Final Build Lock": ["Freeze rules", "Smoke test", "Fallback mode", "Version tag", "Equipment check"],
    "Demo Rehearsal": ["Timing", "Speaker roles", "Q&A practice", "Transitions", "Confidence"],
    "Final Demo": ["Live robot run", "Recorded backup", "Use case framing", "Technical walk-through", "Value story"],
    "Product Presentation": ["Problem statement", "Target user", "Demo proof", "Business logic", "Roadmap"],
    "Technical Q&A": ["Architecture", "Data", "Testing", "Failure analysis", "Safety"],
    "Investor-Style Pitch": ["Market", "Moat", "Traction proxy", "Business model", "Funding story"],
    "Awards": ["Judging categories", "Mentor feedback", "Recognition", "Next path", "Celebration"],
    "Closing Ceremony": ["Reflection", "Certificates", "Family photos", "Mentor thanks", "Alumni invitation"],
    "Networking": ["Mentor conversations", "Engineer conversations", "Family showcase", "Contact etiquette", "Follow-up message"],
    "Certificate": ["Program record", "Project title", "Skill badges", "Portfolio language", "Next steps"],
    "Alumni Invitation": ["AI Club pathway", "Internship pathway", "Research pathway", "Future events", "Mentorship"],
}


ZH_TOPIC_DETAILS = {
    "开营仪式": ["项目目标与文化", "10 天旅程结构", "实验室安全规则", "团队协作规范", "最终 Demo 标准"],
    "项目介绍": ["每日节奏与里程碑", "工具账户与工作区", "导师反馈方式", "作品集期待", "如何记录项目进展"],
    "认识导师团队": ["AI 导师角色", "机器人导师角色", "创始人导师角色", "Office Hours 使用方式", "如何提出高质量技术问题"],
    "FF 实验室与设施体验": ["机器人实验站点", "感知与传感演示", "硬件测试区域", "数据采集流程", "公司实验室如何降低风险"],
    "团队组建": ["能力与兴趣地图", "团队角色选择", "协作协议", "决策机制", "项目方向匹配"],
    "认识你的机器人": ["机器人结构", "传感器地图", "关节与执行器概览", "电池与安全基础", "可探索任务方向"],
    "创始人炉边对谈": ["创始人起点故事", "市场时机", "第一支团队", "早期融资", "不确定性中的韧性"],
    "AI 基础": ["机器学习概念", "神经网络", "Embedding 与表示", "模型评估", "失败模式与偏差"],
    "Embodied AI 概览": ["感知到行动闭环", "世界模型", "可供性 Affordance", "规划与控制", "仿真到现实迁移"],
    "机器人系统架构": ["传感器层", "计算层", "中间件与 API", "控制回路", "遥测与日志"],
    "编程工作坊": ["Python 工作流", "API 与数据结构", "版本控制基础", "调试习惯", "Notebook 与脚本工作流"],
    "仿真环境入门": ["数字孪生概念", "场景搭建", "机器人模型加载", "虚拟传感器", "场景测试"],
    "第一次工程冲刺": ["任务拆解", "Issue 跟踪", "结对编程", "冲刺 Demo", "阻塞问题汇报"],
    "每日 Demo 与复盘": ["Demo 仪式", "学习日志", "同伴反馈", "风险清单", "下一步计划"],
    "计算机视觉基础": ["图像像素与通道", "边缘检测", "目标检测", "图像分割", "准确率与置信度"],
    "传感器与感知": ["摄像头输入", "深度感知", "IMU 基础", "激光雷达概念", "传感器融合"],
    "Skill Graph 入门": ["技能节点", "前置条件", "触发机制", "动作链", "恢复路径"],
    "工程师带领的技能工作坊": ["阅读示例技能", "修改参数", "测试机器人行为", "分析失败案例", "导师代码评审"],
    "构建一个简单机器人技能": ["目标选择", "状态机设计", "感知接口", "动作指令", "成功条件"],
    "在仿真环境中测试": ["场景变化", "日志阅读", "回归检查", "性能记录", "Bug 报告"],
    "嘉宾分享 真实世界中的机器人": ["部署案例", "安全经验", "客户需求", "产品限制", "机器人职业路径"],
    "硬件与机器人集成": ["执行器地图", "传感器连接", "计算模块", "延迟预算", "电源管理"],
    "安全与测试流程": ["测试区域", "急停协议", "检查清单设计", "故障隔离", "负责任升级"],
    "真实机器人控制基础": ["坐标系", "速度指令", "运动限制", "遥操作", "控制器调参"],
    "部署到机器人": ["构建软件包", "配置交接", "网络设置", "启动顺序", "回滚方案"],
    "测试、调试、改进": ["复现 Bug", "查看日志", "调整参数", "重新测试", "记录结果"],
    "工程评审": ["设计理由", "风险评审", "导师提问", "下一步动作", "验收标准"],
    "实验室开放时间": ["可选导师支持", "原型整理", "实验时间", "团队同步", "反思记录"],
    "产品思维": ["问题定义", "用户任务", "产品承诺", "最小可行产品", "成功指标"],
    "用户问题": ["访谈设计", "痛点发现", "场景定义", "用户画像", "证据质量"],
    "市场发现": ["市场地图", "替代方案", "采用阻力", "利益相关者", "竞品扫描"],
    "商业模式工作坊": ["价值链", "定价逻辑", "成本结构", "销售渠道", "收入假设"],
    "创业财务基础": ["单元经济模型", "Burn Rate", "毛利率", "Runway", "融资取舍"],
    "融资基础入门": ["天使与 VC", "SAFE 协议", "股权稀释", "里程碑融资", "路演材料"],
    "VC / 创始人炉边对谈": ["融资叙事", "投资人问题", "融资时机", "团队可信度", "伦理责任"],
    "团队冲刺计划": ["范围定义", "里程碑", "角色负责人", "Bug 优先级", "每日目标"],
    "项目范围评审": ["必须完成与可以延后", "技术可行性", "Demo 边界", "风险排序", "导师确认"],
    "工程站会": ["昨天 今天 阻塞", "依赖检查", "决策记录", "时间盒", "团队责任"],
    "项目开发": ["功能实现", "模块集成", "测试", "Demo 界面", "文档"],
    "导师 Office Hours": ["技术选择", "架构问题", "路演逻辑", "失败排查", "下一里程碑"],
    "中期技术检查": ["原型成熟度", "传感器与数据状态", "集成风险", "Demo 质量", "通过标准"],
    "团队 Demo 练习": ["时间控制", "讲述方式", "备用演示方案", "团队交接", "观众提问"],
    "真实机器人挑战": ["安全", "可靠性", "边界情况", "维护", "环境变化"],
    "产线 / 工作流视角": ["工作流地图", "人机交接", "吞吐量", "瓶颈", "质量控制"],
    "应用场景选择": ["影响力", "可行性", "数据条件", "用户接触", "路演适配度"],
    "项目深度工作": ["实现", "重构", "测试", "集成", "稳定化"],
    "技术评审": ["架构", "失败模式", "评估指标", "导师 critique", "修订计划"],
    "用户场景测试": ["场景脚本", "观察", "成功标准", "失败记录", "迭代计划"],
    "CTO / 专家炉边对谈": ["技术路线图", "技术人才招聘", "产品架构", "系统规模化", "负责任部署"],
    "测试与调试": ["测试矩阵", "日志分析", "根因定位", "回归测试", "Demo 可靠性"],
    "产品打磨": ["界面文案", "物理布置", "体验流程", "边界情况", "最终检查清单"],
    "Demo 故事线": ["开场钩子", "问题", "解决方案", "证明", "结尾请求"],
    "路演辅导": ["观众视角", "产品叙事", "反对意见处理", "早期 traction 替代信号", "创始人状态"],
    "演示设计": ["幻灯片层级", "视觉证据", "简洁文案", "数据图表", "彩排流程"],
    "Hackathon 准备": ["范围锁定", "团队角色", "素材清单", "风险计划", "时间盒"],
    "Hackathon 启动": ["规则", "评审标准", "时间线", "团队承诺", "第一轮冲刺"],
    "Hackathon 冲刺": ["快速计划", "执行区块", "导师检查点", "当天目标", "风险削减"],
    "导师检查": ["简短更新", "问题升级", "决策支持", "技术反馈", "路演反馈"],
    "快速原型": ["纸面原型", "代码桩", "传感器 Mock", "Demo Harness", "快速测试"],
    "Hackathon 开发": ["集成", "界面", "数据管线", "机器人行为", "幻灯片同步"],
    "最终提交准备": ["素材打包", "README", "备用 Demo 视频", "演示流程单", "提交检查清单"],
    "最终构建锁定": ["冻结规则", "冒烟测试", "备用模式", "版本标记", "设备检查"],
    "Demo 彩排": ["时间", "讲者分工", "Q&A 练习", "转场", "信心"],
    "最终 Demo": ["机器人现场运行", "备用录屏", "使用场景", "技术讲解", "价值故事"],
    "产品展示": ["问题陈述", "目标用户", "Demo 证明", "商业逻辑", "路线图"],
    "技术问答": ["架构", "数据", "测试", "失败分析", "安全"],
    "投资人式路演": ["市场", "壁垒", "早期 traction 替代信号", "商业模式", "融资故事"],
    "奖项公布": ["评审类别", "导师反馈", "认可", "下一路径", "庆祝"],
    "闭营仪式": ["反思", "证书", "家庭合影", "感谢导师", "校友邀请"],
    "交流环节": ["导师交流", "工程师交流", "家庭展示", "联系方式礼仪", "后续跟进"],
    "结业证书": ["项目记录", "项目题目", "技能标签", "作品集表达", "下一步"],
    "校友邀请": ["AI Club 路径", "实习路径", "研究路径", "未来活动", "导师支持"],
}


TEXT = {
    "en": {
        "file": "agentech-ff-eai-robotics-future-founder-program-guide-en.pdf",
        "doc_title": "EAI Robotics Future Founder Immersion Program",
        "cover_title": "EAI Robotics\nFuture Founder\nImmersion Program",
        "cover_subtitle": "A 10-day journey where students build, pitch, and launch an AI robotics startup inside a real robotics company.",
        "guide_label": "PROGRAM GUIDE",
        "brand_line": "AGENTECH  |  FF",
        "overview_title": "Program Overview",
        "overview_body": [
            "This guide provides a detailed 10-day structure for the EAI Robotics Future Founder Immersion Program. The program is designed for high school students who are ready to experience AI robotics as builders, product thinkers, and emerging founders.",
            "The journey combines embodied AI, robotics engineering, mentorship, startup thinking, financial literacy, and a final hackathon. Students do not simply learn AI. They experience how an AI robotics venture is built from idea to prototype to demo to pitch.",
        ],
        "overview_cards": [
            ("Real Company Environment", "Students enter a working robotics company context and learn from the culture, tools, and pace of real technical teams."),
            ("Founder-Level Journey", "The program connects technical building with user problems, market logic, business models, and investor-style storytelling."),
            ("Final Demo and Pitch", "The journey culminates in a hackathon, public demo, technical Q&A, and founder-style presentation."),
        ],
        "daily_label": "Daily Journey",
        "schedule": ["Morning", "Afternoon", "Evening"],
        "detail_rows": ["Learning Focus", "Student Output", "Founder Lens"],
        "topic_title": "Detailed Topic Pool",
        "topic_intro": "The topics below are optional areas the program may draw from. The final emphasis may vary based on student level, equipment availability, mentor focus, and project direction.",
        "topic_columns": ["Session", "Module", "Possible topics"],
        "final_title": "Student Outcomes and Next Pathways",
        "final_intro": "By the end of the program, students should leave with tangible work, stronger technical confidence, and a clearer sense of how AI robotics connects to research, entrepreneurship, and real-world impact.",
        "outcomes": [
            "A completed AI robotics project",
            "Final demo presentation",
            "Founder-style pitch experience",
            "Certificate of completion",
            "Project portfolio material",
            "Exposure to real engineering workflow",
            "Invitation to continue through Agentech AI Club / Internship / Research Pathway",
        ],
        "footer": "Internal program guide for families, students, mentors, and partners.",
        "page": "Page",
    },
    "zh": {
        "file": "agentech-ff-eai-robotics-future-founder-program-guide-zh.pdf",
        "doc_title": "具身智能机器人未来创始人沉浸项目",
        "cover_title": "具身智能机器人\n未来创始人\n沉浸项目",
        "cover_subtitle": "一段 10 天的沉浸式旅程：学生在真实机器人公司环境中，完成从构想到原型、演示与路演的具身智能机器人创业项目。",
        "guide_label": "项目手册",
        "brand_line": "智能体科技有限公司  |  法拉第未来",
        "overview_title": "项目概览",
        "overview_body": [
            "这份手册说明 EAI Robotics Future Founder Immersion Program 的 10 天详细结构。项目面向准备以建设者、产品思考者和未来创始人身份进入 AI 机器人世界的高中生。",
            "项目融合具身智能、机器人工程、工程师导师制、创业思维、财务素养与最终 Hackathon。学生不只是学习 AI，而是体验一个 AI 机器人创业项目如何从想法走向原型、Demo 和路演。",
        ],
        "overview_cards": [
            ("真实公司环境", "学生进入真实机器人公司语境，理解技术团队的文化、工具、节奏和协作方式。"),
            ("创始人级别旅程", "项目把技术构建与用户问题、市场逻辑、商业模式和投资人式表达连接起来。"),
            ("最终 Demo 与路演", "旅程最终走向 Hackathon、公开 Demo、技术问答和创始人式展示。"),
        ],
        "daily_label": "每日旅程",
        "schedule": ["上午", "下午", "晚间"],
        "detail_rows": ["学习重点", "学生产出", "创始人视角"],
        "topic_title": "详细内容选题池",
        "topic_intro": "以下为项目可能展开的可选内容。实际课程会根据学生基础、设备条件、导师重点和项目方向选择其中一部分深入讲解。",
        "topic_columns": ["时段", "模块", "可能内容"],
        "final_title": "学生收获与后续路径",
        "final_intro": "项目结束时，学生应当带走可展示的实际作品、更强的技术信心，以及对 AI 机器人、研究、创业和真实世界影响力之间关系的更清晰理解。",
        "outcomes": [
            "一个完成的 AI 机器人项目",
            "最终 Demo 展示",
            "创始人式路演体验",
            "项目结业证书",
            "可用于作品集的项目材料",
            "真实工程工作流体验",
            "继续进入 Agentech AI Club / 实习 / 研究路径的机会",
        ],
        "footer": "供学生、家长、导师和合作伙伴使用的项目内部手册。",
        "page": "页码",
    },
}


def prepare_assets() -> None:
    TMP_DIR.mkdir(parents=True, exist_ok=True)
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    img = Image.open(FF_MARK_SOURCE).convert("RGBA")
    px = img.load()
    for y in range(img.height):
        for x in range(img.width):
            r, g, b, a = px[x, y]
            if r > 245 and g > 245 and b > 245:
                px[x, y] = (255, 255, 255, 0)
    img.save(FF_MARK_CLEAN)
    for source, target in zip(DAY_MEDIA, MEDIA_CROPS):
        crop_to_ratio(source, target, (1260, 360))


def crop_to_ratio(source: Path, target: Path, size: tuple[int, int]) -> None:
    image = Image.open(source).convert("RGB")
    target_w, target_h = size
    scale = max(target_w / image.width, target_h / image.height)
    resized = image.resize((int(image.width * scale), int(image.height * scale)), Image.Resampling.LANCZOS)
    left = max(0, (resized.width - target_w) // 2)
    top = max(0, (resized.height - target_h) // 2)
    cropped = resized.crop((left, top, left + target_w, top + target_h))
    cropped.save(target, quality=92, optimize=True)


def register_fonts() -> None:
    if FONT_ARIAL_UNICODE.exists():
        pdfmetrics.registerFont(TTFont("ArialUnicode", str(FONT_ARIAL_UNICODE)))


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(text.replace("\n", "<br/>"), style)


def bullet_list(items: list[str], style: ParagraphStyle) -> Paragraph:
    return Paragraph("<br/>".join(f"- {item}" for item in items), style)


def build_styles(lang: str) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    body_font = "Helvetica" if lang == "en" else "ArialUnicode"
    bold_font = "Helvetica-Bold" if lang == "en" else "ArialUnicode"
    return {
        "cover_label": ParagraphStyle(
            "cover_label",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=9,
            leading=12,
            textColor=ACCENT,
            alignment=TA_LEFT,
            spaceAfter=18,
            uppercase=True,
        ),
        "cover_title": ParagraphStyle(
            "cover_title",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=42 if lang == "en" else 34,
            leading=45 if lang == "en" else 41,
            textColor=INK,
            alignment=TA_LEFT,
            spaceAfter=22,
        ),
        "cover_subtitle": ParagraphStyle(
            "cover_subtitle",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=14,
            leading=22,
            textColor=MUTED,
            alignment=TA_LEFT,
            spaceAfter=18,
        ),
        "h1": ParagraphStyle(
            "h1",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=27 if lang == "en" else 24,
            leading=32 if lang == "en" else 31,
            textColor=INK,
            spaceAfter=10,
        ),
        "h2": ParagraphStyle(
            "h2",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=18 if lang == "en" else 17,
            leading=23,
            textColor=INK,
            spaceAfter=8,
        ),
        "eyebrow": ParagraphStyle(
            "eyebrow",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=8,
            leading=10,
            textColor=ROSE,
            spaceAfter=8,
        ),
        "body": ParagraphStyle(
            "body",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=10.2 if lang == "en" else 10.5,
            leading=15.2 if lang == "en" else 17,
            textColor=MUTED,
            spaceAfter=8,
        ),
        "small": ParagraphStyle(
            "small",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=8.5 if lang == "en" else 8.8,
            leading=12.6 if lang == "en" else 14,
            textColor=MUTED,
        ),
        "table_head": ParagraphStyle(
            "table_head",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=8.4,
            leading=10,
            textColor=INK,
            alignment=TA_CENTER,
        ),
        "table_body": ParagraphStyle(
            "table_body",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=8.6 if lang == "en" else 8.7,
            leading=12.4 if lang == "en" else 13.5,
            textColor=MUTED,
        ),
        "topic_head": ParagraphStyle(
            "topic_head",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=7.7 if lang == "en" else 7.8,
            leading=9.2 if lang == "en" else 10.6,
            textColor=INK,
            alignment=TA_CENTER,
        ),
        "topic_label": ParagraphStyle(
            "topic_label",
            parent=base["Normal"],
            fontName=bold_font,
            fontSize=7.6 if lang == "en" else 7.8,
            leading=9.2 if lang == "en" else 10.6,
            textColor=ACCENT,
        ),
        "topic_body": ParagraphStyle(
            "topic_body",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=7.35 if lang == "en" else 7.55,
            leading=9.25 if lang == "en" else 10.6,
            textColor=MUTED,
        ),
        "footer": ParagraphStyle(
            "footer",
            parent=base["Normal"],
            fontName=body_font,
            fontSize=7.5,
            leading=9,
            textColor=colors.HexColor("#8b877d"),
        ),
    }


def draw_header_footer(canvas, doc, lang: str, text: dict) -> None:
    width, height = letter
    footer_font = "Helvetica" if lang == "en" else "ArialUnicode"
    footer_bold_font = "Helvetica-Bold" if lang == "en" else "ArialUnicode"
    canvas.saveState()
    canvas.setFillColor(BG)
    canvas.rect(0, 0, width, height, stroke=0, fill=1)
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(0.5)
    canvas.line(48, height - 58, width - 48, height - 58)
    canvas.drawImage(str(AGENTECH_WORDMARK), 48, height - 40, width=82, height=8.3, mask="auto")
    canvas.setStrokeColor(colors.HexColor("#cecacd"))
    canvas.line(144, height - 44, 144, height - 28)
    canvas.drawImage(str(FF_MARK_CLEAN), 158, height - 46, width=18, height=13.3, mask="auto")
    canvas.setFont(footer_bold_font, 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(width - 48, height - 36, text["guide_label"].upper() if lang == "en" else text["guide_label"])
    canvas.setStrokeColor(LINE)
    canvas.line(48, 54, width - 48, 54)
    canvas.setFont(footer_font, 7.5)
    canvas.setFillColor(colors.HexColor("#9893a5"))
    canvas.drawString(48, 35, text["brand_line"])
    canvas.drawRightString(width - 48, 35, f'{text["page"]} {doc.page:02d}')
    canvas.restoreState()


def make_table(rows, col_widths, style_commands):
    table = Table(rows, colWidths=col_widths, hAlign="LEFT")
    table.setStyle(TableStyle(style_commands))
    return table


def overview_page(story, styles, text, lang: str) -> None:
    story.append(p(text["guide_label"], styles["eyebrow"]))
    story.append(p(text["overview_title"], styles["h1"]))
    for paragraph in text["overview_body"]:
        story.append(p(paragraph, styles["body"]))
    story.append(Spacer(1, 14))
    rows = []
    for title, body in text["overview_cards"]:
        rows.append([p(title, styles["h2"]), p(body, styles["body"])])
    story.append(
        make_table(
            rows,
            [2.05 * inch, 4.55 * inch],
            [
                ("BACKGROUND", (0, 0), (-1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 14),
                ("RIGHTPADDING", (0, 0), (-1, -1), 14),
                ("TOPPADDING", (0, 0), (-1, -1), 13),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 13),
            ],
        )
    )


def day_page(story, styles, day, text, media_path: Path) -> None:
    story.append(p(text["daily_label"], styles["eyebrow"]))
    day_heading = f'{day["day"]}: {day["title"]}' if day["day"].startswith("Day") else f'{day["day"]} {day["title"]}'
    story.append(p(day_heading, styles["h1"]))
    story.append(p(day["tagline"], styles["h2"]))
    story.append(p(day["body"], styles["body"]))
    story.append(Spacer(1, 6))
    story.append(RLImage(str(media_path), width=6.35 * inch, height=1.82 * inch))
    story.append(Spacer(1, 10))

    schedule_rows = [[p(label, styles["table_head"]) for label in text["schedule"]]]
    schedule_rows.append(
        [
            bullet_list(day["morning"], styles["table_body"]),
            bullet_list(day["afternoon"], styles["table_body"]),
            bullet_list(day["evening"], styles["table_body"]),
        ]
    )
    story.append(
        make_table(
            schedule_rows,
            [2.06 * inch, 2.06 * inch, 2.06 * inch],
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f2e9e1")),
                ("BACKGROUND", (0, 1), (-1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 10),
                ("RIGHTPADDING", (0, 0), (-1, -1), 10),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ],
        )
    )
    story.append(Spacer(1, 14))

    labels = text["detail_rows"]
    detail_rows = [
        [p(labels[0], styles["table_head"]), p(day["focus"], styles["table_body"])],
        [p(labels[1], styles["table_head"]), p(day["output"], styles["table_body"])],
        [p(labels[2], styles["table_head"]), p(day["founder"], styles["table_body"])],
    ]
    story.append(
        make_table(
            detail_rows,
            [1.45 * inch, 4.73 * inch],
            [
                ("BACKGROUND", (0, 0), (0, -1), colors.HexColor("#f2e9e1")),
                ("BACKGROUND", (1, 0), (1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.4, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ],
        )
    )


def topic_page(story, styles, day, text, lang: str) -> None:
    details = EN_TOPIC_DETAILS if lang == "en" else ZH_TOPIC_DETAILS
    day_heading = f'{day["day"]}: {day["title"]}' if day["day"].startswith("Day") else f'{day["day"]} {day["title"]}'

    entries = []
    session_rows = [
        (text["schedule"][0], day["morning"]),
        (text["schedule"][1], day["afternoon"]),
        (text["schedule"][2], day["evening"]),
    ]
    for session_label, modules in session_rows:
        for module in modules:
            topics = details.get(module, fallback_topics(module, lang))
            entries.append((session_label, module, topics))

    chunk_size = 5 if len(entries) > 7 else len(entries)
    for chunk_index, start in enumerate(range(0, len(entries), chunk_size)):
        if chunk_index:
            story.append(PageBreak())
        title = text["topic_title"] if chunk_index == 0 else f'{text["topic_title"]} Continued'
        if lang == "zh" and chunk_index:
            title = f'{text["topic_title"]} 续'
        story.append(p(title, styles["eyebrow"]))
        story.append(p(day_heading, styles["h1"]))
        story.append(p(text["topic_intro"], styles["body"]))
        story.append(Spacer(1, 8))
        append_topic_table(story, styles, text, entries[start : start + chunk_size])


def append_topic_table(story, styles, text, entries) -> None:
    rows = [[p(label, styles["topic_head"]) for label in text["topic_columns"]]]
    for session_label, module, topics in entries:
        rows.append(
            [
                p(session_label, styles["topic_label"]),
                p(module, styles["topic_label"]),
                bullet_list(topics, styles["topic_body"]),
            ]
        )
    story.append(
        make_table(
            rows,
            [0.72 * inch, 1.66 * inch, 3.86 * inch],
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f2e9e1")),
                ("BACKGROUND", (0, 1), (-1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.55, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.32, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ],
        )
    )


def fallback_topics(module: str, lang: str) -> list[str]:
    if lang == "zh":
        return [
            f"{module} 的核心概念",
            f"{module} 的真实案例",
            f"{module} 的常见错误",
            f"{module} 的团队练习",
            f"{module} 与最终 Demo 的关系",
        ]
    return [
        f"Core concepts behind {module}",
        f"Real-world examples of {module}",
        f"Common failure modes in {module}",
        f"Team practice for {module}",
        f"How {module} supports the final demo",
    ]


def final_page(story, styles, text) -> None:
    story.append(p(text["guide_label"], styles["eyebrow"]))
    story.append(p(text["final_title"], styles["h1"]))
    story.append(p(text["final_intro"], styles["body"]))
    story.append(Spacer(1, 12))
    rows = []
    for idx, item in enumerate(text["outcomes"], start=1):
        rows.append([p(f"{idx:02d}", styles["table_head"]), p(item, styles["table_body"])])
    story.append(
        make_table(
            rows,
            [0.72 * inch, 5.52 * inch],
            [
                ("BACKGROUND", (0, 0), (0, -1), SILVER),
                ("BACKGROUND", (1, 0), (1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ],
        )
    )
    story.append(Spacer(1, 18))
    story.append(p(text["footer"], styles["body"]))


def build_pdf(lang: str) -> Path:
    text = TEXT[lang]
    days = EN_DAYS if lang == "en" else ZH_DAYS
    styles = build_styles(lang)
    output = OUT_DIR / text["file"]
    doc = BaseDocTemplate(
        str(output),
        pagesize=letter,
        leftMargin=48,
        rightMargin=48,
        topMargin=78,
        bottomMargin=72,
        title=text["doc_title"],
        author="Agentech",
        subject="EAI Robotics Future Founder Immersion Program",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates(
        [
            PageTemplate(
                id="guide",
                frames=[frame],
                onPage=lambda canvas, doc, lang=lang, text=text: draw_header_footer(canvas, doc, lang, text),
            )
        ]
    )

    story = []
    story.append(Spacer(1, 88))
    story.append(p(text["guide_label"], styles["cover_label"]))
    story.append(p(text["cover_title"], styles["cover_title"]))
    story.append(p(text["cover_subtitle"], styles["cover_subtitle"]))
    story.append(Spacer(1, 6))
    story.append(RLImage(str(MEDIA_CROPS[0]), width=6.35 * inch, height=1.82 * inch))
    story.append(Spacer(1, 18))
    chips = [["10 DAYS", "REAL ROBOTS", "REAL ENGINEERS", "FINAL DEMO + PITCH"]]
    if lang == "zh":
        chips = [["10 天", "真实机器人", "真实工程师", "最终 Demo 与路演"]]
    story.append(
        make_table(
            [[p(chip, styles["table_head"]) for chip in chips[0]]],
            [1.55 * inch, 1.55 * inch, 1.55 * inch, 1.72 * inch],
            [
                ("BACKGROUND", (0, 0), (-1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 11),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
            ],
        )
    )
    story.append(Spacer(1, 72))
    story.append(p(text["brand_line"], styles["small"]))
    story.append(PageBreak())

    overview_page(story, styles, text, lang)
    story.append(PageBreak())

    for index, day in enumerate(days):
        day_page(story, styles, day, text, MEDIA_CROPS[index])
        story.append(PageBreak())
        topic_page(story, styles, day, text, lang)
        story.append(PageBreak())

    final_page(story, styles, text)
    doc.build(story)
    return output


def main() -> None:
    prepare_assets()
    register_fonts()
    outputs = [build_pdf("en"), build_pdf("zh")]
    for output in outputs:
        print(output)


if __name__ == "__main__":
    main()

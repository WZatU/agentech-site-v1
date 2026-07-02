from __future__ import annotations

from html import escape
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

BG = colors.HexColor("#faf7f0")
CARD = colors.HexColor("#ffffff")
INK = colors.HexColor("#18181b")
MUTED = colors.HexColor("#565f6b")
LINE = colors.HexColor("#ddd7ce")
ACCENT = colors.HexColor("#1a73e8")
ORANGE = colors.HexColor("#ff6036")
SOFT = colors.HexColor("#f2eee7")
DARK = colors.HexColor("#0f172a")

DAY_MEDIA = [
    ROOT / "public" / "assets" / "ff-robotics" / "day-1-ai-branded-lab-arrival.png",
    ROOT / "public" / "assets" / "ff-robotics" / "ff-official-x2-chip-jetson.jpg",
    ROOT / "public" / "assets" / "ff-robotics" / "ff-official-x2-head-closeup.jpg",
    ROOT / "public" / "assets" / "ff-robotics" / "day-5-ai-branded-founder-workshop.png",
    ROOT / "public" / "assets" / "ff-robotics" / "day-10-ai-branded-demo-day.png",
    ROOT / "public" / "assets" / "ff-robotics" / "day-6-ai-branded-engineering-sprint.png",
    ROOT / "public" / "assets" / "ff-robotics" / "ff-official-aegis-robot-dog.jpg",
    ROOT / "public" / "assets" / "ff-robotics" / "day-8-ai-branded-product-polish.png",
    ROOT / "public" / "assets" / "ff-robotics" / "day-9-ai-branded-hackathon.png",
    ROOT / "public" / "assets" / "ff-robotics" / "day-10-ai-branded-demo-day.png",
]

MEDIA_CROPS = [TMP_DIR / f"eai-two-session-day-{idx + 1:02d}.jpg" for idx in range(10)]


EN_DAYS = [
    {
        "session": "Session 1",
        "theme": "Robotics Venture Lab",
        "day": "Day 1",
        "title": "Discover a Robotics Venture",
        "tagline": "Start with a real problem.",
        "body": "Students enter a real robotics company environment, form teams, and choose a problem that can become a robotics startup concept within five focused days.",
        "schedule": [
            ("Morning", ["Session kickoff", "Robotics company orientation", "Problem discovery lab"]),
            ("Afternoon", ["Robot platform tour", "Team formation", "Venture challenge selection"]),
            ("Evening", ["Founder fireside", "Reflection notes", "Team question list"]),
        ],
        "focus": ["Company context", "Problem discovery", "Team formation", "Startup challenge selection"],
        "output": ["Team charter", "Selected venture challenge", "First problem statement"],
        "founder": "A founder begins by noticing real systems, real constraints, and real people.",
        "topics": ["Robotics company workflow", "Customer pain points", "Mission framing", "Team roles", "Early venture risk"],
    },
    {
        "session": "Session 1",
        "theme": "Robotics Venture Lab",
        "day": "Day 2",
        "title": "Prototype the First Capability",
        "tagline": "A venture needs proof that something works.",
        "body": "Teams learn embodied AI foundations and connect them to a first technical capability that can be tested and explained.",
        "schedule": [
            ("Morning", ["Embodied AI fundamentals", "Robot architecture", "Capability map"]),
            ("Afternoon", ["Programming workshop", "Simulation sprint", "Prototype review"]),
            ("Evening", ["Daily demo", "Mentor feedback", "Iteration notes"]),
        ],
        "focus": ["Perception-action loop", "System architecture", "Prototype scoping", "Technical proof"],
        "output": ["Capability map", "Simulation result", "Prototype review notes"],
        "founder": "Technical clarity becomes strategic clarity when a team can show what works.",
        "topics": ["Embodied AI loop", "Simulation setup", "API workflow", "Debugging routine", "Prototype acceptance criteria"],
    },
    {
        "session": "Session 1",
        "theme": "Robotics Venture Lab",
        "day": "Day 3",
        "title": "Turn Tech into Product",
        "tagline": "Technology becomes valuable when a user needs it.",
        "body": "Students connect the prototype to a customer problem, a user story, and a simple business model.",
        "schedule": [
            ("Morning", ["User problem framing", "Market discovery", "Product promise"]),
            ("Afternoon", ["Engineer-led skill workshop", "Prototype refinement", "Business model sketch"]),
            ("Evening", ["Guest talk", "Real-world robotics", "Team revisions"]),
        ],
        "focus": ["User need", "Market context", "Product promise", "Business model basics"],
        "output": ["User story", "Revised prototype", "Business model sketch"],
        "founder": "A strong founder does not start with a feature. A strong founder starts with a painful problem.",
        "topics": ["User jobs", "Alternative solutions", "Pricing logic", "Skill graph basics", "Product proof"],
    },
    {
        "session": "Session 1",
        "theme": "Robotics Venture Lab",
        "day": "Day 4",
        "title": "Hackathon Kickoff: Build Sprint",
        "tagline": "The first demo takes shape under constraints.",
        "body": "The Session 1 hackathon begins with a shorter sprint. Teams lock scope, stabilize their prototype, and prepare the venture story.",
        "schedule": [
            ("Morning", ["Scope lock", "Hardware and safety review", "Demo success criteria"]),
            ("Afternoon", ["Mini hackathon kickoff", "Build, test, debug", "Mentor check-ins"]),
            ("Evening", ["Pitch outline", "Risk review", "Demo run sheet"]),
        ],
        "focus": ["Scope control", "Build sprint", "Demo reliability", "Pitch structure"],
        "output": ["Locked scope", "Stabilized prototype", "Pitch outline"],
        "founder": "Pressure reveals priorities. Teams learn what to cut, protect, and explain.",
        "topics": ["Hackathon rules", "Safety review", "Fallback plan", "Mentor critique", "Demo evidence"],
    },
    {
        "session": "Session 1",
        "theme": "Robotics Venture Lab",
        "day": "Day 5",
        "title": "Session 1 Demo Day",
        "tagline": "Pitch the venture, defend the build.",
        "body": "Session 1 closes with a compact hackathon showcase and founder-style pitch.",
        "schedule": [
            ("Morning", ["Final build lock", "Demo rehearsal", "Technical Q&A prep"]),
            ("Afternoon", ["Mini hackathon showcase", "Founder-style pitch", "Awards and reflection"]),
            ("Evening", ["Continuation pathways", "Certificate moment", "Family networking"]),
        ],
        "focus": ["Demo clarity", "Technical questions", "Founder story", "Next pathway"],
        "output": ["Demo", "Founder pitch", "Portfolio-ready project story"],
        "founder": "A demo is a promise about what the product can become next.",
        "topics": ["Live demo flow", "Technical Q&A", "Market story", "Judging categories", "Portfolio language"],
    },
    {
        "session": "Session 2",
        "theme": "AI Robotics Product Lab",
        "day": "Day 1",
        "title": "Map the Autonomy Opportunity",
        "tagline": "A second session starts fresh, with a different lens.",
        "body": "Session 2 is standalone for new students and non-repetitive for returning students. Teams focus on AI robotics product opportunities and autonomy loops.",
        "schedule": [
            ("Morning", ["Session kickoff", "Autonomy use-case lab", "AI product briefing"]),
            ("Afternoon", ["Workflow mapping", "Team formation", "Product challenge selection"]),
            ("Evening", ["Expert fireside", "Opportunity notes", "Team planning"]),
        ],
        "focus": ["Autonomy opportunity", "Workflow value", "Product challenge", "Team scope"],
        "output": ["Workflow map", "Selected product challenge", "Autonomy opportunity brief"],
        "founder": "A product opportunity appears where workflow pain meets technical leverage.",
        "topics": ["Autonomy use cases", "Workflow mapping", "Human-robot handoff", "Reliability needs", "Product success metric"],
    },
    {
        "session": "Session 2",
        "theme": "AI Robotics Product Lab",
        "day": "Day 2",
        "title": "Build the AI Product Loop",
        "tagline": "Autonomy is a loop, not a single trick.",
        "body": "Students build around perception, decision, action, and feedback with an emphasis on measurable improvement.",
        "schedule": [
            ("Morning", ["Perception and planning", "Data and evaluation", "Autonomy loop design"]),
            ("Afternoon", ["System integration sprint", "Scenario testing", "Technical review"]),
            ("Evening", ["Daily demo", "Iteration notes", "Risk list"]),
        ],
        "focus": ["Perception", "Planning", "Evaluation", "Integration"],
        "output": ["Autonomy loop diagram", "Scenario test", "Technical review notes"],
        "founder": "Reliable products are built from loops that can be measured and improved.",
        "topics": ["Data collection", "Evaluation criteria", "Scenario testing", "System integration", "Failure logging"],
    },
    {
        "session": "Session 2",
        "theme": "AI Robotics Product Lab",
        "day": "Day 3",
        "title": "Test, Iterate, and Position",
        "tagline": "A product improves when its failures are visible.",
        "body": "Teams stress-test their product idea and improve it through feedback, metrics, and launch positioning.",
        "schedule": [
            ("Morning", ["Reliability testing", "Failure mode review", "Product metrics"]),
            ("Afternoon", ["Iteration sprint", "User scenario validation", "Launch storyline"]),
            ("Evening", ["Pitch coaching", "Product positioning", "Team revisions"]),
        ],
        "focus": ["Reliability", "Failure modes", "Product metrics", "Positioning"],
        "output": ["Test matrix", "Iteration notes", "Launch storyline"],
        "founder": "The best product teams make failure visible early enough to learn from it.",
        "topics": ["Reliability testing", "Root cause review", "Metric design", "Product positioning", "Launch narrative"],
    },
    {
        "session": "Session 2",
        "theme": "AI Robotics Product Lab",
        "day": "Day 4",
        "title": "Launch Sprint Kickoff",
        "tagline": "Build fast, then make the product understandable.",
        "body": "The Session 2 hackathon begins on Day 4 with a product launch sprint and deliberate tradeoffs before demo day.",
        "schedule": [
            ("Morning", ["Launch scope lock", "Roadmap and risk review", "Judging criteria"]),
            ("Afternoon", ["Mini hackathon kickoff", "Product build sprint", "Mentor check-ins"]),
            ("Evening", ["Demo rehearsal", "Final tests", "Evidence package"]),
        ],
        "focus": ["Launch scope", "Product sprint", "Evidence", "Demo rehearsal"],
        "output": ["Launch scope", "Product demo draft", "Evidence package"],
        "founder": "A launch story must make technical progress understandable to people outside the build team.",
        "topics": ["Scope lock", "Product roadmap", "Evidence package", "Mentor check-ins", "Rehearsal flow"],
    },
    {
        "session": "Session 2",
        "theme": "AI Robotics Product Lab",
        "day": "Day 5",
        "title": "Session 2 Demo Day",
        "tagline": "Launch the product vision.",
        "body": "Session 2 closes with a demo-day moment focused on product autonomy, workflow value, and launch storytelling.",
        "schedule": [
            ("Morning", ["Final demo", "Product presentation", "Technical Q&A"]),
            ("Afternoon", ["Investor-style pitch", "Awards", "Closing ceremony"]),
            ("Evening", ["Networking", "Certificate", "Alumni invitation"]),
        ],
        "focus": ["Product autonomy", "Workflow value", "Launch story", "Future pathway"],
        "output": ["Final demo", "Investor-style pitch", "Second portfolio story"],
        "founder": "Students who attend both sessions leave with two distinct project arcs.",
        "topics": ["Final demo", "Autonomy proof", "Product value", "Investor-style pitch", "Next pathway"],
    },
]


ZH_DAYS = [
    {
        "session": "第一期",
        "theme": "机器人创业实验室",
        "day": "第 1 天",
        "title": "发现机器人创业机会",
        "tagline": "从真实问题开始",
        "body": "学生进入真实机器人公司环境，组建团队，并选择一个可以在 5 天内转化为创业概念的问题。",
        "schedule": [
            ("上午", ["第一期开营", "机器人公司环境导览", "问题发现工作坊"]),
            ("下午", ["机器人平台体验", "团队组建", "创业挑战选择"]),
            ("晚间", ["创始人炉边对谈", "反思记录", "团队问题清单"]),
        ],
        "focus": ["公司语境", "问题发现", "团队组建", "创业挑战选择"],
        "output": ["团队协议", "选定创业挑战", "第一版问题陈述"],
        "founder": "创始人的第一步，是观察真实系统、真实限制和真实的人。",
        "topics": ["机器人公司工作流", "客户痛点", "任务定义", "团队角色", "早期创业风险"],
    },
    {
        "session": "第一期",
        "theme": "机器人创业实验室",
        "day": "第 2 天",
        "title": "做出第一个能力原型",
        "tagline": "创业项目需要证明有东西能跑起来",
        "body": "团队学习具身智能基础，并把它连接到一个可测试、可解释的早期技术能力。",
        "schedule": [
            ("上午", ["具身智能基础", "机器人系统架构", "能力地图"]),
            ("下午", ["编程工作坊", "仿真冲刺", "原型评审"]),
            ("晚间", ["每日 Demo", "导师反馈", "迭代记录"]),
        ],
        "focus": ["感知行动闭环", "系统架构", "原型范围", "技术证明"],
        "output": ["能力地图", "仿真结果", "原型评审记录"],
        "founder": "当团队能证明什么有效，技术清晰度才会变成战略清晰度。",
        "topics": ["具身智能闭环", "仿真设置", "API 工作流", "调试习惯", "原型验收标准"],
    },
    {
        "session": "第一期",
        "theme": "机器人创业实验室",
        "day": "第 3 天",
        "title": "把技术转成产品",
        "tagline": "当用户需要它 技术才变得有价值",
        "body": "学生把原型连接到客户问题、用户故事和简单商业模式。",
        "schedule": [
            ("上午", ["用户问题定义", "市场发现", "产品承诺"]),
            ("下午", ["工程师带领的技能工作坊", "原型改进", "商业模式草图"]),
            ("晚间", ["嘉宾分享", "真实世界中的机器人", "团队修订"]),
        ],
        "focus": ["用户需求", "市场场景", "产品承诺", "商业模式基础"],
        "output": ["用户故事", "修订原型", "商业模式草图"],
        "founder": "强创始人不是从功能开始，而是从足够痛的问题开始。",
        "topics": ["用户任务", "替代方案", "定价逻辑", "技能图基础", "产品证据"],
    },
    {
        "session": "第一期",
        "theme": "机器人创业实验室",
        "day": "第 4 天",
        "title": "Hackathon 启动：构建冲刺",
        "tagline": "第一个 Demo 在限制中成型",
        "body": "第一期 Hackathon 从更短的冲刺开始。团队锁定范围、稳定原型，并准备创业叙事。",
        "schedule": [
            ("上午", ["范围锁定", "硬件与安全评审", "Demo 成功标准"]),
            ("下午", ["小型 Hackathon 启动", "构建、测试、调试", "导师检查"]),
            ("晚间", ["路演提纲", "风险评审", "Demo 流程单"]),
        ],
        "focus": ["范围控制", "构建冲刺", "Demo 可靠性", "路演结构"],
        "output": ["锁定范围", "稳定原型", "路演提纲"],
        "founder": "压力会显露优先级。团队会学习什么该砍掉、什么必须守住、什么必须讲清楚。",
        "topics": ["Hackathon 规则", "安全评审", "备用方案", "导师反馈", "Demo 证据"],
    },
    {
        "session": "第一期",
        "theme": "机器人创业实验室",
        "day": "第 5 天",
        "title": "第一期 Demo Day",
        "tagline": "路演创业想法 回答技术问题",
        "body": "第一期以紧凑的 Hackathon 展示和创始人式路演结束。",
        "schedule": [
            ("上午", ["最终构建锁定", "Demo 彩排", "技术问答准备"]),
            ("下午", ["小型 Hackathon 展示", "创始人式路演", "奖项与复盘"]),
            ("晚间", ["后续路径说明", "结业时刻", "家庭交流"]),
        ],
        "focus": ["Demo 清晰度", "技术问答", "创始人故事", "后续路径"],
        "output": ["Demo", "创始人路演", "作品集项目故事"],
        "founder": "好的 Demo 是关于产品下一步可能性的清晰承诺。",
        "topics": ["现场 Demo 流程", "技术问答", "市场故事", "评审维度", "作品集表达"],
    },
    {
        "session": "第二期",
        "theme": "AI 机器人产品实验室",
        "day": "第 1 天",
        "title": "定位自主能力产品机会",
        "tagline": "第二期从新的视角重新开始",
        "body": "第二期对新学生独立完整，对两期联报学生不重复第一期。团队聚焦 AI 机器人产品机会和自主能力闭环。",
        "schedule": [
            ("上午", ["第二期开营", "自主能力应用场景工作坊", "AI 产品简报"]),
            ("下午", ["工作流地图", "团队组建", "产品挑战选择"]),
            ("晚间", ["专家炉边对谈", "机会记录", "团队计划"]),
        ],
        "focus": ["自主能力机会", "工作流价值", "产品挑战", "团队范围"],
        "output": ["工作流地图", "选定产品挑战", "自主能力机会简报"],
        "founder": "当工作流痛点遇到技术杠杆，产品机会就会出现。",
        "topics": ["自主能力应用场景", "工作流地图", "人机交接", "可靠性需求", "产品成功指标"],
    },
    {
        "session": "第二期",
        "theme": "AI 机器人产品实验室",
        "day": "第 2 天",
        "title": "构建 AI 产品闭环",
        "tagline": "自主能力不是单点技巧 而是一套闭环",
        "body": "学生围绕感知、决策、行动和反馈构建系统，并强调可衡量的改进。",
        "schedule": [
            ("上午", ["感知与规划", "数据与评估", "自主能力闭环设计"]),
            ("下午", ["系统集成冲刺", "场景测试", "技术评审"]),
            ("晚间", ["每日 Demo", "迭代记录", "风险清单"]),
        ],
        "focus": ["感知", "规划", "评估", "集成"],
        "output": ["自主能力闭环图", "场景测试", "技术评审记录"],
        "founder": "可靠产品来自可以被测量、被改进的闭环。",
        "topics": ["数据采集", "评估标准", "场景测试", "系统集成", "失败日志"],
    },
    {
        "session": "第二期",
        "theme": "AI 机器人产品实验室",
        "day": "第 3 天",
        "title": "测试 迭代 定位",
        "tagline": "失败被看见 产品才会变好",
        "body": "团队通过反馈、指标和发布定位，对产品想法进行压力测试和改进。",
        "schedule": [
            ("上午", ["可靠性测试", "失败模式评审", "产品指标"]),
            ("下午", ["迭代冲刺", "用户场景验证", "发布故事线"]),
            ("晚间", ["路演辅导", "产品定位", "团队修订"]),
        ],
        "focus": ["可靠性", "失败模式", "产品指标", "定位"],
        "output": ["测试矩阵", "迭代记录", "发布故事线"],
        "founder": "优秀产品团队会尽早让失败变得可见，并从中学习。",
        "topics": ["可靠性测试", "根因复盘", "指标设计", "产品定位", "发布叙事"],
    },
    {
        "session": "第二期",
        "theme": "AI 机器人产品实验室",
        "day": "第 4 天",
        "title": "发布冲刺启动",
        "tagline": "快速构建 然后让产品被理解",
        "body": "第二期 Hackathon 在第 4 天进入产品发布冲刺，并在 Demo Day 前做出清晰取舍。",
        "schedule": [
            ("上午", ["发布范围锁定", "路线图与风险评审", "评审标准"]),
            ("下午", ["小型 Hackathon 启动", "产品构建冲刺", "导师检查"]),
            ("晚间", ["Demo 彩排", "最终测试", "证据包"]),
        ],
        "focus": ["发布范围", "产品冲刺", "证据", "Demo 彩排"],
        "output": ["发布范围", "产品 Demo 草稿", "证据包"],
        "founder": "发布故事必须让团队外的人也能理解技术进展。",
        "topics": ["范围锁定", "产品路线图", "证据包", "导师检查", "彩排流程"],
    },
    {
        "session": "第二期",
        "theme": "AI 机器人产品实验室",
        "day": "第 5 天",
        "title": "第二期 Demo Day",
        "tagline": "发布产品愿景",
        "body": "第二期以面向产品自主能力、工作流价值和发布叙事的 Demo Day 收束。",
        "schedule": [
            ("上午", ["最终 Demo", "产品展示", "技术问答"]),
            ("下午", ["投资人式路演", "奖项公布", "闭营仪式"]),
            ("晚间", ["交流环节", "结业证书", "校友邀请"]),
        ],
        "focus": ["产品自主能力", "工作流价值", "发布故事", "未来路径"],
        "output": ["最终 Demo", "投资人式路演", "第二个作品集故事"],
        "founder": "参加两期的学生会带走两条不同的项目成长线。",
        "topics": ["最终 Demo", "自主能力证明", "产品价值", "投资人式路演", "下一步路径"],
    },
]


TEXT = {
    "en": {
        "file": "agentech-ff-eai-robotics-future-founder-program-guide-en.pdf",
        "doc_title": "EAI Robotics Future Founder Immersion Program",
        "guide_label": "PROGRAM GUIDE",
        "brand_line": "AGENTECH  |  FF",
        "cover_title": "EAI Robotics\nFuture Founder\nImmersion Program",
        "cover_subtitle": "Two standalone 5-day sessions where students build AI robotics ventures and products inside a real robotics company.",
        "chips": ["Session 1: Early July 2026", "Session 2: Late July 2026", "$1,399 each / $2,500 both"],
        "overview_title": "Program Overview",
        "overview_body": [
            "The program is structured as two independent 5-day sessions. Students may choose Session 1, Session 2, or both.",
            "Session 1 focuses on robotics venture building. Session 2 focuses on AI robotics product and autonomy. Both-session students experience non-repeating content and two project outcomes.",
        ],
        "cards": [
            ("Standalone Sessions", "Each session has its own opening, build arc, mini hackathon, demo, and founder-style pitch."),
            ("Non-Repeating Content", "The two sessions use different product lenses so returning students keep building forward."),
            ("Interest Options", "Families can submit interest for Session 1 only, Session 2 only, or both sessions."),
        ],
        "session_title": "Session Options and Pricing",
        "session_columns": ["Option", "Window", "Fee", "Focus"],
        "session_rows": [
            ("Session 1 only", "Early July 2026", "$1,399", "Robotics venture building and first founder pitch."),
            ("Session 2 only", "Late July 2026", "$1,399", "AI robotics product, autonomy loop, and launch pitch."),
            ("Both sessions", "Early + Late July 2026", "$2,500", "Two distinct project arcs and two demo-day moments."),
        ],
        "application_title": "Application and Interest Flow",
        "application_body": "The website collects structured interest only. It does not create an invoice or payment request at this stage. Agentech will follow up with final dates, availability, and next steps.",
        "mentor_title": "Mentors, Hackathons, and Outcomes",
        "mentor_body": "Students learn with engineers, founders, robotics specialists, and selected guest mentors. Each session ends with a shorter hackathon and a demo-day pitch.",
        "outcomes": ["AI robotics project per session attended", "Mini hackathon and demo-day presentation", "Founder-style pitch experience", "Certificate and portfolio-ready project story", "Pathway into Agentech AI Club, internship, or research"],
        "daily_label": "Daily Journey",
        "topic_label": "Topic Deep Dive",
        "schedule_label": "Schedule",
        "focus_label": "Learning Focus",
        "output_label": "Student Output",
        "founder_label": "Founder Lens",
        "topic_columns": ["Focus", "Topics"],
        "page": "Page",
    },
    "zh": {
        "file": "agentech-ff-eai-robotics-future-founder-program-guide-zh.pdf",
        "doc_title": "具身智能机器人未来创始人沉浸项目",
        "guide_label": "项目手册",
        "brand_line": "智能体科技有限公司  |  法拉第未来",
        "cover_title": "具身智能机器人\n未来创始人\n沉浸项目",
        "cover_subtitle": "两期独立的 5 天体验，学生在真实机器人公司环境中构建 AI 机器人创业项目与产品原型。",
        "chips": ["第一期：2026 年 7 月上旬", "第二期：2026 年 7 月下旬", "$1,399 每期 / $2,500 两期"],
        "overview_title": "项目概览",
        "overview_body": [
            "项目调整为两期独立的 5 天体验。学生可以只参加第一期、只参加第二期，或两期联报。",
            "第一期聚焦机器人创业构建，第二期聚焦 AI 机器人产品与自主能力。两期联报学生会经历不重复内容，并完成两条项目成果线。",
        ],
        "cards": [
            ("独立完整的两期", "每一期都有开营、构建主线、小型 Hackathon、Demo 和创始人式路演。"),
            ("内容不重复", "两期采用不同产品视角，让两期联报学生持续向前构建。"),
            ("三种兴趣选择", "家庭可以提交仅第一期、仅第二期或两期联报的兴趣申请。"),
        ],
        "session_title": "期数选择与价格",
        "session_columns": ["选择", "时间", "费用", "重点"],
        "session_rows": [
            ("仅第一期", "2026 年 7 月上旬", "$1,399", "机器人创业构建与第一次创始人式路演。"),
            ("仅第二期", "2026 年 7 月下旬", "$1,399", "AI 机器人产品、自主能力闭环与发布路演。"),
            ("两期联报", "2026 年 7 月上旬 + 下旬", "$2,500", "两条不同项目线与两次 Demo Day 时刻。"),
        ],
        "application_title": "申请与兴趣登记流程",
        "application_body": "网站当前只收集结构化兴趣，不会创建账单或付款请求。Agentech 团队会后续跟进最终日期、名额与下一步安排。",
        "mentor_title": "导师 Hackathon 与学生收获",
        "mentor_body": "学生将与工程师、创始人、机器人专家及精选嘉宾导师学习。每一期都以更短的小型 Hackathon 与 Demo Day 路演结束。",
        "outcomes": ["每期完成一个 AI 机器人项目", "小型 Hackathon 与 Demo Day 展示", "创始人式路演体验", "结业证书与作品集项目故事", "进入 Agentech AI Club、实习或研究路径的机会"],
        "daily_label": "每日旅程",
        "topic_label": "主题深入",
        "schedule_label": "日程",
        "focus_label": "学习重点",
        "output_label": "学生产出",
        "founder_label": "创始人视角",
        "topic_columns": ["重点", "主题"],
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
        crop_to_ratio(source, target, (1260, 380))


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


def build_styles(lang: str) -> dict[str, ParagraphStyle]:
    base = getSampleStyleSheet()
    body_font = "Helvetica" if lang == "en" else "ArialUnicode"
    bold_font = "Helvetica-Bold" if lang == "en" else "ArialUnicode"
    return {
        "cover_label": ParagraphStyle("cover_label", parent=base["Normal"], fontName=bold_font, fontSize=9, leading=12, textColor=ACCENT, spaceAfter=18),
        "cover_title": ParagraphStyle("cover_title", parent=base["Normal"], fontName=bold_font, fontSize=41 if lang == "en" else 34, leading=45 if lang == "en" else 42, textColor=INK, spaceAfter=20),
        "cover_body": ParagraphStyle("cover_body", parent=base["Normal"], fontName=body_font, fontSize=14, leading=22, textColor=MUTED, spaceAfter=18),
        "eyebrow": ParagraphStyle("eyebrow", parent=base["Normal"], fontName=bold_font, fontSize=8.5, leading=11, textColor=ORANGE, spaceAfter=8),
        "h1": ParagraphStyle("h1", parent=base["Normal"], fontName=bold_font, fontSize=27 if lang == "en" else 23.5, leading=32 if lang == "en" else 31, textColor=INK, spaceAfter=10),
        "h2": ParagraphStyle("h2", parent=base["Normal"], fontName=bold_font, fontSize=16 if lang == "en" else 15, leading=21 if lang == "en" else 22, textColor=INK, spaceAfter=7),
        "body": ParagraphStyle("body", parent=base["Normal"], fontName=body_font, fontSize=10.2 if lang == "en" else 10.1, leading=15.4 if lang == "en" else 16.8, textColor=MUTED, spaceAfter=8),
        "small": ParagraphStyle("small", parent=base["Normal"], fontName=body_font, fontSize=8.2, leading=11.5, textColor=MUTED),
        "chip": ParagraphStyle("chip", parent=base["Normal"], fontName=bold_font, fontSize=8.2 if lang == "en" else 8.4, leading=10.2 if lang == "en" else 12, textColor=INK, alignment=TA_CENTER),
        "table_head": ParagraphStyle("table_head", parent=base["Normal"], fontName=bold_font, fontSize=8.4, leading=10.8, textColor=INK, alignment=TA_CENTER),
        "table_body": ParagraphStyle("table_body", parent=base["Normal"], fontName=body_font, fontSize=8.7 if lang == "en" else 8.5, leading=12.6 if lang == "en" else 13.6, textColor=MUTED),
        "table_label": ParagraphStyle("table_label", parent=base["Normal"], fontName=bold_font, fontSize=8.4 if lang == "en" else 8.5, leading=11.5 if lang == "en" else 13, textColor=ACCENT),
        "footer": ParagraphStyle("footer", parent=base["Normal"], fontName=body_font, fontSize=7.5, leading=9, textColor=colors.HexColor("#8b877d")),
    }


def p(text: str, style: ParagraphStyle) -> Paragraph:
    return Paragraph(escape(text).replace("\n", "<br/>"), style)


def bullet_list(items: list[str], style: ParagraphStyle) -> Paragraph:
    return Paragraph("<br/>".join(f"- {escape(item)}" for item in items), style)


def make_table(rows, col_widths, style_commands) -> Table:
    table = Table(rows, colWidths=col_widths, hAlign="LEFT")
    table.setStyle(TableStyle(style_commands))
    return table


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
    canvas.setFillColor(colors.HexColor("#8b877d"))
    canvas.drawString(48, 35, text["brand_line"])
    canvas.drawRightString(width - 48, 35, f'{text["page"]} {doc.page:02d}')
    canvas.restoreState()


def append_chip_row(story: list, styles: dict, labels: list[str]) -> None:
    story.append(
        make_table(
            [[p(label, styles["chip"]) for label in labels]],
            [2.04 * inch, 2.04 * inch, 2.04 * inch],
            [
                ("BACKGROUND", (0, 0), (-1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
            ],
        )
    )


def cover_page(story: list, styles: dict, text: dict) -> None:
    story.append(Spacer(1, 86))
    story.append(p(text["guide_label"], styles["cover_label"]))
    story.append(p(text["cover_title"], styles["cover_title"]))
    story.append(p(text["cover_subtitle"], styles["cover_body"]))
    story.append(RLImage(str(MEDIA_CROPS[0]), width=6.35 * inch, height=1.88 * inch))
    story.append(Spacer(1, 18))
    append_chip_row(story, styles, text["chips"])
    story.append(Spacer(1, 74))
    story.append(p(text["brand_line"], styles["small"]))


def overview_page(story: list, styles: dict, text: dict) -> None:
    story.append(p(text["guide_label"], styles["eyebrow"]))
    story.append(p(text["overview_title"], styles["h1"]))
    for paragraph in text["overview_body"]:
        story.append(p(paragraph, styles["body"]))
    story.append(Spacer(1, 12))
    rows = [[p(title, styles["h2"]), p(body, styles["body"])] for title, body in text["cards"]]
    story.append(
        make_table(
            rows,
            [2.05 * inch, 4.32 * inch],
            [
                ("BACKGROUND", (0, 0), (-1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 13),
                ("RIGHTPADDING", (0, 0), (-1, -1), 13),
                ("TOPPADDING", (0, 0), (-1, -1), 11),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
            ],
        )
    )


def session_options_page(story: list, styles: dict, text: dict) -> None:
    story.append(p(text["guide_label"], styles["eyebrow"]))
    story.append(p(text["session_title"], styles["h1"]))
    rows = [[p(label, styles["table_head"]) for label in text["session_columns"]]]
    rows.extend([[p(value, styles["table_body"]) for value in row] for row in text["session_rows"]])
    story.append(
        make_table(
            rows,
            [1.35 * inch, 1.55 * inch, 1.05 * inch, 2.38 * inch],
            [
                ("BACKGROUND", (0, 0), (-1, 0), SOFT),
                ("BACKGROUND", (0, 1), (-1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
            ],
        )
    )
    story.append(Spacer(1, 18))
    append_chip_row(story, styles, text["chips"])


def application_page(story: list, styles: dict, text: dict) -> None:
    story.append(p(text["guide_label"], styles["eyebrow"]))
    story.append(p(text["application_title"], styles["h1"]))
    story.append(p(text["application_body"], styles["body"]))
    story.append(Spacer(1, 12))
    rows = [
        [p("1", styles["table_head"]), p("Parent signs in and chooses an eligible student." if text["page"] == "Page" else "家长登录并选择符合条件的学生。", styles["table_body"])],
        [p("2", styles["table_head"]), p("Parent selects Session 1 only, Session 2 only, or both sessions." if text["page"] == "Page" else "家长选择仅第一期、仅第二期或两期联报。", styles["table_body"])],
        [p("3", styles["table_head"]), p("Agentech receives the interest record and follows up manually." if text["page"] == "Page" else "Agentech 收到兴趣记录后人工跟进。", styles["table_body"])],
        [p("4", styles["table_head"]), p("No payment or invoice is created during this interest step." if text["page"] == "Page" else "此兴趣登记步骤不会创建账单或付款请求。", styles["table_body"])],
    ]
    story.append(
        make_table(
            rows,
            [0.55 * inch, 5.82 * inch],
            [
                ("BACKGROUND", (0, 0), (0, -1), SOFT),
                ("BACKGROUND", (1, 0), (1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 11),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ],
        )
    )


def mentor_page(story: list, styles: dict, text: dict) -> None:
    story.append(p(text["guide_label"], styles["eyebrow"]))
    story.append(p(text["mentor_title"], styles["h1"]))
    story.append(p(text["mentor_body"], styles["body"]))
    story.append(Spacer(1, 12))
    rows = [[p(f"{idx:02d}", styles["table_head"]), p(item, styles["table_body"])] for idx, item in enumerate(text["outcomes"], start=1)]
    story.append(
        make_table(
            rows,
            [0.62 * inch, 5.75 * inch],
            [
                ("BACKGROUND", (0, 0), (0, -1), SOFT),
                ("BACKGROUND", (1, 0), (1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("TOPPADDING", (0, 0), (-1, -1), 9),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
            ],
        )
    )


def day_page(story: list, styles: dict, text: dict, day: dict, media_path: Path) -> None:
    story.append(p(text["daily_label"], styles["eyebrow"]))
    story.append(p(f'{day["session"]} / {day["day"]}: {day["title"]}', styles["h1"]))
    story.append(p(day["theme"], styles["h2"]))
    story.append(p(day["tagline"], styles["h2"]))
    story.append(p(day["body"], styles["body"]))
    story.append(RLImage(str(media_path), width=6.35 * inch, height=1.88 * inch))
    story.append(Spacer(1, 10))
    rows = [[p(label, styles["table_head"]) for label, _ in day["schedule"]]]
    rows.append([bullet_list(items, styles["table_body"]) for _, items in day["schedule"]])
    story.append(
        make_table(
            rows,
            [2.08 * inch, 2.08 * inch, 2.08 * inch],
            [
                ("BACKGROUND", (0, 0), (-1, 0), SOFT),
                ("BACKGROUND", (0, 1), (-1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 9),
                ("RIGHTPADDING", (0, 0), (-1, -1), 9),
                ("TOPPADDING", (0, 0), (-1, -1), 8),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ],
        )
    )


def topic_page(story: list, styles: dict, text: dict, day: dict) -> None:
    story.append(p(text["topic_label"], styles["eyebrow"]))
    story.append(p(f'{day["session"]} / {day["day"]}: {day["title"]}', styles["h1"]))
    rows = [
        [p(text["focus_label"], styles["table_label"]), bullet_list(day["focus"], styles["table_body"])],
        [p(text["output_label"], styles["table_label"]), bullet_list(day["output"], styles["table_body"])],
        [p(text["founder_label"], styles["table_label"]), p(day["founder"], styles["table_body"])],
        [p(text["topic_columns"][1], styles["table_label"]), bullet_list(day["topics"], styles["table_body"])],
    ]
    story.append(
        make_table(
            rows,
            [1.35 * inch, 4.95 * inch],
            [
                ("BACKGROUND", (0, 0), (0, -1), SOFT),
                ("BACKGROUND", (1, 0), (1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, LINE),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 12),
                ("RIGHTPADDING", (0, 0), (-1, -1), 12),
                ("TOPPADDING", (0, 0), (-1, -1), 12),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
            ],
        )
    )


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
    intro_pages = [
        lambda: cover_page(story, styles, text),
        lambda: overview_page(story, styles, text),
        lambda: session_options_page(story, styles, text),
        lambda: application_page(story, styles, text),
        lambda: mentor_page(story, styles, text),
    ]
    for builder in intro_pages:
        builder()
        story.append(PageBreak())

    for index, day in enumerate(days):
        day_page(story, styles, text, day, MEDIA_CROPS[index])
        story.append(PageBreak())
        topic_page(story, styles, text, day)
        if index != len(days) - 1:
            story.append(PageBreak())

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

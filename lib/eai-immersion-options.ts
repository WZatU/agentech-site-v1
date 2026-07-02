export const eaiProgramUrl =
  "https://www.agent-tech.ai/agentech-education/agentech-ff-eai-robotics-future-founder-immersion-program";

export const eaiPerSessionPrice = 1399;
export const eaiBothSessionsPrice = 2500;

export const eaiInterestOptions = [
  {
    id: "session-1",
    label: "Session 1 only",
    shortLabel: "Session 1",
    zhLabel: "仅第一期",
    dateLabel: "Early July 2026",
    zhDateLabel: "2026 年 7 月上旬",
    price: eaiPerSessionPrice,
    priceLabel: "$1,399",
    description: "Robotics venture building, real-world problem discovery, prototype sprint, and mini hackathon pitch.",
    zhDescription: "机器人创业构建、真实问题发现、原型冲刺，以及小型 Hackathon 路演。"
  },
  {
    id: "session-2",
    label: "Session 2 only",
    shortLabel: "Session 2",
    zhLabel: "仅第二期",
    dateLabel: "Late July 2026",
    zhDateLabel: "2026 年 7 月下旬",
    price: eaiPerSessionPrice,
    priceLabel: "$1,399",
    description: "AI robotics product and autonomy, system iteration, product launch sprint, and mini hackathon pitch.",
    zhDescription: "AI 机器人产品与自主能力、系统迭代、产品发布冲刺，以及小型 Hackathon 路演。"
  },
  {
    id: "both",
    label: "Both sessions",
    shortLabel: "Both sessions",
    zhLabel: "两期联报",
    dateLabel: "Early + Late July 2026",
    zhDateLabel: "2026 年 7 月上旬 + 下旬",
    price: eaiBothSessionsPrice,
    priceLabel: "$2,500",
    description: "A two-session founder pathway with distinct projects, non-repeating content, and two demo-day moments.",
    zhDescription: "两期创始人路径，项目内容不重复，并包含两次 Demo Day 成果展示。"
  }
] as const;

export type EaiInterestOptionId = (typeof eaiInterestOptions)[number]["id"];

export function getEaiInterestOption(optionId: string) {
  return eaiInterestOptions.find((option) => option.id === optionId);
}

export const eaiPriceSummary = "$1,399 per session / $2,500 for both sessions";
export const eaiZhPriceSummary = "$1,399 每期 / $2,500 两期联报";

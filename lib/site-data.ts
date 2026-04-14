export type NavItem = {
  label: string;
  href: string;
};

export const navigation: NavItem[] = [
  { label: "Hard Agents", href: "/hardware-agents" },
  { label: "Soft Agents", href: "/software-agents" },
  { label: "Edge Products", href: "/edge-product" },
  { label: "About Us", href: "/about" },
  { label: "Talents", href: "/talents" },
  { label: "Career", href: "/career" },
  { label: "Explore", href: "/explore" }
];

export const company = {
  name: "Agentech",
  tagline: "AI-native robotics and intelligent systems.",
  heroTitle: "Agentech",
  heroBody: "AI-native robotics and intelligent systems.",
  location: "California / Global Collaboration",
  contactEmail: "hello@agentech.ai",
  inquiryEmail: "partnerships@agentech.ai",
  socialLinks: [
    { label: "LinkedIn", href: "https://www.linkedin.com/company/agentech" },
    { label: "Facebook", href: "https://www.facebook.com/agentech" },
    { label: "TikTok", href: "https://www.tiktok.com/@agentech" }
  ]
};

export const homeTracks = [
  {
    title: "Hard Agents",
    description: "Physical systems designed for useful work in the real world.",
    href: "/hardware-agents"
  },
  {
    title: "Soft Agents",
    description: "Multi-agent software built for execution, memory, and operational leverage.",
    href: "/software-agents"
  },
  {
    title: "Edge Products",
    description: "Applied experiments exploring what should exist next.",
    href: "/edge-product"
  }
];

export const aboutIntro = {
  title: "Built with a clear technical point of view.",
  body: "Agentech focuses on AI-native systems across hardware, software, and applied experimentation."
};

export const leadership = [
  {
    name: "Bill",
    role: "Founder & CEO",
    bio: "Tech mindset, source thinking, and company leadership.",
    emphasis: "primary"
  },
  {
    name: "Gaoxin",
    role: "CTO",
    bio: "Hardware development, robotic design, and implementation.",
    emphasis: "primary"
  },
  {
    name: "David",
    role: "Core Tech Lead",
    bio: "Algorithm research and agentic architecture.",
    emphasis: "secondary"
  },
  {
    name: "Wesley",
    role: "Core Tech Lead",
    bio: "Software development.",
    emphasis: "secondary"
  }
];

export const supportTeam = [
  { name: "Lydia", role: "COO" },
  { name: "Connie", role: "CFO" },
  { name: "Mei", role: "Investor" }
];

export const exploreMetrics = [
  { label: "Active Projects", value: "06", delta: "Hardware, software, and edge tracks" },
  { label: "Live Workflows", value: "18", delta: "Internal agent loops in motion" },
  { label: "Partner Companies", value: "05", delta: "Early strategic relationships" },
  { label: "Refresh Rhythm", value: "15 min", delta: "Internal operational sync" }
];

export const exploreSignals = [
  "Selected business conversations",
  "Research-driven product iteration",
  "Operational visibility without excess noise"
];

export type ApplicationTrack = {
  id: string;
  title: string;
  summary: string;
  fields: string[];
  asset: string;
  questions: string[];
};

export const applicationIntro = {
  eyebrow: "Application System",
  title: "Applications.",
  body: "A simple structure for different kinds of inbound."
};

export const applicationTracks: ApplicationTrack[] = [
  {
    id: "internship",
    title: "Internship",
    summary: "Early builders.",
    fields: ["Name", "Email", "School / Major", "Location"],
    asset: "Resume / Work Sample",
    questions: [
      "What are you trying to learn right now?",
      "What have you done to push your limits?"
    ]
  },
  {
    id: "full-time",
    title: "Full Time",
    summary: "Long-term builders.",
    fields: ["Name", "Email", "Location", "LinkedIn / Website"],
    asset: "Resume / Portfolio",
    questions: [
      "What is the hardest thing you've built?",
      "What role do you see yourself in?"
    ]
  },
  {
    id: "partnerships",
    title: "Partnerships",
    summary: "External collaboration.",
    fields: ["Name", "Company", "Email", "Location"],
    asset: "Deck / Proposal",
    questions: [
      "What kind of collaboration are you proposing?",
      "What resources or distribution do you bring?"
    ]
  },
  {
    id: "talents",
    title: "Talents",
    summary: "High-signal individuals.",
    fields: ["Name", "Email", "Location", "LinkedIn / Website"],
    asset: "Work / Link / Resume",
    questions: [
      "What do you think deeply about?",
      "Why should we select you?"
    ]
  }
];

export const eaiImmersionSlug = "agentech-ff-eai-robotics-future-founder-immersion-program";

export type JourneyLayout =
  | "text-left"
  | "text-right"
  | "wide-media"
  | "overlay"
  | "split"
  | "video-top"
  | "timeline"
  | "floating"
  | "dark"
  | "bright";

export type ProgramDay = {
  day: string;
  title: string;
  tagline: string;
  morning: string[];
  afternoon: string[];
  evening: string[];
  body: string;
  mediaType: "image" | "video";
  mediaUrl: string;
  mediaAlt: string;
  mediaPosition?: string;
  layout: JourneyLayout;
  animationNote: string;
};

export const heroMedia = {
  mediaType: "image",
  mediaUrl: "/assets/ff-robotics/ff-master-x2-hero.jpg",
  mediaAlt: "FF Master humanoid robot standing against a soft gray background"
} as const;

export const programJourneyDays: ProgramDay[] = [
  {
    day: "Day 1",
    title: "Welcome to the Future",
    tagline: "Everything starts with curiosity.",
    morning: ["Opening Ceremony", "Program Orientation", "Meet the Mentors"],
    afternoon: ["FF Lab & Facility Experience", "Team Formation", "Meet Your Robot"],
    evening: ["Founder Fireside Chat"],
    body:
      "Students enter the world of AI robotics through a real company environment. They meet mentors, explore the lab, form teams, and begin their journey from learner to builder.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/day-1-ai-branded-lab-arrival.png",
    mediaAlt: "AI-redrawn students entering a branded FF robotics lab with an engineer mentor and humanoid robot",
    mediaPosition: "54% 44%",
    layout: "wide-media",
    animationNote: "Slow fade-in with a large text reveal."
  },
  {
    day: "Day 2",
    title: "Think Like an AI Engineer",
    tagline: "Learn how intelligent machines think.",
    morning: ["AI Fundamentals", "Embodied AI Overview", "Robot System Architecture"],
    afternoon: ["Programming Workshop", "Simulation Introduction", "First Engineering Sprint"],
    evening: ["Daily Demo & Reflection"],
    body:
      "Students learn the basic language of AI, robotics, and embodied intelligence. The goal is not only to understand concepts, but to begin thinking like an engineer.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/ff-official-x2-chip-jetson.jpg",
    mediaAlt: "Official FF robotics compute module with NVIDIA Jetson hardware for embodied AI systems",
    mediaPosition: "50% 50%",
    layout: "text-right",
    animationNote: "Code and interface elements slide in subtly."
  },
  {
    day: "Day 3",
    title: "Build Your First Skill",
    tagline: "Every robot begins with a single skill.",
    morning: ["Computer Vision Basics", "Sensors & Perception", "Skill Graph Introduction"],
    afternoon: ["Engineer-Led Skill Workshop", "Build a Simple Robot Skill", "Test in Simulation"],
    evening: ["Guest Talk: Robotics in the Real World"],
    body:
      "Students begin building reusable robot skills. They learn how perception, planning, and action connect together inside an embodied AI system.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/ff-official-x2-head-closeup.jpg",
    mediaAlt: "Official FF humanoid robot upper body and sensor head for perception and embodied AI",
    mediaPosition: "58% 42%",
    layout: "overlay",
    animationNote: "Sensor lines and overlay graphics move lightly across the media."
  },
  {
    day: "Day 4",
    title: "Connect AI to Reality",
    tagline: "Ideas become reality when they move.",
    morning: ["Hardware & Robot Integration", "Safety and Testing Workflow", "Real Robot Control Basics"],
    afternoon: ["Deploy to Robot", "Test, Debug, Improve", "Engineering Review"],
    evening: ["Lab Open Hour"],
    body:
      "Students move from simulation into the physical world. They learn why real robots are harder than demos, and why engineering discipline matters.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/ff-official-master-product.jpg",
    mediaAlt: "Official FF Master humanoid robot standing in a controlled robotics environment",
    mediaPosition: "52% 46%",
    layout: "split",
    animationNote: "Split screen transition from simulation to real robot testing."
  },
  {
    day: "Day 5",
    title: "Design Like a Founder",
    tagline: "Great engineers solve problems. Great founders find them.",
    morning: ["Product Thinking", "User Problems", "Market Discovery"],
    afternoon: ["Business Model Workshop", "Financial Literacy for Startups", "Startup Financing Basics"],
    evening: ["VC / Founder Fireside Chat"],
    body:
      "Students learn that technology is only part of the company-building process. They explore customer needs, pricing, business models, and the basics of fundraising.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/day-5-ai-branded-founder-workshop.png",
    mediaAlt: "AI-redrawn founder workshop with students in black and white branded clothing discussing robotics strategy",
    mediaPosition: "48% 46%",
    layout: "text-left",
    animationNote: "Cards and notes settle into a product roadmap."
  },
  {
    day: "Day 6",
    title: "Move Faster Together",
    tagline: "Innovation is a team sport.",
    morning: ["Team Sprint Planning", "Project Scope Review", "Engineering Stand-up"],
    afternoon: ["Project Development", "Mentor Office Hours", "Midpoint Technical Check"],
    evening: ["Team Demo Practice"],
    body:
      "Teams accelerate their projects with engineer mentorship. Students learn how real teams plan, divide tasks, debug together, and communicate progress.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/day-6-ai-branded-engineering-sprint.png",
    mediaAlt: "AI-redrawn students and mentors collaborating during a robotics engineering sprint in branded clothing",
    mediaPosition: "50% 48%",
    layout: "video-top",
    animationNote: "Kanban and sprint cards move with the scroll."
  },
  {
    day: "Day 7",
    title: "Solve Real Problems",
    tagline: "Technology matters when it solves something real.",
    morning: ["Real-World Robotics Challenges", "Production Line / Workflow Perspective", "Use Case Selection"],
    afternoon: ["Project Deep Work", "Technical Review", "User Scenario Testing"],
    evening: ["CTO / Expert Fireside Chat"],
    body:
      "Students connect their projects to real operational challenges. They refine use cases, test assumptions, and learn how robotics can create value in real environments.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/ff-official-aegis-robot-dog.jpg",
    mediaAlt: "Official FF Aegis robot dog representing real-world robotics deployment and workflow challenges",
    mediaPosition: "50% 50%",
    layout: "timeline",
    animationNote: "A workflow path animates through the schedule."
  },
  {
    day: "Day 8",
    title: "Polish Your Product",
    tagline: "Details make products great.",
    morning: ["Testing & Debugging", "Product Polish", "Demo Storyline"],
    afternoon: ["Pitch Coaching", "Presentation Design", "Hackathon Preparation"],
    evening: ["Hackathon Kickoff"],
    body:
      "Teams prepare for the final challenge. They improve their prototype, sharpen their story, and transform a technical project into a presentable product.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/day-8-ai-branded-product-polish.png",
    mediaAlt: "AI-redrawn students polishing a robotics product demo and founder pitch with a mentor in a branded lab",
    mediaPosition: "50% 50%",
    layout: "floating",
    animationNote: "Before and after product polish transition."
  },
  {
    day: "Day 9",
    title: "Build Under Pressure",
    tagline: "Build fast. Learn faster.",
    morning: ["Hackathon Sprint", "Mentor Check-ins", "Rapid Prototyping"],
    afternoon: ["Hackathon Development", "Testing & Debugging", "Final Submission Prep"],
    evening: ["Final Build Lock", "Demo Rehearsal"],
    body:
      "The two-day hackathon begins. Teams work under pressure, make tradeoffs, solve unexpected problems, and prepare their final demo.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/day-9-ai-branded-hackathon.png",
    mediaAlt: "AI-redrawn late-night robotics hackathon with students in branded black and white clothing",
    mediaPosition: "50% 48%",
    layout: "dark",
    animationNote: "Countdown timer energy with a darker, higher-pressure atmosphere."
  },
  {
    day: "Day 10",
    title: "Launch Your Future",
    tagline: "Your journey has just begun.",
    morning: ["Final Demo", "Product Presentation", "Technical Q&A"],
    afternoon: ["Investor-Style Pitch", "Awards", "Closing Ceremony"],
    evening: ["Networking", "Certificate", "Alumni Invitation"],
    body:
      "Students present their work to mentors, engineers, guests, and families. The program ends not as a graduation, but as the beginning of a longer path into AI, robotics, research, entrepreneurship, and real-world impact.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/day-10-ai-branded-demo-day.png",
    mediaAlt: "AI-redrawn final robotics demo day with students presenting to mentors and families",
    mediaPosition: "50% 48%",
    layout: "bright",
    animationNote: "Bright reveal, celebratory but premium."
  }
];

export const mentorRoles = [
  "AI Engineer",
  "Robotics Engineer",
  "Startup Founder",
  "FF Executive",
  "University Professor",
  "Investor / Venture Advisor"
] as const;

export const judgingCategories = [
  "Technical Execution",
  "Creativity",
  "Real-World Value",
  "Teamwork",
  "Final Pitch"
] as const;

export const studentOutcomes = [
  "A completed AI robotics project",
  "Final demo presentation",
  "Founder-style pitch experience",
  "Certificate of completion",
  "Project portfolio material",
  "Exposure to real engineering workflow",
  "Invitation to continue through Agentech AI Club / Internship / Research Pathway"
] as const;

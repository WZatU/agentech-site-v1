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
    day: "Session 1 / Day 1",
    title: "Discover a Robotics Venture",
    tagline: "Start with a real problem.",
    morning: ["Session 1 Kickoff", "Robotics Company Orientation", "Problem Discovery Lab"],
    afternoon: ["Robot Platform Tour", "Team Formation", "Venture Challenge Selection"],
    evening: ["Founder Fireside: Robotics Startups"],
    body:
      "Students enter Session 1 as venture builders. They explore a real robotics company environment, form teams, and choose a problem that can become a robotics startup concept within five focused days.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/day-1-ai-branded-lab-arrival.png",
    mediaAlt: "AI-redrawn students entering a branded FF robotics lab with an engineer mentor and humanoid robot",
    mediaPosition: "54% 44%",
    layout: "wide-media",
    animationNote: "Slow fade-in with a large text reveal."
  },
  {
    day: "Session 1 / Day 2",
    title: "Prototype the First Capability",
    tagline: "A venture needs proof that something works.",
    morning: ["Embodied AI Fundamentals", "Robot System Architecture", "Capability Mapping"],
    afternoon: ["Programming Workshop", "Simulation Sprint", "First Prototype Review"],
    evening: ["Daily Demo & Mentor Feedback"],
    body:
      "Teams learn the language of embodied AI and connect it to a first capability. The emphasis is on showing early technical proof, not repeating textbook AI concepts.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/ff-official-x2-chip-jetson.jpg",
    mediaAlt: "Official FF robotics compute module with NVIDIA Jetson hardware for embodied AI systems",
    mediaPosition: "50% 50%",
    layout: "text-right",
    animationNote: "Code and interface elements slide in subtly."
  },
  {
    day: "Session 1 / Day 3",
    title: "Turn Tech into Product",
    tagline: "Technology becomes valuable when a user needs it.",
    morning: ["User Problem Framing", "Market Discovery", "Product Promise"],
    afternoon: ["Engineer-Led Skill Workshop", "Prototype Refinement", "Business Model Sketch"],
    evening: ["Guest Talk: Robotics in the Real World"],
    body:
      "Students connect the prototype to a customer problem, a user story, and a simple business model. Session 1 keeps founder thinking tightly coupled to the build.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/ff-official-x2-head-closeup.jpg",
    mediaAlt: "Official FF humanoid robot upper body and sensor head for perception and embodied AI",
    mediaPosition: "58% 42%",
    layout: "overlay",
    animationNote: "Sensor lines and overlay graphics move lightly across the media."
  },
  {
    day: "Session 1 / Day 4",
    title: "Hackathon Kickoff: Build Sprint",
    tagline: "The first demo takes shape under constraints.",
    morning: ["Scope Lock", "Hardware & Safety Review", "Demo Success Criteria"],
    afternoon: ["Mini Hackathon Kickoff", "Build, Test, Debug", "Mentor Check-ins"],
    evening: ["Pitch Outline and Risk Review"],
    body:
      "The Session 1 hackathon begins with a shorter, focused sprint. Teams lock scope, stabilize their prototype, and prepare a story that explains both the technology and the venture.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/ff-official-master-product.jpg",
    mediaAlt: "Official FF Master humanoid robot standing in a controlled robotics environment",
    mediaPosition: "52% 46%",
    layout: "split",
    animationNote: "Split screen transition from simulation to real robot testing."
  },
  {
    day: "Session 1 / Day 5",
    title: "Session 1 Demo Day",
    tagline: "Pitch the venture, defend the build.",
    morning: ["Final Build Lock", "Demo Rehearsal", "Technical Q&A Prep"],
    afternoon: ["Mini Hackathon Showcase", "Founder-Style Pitch", "Awards and Reflection"],
    evening: ["Continuation Pathways"],
    body:
      "Session 1 closes with a compact hackathon showcase and founder-style pitch. Students leave with a robotics venture story, prototype evidence, and feedback they can continue developing.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/day-5-ai-branded-founder-workshop.png",
    mediaAlt: "AI-redrawn founder workshop with students in black and white branded clothing discussing robotics strategy",
    mediaPosition: "48% 46%",
    layout: "text-left",
    animationNote: "Cards and notes settle into a product roadmap."
  },
  {
    day: "Session 2 / Day 1",
    title: "Map the Autonomy Opportunity",
    tagline: "A second session starts fresh, with a different lens.",
    morning: ["Session 2 Kickoff", "Autonomy Use-Case Lab", "AI Product Briefing"],
    afternoon: ["Workflow Mapping", "Team Formation", "Product Challenge Selection"],
    evening: ["Expert Fireside: Autonomy in the Real World"],
    body:
      "Session 2 is standalone for new students and non-repetitive for returning students. Teams focus on AI robotics product opportunities, autonomy loops, and workflow value rather than repeating Session 1 venture discovery.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/day-6-ai-branded-engineering-sprint.png",
    mediaAlt: "AI-redrawn students and mentors collaborating during a robotics engineering sprint in branded clothing",
    mediaPosition: "50% 48%",
    layout: "video-top",
    animationNote: "Kanban and sprint cards move with the scroll."
  },
  {
    day: "Session 2 / Day 2",
    title: "Build the AI Product Loop",
    tagline: "Autonomy is a loop, not a single trick.",
    morning: ["Perception and Planning", "Data and Evaluation", "Autonomy Loop Design"],
    afternoon: ["System Integration Sprint", "Scenario Testing", "Technical Review"],
    evening: ["Daily Demo and Iteration Notes"],
    body:
      "Students build around perception, decision, action, and feedback. The work emphasizes product reliability, scenario testing, and measurable improvement.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/ff-official-aegis-robot-dog.jpg",
    mediaAlt: "Official FF Aegis robot dog representing real-world robotics deployment and workflow challenges",
    mediaPosition: "50% 50%",
    layout: "timeline",
    animationNote: "A workflow path animates through the schedule."
  },
  {
    day: "Session 2 / Day 3",
    title: "Test, Iterate, and Position",
    tagline: "A product improves when its failures are visible.",
    morning: ["Reliability Testing", "Failure Mode Review", "Product Metrics"],
    afternoon: ["Iteration Sprint", "User Scenario Validation", "Launch Storyline"],
    evening: ["Pitch Coaching: Product Positioning"],
    body:
      "Teams stress-test their AI robotics product idea and improve it through feedback. Returning students encounter a different content arc focused on autonomy, metrics, and product positioning.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/day-8-ai-branded-product-polish.png",
    mediaAlt: "AI-redrawn students polishing a robotics product demo and founder pitch with a mentor in a branded lab",
    mediaPosition: "50% 50%",
    layout: "floating",
    animationNote: "Before and after product polish transition."
  },
  {
    day: "Session 2 / Day 4",
    title: "Launch Sprint Kickoff",
    tagline: "Build fast, then make the product understandable.",
    morning: ["Launch Scope Lock", "Roadmap and Risk Review", "Judging Criteria"],
    afternoon: ["Mini Hackathon Kickoff", "Product Build Sprint", "Mentor Check-ins"],
    evening: ["Demo Rehearsal and Final Tests"],
    body:
      "The Session 2 hackathon begins on Day 4 with a product launch sprint. Teams stabilize the build, prepare evidence, and make deliberate tradeoffs before demo day.",
    mediaType: "image",
    mediaUrl: "/assets/ff-robotics/day-9-ai-branded-hackathon.png",
    mediaAlt: "AI-redrawn late-night robotics hackathon with students in branded black and white clothing",
    mediaPosition: "50% 48%",
    layout: "dark",
    animationNote: "Countdown timer energy with a darker, higher-pressure atmosphere."
  },
  {
    day: "Session 2 / Day 5",
    title: "Session 2 Demo Day",
    tagline: "Launch the product vision.",
    morning: ["Final Demo", "Product Presentation", "Technical Q&A"],
    afternoon: ["Investor-Style Pitch", "Awards", "Closing Ceremony"],
    evening: ["Networking", "Certificate", "Alumni Invitation"],
    body:
      "Session 2 closes with a second demo-day moment focused on product autonomy, workflow value, and launch storytelling. Students who attend both sessions leave with two distinct project arcs.",
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
  "Session Demo and Pitch"
] as const;

export const studentOutcomes = [
  "One completed AI robotics project per session attended",
  "Mini hackathon and demo-day presentation",
  "Founder-style pitch experience for each selected session",
  "Certificate of completion",
  "Project portfolio material",
  "Exposure to real engineering workflow",
  "Invitation to continue through Agentech AI Club / Internship / Research Pathway"
] as const;

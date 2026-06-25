export const educationGradePages = [
  {
    slug: "k-2",
    grade: "Grade K-2",
    title: "AI Imagination Summer Camp",
    subtitle:
      "Give your child a head start in the world of AI through fun, hands-on learning designed just for Grades K-2! At AI Imagination Summer Camp, young builders will explore creativity, problem-solving, and technology through exciting projects, interactive activities, and beginner-friendly AI adventures in a small, supportive classroom environment.\n\nSpots are limited - ignite your child's imagination this summer and help them become tomorrow's future-ready innovator!",
    image: "/assets/class advertisements/k-2 homepage.png",
    flyerImage: "/assets/class advertisements/Flyers/k-2.png?v=20260521"
  },
  {
    slug: "3-5",
    grade: "Grade 3-5",
    title: "AI Imagination Summer Camp",
    subtitle:
      "Designed for curious young innovators in Grades 3-5, AI Imagination Summer Camp transforms technology into an exciting hands-on adventure where students explore AI, creativity, and digital problem-solving in a fun and engaging way. Campers will build confidence through interactive projects, teamwork, and beginner-friendly coding activities that spark imagination and future-ready thinking.\n\nWith small class sizes, expert instructors, and project-based learning, students won't just use technology - they'll learn how to create with it. This is the perfect summer experience for kids ready to level up from imagination to innovation!",
    image: "/assets/class advertisements/3-5.png",
    flyerImage: "/assets/class advertisements/3-5.png"
  },
  {
    slug: "6-8",
    grade: "Grade 6-8",
    title: "AI Creation Camp",
    subtitle:
      "Turn curiosity into creation at our AI Creation Camp for Grades 6-8, where students build real AI-powered projects, explore robotics and drones, and learn the technology shaping the future. Through hands-on coding, computer vision, and innovation challenges, campers gain the confidence to become creative problem-solvers and future tech leaders.\n\nFrom obstacle-avoiding robots to drone mapping missions, this immersive summer experience combines cutting-edge technology with teamwork, creativity, and fun - all in a small-group learning environment designed to inspire the next generation of innovators.",
    image: "/assets/class advertisements/6-8.png",
    flyerImage: "/assets/class advertisements/Flyers/6-8.png"
  },
  {
    slug: "agentech-ff-eai-robotics-future-founder-immersion-program",
    grade: "Grade 9-12",
    title: "Agentech FF EAI Robotics Future Founder Immersion Program",
    subtitle: "High school students explore EAI robotics, embodied intelligence, and future-founder thinking through an immersive program experience.",
    image: "/assets/logo/AGENTECH_ff_immersion_program.png",
    flyerImage: "/assets/logo/AGENTECH_ff_immersion_program.png"
  }
] as const;

export type EducationGradePage = (typeof educationGradePages)[number];

export function getEducationGradePage(slug: string) {
  return educationGradePages.find((page) => page.slug === slug);
}

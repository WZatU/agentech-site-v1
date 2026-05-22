export const educationGradePages = [
  {
    slug: "k-2",
    grade: "Grade K-2",
    title: "K-2 AI & Robotics Foundations",
    subtitle: "Early builders explore robotics, logic, creativity, and teamwork.",
    image: "/assets/class advertisements/Flyers/k-2.png?v=20260521",
    flyerImage: "/assets/class advertisements/Flyers/k-2.png?v=20260521"
  },
  {
    slug: "3-5",
    grade: "Grade 3-5",
    title: "Grade 3-5 Robotics Discovery",
    subtitle: "Students connect coding, sensors, building, and problem solving through hands-on projects.",
    image: "/assets/class advertisements/3-5.png",
    flyerImage: "/assets/class advertisements/3-5.png"
  },
  {
    slug: "6-8",
    grade: "Grade 6-8",
    title: "Grade 6-8 AI & Robotics Lab",
    subtitle: "Middle school students build deeper technical confidence through real robotics challenges.",
    image: "/assets/class advertisements/6-8.png",
    flyerImage: "/assets/class advertisements/Flyers/6-8.png"
  },
  {
    slug: "9-12",
    grade: "Grade 9-12",
    title: "Grade 9-12 Advanced AI & Robotics",
    subtitle: "High school students work toward portfolio-ready engineering and AI projects.",
    image: "/assets/class advertisements/9-12.png",
    flyerImage: "/assets/class advertisements/Flyers/9-12.png"
  }
] as const;

export type EducationGradePage = (typeof educationGradePages)[number];

export function getEducationGradePage(slug: string) {
  return educationGradePages.find((page) => page.slug === slug);
}

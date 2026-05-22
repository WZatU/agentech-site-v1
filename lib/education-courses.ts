export type EducationCourse = {
  slug: string;
  courseCode: string;
  gradeSlug: string;
  title: string;
  previewDescription: string;
  description: string;
  city: string;
  state: string;
  locationCode: string;
  locationName: string;
  locationAddress?: string;
  courseName: string;
  classTime: string;
  startingDate: string;
  ageRange: string;
  minAge: number;
  maxAge: number;
  price: number;
  flyerImage: string;
  detailFlyerImages?: string[];
};

export const educationCourses: EducationCourse[] = [
  {
    slug: "walnut-2026-summer-k-2",
    courseCode: "W001",
    gradeSlug: "k-2",
    title: "Walnut 2026 Summer K-2",
    previewDescription: "Walnut 2026 summer K-2",
    description:
      "AI Imagination Summer Camp for Grades K-2 in Walnut. Young builders explore creativity, problem-solving, and beginner-friendly AI through hands-on activities.",
    city: "Walnut",
    state: "CA",
    locationCode: "WALNUT",
    locationName: "Walnut",
    courseName: "AI Imagination Summer Camp K-2",
    classTime: "2026 Summer",
    startingDate: "2026-06-01",
    ageRange: "Grades K-2",
    minAge: 5,
    maxAge: 8,
    price: 499,
    flyerImage: "/assets/class advertisements/Flyers/k-2 eng.png"
  },
  {
    slug: "walnut-2026-summer-3-5",
    courseCode: "W002",
    gradeSlug: "3-5",
    title: "Walnut 2026 Summer Grades 3-5",
    previewDescription: "Walnut 2026 Summer Grades 3-5",
    description:
      "AI Imagination Summer Camp for Grades 3-5 in Walnut. Students explore AI, creativity, digital problem-solving, teamwork, and beginner-friendly coding through hands-on projects.",
    city: "Walnut",
    state: "CA",
    locationCode: "WALNUT",
    locationName: "Walnut",
    courseName: "AI Imagination Summer Camp 3-5",
    classTime: "2026 Summer",
    startingDate: "2026-06-01",
    ageRange: "Grades 3-5",
    minAge: 9,
    maxAge: 11,
    price: 499,
    flyerImage: "/assets/class advertisements/Flyers/3-5.png"
  },
  {
    slug: "walnut-2026-summer-6-8",
    courseCode: "W003",
    gradeSlug: "6-8",
    title: "Walnut 2026 Summer Grades 6-8",
    previewDescription: "Walnut 2026 Summer Grades 6-8",
    description:
      "AI Creation Camp for Grades 6-8 in Walnut. Students build AI-powered projects, explore robotics and drones, and practice hands-on coding, computer vision, and innovation challenges.",
    city: "Walnut",
    state: "CA",
    locationCode: "WALNUT",
    locationName: "Walnut",
    courseName: "AI Creation Camp 6-8",
    classTime: "2026 Summer",
    startingDate: "2026-06-01",
    ageRange: "Grades 6-8",
    minAge: 11,
    maxAge: 14,
    price: 699,
    flyerImage: "/assets/class advertisements/Flyers/6-8.png",
    detailFlyerImages: [
      "/assets/class advertisements/Flyers/6-8.png",
      "/assets/class advertisements/Flyers/6-8 chinese.png"
    ]
  }
];

export function getEducationCoursesByGrade(gradeSlug: string) {
  return educationCourses.filter((course) => course.gradeSlug === gradeSlug);
}

export function getEducationCourse(gradeSlug: string, courseSlug: string) {
  return educationCourses.find((course) => course.gradeSlug === gradeSlug && course.slug === courseSlug);
}

export function getEducationCourseByCode(courseCode: string) {
  return educationCourses.find((course) => course.courseCode === courseCode);
}

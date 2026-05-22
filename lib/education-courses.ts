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
  price: number;
  flyerImage: string;
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
    price: 499,
    flyerImage: "/assets/class advertisements/Flyers/k-2 eng.png"
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

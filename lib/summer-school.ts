export const SUMMER_SCHOOL_GRADES = ["9", "10", "11", "12"] as const;

export const SUMMER_SCHOOL_INTERESTS = [
  "Robotics",
  "AI",
  "Programming",
  "Math",
  "Engineering",
  "Entrepreneurship",
  "Business"
] as const;

export const SUMMER_SCHOOL_EXPERIENCE = ["Beginner", "Intermediate", "Advanced"] as const;

export type SummerSchoolGrade = (typeof SUMMER_SCHOOL_GRADES)[number];
export type SummerSchoolInterest = (typeof SUMMER_SCHOOL_INTERESTS)[number];
export type SummerSchoolExperience = (typeof SUMMER_SCHOOL_EXPERIENCE)[number];

export type SummerSchoolApplication = {
  name: string;
  email: string;
  school: string;
  grade: SummerSchoolGrade;
  gpa: string;
  interests: SummerSchoolInterest[];
  experience: SummerSchoolExperience;
  parentEmail: string;
  projects: string;
  uniqueness: string;
  notes?: string;
};

export function buildSummerSchoolSubject(name: string) {
  return `[Summer School] - Application for ${name}`;
}

export function buildSummerSchoolText(application: SummerSchoolApplication) {
  return [
    "Program: Summer School",
    `Name: ${application.name}`,
    `Email: ${application.email}`,
    `School: ${application.school}`,
    `Grade: ${application.grade}`,
    `GPA: ${application.gpa}`,
    `Interest Areas: ${application.interests.join(", ")}`,
    `Experience: ${application.experience}`,
    `Parent Email: ${application.parentEmail}`,
    `Projects: ${application.projects}`,
    `Uniqueness: ${application.uniqueness}`,
    `Notes: ${application.notes?.trim() || "N/A"}`
  ].join("\n");
}

export function buildSummerSchoolMailto(application: SummerSchoolApplication, recipient: string) {
  const subject = buildSummerSchoolSubject(application.name);
  const body = buildSummerSchoolText(application);

  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

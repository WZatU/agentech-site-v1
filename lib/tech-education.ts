export const TECH_EDUCATION_GRADES = ["7", "8", "9", "10", "11", "12"] as const;

export const TECH_EDUCATION_INTERESTS = [
  "Robotics",
  "AI",
  "Programming",
  "Math",
  "Engineering"
] as const;

export const TECH_EDUCATION_EXPERIENCE = ["Beginner", "Intermediate"] as const;

export type TechEducationGrade = (typeof TECH_EDUCATION_GRADES)[number];
export type TechEducationInterest = (typeof TECH_EDUCATION_INTERESTS)[number];
export type TechEducationExperience = (typeof TECH_EDUCATION_EXPERIENCE)[number];

export type TechEducationApplication = {
  name: string;
  email: string;
  school: string;
  grade: TechEducationGrade;
  gpa: string;
  interests: TechEducationInterest[];
  experience: TechEducationExperience;
  parentEmail: string;
  notes?: string;
};

export function buildTechEducationSubject(name: string) {
  return `[Tech Education] - Application for ${name}`;
}

export function buildTechEducationText(application: TechEducationApplication) {
  return [
    "Program: Tech Education",
    `Name: ${application.name}`,
    `Email: ${application.email}`,
    `School: ${application.school}`,
    `Grade: ${application.grade}`,
    `GPA: ${application.gpa}`,
    `Interest Areas: ${application.interests.join(", ")}`,
    `Experience: ${application.experience}`,
    `Parent Email: ${application.parentEmail}`,
    `Notes: ${application.notes?.trim() || "N/A"}`
  ].join("\n");
}

export function buildTechEducationMailto(application: TechEducationApplication, recipient: string) {
  const subject = buildTechEducationSubject(application.name);
  const body = buildTechEducationText(application);

  return `mailto:${encodeURIComponent(recipient)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

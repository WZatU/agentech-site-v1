export const INTERNSHIP_ROLE_INTERESTS = [
  "Software",
  "AI / Agents",
  "Robotics",
  "Hardware",
  "Research",
  "Operations",
  "Business"
] as const;

export type InternshipRoleInterest = (typeof INTERNSHIP_ROLE_INTERESTS)[number];

export type InternshipApplication = {
  name: string;
  email: string;
  organization: string;
  major: string;
  graduationYear: string;
  location: string;
  roleInterests: InternshipRoleInterest[];
  profileLink?: string;
  built: string;
  whyAgentech: string;
  resumeFilename: string;
  notes?: string;
};

export function buildInternshipSubject(name: string) {
  return `[Internship] - Application for ${name}`;
}

export function buildInternshipText(application: InternshipApplication) {
  return [
    "Program: Internship",
    `Name: ${application.name}`,
    `Email: ${application.email}`,
    `University / Company: ${application.organization}`,
    `Major / Field: ${application.major}`,
    `Graduation Year: ${application.graduationYear}`,
    `Location: ${application.location}`,
    `Role Interest: ${application.roleInterests.join(", ")}`,
    `LinkedIn / Portfolio / GitHub: ${application.profileLink?.trim() || "N/A"}`,
    `What have you built?: ${application.built}`,
    `Why Agentech?: ${application.whyAgentech}`,
    `Resume Filename: ${application.resumeFilename}`,
    `Notes: ${application.notes?.trim() || "N/A"}`
  ].join("\n");
}

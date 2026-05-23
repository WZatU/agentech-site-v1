import { supabaseRequest } from "@/lib/supabase-server";
import type { InternshipApplication } from "@/lib/internship";
import type { SummerSchoolApplication } from "@/lib/summer-school";
import type { TechEducationApplication } from "@/lib/tech-education";

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function accountExists(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const rows = await supabaseRequest<Array<{ email: string }>>("agentech_accounts", {
    query: `select=email&email=eq.${encodeURIComponent(normalizedEmail)}&limit=1`
  });

  return rows.length > 0;
}

export async function saveWorkshopApplication(accountEmail: string, application: TechEducationApplication, resumeStoragePath?: string | null) {
  await supabaseRequest<null>("agentech_workshop_applications", {
    method: "POST",
    body: [
      {
        account_email: normalizeEmail(accountEmail),
        name: application.name,
        email: normalizeEmail(application.email),
        school: application.school,
        grade: application.grade,
        gpa: application.gpa,
        interests: application.interests,
        experience: application.experience,
        parent_email: normalizeEmail(application.parentEmail),
        resume_filename: application.resumeFilename || null,
        resume_storage_path: resumeStoragePath || null,
        notes: application.notes || null
      }
    ],
    prefer: "return=minimal"
  });
}

export async function saveAiRoboticsClubApplication(accountEmail: string, application: SummerSchoolApplication, resumeStoragePath?: string | null) {
  await supabaseRequest<null>("agentech_ai_robotics_club_applications", {
    method: "POST",
    body: [
      {
        account_email: normalizeEmail(accountEmail),
        name: application.name,
        email: normalizeEmail(application.email),
        school: application.school,
        grade: application.grade,
        gpa: application.gpa,
        interests: application.interests,
        experience: application.experience,
        parent_email: normalizeEmail(application.parentEmail),
        projects: application.projects,
        uniqueness: application.uniqueness,
        resume_filename: application.resumeFilename || null,
        resume_storage_path: resumeStoragePath || null,
        notes: application.notes || null
      }
    ],
    prefer: "return=minimal"
  });
}

export async function saveInternshipApplication(
  accountEmail: string,
  application: InternshipApplication,
  resumeStoragePath: string
) {
  await supabaseRequest<null>("agentech_internship_applications", {
    method: "POST",
    body: [
      {
        account_email: normalizeEmail(accountEmail),
        name: application.name,
        email: normalizeEmail(application.email),
        organization: application.organization,
        major: application.major,
        graduation_year: application.graduationYear,
        location: application.location,
        role_interests: application.roleInterests,
        profile_link: application.profileLink || null,
        built: application.built,
        why_agentech: application.whyAgentech,
        resume_filename: application.resumeFilename,
        resume_storage_path: resumeStoragePath,
        notes: application.notes || null
      }
    ],
    prefer: "return=minimal"
  });
}

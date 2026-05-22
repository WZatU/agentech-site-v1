import { supabaseRequest } from "@/lib/supabase-server";

export type TalentProgramType = "workshop" | "ai_robotics_club" | "internship";

type SaveTalentApplicationInput = {
  accountEmail: string;
  programType: TalentProgramType;
  applicantName: string;
  applicantEmail: string;
  parentEmail?: string;
  school?: string;
  grade?: string;
  formData: unknown;
  resumeFilename?: string;
  resumeStoragePath?: string;
};

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

export async function saveTalentApplication(input: SaveTalentApplicationInput) {
  await supabaseRequest<null>("agentech_talent_applications", {
    method: "POST",
    body: [
      {
        account_email: normalizeEmail(input.accountEmail),
        program_type: input.programType,
        applicant_name: input.applicantName,
        applicant_email: normalizeEmail(input.applicantEmail),
        parent_email: input.parentEmail ? normalizeEmail(input.parentEmail) : null,
        school: input.school || null,
        grade: input.grade || null,
        form_data: input.formData,
        resume_filename: input.resumeFilename || null,
        resume_storage_path: input.resumeStoragePath || null
      }
    ],
    prefer: "return=minimal"
  });
}

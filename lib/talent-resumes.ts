import { uploadSupabaseStorageObject } from "@/lib/supabase-server";

export const TALENT_RESUME_BUCKET = "talent-resumes";
export const MAX_TALENT_RESUME_BYTES = 5 * 1024 * 1024;

export function sanitizeResumeFilename(filename: string) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

export function buildTalentResumeStoragePath(accountEmail: string, filename: string) {
  const accountFolder = accountEmail.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${accountFolder}/${Date.now()}-${crypto.randomUUID()}-${filename}`;
}

export function validateTalentResumeFile(file: File) {
  if (file.size === 0 || file.size > MAX_TALENT_RESUME_BYTES) {
    return "Please upload a PDF under 5MB.";
  }

  const lowerFilename = file.name.toLowerCase();
  const isPdf = file.type === "application/pdf" || lowerFilename.endsWith(".pdf");

  if (!isPdf) {
    return "Resume must be a PDF.";
  }

  return "";
}

export async function uploadTalentResume(accountEmail: string, file: File) {
  const filename = sanitizeResumeFilename(file.name || "resume.pdf");
  const uploaded = await uploadSupabaseStorageObject(
    TALENT_RESUME_BUCKET,
    buildTalentResumeStoragePath(accountEmail, filename),
    file,
    "application/pdf"
  );

  return {
    filename,
    path: uploaded.path
  };
}

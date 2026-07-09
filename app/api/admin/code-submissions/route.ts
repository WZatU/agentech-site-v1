import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { getServerAccountEmail } from "@/lib/server-account-session";
import { supabaseRequest } from "@/lib/supabase-server";

async function isAdminEmail(email: string) {
  const rows = await supabaseRequest<Array<{ email: string; active: boolean }>>("agentech_admin_users", {
    query: `email=eq.${encodeURIComponent(email)}&active=eq.true&select=email,active&limit=1`
  }).catch(() => []);

  return rows.length > 0;
}

export async function GET(request: NextRequest) {
  const adminEmail = await getServerAccountEmail(request);
  if (!isValidEmail(adminEmail) || !(await isAdminEmail(adminEmail))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id")?.trim() ?? "";
  const targetUser = normalizeEmail(url.searchParams.get("user"));

  if (id) {
    const rows = await supabaseRequest("agentech_code_submissions", {
      query: `id=eq.${encodeURIComponent(id)}&select=*&limit=1`
    }).catch(() => []);

    const submission = Array.isArray(rows) ? rows[0] : null;
    if (!submission) {
      return NextResponse.json({ error: "Code submission not found." }, { status: 404 });
    }

    return NextResponse.json({ ok: true, submission });
  }

  const userFilter = isValidEmail(targetUser) ? `email=eq.${encodeURIComponent(targetUser)}&` : "";
  const rows = await supabaseRequest("agentech_code_submissions", {
    query: `${userFilter}select=id,email,developer_name,robot_model,run_mode,source,uploaded_file_name,commands,physical_safety_status,ai_security_status,ai_security_model,ai_security_summary,ai_security_findings,ai_security_risk_level,ai_security_reviewed_at,credits_charged,created_at,updated_at&order=created_at.desc&limit=100`
  }).catch(() => []);

  return NextResponse.json({ ok: true, submissions: rows });
}

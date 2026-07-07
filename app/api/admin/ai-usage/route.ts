import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { getServerAccountEmail } from "@/lib/server-account-session";
import { supabaseRequest } from "@/lib/supabase-server";

function toLimit(value: string | null) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(250, Math.floor(parsed)) : 100;
}

async function isAiGatewayAdmin(email: string) {
  const rows = await supabaseRequest<Array<{ email: string; active: boolean }>>("agentech_admin_users", {
    query: `email=eq.${encodeURIComponent(email)}&active=eq.true&select=email,active&limit=1`
  }).catch(() => []);

  return rows.length > 0;
}

export async function GET(request: NextRequest) {
  const adminEmail = await getServerAccountEmail(request);
  if (!isValidEmail(adminEmail) || !(await isAiGatewayAdmin(adminEmail))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const url = new URL(request.url);
  const targetUser = normalizeEmail(url.searchParams.get("user"));
  const limit = toLimit(url.searchParams.get("limit"));
  const userFilter = isValidEmail(targetUser) ? `user_id=eq.${encodeURIComponent(targetUser)}&` : "";

  const [caps, usage, developerProfiles, developerAccounts] = await Promise.all([
    supabaseRequest("agentech_ai_cap", {
      query: `${userFilter}select=*&order=updated_at.desc`
    }).catch(() => []),
    supabaseRequest("agentech_ai_usage", {
      query: `${userFilter}select=*&order=created_at.desc&limit=${limit}`
    }).catch(() => []),
    supabaseRequest("agentech_account_profiles", {
      query: "profile_type=eq.developer&select=id,account_email,username,display_name,monthly_credit_limit,monthly_credits_used,monthly_usage_period,created_at&order=created_at.desc"
    }).catch(() => []),
    supabaseRequest("agentech_accounts", {
      query: "select=email,developer_latest_code_submission_id,developer_physical_safety_status,developer_ai_security_status,developer_ai_security_passed_at"
    }).catch(() => [])
  ]);

  return NextResponse.json({
    ok: true,
    adminEmail,
    targetUser: isValidEmail(targetUser) ? targetUser : null,
    caps,
    usage,
    developerProfiles,
    developerAccounts
  });
}

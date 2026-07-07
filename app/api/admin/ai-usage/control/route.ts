import { NextRequest, NextResponse } from "next/server";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { getServerAccountEmail } from "@/lib/server-account-session";
import { supabaseRequest } from "@/lib/supabase-server";

type GatewayCapRecord = {
  user_id: string;
  monthly_request_limit: number;
  monthly_token_limit: number;
  monthly_cost_limit: number;
  current_requests: number;
  current_tokens: number;
  current_cost: number;
  usage_period: string;
  updated_at: string;
};

const defaultMonthlyRequestLimit = 20;
const defaultMonthlyTokenLimit = 100_000;
const defaultMonthlyCostLimit = 5;

function currentUsagePeriod() {
  return new Date().toISOString().slice(0, 7);
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : fallback;
}

function toNonNegativeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function gatewayDefaults() {
  return {
    monthlyRequestLimit: toPositiveInteger(process.env.EAI_GATEWAY_MONTHLY_REQUEST_LIMIT, defaultMonthlyRequestLimit),
    monthlyTokenLimit: toPositiveInteger(process.env.EAI_GATEWAY_MONTHLY_TOKEN_LIMIT, defaultMonthlyTokenLimit),
    monthlyCostLimit: toNonNegativeNumber(process.env.EAI_GATEWAY_MONTHLY_COST_LIMIT, defaultMonthlyCostLimit)
  };
}

async function isAiGatewayAdmin(email: string) {
  const rows = await supabaseRequest<Array<{ email: string; active: boolean }>>("agentech_admin_users", {
    query: `email=eq.${encodeURIComponent(email)}&active=eq.true&select=email,active&limit=1`
  }).catch(() => []);

  return rows.length > 0;
}

async function getGatewayCap(userId: string) {
  const rows = await supabaseRequest<GatewayCapRecord[]>("agentech_ai_cap", {
    query: `user_id=eq.${encodeURIComponent(userId)}&select=*&limit=1`
  }).catch(() => []);

  return rows[0] ?? null;
}

async function writeGatewayCap(userId: string, cap: Partial<GatewayCapRecord>) {
  const existing = await getGatewayCap(userId);
  const body = {
    ...cap,
    user_id: userId,
    usage_period: existing?.usage_period ?? currentUsagePeriod(),
    current_requests: existing?.current_requests ?? 0,
    current_tokens: existing?.current_tokens ?? 0,
    current_cost: existing?.current_cost ?? 0,
    updated_at: new Date().toISOString()
  };

  if (existing) {
    const rows = await supabaseRequest<GatewayCapRecord[]>("agentech_ai_cap", {
      method: "PATCH",
      query: `user_id=eq.${encodeURIComponent(userId)}`,
      body
    });
    return rows[0] ?? { ...existing, ...body };
  }

  const rows = await supabaseRequest<GatewayCapRecord[]>("agentech_ai_cap", {
    method: "POST",
    body
  });

  return rows[0] ?? body;
}

export async function POST(request: NextRequest) {
  const adminEmail = await getServerAccountEmail(request);
  if (!isValidEmail(adminEmail) || !(await isAiGatewayAdmin(adminEmail))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { userId?: string; action?: string } | null;
  const targetUser = normalizeEmail(body?.userId);
  const action = body?.action;

  if (!isValidEmail(targetUser)) {
    return NextResponse.json({ error: "Valid target user email is required." }, { status: 400 });
  }

  if (targetUser === normalizeEmail(adminEmail)) {
    return NextResponse.json({ error: "The gateway owner account cannot pause itself." }, { status: 400 });
  }

  if (action === "pause") {
    const cap = await writeGatewayCap(targetUser, {
      monthly_request_limit: 0,
      monthly_token_limit: 0,
      monthly_cost_limit: 0
    });

    return NextResponse.json({ ok: true, action, userId: targetUser, cap });
  }

  if (action === "resume") {
    const defaults = gatewayDefaults();
    const cap = await writeGatewayCap(targetUser, {
      monthly_request_limit: defaults.monthlyRequestLimit,
      monthly_token_limit: defaults.monthlyTokenLimit,
      monthly_cost_limit: defaults.monthlyCostLimit
    });

    return NextResponse.json({ ok: true, action, userId: targetUser, cap });
  }

  return NextResponse.json({ error: "Unsupported admin action." }, { status: 400 });
}

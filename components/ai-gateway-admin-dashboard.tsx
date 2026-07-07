"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clearAccountSession, getAccountSession } from "@/lib/account-session";

type AdminAiCap = {
  user_id: string;
  monthly_request_limit: number | string;
  monthly_token_limit: number | string;
  monthly_cost_limit: number | string;
  current_requests: number | string;
  current_tokens: number | string;
  current_cost: number | string;
  usage_period: string;
  updated_at: string;
};

type AdminAiUsage = {
  id: number;
  user_id: string;
  endpoint: string;
  model: string;
  prompt_tokens: number | string;
  completion_tokens: number | string;
  total_tokens: number | string;
  estimated_cost: number | string;
  status_code: number | null;
  latency_ms: number | null;
  created_at: string;
};

type AdminDeveloperProfile = {
  id: number;
  account_email: string;
  username: string;
  display_name: string;
  monthly_credit_limit: number | string;
  monthly_credits_used: number | string;
  monthly_usage_period: string;
  created_at: string;
};

type AdminDeveloperAccount = {
  email: string;
  developer_latest_code_submission_id: string | null;
  developer_physical_safety_status: string | null;
  developer_ai_security_status: string | null;
  developer_ai_security_passed_at: string | null;
};

type AdminAiUsageData = {
  caps: AdminAiCap[];
  usage: AdminAiUsage[];
  developerProfiles: AdminDeveloperProfile[];
  developerAccounts: AdminDeveloperAccount[];
};

function looksLikeGatewayAdmin(email: string) {
  return email.trim().toLowerCase() === "info@agent-tech.ai";
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatTokenCount(value: number | string | undefined | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.max(0, Math.floor(amount)).toLocaleString() : "0";
}

function formatGatewayCost(value: number | string | undefined | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `$${amount.toFixed(4)}` : "$0.0000";
}

function formatDurationMs(value: number | string | undefined | null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount) || amount <= 0) return "0 ms";
  if (amount < 1000) return `${Math.round(amount).toLocaleString()} ms`;
  return `${(amount / 1000).toFixed(1)} s`;
}

function formatStatus(value: string | null | undefined) {
  const status = value || "not started";
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getUsageWindowStats(rows: AdminAiUsage[]) {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  let callsLastHour = 0;
  let callsLast24h = 0;
  let latencyTotal = 0;
  let latencyCount = 0;
  let latest: AdminAiUsage | null = null;
  let latestTime = 0;

  for (const row of rows) {
    const createdAt = new Date(row.created_at).getTime();
    if (Number.isFinite(createdAt)) {
      if (createdAt >= oneHourAgo) callsLastHour += 1;
      if (createdAt >= oneDayAgo) callsLast24h += 1;
      if (createdAt > latestTime) {
        latestTime = createdAt;
        latest = row;
      }
    }

    const latency = Number(row.latency_ms ?? 0);
    if (Number.isFinite(latency) && latency > 0) {
      latencyTotal += latency;
      latencyCount += 1;
    }
  }

  return {
    callsLastHour,
    callsLast24h,
    latest,
    averageLatencyMs: latencyCount ? latencyTotal / latencyCount : 0
  };
}

export function AiGatewayAdminDashboard({ adminEmail = "" }: { adminEmail?: string }) {
  const [email, setEmail] = useState(adminEmail);
  const [data, setData] = useState<AdminAiUsageData>({ caps: [], usage: [], developerProfiles: [], developerAccounts: [] });
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  async function loadUsage() {
    setLoading(true);
    setMessage("");
    const response = await fetch("/api/admin/ai-usage?limit=250");
    const result = (await response.json().catch(() => null)) as (AdminAiUsageData & { error?: string }) | null;

    if (!response.ok || !result) {
      setMessage(result?.error || "Unable to load AI gateway usage. Sign out and sign back in as info@agent-tech.ai.");
      setLoading(false);
      return;
    }

    setData({
      caps: result.caps ?? [],
      usage: result.usage ?? [],
      developerProfiles: result.developerProfiles ?? [],
      developerAccounts: result.developerAccounts ?? []
    });
    setLoading(false);
  }

  useEffect(() => {
    if (adminEmail) {
      setEmail(adminEmail);
      return;
    }

    const session = getAccountSession();
    setEmail(session?.email ?? "");
  }, [adminEmail]);

  useEffect(() => {
    if (!email || !looksLikeGatewayAdmin(email)) {
      setLoading(false);
      return;
    }

    void loadUsage();
  }, [email]);

  const summary = useMemo(() => {
    const totalRequests = data.caps.reduce((total, cap) => total + Number(cap.current_requests ?? 0), 0);
    const totalTokens = data.caps.reduce((total, cap) => total + Number(cap.current_tokens ?? 0), 0);
    const totalCost = data.caps.reduce((total, cap) => total + Number(cap.current_cost ?? 0), 0);
    const activeGatewayUsers = data.caps.filter((cap) => Number(cap.current_requests ?? 0) > 0).length;

    return { totalRequests, totalTokens, totalCost, activeGatewayUsers };
  }, [data.caps]);

  const capByEmail = useMemo(() => new Map(data.caps.map((cap) => [cap.user_id, cap])), [data.caps]);
  const accountByEmail = useMemo(() => new Map(data.developerAccounts.map((account) => [account.email, account])), [data.developerAccounts]);
  const usageByEmail = useMemo(() => {
    const map = new Map<string, AdminAiUsage[]>();
    for (const row of data.usage) {
      const rows = map.get(row.user_id) ?? [];
      rows.push(row);
      map.set(row.user_id, rows);
    }
    return map;
  }, [data.usage]);
  const gatewayHistory = useMemo(() => getUsageWindowStats(data.usage), [data.usage]);

  if (!email) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <h1 className="text-3xl font-bold text-slate-950">Admin Sign In Required</h1>
        <p className="mt-3 text-slate-600">Sign in as info@agent-tech.ai to monitor AI gateway usage.</p>
        <Link href="/login?next=/admin/ai-gateway" className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white">
          Sign In
        </Link>
      </div>
    );
  }

  if (!looksLikeGatewayAdmin(email)) {
    return (
      <div className="rounded-[24px] border border-red-200 bg-red-50 p-8">
        <h1 className="text-3xl font-bold text-red-950">Admin Access Required</h1>
        <p className="mt-3 text-red-800">This console is only for info@agent-tech.ai.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[18px] border border-slate-200 bg-[#f8fbff] shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div className="flex flex-col gap-5 border-b border-slate-200 bg-white px-5 pb-5 pt-5 sm:px-7 md:flex-row md:items-start md:justify-between md:px-8 md:pt-7">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f70c8]">Admin Console</p>
          <h1 className="mt-2 text-[28px] font-bold leading-tight text-slate-950 sm:text-4xl">AI Gateway Usage</h1>
          <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
            Developer profiles, AI requests, token totals, cost caps, recent velocity, and model call history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={loadUsage}
            disabled={loading}
            className="rounded-full border border-[#2f70c8] bg-white px-4 py-2 text-sm font-bold text-[#245da7] transition hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Refreshing..." : "Refresh Usage"}
          </button>
          <button
            type="button"
            onClick={() => {
              clearAccountSession();
              window.location.href = "/login?next=/admin/ai-gateway";
            }}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#2f70c8] hover:text-[#2f70c8]"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="space-y-6 p-5 sm:p-7 md:p-8">
        {message ? (
          <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{message}</p>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          {[
            { label: "Developer Profiles", value: data.developerProfiles.length.toLocaleString(), helper: "Profiles with developer access" },
            { label: "Gateway Users", value: summary.activeGatewayUsers.toLocaleString(), helper: "Used AI this month" },
            { label: "Monthly Requests", value: summary.totalRequests.toLocaleString(), helper: "Across all users" },
            { label: "Last Hour", value: gatewayHistory.callsLastHour.toLocaleString(), helper: "Recent AI calls" },
            { label: "Last 24 Hours", value: gatewayHistory.callsLast24h.toLocaleString(), helper: "Recent AI calls" },
            { label: "Estimated Cost", value: formatGatewayCost(summary.totalCost), helper: "Current month" }
          ].map((card) => (
            <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
              <p className="mt-3 text-3xl font-black text-slate-950">{card.value}</p>
              <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
            </div>
          ))}
        </div>

        <section className="rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2f70c8]">Developer Profiles</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">AI Usage By Developer Account</h2>
            </div>
            <p className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#245da7]">
              {formatTokenCount(summary.totalTokens)} tokens this month
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-[1160px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                <tr>
                  <th className="px-5 py-3">Developer</th>
                  <th className="px-5 py-3">Account</th>
                  <th className="px-5 py-3">Requests</th>
                  <th className="px-5 py-3">Tokens</th>
                  <th className="px-5 py-3">Cost</th>
                  <th className="px-5 py-3">History</th>
                  <th className="px-5 py-3">Software Gate</th>
                  <th className="px-5 py-3">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.developerProfiles.length ? data.developerProfiles.map((profile) => {
                  const cap = capByEmail.get(profile.account_email);
                  const account = accountByEmail.get(profile.account_email);
                  const requests = Number(cap?.current_requests ?? 0);
                  const requestLimit = Number(cap?.monthly_request_limit ?? 20);
                  const tokens = Number(cap?.current_tokens ?? 0);
                  const cost = Number(cap?.current_cost ?? 0);
                  const costLimit = Number(cap?.monthly_cost_limit ?? 5);
                  const gateStatus = account?.developer_ai_security_status || "not started";
                  const history = getUsageWindowStats(usageByEmail.get(profile.account_email) ?? []);
                  const highRecentUse = history.callsLastHour >= 5;
                  return (
                    <tr key={profile.id} className="align-top">
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">{profile.display_name || profile.username}</p>
                        <p className="mt-1 font-mono text-xs text-slate-500">@{profile.username}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="break-all font-semibold text-slate-700">{profile.account_email}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">{requests.toLocaleString()} / {requestLimit.toLocaleString()}</p>
                        <p className="mt-1 text-xs text-slate-500">monthly calls</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">{formatTokenCount(tokens)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-bold text-slate-950">{formatGatewayCost(cost)}</p>
                        <p className="mt-1 text-xs text-slate-500">limit {formatGatewayCost(costLimit)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-700">
                          {history.latest ? formatDateTime(history.latest.created_at) : "Never used"}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {history.callsLastHour.toLocaleString()} in 1h / {history.callsLast24h.toLocaleString()} in 24h
                        </p>
                        <p className="mt-1 text-xs text-slate-500">avg {formatDurationMs(history.averageLatencyMs)}</p>
                        {highRecentUse ? (
                          <span className="mt-2 inline-flex rounded-full bg-amber-50 px-2 py-1 text-[11px] font-bold text-amber-700">
                            High recent use
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                          gateStatus === "passed"
                            ? "bg-emerald-50 text-emerald-700"
                            : gateStatus === "failed" || gateStatus === "error"
                              ? "bg-red-50 text-red-700"
                              : "bg-slate-100 text-slate-600"
                        }`}>
                          {formatStatus(gateStatus)}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {cap?.updated_at ? formatDateTime(cap.updated_at) : "No AI usage yet"}
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm font-semibold text-slate-500" colSpan={8}>
                      No developer profiles found yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
          <div className="border-b border-slate-200 px-5 py-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2f70c8]">Recent Calls</p>
            <h2 className="mt-1 text-xl font-bold text-slate-950">AI Gateway Log</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {data.usage.length ? data.usage.slice(0, 20).map((row) => (
              <div key={row.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[minmax(220px,1fr)_140px_120px_120px_120px_150px] md:items-center">
                <div>
                  <p className="break-all font-bold text-slate-950">{row.user_id}</p>
                  <p className="mt-1 text-xs text-slate-500">{row.endpoint} - {row.model}</p>
                </div>
                <p className="font-semibold text-slate-700">{formatTokenCount(row.total_tokens)} tokens</p>
                <p className="font-semibold text-slate-700">{formatGatewayCost(row.estimated_cost)}</p>
                <p className="font-semibold text-slate-700">{formatDurationMs(row.latency_ms)}</p>
                <p className="font-semibold text-slate-700">HTTP {row.status_code ?? "n/a"}</p>
                <p className="text-slate-500">{formatDateTime(row.created_at)}</p>
              </div>
            )) : (
              <p className="px-5 py-8 text-center text-sm font-semibold text-slate-500">No AI gateway calls logged yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

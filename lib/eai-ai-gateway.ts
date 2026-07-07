import { supabaseRequest } from "@/lib/supabase-server";

type GatewayEndpoint = "chat" | "robot_code_security_review";

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

type OpenAiUsage = {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

type GatewayRateWindow = {
  count: number;
  resetAt: number;
};

const gatewayRateWindows = new Map<string, GatewayRateWindow>();
const defaultAllowedModels = ["gpt-5.5", "gpt-5.1", "gpt-4.1", "gpt-4o-mini"];
const defaultMonthlyRequestLimit = 20;
const defaultMonthlyTokenLimit = 100_000;
const defaultMonthlyCostLimit = 5;
const defaultEstimatedCostPerRequest = 0.25;
const maxGatewayBodyChars = 120_000;

function getGatewayConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("EAI AI Gateway is not configured. Set OPENAI_API_KEY on the server.");
  }

  const allowedModels = (process.env.EAI_GATEWAY_ALLOWED_MODELS || defaultAllowedModels.join(","))
    .split(",")
    .map((model) => model.trim())
    .filter(Boolean);

  return {
    apiKey,
    allowedModels,
    monthlyRequestLimit: toPositiveInteger(process.env.EAI_GATEWAY_MONTHLY_REQUEST_LIMIT, defaultMonthlyRequestLimit),
    monthlyTokenLimit: toPositiveInteger(process.env.EAI_GATEWAY_MONTHLY_TOKEN_LIMIT, defaultMonthlyTokenLimit),
    monthlyCostLimit: toNonNegativeNumber(process.env.EAI_GATEWAY_MONTHLY_COST_LIMIT, defaultMonthlyCostLimit),
    requestsPerMinute: toPositiveInteger(process.env.EAI_GATEWAY_REQUESTS_PER_MINUTE, 8),
    inputCostPerMillion: toNonNegativeNumber(process.env.OPENAI_GATEWAY_INPUT_COST_PER_1M, 0),
    outputCostPerMillion: toNonNegativeNumber(process.env.OPENAI_GATEWAY_OUTPUT_COST_PER_1M, 0),
    defaultEstimatedCostPerRequest: toNonNegativeNumber(process.env.EAI_GATEWAY_DEFAULT_COST_PER_REQUEST, defaultEstimatedCostPerRequest)
  };
}

function toPositiveInteger(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : fallback;
}

function toNonNegativeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function currentUsagePeriod() {
  return new Date().toISOString().slice(0, 7);
}

function estimatePromptTokens(body: unknown) {
  return Math.ceil(JSON.stringify(body).length / 4);
}

function estimateCost(input: {
  promptTokens: number;
  completionTokens: number;
  inputCostPerMillion: number;
  outputCostPerMillion: number;
  defaultEstimatedCostPerRequest: number;
}) {
  const inputCost = (input.promptTokens / 1_000_000) * input.inputCostPerMillion;
  const outputCost = (input.completionTokens / 1_000_000) * input.outputCostPerMillion;
  const tokenCost = inputCost + outputCost;
  const estimatedCost = tokenCost > 0 ? tokenCost : input.defaultEstimatedCostPerRequest;
  return Number(estimatedCost.toFixed(6));
}

function extractOpenAiUsage(payload: unknown, fallbackPromptTokens: number): OpenAiUsage {
  const record = payload && typeof payload === "object" ? payload as Record<string, unknown> : {};
  const usage = record.usage && typeof record.usage === "object" ? record.usage as Record<string, unknown> : {};
  const promptTokens = toPositiveInteger(usage.input_tokens ?? usage.prompt_tokens, fallbackPromptTokens);
  const completionTokens = toPositiveInteger(usage.output_tokens ?? usage.completion_tokens, 0);
  const totalTokens = toPositiveInteger(usage.total_tokens, promptTokens + completionTokens);

  return {
    promptTokens,
    completionTokens,
    totalTokens
  };
}

function assertAllowedEndpoint(endpoint: string): asserts endpoint is GatewayEndpoint {
  if (endpoint !== "chat" && endpoint !== "robot_code_security_review") {
    throw Object.assign(new Error("Permission denied for this AI gateway endpoint."), { status: 403 });
  }
}

function assertAllowedModel(model: string, allowedModels: string[]) {
  if (!allowedModels.includes(model)) {
    throw Object.assign(new Error("This model is not allowed through the EAI AI Gateway."), { status: 403 });
  }
}

function assertBodySize(body: unknown) {
  if (JSON.stringify(body).length > maxGatewayBodyChars) {
    throw Object.assign(new Error("AI request is too large for the gateway."), { status: 413 });
  }
}

function assertRateLimit(userId: string, endpoint: GatewayEndpoint, requestsPerMinute: number) {
  const key = `${userId}:${endpoint}`;
  const now = Date.now();
  const current = gatewayRateWindows.get(key);

  if (!current || now >= current.resetAt) {
    gatewayRateWindows.set(key, { count: 1, resetAt: now + 60_000 });
    return;
  }

  if (current.count >= requestsPerMinute) {
    throw Object.assign(new Error("AI gateway rate limit exceeded. Try again in a minute."), { status: 429 });
  }

  current.count += 1;
}

async function getOrCreateGatewayCap(input: {
  userId: string;
  monthlyRequestLimit: number;
  monthlyTokenLimit: number;
  monthlyCostLimit: number;
}) {
  const period = currentUsagePeriod();
  const rows = await supabaseRequest<GatewayCapRecord[]>("agentech_ai_cap", {
    query: `user_id=eq.${encodeURIComponent(input.userId)}&select=*&limit=1`
  }).catch(() => []);

  const existing = rows[0];
  if (existing) {
    if (existing.usage_period === period) {
      return {
        ...existing,
        monthly_request_limit: Number(existing.monthly_request_limit ?? input.monthlyRequestLimit),
        current_requests: Number(existing.current_requests ?? 0)
      };
    }

    const resetRows = await supabaseRequest<GatewayCapRecord[]>("agentech_ai_cap", {
      method: "PATCH",
      query: `user_id=eq.${encodeURIComponent(input.userId)}`,
      body: {
        current_requests: 0,
        current_tokens: 0,
        current_cost: 0,
        usage_period: period,
        updated_at: new Date().toISOString()
      }
    });
    return resetRows[0] ?? { ...existing, current_requests: 0, current_tokens: 0, current_cost: 0, usage_period: period };
  }

  const createdRows = await supabaseRequest<GatewayCapRecord[]>("agentech_ai_cap", {
    method: "POST",
    body: {
      user_id: input.userId,
      monthly_request_limit: input.monthlyRequestLimit,
      monthly_token_limit: input.monthlyTokenLimit,
      monthly_cost_limit: input.monthlyCostLimit,
      current_requests: 0,
      current_tokens: 0,
      current_cost: 0,
      usage_period: period,
      updated_at: new Date().toISOString()
    }
  }).catch(() => []);

  return createdRows[0] ?? {
    user_id: input.userId,
    monthly_request_limit: input.monthlyRequestLimit,
    monthly_token_limit: input.monthlyTokenLimit,
    monthly_cost_limit: input.monthlyCostLimit,
    current_requests: 0,
    current_tokens: 0,
    current_cost: 0,
    usage_period: period,
    updated_at: new Date().toISOString()
  };
}

function assertQuota(cap: GatewayCapRecord, estimatedPromptTokens: number) {
  const monthlyRequestLimit = Number(cap.monthly_request_limit ?? 0);
  const monthlyTokenLimit = Number(cap.monthly_token_limit ?? 0);
  const monthlyCostLimit = Number(cap.monthly_cost_limit ?? 0);
  const currentRequests = Number(cap.current_requests ?? 0);
  const currentTokens = Number(cap.current_tokens ?? 0);
  const currentCost = Number(cap.current_cost ?? 0);

  if (monthlyRequestLimit > 0 && currentRequests >= monthlyRequestLimit) {
    throw Object.assign(new Error("Monthly AI request quota exceeded."), { status: 429 });
  }

  if (monthlyTokenLimit > 0 && currentTokens + estimatedPromptTokens > monthlyTokenLimit) {
    throw Object.assign(new Error("Monthly AI token quota exceeded."), { status: 429 });
  }

  if (monthlyCostLimit > 0 && currentCost >= monthlyCostLimit) {
    throw Object.assign(new Error("Monthly AI cost quota exceeded."), { status: 429 });
  }
}

async function recordGatewayUsage(input: {
  userId: string;
  endpoint: GatewayEndpoint;
  model: string;
  usage: OpenAiUsage;
  estimatedCost: number;
  statusCode: number;
  latencyMs: number;
}) {
  await supabaseRequest("agentech_ai_usage", {
    method: "POST",
    body: {
      user_id: input.userId,
      endpoint: input.endpoint,
      model: input.model,
      prompt_tokens: input.usage.promptTokens,
      completion_tokens: input.usage.completionTokens,
      total_tokens: input.usage.totalTokens,
      estimated_cost: input.estimatedCost,
      status_code: input.statusCode,
      latency_ms: input.latencyMs
    }
  }).catch(() => null);

  const capRows = await supabaseRequest<GatewayCapRecord[]>("agentech_ai_cap", {
    query: `user_id=eq.${encodeURIComponent(input.userId)}&select=*&limit=1`
  }).catch(() => []);
  const cap = capRows[0];
  if (!cap) {
    return;
  }

  await supabaseRequest("agentech_ai_cap", {
    method: "PATCH",
    query: `user_id=eq.${encodeURIComponent(input.userId)}`,
    prefer: "return=minimal",
    body: {
      current_requests: Number(cap.current_requests ?? 0) + 1,
      current_tokens: Number(cap.current_tokens ?? 0) + input.usage.totalTokens,
      current_cost: Number(cap.current_cost ?? 0) + input.estimatedCost,
      usage_period: currentUsagePeriod(),
      updated_at: new Date().toISOString()
    }
  }).catch(() => null);
}

export async function callOpenAiResponsesThroughGateway(input: {
  userId: string;
  endpoint: GatewayEndpoint;
  model: string;
  body: Record<string, unknown>;
}) {
  assertAllowedEndpoint(input.endpoint);
  const config = getGatewayConfig();
  assertAllowedModel(input.model, config.allowedModels);
  assertBodySize(input.body);
  assertRateLimit(input.userId, input.endpoint, config.requestsPerMinute);

  const estimatedPromptTokens = estimatePromptTokens(input.body);
  const cap = await getOrCreateGatewayCap({
    userId: input.userId,
    monthlyRequestLimit: config.monthlyRequestLimit,
    monthlyTokenLimit: config.monthlyTokenLimit,
    monthlyCostLimit: config.monthlyCostLimit
  });
  assertQuota(cap, estimatedPromptTokens);

  const startedAt = Date.now();
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input.body)
  });
  const latencyMs = Date.now() - startedAt;
  const payload = await response.json().catch(() => null);
  const usage = extractOpenAiUsage(payload, estimatedPromptTokens);
  const estimatedCost = estimateCost({
    promptTokens: usage.promptTokens,
    completionTokens: usage.completionTokens,
    inputCostPerMillion: config.inputCostPerMillion,
    outputCostPerMillion: config.outputCostPerMillion,
    defaultEstimatedCostPerRequest: config.defaultEstimatedCostPerRequest
  });

  await recordGatewayUsage({
    userId: input.userId,
    endpoint: input.endpoint,
    model: input.model,
    usage,
    estimatedCost,
    statusCode: response.status,
    latencyMs
  });

  return {
    ok: response.ok,
    status: response.status,
    payload,
    usage,
    estimatedCost,
    latencyMs
  };
}

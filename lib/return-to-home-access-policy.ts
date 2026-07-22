export type ReturnToHomeAccessSource = "subscription" | "purchase" | "internal" | "none";

type DatedAccessRecord = {
  status: string;
  endsAt: string | null;
};

function isCurrent(value: string | null, nowMs: number) {
  if (!value) return true;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp > nowMs;
}

export function resolveReturnToHomeAccess(input: {
  internal: boolean;
  subscriptions?: DatedAccessRecord[];
  entitlements?: DatedAccessRecord[];
  nowMs?: number;
}) {
  if (input.internal) {
    return {
      allowed: true,
      source: "internal" as const,
      subscribed: false,
      purchased: false
    };
  }

  const nowMs = input.nowMs ?? Date.now();
  const subscribed = (input.subscriptions ?? []).some(
    (item) => ["active", "trialing"].includes(item.status) && isCurrent(item.endsAt, nowMs)
  );
  const purchased = (input.entitlements ?? []).some(
    (item) => item.status === "active" && isCurrent(item.endsAt, nowMs)
  );

  return {
    allowed: subscribed || purchased,
    source: subscribed ? "subscription" as const : purchased ? "purchase" as const : "none" as const,
    subscribed,
    purchased
  };
}

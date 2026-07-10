export const usdPerAccountCredit = 0.01;

export function getAiReviewCreditCost() {
  const parsed = Number(process.env.AGENTECH_AI_REVIEW_CREDITS ?? 50);
  return Number.isFinite(parsed) && parsed > 0 ? Math.ceil(parsed) : 50;
}

export function getAiReviewRunCostUsd() {
  return Number((getAiReviewCreditCost() * usdPerAccountCredit).toFixed(2));
}

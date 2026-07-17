export const AGENTECH_COMPANY_DOMAIN = "agent-tech.ai";
export const AGENTECH_COMPANY_EMAIL_SUFFIX = `@${AGENTECH_COMPANY_DOMAIN}`;
export const AGENTECH_GATEWAY_OWNER_EMAIL = `info${AGENTECH_COMPANY_EMAIL_SUFFIX}`;
export const AGENTECH_ADDITIONAL_INTERNAL_EMAILS = ["wesleyfan2015@gmail.com"] as const;
export const AGENTECH_GATEWAY_OWNER_EMAILS = [
  AGENTECH_GATEWAY_OWNER_EMAIL,
  ...AGENTECH_ADDITIONAL_INTERNAL_EMAILS
] as const;

export function normalizeCompanyEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

export function isAgentechCompanyEmail(email: string | null | undefined) {
  const normalized = normalizeCompanyEmail(email);
  return normalized.endsWith(AGENTECH_COMPANY_EMAIL_SUFFIX) || AGENTECH_ADDITIONAL_INTERNAL_EMAILS.includes(normalized as (typeof AGENTECH_ADDITIONAL_INTERNAL_EMAILS)[number]);
}

export function isAgentechGatewayOwnerEmail(email: string | null | undefined) {
  const normalized = normalizeCompanyEmail(email);
  return AGENTECH_GATEWAY_OWNER_EMAILS.includes(normalized as (typeof AGENTECH_GATEWAY_OWNER_EMAILS)[number]);
}

export function getSoftwareCheckCreditPolicy(email: string | null | undefined) {
  const internalCompanyAccount = isAgentechCompanyEmail(email);

  return {
    internalCompanyAccount,
    chargeCreditsWhenAvailable: true,
    creditBalanceRequired: !internalCompanyAccount
  };
}

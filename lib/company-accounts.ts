export const AGENTECH_COMPANY_DOMAIN = "agent-tech.ai";
export const AGENTECH_COMPANY_EMAIL_SUFFIX = `@${AGENTECH_COMPANY_DOMAIN}`;
export const AGENTECH_GATEWAY_OWNER_EMAIL = `info${AGENTECH_COMPANY_EMAIL_SUFFIX}`;

export function normalizeCompanyEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

export function isAgentechCompanyEmail(email: string | null | undefined) {
  return normalizeCompanyEmail(email).endsWith(AGENTECH_COMPANY_EMAIL_SUFFIX);
}

export function isAgentechGatewayOwnerEmail(email: string | null | undefined) {
  return normalizeCompanyEmail(email) === AGENTECH_GATEWAY_OWNER_EMAIL;
}

export function getSoftwareCheckCreditPolicy(email: string | null | undefined) {
  const internalCompanyAccount = isAgentechCompanyEmail(email);

  return {
    internalCompanyAccount,
    chargeCreditsWhenAvailable: true,
    creditBalanceRequired: !internalCompanyAccount
  };
}

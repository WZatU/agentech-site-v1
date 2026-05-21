export type AgentechAccountSession = {
  email: string;
  signedInAt: string;
};

export const accountSessionKey = "agentechAccount";
export const legacyAccountEmailKey = "agentechAccountEmail";
export const accountSessionEvent = "agentech-account-session-change";

export function getAccountSession() {
  if (typeof window === "undefined") return null;

  const raw = window.localStorage.getItem(accountSessionKey);
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as AgentechAccountSession;
      if (parsed.email) {
        return parsed;
      }
    } catch {
      window.localStorage.removeItem(accountSessionKey);
    }
  }

  const legacyEmail = window.localStorage.getItem(legacyAccountEmailKey);
  if (legacyEmail) {
    return setAccountSession(legacyEmail);
  }

  return null;
}

export function setAccountSession(email: string) {
  const session: AgentechAccountSession = {
    email,
    signedInAt: new Date().toISOString()
  };

  window.localStorage.setItem(accountSessionKey, JSON.stringify(session));
  window.localStorage.setItem(legacyAccountEmailKey, email);
  window.dispatchEvent(new Event(accountSessionEvent));
  return session;
}

export function clearAccountSession() {
  window.localStorage.removeItem(accountSessionKey);
  window.localStorage.removeItem(legacyAccountEmailKey);
  window.dispatchEvent(new Event(accountSessionEvent));
}

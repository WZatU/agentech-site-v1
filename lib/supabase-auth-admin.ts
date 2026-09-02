const defaultPublishableKey = "sb_publishable_3PtM-SBX5-B86fvpjBaFmw_pNVwqUQe";
const authRequestTimeoutMs = 10_000;

function config() {
  // Older deployments store the Data API URL rather than the project root.
  const url = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "").replace(/\/rest\/v1$/, "");
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || defaultPublishableKey;
  if (!url || !serviceRoleKey) throw new Error("Supabase Auth admin configuration is missing.");
  return { url, serviceRoleKey, publishableKey };
}

export async function verifySupabasePassword(email: string, password: string) {
  const { url, publishableKey } = config();
  const response = await fetch(`${url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: publishableKey },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
    signal: AbortSignal.timeout(authRequestTimeoutMs)
  });
  if (response.ok) return true;

  const error = await response.json().catch(() => null) as { error_code?: string } | null;
  if (response.status === 400 && error?.error_code === "invalid_credentials") return false;

  // A service/configuration error must not trigger legacy password migration.
  throw new Error(`Supabase password verification failed (HTTP ${response.status}).`);
}

export async function ensureSupabaseAuthUser(email: string, password: string) {
  const { url, serviceRoleKey } = config();
  const headers = {
    "Content-Type": "application/json",
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`
  };
  const created = await fetch(`${url}/auth/v1/admin/users`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, password, email_confirm: true }),
    cache: "no-store",
    signal: AbortSignal.timeout(authRequestTimeoutMs)
  });
  if (created.ok) return;

  const list = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, {
    headers,
    cache: "no-store",
    signal: AbortSignal.timeout(authRequestTimeoutMs)
  });
  if (!list.ok) throw new Error("Unable to locate the Supabase Auth user.");
  const payload = await list.json() as { users?: Array<{ id?: string; email?: string }> };
  const user = payload.users?.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
  if (!user?.id) throw new Error("Unable to create the Supabase Auth user.");

  const updated = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password, email_confirm: true }),
    cache: "no-store",
    signal: AbortSignal.timeout(authRequestTimeoutMs)
  });
  if (!updated.ok) throw new Error("Unable to synchronize the Supabase Auth password.");
}

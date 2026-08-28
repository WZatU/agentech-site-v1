const defaultPublishableKey = "sb_publishable_3PtM-SBX5-B86fvpjBaFmw_pNVwqUQe";

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
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
    cache: "no-store"
  });
  return response.ok;
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
    cache: "no-store"
  });
  if (created.ok) return;

  const list = await fetch(`${url}/auth/v1/admin/users?page=1&per_page=1000`, { headers, cache: "no-store" });
  if (!list.ok) throw new Error("Unable to locate the Supabase Auth user.");
  const payload = await list.json() as { users?: Array<{ id?: string; email?: string }> };
  const user = payload.users?.find((candidate) => candidate.email?.toLowerCase() === email.toLowerCase());
  if (!user?.id) throw new Error("Unable to create the Supabase Auth user.");

  const updated = await fetch(`${url}/auth/v1/admin/users/${encodeURIComponent(user.id)}`, {
    method: "PUT",
    headers,
    body: JSON.stringify({ password, email_confirm: true }),
    cache: "no-store"
  });
  if (!updated.ok) throw new Error("Unable to synchronize the Supabase Auth password.");
}

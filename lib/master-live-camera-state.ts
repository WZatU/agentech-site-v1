import {
  normalizeMasterCameraId,
  normalizeMasterViewSelection,
  type MasterViewSelection,
} from "./master-live-camera.ts";

type StoreOptions = {
  supabaseUrl: string;
  serviceRoleKey: string;
  fetchImpl?: typeof fetch;
  now?: () => Date;
};

type StoredSelection = {
  mode: "wall" | "focus";
  camera_id: string | null;
  expires_at: string;
};

function restUrl(value: string) {
  return value.replace(/\/$/, "").replace(/\/rest\/v1$/, "") + "/rest/v1";
}

export function createMasterLiveCameraStateStore(options: StoreOptions) {
  const request = options.fetchImpl ?? fetch;
  const baseUrl = restUrl(options.supabaseUrl);
  const headers = {
    apikey: options.serviceRoleKey,
    Authorization: `Bearer ${options.serviceRoleKey}`,
    "Content-Type": "application/json",
  };
  const now = options.now ?? (() => new Date());

  return {
    async get(sessionId: number): Promise<MasterViewSelection> {
      const query = `session_id=eq.${encodeURIComponent(sessionId)}&select=mode,camera_id,expires_at&limit=1`;
      const response = await request(`${baseUrl}/master_live_camera_state?${query}`, { headers, cache: "no-store" });
      if (!response.ok) throw new Error(`Unable to read Master camera state (${response.status}).`);
      const row = (await response.json() as StoredSelection[])[0];
      if (!row || Date.parse(row.expires_at) <= now().getTime()) return { mode: "wall" };
      const cameraId = normalizeMasterCameraId(row.camera_id);
      return row.mode === "focus" && cameraId ? { mode: "focus", cameraId } : { mode: "wall" };
    },

    async set(sessionId: number, value: unknown, expiresAt: string): Promise<MasterViewSelection> {
      const selection = normalizeMasterViewSelection(value);
      const response = await request(`${baseUrl}/master_live_camera_state?on_conflict=session_id`, {
        method: "POST",
        headers: { ...headers, Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify({
          session_id: sessionId,
          mode: selection.mode,
          camera_id: selection.mode === "focus" ? selection.cameraId : null,
          expires_at: expiresAt,
        }),
      });
      if (!response.ok) throw new Error(`Unable to save Master camera state (${response.status}).`);
      return selection;
    },

    async clearExpired(at = now()): Promise<void> {
      const query = `expires_at=lte.${encodeURIComponent(at.toISOString())}`;
      const response = await request(`${baseUrl}/master_live_camera_state?${query}`, {
        method: "DELETE",
        headers,
      });
      if (!response.ok) throw new Error(`Unable to clear expired Master camera state (${response.status}).`);
    },
  };
}

function configuredStore() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) throw new Error("Supabase server configuration is missing.");
  return createMasterLiveCameraStateStore({ supabaseUrl, serviceRoleKey });
}

export async function getMasterViewSelection(sessionId: number) {
  return configuredStore().get(sessionId);
}

export async function setMasterViewSelection(sessionId: number, value: unknown, expiresAt: string) {
  return configuredStore().set(sessionId, value, expiresAt);
}

export async function clearExpiredMasterViewSelections(at = new Date(), options?: StoreOptions) {
  return (options ? createMasterLiveCameraStateStore(options) : configuredStore()).clearExpired(at);
}

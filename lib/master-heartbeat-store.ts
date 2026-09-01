import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join, resolve } from "node:path";
import {
  parseMasterHeartbeatObservation,
  type MasterHeartbeatObservation,
} from "./master-heartbeat.ts";

export type StoredMasterHeartbeat = {
  observation: MasterHeartbeatObservation;
  receivedAt: string;
};

function runtimeDirectory() {
  return resolve(process.env.MASTER_HEARTBEAT_RUNTIME_DIR || ".master-heartbeat-runtime");
}

function storagePath() {
  return join(runtimeDirectory(), "latest.json");
}

export async function writeLatestHeartbeat(record: StoredMasterHeartbeat): Promise<void> {
  const directory = runtimeDirectory();
  const destination = storagePath();
  const temporary = join(directory, `.latest-${randomBytes(8).toString("hex")}.tmp`);
  await mkdir(directory, { recursive: true });
  try {
    await writeFile(temporary, JSON.stringify(record), { encoding: "utf8", mode: 0o600 });
    await rename(temporary, destination);
  } catch (error) {
    await unlink(temporary).catch(() => undefined);
    throw error;
  }
}

export async function readLatestHeartbeat(): Promise<StoredMasterHeartbeat | null> {
  let raw: string;
  try {
    raw = await readFile(storagePath(), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    console.error("[master-heartbeat] unable to read runtime status");
    return null;
  }
  try {
    const value = JSON.parse(raw) as Record<string, unknown>;
    if (
      typeof value !== "object"
      || value === null
      || Array.isArray(value)
      || Object.keys(value).some((key) => key !== "observation" && key !== "receivedAt")
      || typeof value.receivedAt !== "string"
    ) return null;
    const receivedAt = new Date(value.receivedAt);
    if (!Number.isFinite(receivedAt.getTime())) return null;
    return {
      observation: parseMasterHeartbeatObservation(value.observation, receivedAt),
      receivedAt: receivedAt.toISOString(),
    };
  } catch {
    console.error("[master-heartbeat] corrupt runtime status ignored");
    return null;
  }
}

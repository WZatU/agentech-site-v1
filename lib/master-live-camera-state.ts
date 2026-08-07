import { normalizeMasterViewSelection, type MasterViewSelection } from "./master-live-camera.ts";

const selections = new Map<number, MasterViewSelection>();

export function getMasterViewSelection(sessionId: number): MasterViewSelection {
  return selections.get(sessionId) ?? { mode: "wall" };
}

export function setMasterViewSelection(sessionId: number, value: unknown): MasterViewSelection {
  const selection = normalizeMasterViewSelection(value);
  selections.set(sessionId, selection);
  return selection;
}

export function clearMasterViewSelection(sessionId: number) {
  selections.delete(sessionId);
}

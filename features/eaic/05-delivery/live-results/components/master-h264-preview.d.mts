export type MasterH264PreviewState = {
  phase: "connecting" | "keyframe" | "decoding" | "stopped" | "error";
  width: number;
  height: number;
  fps: number;
  codec: string;
  error: string | null;
};

export function getMasterH264PreviewUrl(relayUrl?: string): string;

export function startMasterH264Preview(options: {
  url: string;
  canvas: HTMLCanvasElement;
  onState?: (state: MasterH264PreviewState) => void;
}): () => void;


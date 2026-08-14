export type MasterH264PreviewState = {
  phase: "connecting" | "keyframe" | "decoding" | "stopped" | "error";
  cameraId: "front-main" | "front-left" | "front-right" | "rgbd-color";
  generation: number;
  width: number;
  height: number;
  fps: number;
  bytesPerSecond: number;
  codec: string;
  error: string | null;
};

export function getMasterH264PreviewUrl(
  relayUrl: string | undefined,
  cameraId: MasterH264PreviewState["cameraId"],
  mode: "wall" | "focus",
): string;

export function startMasterH264Preview(options: {
  url: string;
  cameraId: MasterH264PreviewState["cameraId"];
  canvas: HTMLCanvasElement;
  onState?: (state: MasterH264PreviewState) => void;
}): () => void;

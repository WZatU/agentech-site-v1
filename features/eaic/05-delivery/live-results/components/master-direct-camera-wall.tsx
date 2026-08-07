"use client";

import { useEffect, useRef, useState } from "react";
import { parse } from "@foxglove/rosmsg";
import { MessageReader } from "@foxglove/rosmsg2-serialization";
import { MASTER_LIVE_CAMERAS, type MasterCameraId, type MasterViewSelection } from "@/lib/master-live-camera";

type Channel = { id: number; topic: string; schema: string; schemaName: string; encoding: string };
type CompressedImage = { data: Uint8Array; format?: string; header?: { stamp?: { sec?: number; nanosec?: number } } };
type Frame = { url: string; receivedAt: number };

const RELAY_URL = process.env.NEXT_PUBLIC_MASTER_CAMERA_RELAY_URL || "ws://127.0.0.1:21275";

export function MasterDirectCameraWall({ selection }: { selection: MasterViewSelection }) {
  const [frames, setFrames] = useState<Partial<Record<MasterCameraId, Frame>>>({});
  const [status, setStatus] = useState("Connecting to Master cameras…");
  const urls = useRef(new Map<MasterCameraId, string>());
  const pendingUrls = useRef(new Map<MasterCameraId, string>());
  const paintRequest = useRef<number | null>(null);

  useEffect(() => {
    let stopped = false;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let socket: WebSocket | undefined;

    const connect = () => {
      if (stopped) return;
      setStatus("Connecting to Master cameras…");
      socket = new WebSocket(RELAY_URL, ["coBridge.websocket.v1", "foxglove.websocket.v1"]);
      socket.binaryType = "arraybuffer";
      const subscriptions = new Map<number, { cameraId: MasterCameraId; reader: MessageReader }>();

      socket.onmessage = (event) => {
        if (typeof event.data === "string") {
          const message = JSON.parse(event.data) as { op?: string; channels?: Channel[] };
          if (message.op === "login") {
            socket?.send(JSON.stringify({ op: "login", username: "Agentech Live Stream", userId: "agentech-master-live" }));
          }
          if (message.op === "serverInfo") setStatus("Master cameras connected");
          if (message.op === "advertise") {
            const wanted = MASTER_LIVE_CAMERAS.filter((camera) => selection.mode === "wall" || camera.id === selection.cameraId);
            const requests: Array<{ id: number; channelId: number }> = [];
            for (const [index, camera] of wanted.entries()) {
              const channel = message.channels?.find(({ topic }) => topic === camera.topic);
              if (!channel || channel.encoding !== "cdr") continue;
              const id = index + 1;
              subscriptions.set(id, { cameraId: camera.id, reader: new MessageReader(parse(channel.schema, { ros2: true })) });
              requests.push({ id, channelId: channel.id });
            }
            if (requests.length) {
              socket?.send(JSON.stringify({
                op: "subscribe",
                masterRobotMode: selection.mode === "focus" ? "focus" : "preview",
                subscriptions: requests,
              }));
              setStatus(`Receiving ${requests.length} Master camera${requests.length === 1 ? "" : "s"}`);
            } else {
              setStatus("Master camera topics are unavailable");
            }
          }
          return;
        }

        const decode = async () => {
          const buffer = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data as ArrayBuffer;
          const bytes = new Uint8Array(buffer);
          if (bytes.byteLength < 13 || bytes[0] !== 1) return;
          const id = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(1, true);
          const subscription = subscriptions.get(id);
          if (!subscription) return;
          const image = subscription.reader.readMessage(bytes.subarray(13)) as CompressedImage;
          const mime = String(image.format || "jpeg").toLowerCase().includes("png") ? "image/png" : "image/jpeg";
          const data = new Uint8Array(image.data);
          const url = URL.createObjectURL(new Blob([data.buffer], { type: mime }));
          const superseded = pendingUrls.current.get(subscription.cameraId);
          if (superseded) URL.revokeObjectURL(superseded);
          pendingUrls.current.set(subscription.cameraId, url);
          if (paintRequest.current == null) {
            paintRequest.current = requestAnimationFrame(() => {
              paintRequest.current = null;
              const newest = new Map(pendingUrls.current);
              pendingUrls.current.clear();
              setFrames((current) => {
                const next = { ...current };
                for (const [cameraId, newestUrl] of newest) {
                  const previous = urls.current.get(cameraId);
                  urls.current.set(cameraId, newestUrl);
                  next[cameraId] = { url: newestUrl, receivedAt: Date.now() };
                  if (previous) URL.revokeObjectURL(previous);
                }
                return next;
              });
            });
          }
        };
        void decode();
      };

      socket.onclose = () => {
        if (stopped) return;
        setStatus("Reconnecting to Master cameras…");
        reconnectTimer = setTimeout(connect, 1200);
      };
      socket.onerror = () => socket?.close();
    };

    connect();
    return () => {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      socket?.close();
    };
  }, [selection]);

  useEffect(() => () => {
    if (paintRequest.current != null) cancelAnimationFrame(paintRequest.current);
    for (const url of pendingUrls.current.values()) URL.revokeObjectURL(url);
    pendingUrls.current.clear();
    for (const url of urls.current.values()) URL.revokeObjectURL(url);
    urls.current.clear();
  }, []);

  const visible = MASTER_LIVE_CAMERAS.filter((camera) => selection.mode === "wall" || camera.id === selection.cameraId);
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-[#bfdbfe]" role="status">{status}</p>
      <div className={`grid gap-3 ${selection.mode === "wall" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {visible.map((camera) => {
          const frame = frames[camera.id];
          return (
            <div key={camera.id} data-master-camera-live className="relative aspect-video overflow-hidden border border-[#476784] bg-[#07111c]">
              {/* Blob URLs are live frames and cannot use Next's server image optimizer. */}
              {frame ? <img /* eslint-disable-line @next/next/no-img-element */ src={frame.url} alt={`${camera.label} live camera`} className="h-full w-full object-contain" /> : <div className="grid h-full place-items-center text-sm text-[#bfdbfe]">Waiting for {camera.label}…</div>}
              <span className="absolute left-2 top-2 bg-[#07111c]/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#93c5fd]">{camera.label} · {selection.mode === "wall" ? "1080p" : "4K Focus"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

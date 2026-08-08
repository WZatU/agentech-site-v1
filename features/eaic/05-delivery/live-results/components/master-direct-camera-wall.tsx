"use client";

import { useEffect, useRef, useState } from "react";
import { parse } from "@foxglove/rosmsg";
import { MessageReader } from "@foxglove/rosmsg2-serialization";
import { MASTER_LIVE_CAMERAS, type MasterCameraId, type MasterViewSelection } from "@/lib/master-live-camera";

type Channel = { id: number; topic: string; schema: string; schemaName: string; encoding: string };
type CompressedImage = { data: Uint8Array; format?: string; header?: { stamp?: { sec?: number; nanosec?: number } } };

const RELAY_URL = process.env.NEXT_PUBLIC_MASTER_CAMERA_RELAY_URL || "ws://127.0.0.1:4175/robot";

export function MasterDirectCameraWall({ selection }: { selection: MasterViewSelection }) {
  const [available, setAvailable] = useState<Partial<Record<MasterCameraId, boolean>>>({});
  const [status, setStatus] = useState("Connecting to Master cameras…");
  const canvases = useRef(new Map<MasterCameraId, HTMLCanvasElement>());
  const decodeVersions = useRef(new Map<MasterCameraId, number>());

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
          const cameraId = subscription.cameraId;
          const version = (decodeVersions.current.get(cameraId) ?? 0) + 1;
          decodeVersions.current.set(cameraId, version);
          const bitmap = await createImageBitmap(new Blob([data.buffer], { type: mime }));
          if (decodeVersions.current.get(cameraId) !== version) {
            bitmap.close();
            return;
          }
          const canvas = canvases.current.get(cameraId);
          if (!canvas) {
            bitmap.close();
            return;
          }
          if (canvas.width !== bitmap.width) canvas.width = bitmap.width;
          if (canvas.height !== bitmap.height) canvas.height = bitmap.height;
          canvas.getContext("2d", { alpha: false })?.drawImage(bitmap, 0, 0);
          bitmap.close();
          setAvailable((current) => current[cameraId] ? current : { ...current, [cameraId]: true });
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

  const visible = MASTER_LIVE_CAMERAS.filter((camera) => selection.mode === "wall" || camera.id === selection.cameraId);
  return (
    <div className="mt-4">
      <p className="mb-2 text-xs text-[#bfdbfe]" role="status">{status}</p>
      <div className={`grid gap-3 ${selection.mode === "wall" ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        {visible.map((camera) => {
          return (
            <div key={camera.id} data-master-camera-live className="relative aspect-video overflow-hidden border border-[#476784] bg-[#07111c]">
              <canvas
                ref={(node) => {
                  if (node) canvases.current.set(camera.id, node);
                  else canvases.current.delete(camera.id);
                }}
                aria-label={`${camera.label} live camera`}
                className="h-full w-full object-contain"
              />
              {available[camera.id] ? null : <div className="absolute inset-0 grid place-items-center text-sm text-[#bfdbfe]">Waiting for {camera.label}…</div>}
              <span className="absolute left-2 top-2 bg-[#07111c]/80 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#93c5fd]">{camera.label} · {selection.mode === "wall" ? "1080p" : "4K Focus"}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

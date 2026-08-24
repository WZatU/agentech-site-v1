const HEADER_BYTES = 32;
const MAGIC = [65, 72, 50, 54];
const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 8192;
const CODEC = "avc1.42c032";
const CAMERA_CODES = Object.freeze({
  1: "front-main",
  2: "front-left",
  3: "front-right",
  4: "rgbd-color",
});
const CAMERA_IDS = new Set(Object.values(CAMERA_CODES));

export function getMasterH264PreviewUrl(
  relayUrl = "ws://127.0.0.1:4173/robot",
  cameraId = "front-right",
  mode = "focus",
) {
  if (!CAMERA_IDS.has(cameraId)) throw new RangeError(`Unknown Master camera: ${cameraId}`);
  if (mode !== "wall" && mode !== "focus") throw new RangeError(`Unknown Master H.264 mode: ${mode}`);
  const value = String(relayUrl || "ws://127.0.0.1:4173/robot");
  const url = new URL(value);
  url.pathname = `/h264/${cameraId}`;
  url.search = new URLSearchParams({ scope: "preview", mode }).toString();
  return url.toString();
}

export function startMasterH264Preview(options) {
  const {
    url,
    cameraId,
    canvas,
    WebSocketImpl = globalThis.WebSocket,
    VideoDecoderImpl = globalThis.VideoDecoder,
    EncodedVideoChunkImpl = globalThis.EncodedVideoChunk,
    now = () => performance.now(),
    onState = () => {},
    setTimer = setTimeout,
    clearTimer = clearTimeout,
  } = options;
  if (!CAMERA_IDS.has(cameraId)) throw new RangeError(`Unknown Master camera: ${cameraId}`);
  const config = {
    codec: CODEC,
    optimizeForLatency: true,
    hardwareAcceleration: "prefer-hardware",
  };
  const decodedTimes = [];
  const receivedBytes = [];
  const context = canvas.getContext("2d", { alpha: false });
  let socket;
  let decoder;
  let reconnectTimer;
  let stopped = false;
  let fatal = false;
  let waitingForKeyframe = true;
  let width = 0;
  let height = 0;
  let generation = 0;
  let lastDecodingReportAt = Number.NEGATIVE_INFINITY;

  function report(phase, error = null) {
    onState({
      phase,
      cameraId,
      generation,
      width,
      height,
      fps: decodedTimes.length,
      bytesPerSecond: receivedBytes.reduce((total, entry) => total + entry[1], 0),
      codec: CODEC,
      error,
    });
  }

  function fail(error) {
    if (stopped || fatal) return;
    fatal = true;
    const message = error instanceof Error ? error.message : String(error);
    report("error", message);
    socket?.close();
  }

  function resetDecoder() {
    if (!decoder || stopped) return;
    decoder.reset();
    decoder.configure(config);
    waitingForKeyframe = true;
  }

  function handleDecodedFrame(frame) {
    if (stopped) {
      frame.close();
      return;
    }
    try {
      width = Number(frame.displayWidth || frame.codedWidth || 0);
      height = Number(frame.displayHeight || frame.codedHeight || 0);
      if (!width || !height) throw new Error("Decoded H.264 frame has invalid dimensions");
      if (canvas.width !== width) canvas.width = width;
      if (canvas.height !== height) canvas.height = height;
      if (!context) throw new Error(`${cameraId} canvas is unavailable`);
      context.drawImage(frame, 0, 0);
      const timestamp = now();
      decodedTimes.push(timestamp);
      while (decodedTimes.length && decodedTimes[0] < timestamp - 1000) decodedTimes.shift();
      if (timestamp - lastDecodingReportAt >= 250) {
        lastDecodingReportAt = timestamp;
        report("decoding");
      }
    } catch (error) {
      fail(error);
    } finally {
      frame.close();
    }
  }

  function parseEnvelope(data) {
    const bytes = data instanceof Uint8Array ? data : new Uint8Array(data);
    if (bytes.byteLength < HEADER_BYTES) throw new Error("Incomplete H.264 envelope");
    for (let index = 0; index < MAGIC.length; index += 1) {
      if (bytes[index] !== MAGIC[index]) throw new Error("Invalid H.264 envelope magic");
    }
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (view.getUint8(4) !== 2) throw new Error("Unsupported H.264 envelope version");
    const flags = view.getUint8(5);
    if ((flags & ~1) !== 0) throw new Error("Unsupported H.264 envelope flags");
    if (view.getUint8(6) !== HEADER_BYTES) throw new Error("Invalid H.264 envelope header");
    const envelopeCameraId = CAMERA_CODES[view.getUint8(7)];
    if (!envelopeCameraId) throw new Error("Unknown H.264 envelope camera");
    if (envelopeCameraId !== cameraId) throw new Error("H.264 envelope camera does not match this view");
    const frameGeneration = view.getUint32(8);
    if (frameGeneration < 1) throw new Error("Invalid H.264 envelope generation");
    const frameWidth = view.getUint16(24);
    const frameHeight = view.getUint16(26);
    if (
      frameWidth < 1 || frameWidth > MAX_DIMENSION
      || frameHeight < 1 || frameHeight > MAX_DIMENSION
    ) {
      throw new Error("Invalid H.264 envelope dimensions");
    }
    const payloadBytes = view.getUint32(28);
    if (
      payloadBytes < 1
      || payloadBytes > MAX_PAYLOAD_BYTES
      || bytes.byteLength !== HEADER_BYTES + payloadBytes
    ) {
      throw new Error("Invalid H.264 envelope payload length");
    }
    const timestampBigInt = view.getBigUint64(16);
    if (timestampBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("H.264 timestamp exceeds browser precision");
    }
    return {
      keyframe: (flags & 1) === 1,
      generation: frameGeneration,
      timestamp: Number(timestampBigInt),
      width: frameWidth,
      height: frameHeight,
      payload: bytes.slice(HEADER_BYTES),
    };
  }

  function decodeEnvelope(frame) {
    if (!decoder || stopped || fatal) return;
    if (generation !== frame.generation) {
      if (generation !== 0) resetDecoder();
      generation = frame.generation;
      waitingForKeyframe = true;
      report("keyframe");
    }
    if (waitingForKeyframe && !frame.keyframe) return;
    if (decoder.decodeQueueSize > 2) {
      resetDecoder();
      if (!frame.keyframe) {
        report("keyframe");
        return;
      }
    }
    if (frame.keyframe) waitingForKeyframe = false;
    decoder.decode(new EncodedVideoChunkImpl({
      type: frame.keyframe ? "key" : "delta",
      timestamp: frame.timestamp,
      data: frame.payload,
    }));
  }

  async function handleMessage(event) {
    try {
      const data = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
      if (stopped) return;
      const frame = parseEnvelope(data);
      const timestamp = now();
      receivedBytes.push([timestamp, frame.payload.byteLength]);
      while (receivedBytes.length && receivedBytes[0][0] < timestamp - 1000) receivedBytes.shift();
      decodeEnvelope(frame);
    } catch (error) {
      fail(error);
    }
  }

  function openSocket() {
    if (stopped || fatal) return;
    report("connecting");
    socket = new WebSocketImpl(url);
    socket.binaryType = "arraybuffer";
    socket.onopen = () => {
      waitingForKeyframe = true;
      report("keyframe");
    };
    socket.onmessage = (event) => { void handleMessage(event); };
    socket.onerror = () => socket?.close();
    socket.onclose = () => {
      if (stopped || fatal) return;
      resetDecoder();
      report("connecting", `${cameraId} H.264 stream disconnected; reconnecting`);
      reconnectTimer = setTimer(openSocket, 1000);
    };
  }

  async function initialize() {
    try {
      if (typeof VideoDecoderImpl?.isConfigSupported !== "function") {
        throw new Error("This browser does not support WebCodecs H.264 decoding");
      }
      const support = await VideoDecoderImpl.isConfigSupported(config);
      if (stopped) return;
      if (!support?.supported) throw new Error("This browser cannot decode the robot H.264 profile");
      decoder = new VideoDecoderImpl({
        output: handleDecodedFrame,
        error: (error) => fail(error),
      });
      decoder.configure(config);
      openSocket();
    } catch (error) {
      fail(error);
    }
  }

  report("connecting");
  void initialize();

  return () => {
    if (stopped) return;
    stopped = true;
    clearTimer(reconnectTimer);
    socket?.close();
    if (decoder) {
      try {
        const flush = decoder.flush();
        flush?.catch?.(() => {});
      } catch {
        // Decoder teardown continues even if an implementation cannot flush.
      }
      try { decoder.reset(); } catch {}
      try { decoder.close(); } catch {}
    }
    report("stopped");
  };
}

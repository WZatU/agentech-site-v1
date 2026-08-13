const HEADER_BYTES = 28;
const MAGIC = [65, 72, 50, 54];
const MAX_PAYLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DIMENSION = 8192;
const CODEC = "avc1.42c032";

export function getMasterH264PreviewUrl(
  relayUrl = "ws://127.0.0.1:4173/robot",
) {
  const value = String(relayUrl || "ws://127.0.0.1:4173/robot");
  if (/\/robot(?:\?.*)?$/.test(value)) {
    return value.replace(/\/robot(?:\?.*)?$/, "/h264/front-right");
  }
  const url = new URL(value);
  url.pathname = "/h264/front-right";
  url.search = "";
  return url.toString();
}

export function startMasterH264Preview(options) {
  const {
    url,
    canvas,
    WebSocketImpl = WebSocket,
    VideoDecoderImpl = VideoDecoder,
    EncodedVideoChunkImpl = EncodedVideoChunk,
    now = () => performance.now(),
    onState = () => {},
    setTimer = setTimeout,
    clearTimer = clearTimeout,
  } = options;
  const config = {
    codec: CODEC,
    optimizeForLatency: true,
    hardwareAcceleration: "prefer-hardware",
  };
  const decodedTimes = [];
  const context = canvas.getContext("2d", { alpha: false });
  let socket;
  let decoder;
  let reconnectTimer;
  let stopped = false;
  let fatal = false;
  let waitingForKeyframe = true;
  let width = 0;
  let height = 0;

  function report(phase, error = null) {
    onState({
      phase,
      width,
      height,
      fps: decodedTimes.length,
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
      if (!context) throw new Error("Front Right canvas is unavailable");
      context.drawImage(frame, 0, 0);
      const timestamp = now();
      decodedTimes.push(timestamp);
      while (decodedTimes.length && decodedTimes[0] < timestamp - 1000) decodedTimes.shift();
      report("decoding");
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
    if (view.getUint8(4) !== 1) throw new Error("Unsupported H.264 envelope version");
    const flags = view.getUint8(5);
    if ((flags & ~1) !== 0) throw new Error("Unsupported H.264 envelope flags");
    if (view.getUint16(6) !== HEADER_BYTES) throw new Error("Invalid H.264 envelope header");
    const frameWidth = view.getUint16(20);
    const frameHeight = view.getUint16(22);
    if (
      frameWidth < 1 || frameWidth > MAX_DIMENSION
      || frameHeight < 1 || frameHeight > MAX_DIMENSION
    ) {
      throw new Error("Invalid H.264 envelope dimensions");
    }
    const payloadBytes = view.getUint32(24);
    if (
      payloadBytes < 1
      || payloadBytes > MAX_PAYLOAD_BYTES
      || bytes.byteLength !== HEADER_BYTES + payloadBytes
    ) {
      throw new Error("Invalid H.264 envelope payload length");
    }
    const timestampBigInt = view.getBigUint64(12);
    if (timestampBigInt > BigInt(Number.MAX_SAFE_INTEGER)) {
      throw new Error("H.264 timestamp exceeds browser precision");
    }
    return {
      keyframe: (flags & 1) === 1,
      timestamp: Number(timestampBigInt),
      width: frameWidth,
      height: frameHeight,
      payload: bytes.slice(HEADER_BYTES),
    };
  }

  function decodeEnvelope(frame) {
    if (!decoder || stopped || fatal) return;
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
      decodeEnvelope(parseEnvelope(data));
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
      report("connecting", "Front Right H.264 stream disconnected; reconnecting");
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


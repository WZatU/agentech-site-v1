import assert from "node:assert/strict";
import test from "node:test";

import {
  getMasterH264PreviewUrl,
  startMasterH264Preview,
} from "../features/eaic/05-delivery/live-results/components/master-h264-preview.mjs";

function envelope(sequence, keyframe, timestampUs = 123456n) {
  const payload = Uint8Array.from([0, 0, 0, 1, keyframe ? 0x65 : 0x41, sequence]);
  const wire = new Uint8Array(28 + payload.length);
  wire.set([65, 72, 50, 54], 0);
  const view = new DataView(wire.buffer);
  view.setUint8(4, 1);
  view.setUint8(5, keyframe ? 1 : 0);
  view.setUint16(6, 28);
  view.setUint32(8, sequence);
  view.setBigUint64(12, timestampUs);
  view.setUint16(20, 2064);
  view.setUint16(22, 1552);
  view.setUint32(24, payload.length);
  wire.set(payload, 28);
  return wire.buffer;
}

class FakeWebSocket {
  static instances = [];

  constructor(url) {
    this.url = url;
    this.readyState = 0;
    this.closed = false;
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = 1;
    this.onopen?.();
  }

  message(data) {
    this.onmessage?.({ data });
  }

  close() {
    this.closed = true;
    this.readyState = 3;
  }
}

class FakeChunk {
  constructor(init) {
    Object.assign(this, init);
    this.data = new Uint8Array(init.data);
  }
}

class FakeDecoder {
  static instances = [];
  static support = { supported: true };
  static supportCalls = [];

  static async isConfigSupported(config) {
    this.supportCalls.push(config);
    return this.support;
  }

  constructor(callbacks) {
    this.callbacks = callbacks;
    this.decodeQueueSize = 0;
    this.chunks = [];
    this.configures = [];
    this.resetCount = 0;
    this.flushCount = 0;
    this.closed = false;
    FakeDecoder.instances.push(this);
  }

  configure(config) {
    this.configures.push(config);
  }

  decode(chunk) {
    this.chunks.push(chunk);
  }

  flush() {
    this.flushCount += 1;
    return Promise.resolve();
  }

  reset() {
    this.resetCount += 1;
    this.decodeQueueSize = 0;
  }

  close() {
    this.closed = true;
  }

  output(frame) {
    this.callbacks.output(frame);
  }
}

function fakeCanvas() {
  const draws = [];
  return {
    width: 0,
    height: 0,
    draws,
    getContext() {
      return { drawImage: (...args) => draws.push(args) };
    },
  };
}

function fakeFrame(width = 2064, height = 1552) {
  return {
    displayWidth: width,
    displayHeight: height,
    closed: false,
    close() { this.closed = true; },
  };
}

async function settle() {
  await Promise.resolve();
  await Promise.resolve();
}

function resetFakes() {
  FakeWebSocket.instances = [];
  FakeDecoder.instances = [];
  FakeDecoder.supportCalls = [];
  FakeDecoder.support = { supported: true };
}

function start(overrides = {}) {
  const states = [];
  const canvas = fakeCanvas();
  const stop = startMasterH264Preview({
    url: "ws://127.0.0.1:4173/h264/front-right",
    canvas,
    WebSocketImpl: FakeWebSocket,
    VideoDecoderImpl: FakeDecoder,
    EncodedVideoChunkImpl: FakeChunk,
    onState: (state) => states.push(state),
    ...overrides,
  });
  return { canvas, states, stop };
}

test("requires supported H264 WebCodecs before opening a socket", async () => {
  resetFakes();
  const first = start();
  assert.equal(FakeWebSocket.instances.length, 0);
  await settle();
  assert.equal(FakeDecoder.supportCalls.length, 1);
  assert.equal(FakeWebSocket.instances.length, 1);
  assert.match(FakeDecoder.supportCalls[0].codec, /^avc1\./);
  first.stop();

  resetFakes();
  FakeDecoder.support = { supported: false };
  const second = start();
  await settle();
  assert.equal(FakeWebSocket.instances.length, 0);
  assert.equal(second.states.at(-1).phase, "error");
  second.stop();
});

test("maps keyframes, deltas, and microsecond timestamps without JPEG fallback", async () => {
  resetFakes();
  const { stop } = start();
  await settle();
  const socket = FakeWebSocket.instances[0];
  const decoder = FakeDecoder.instances[0];
  socket.open();
  socket.message(envelope(1, false, 1000n));
  socket.message(envelope(2, true, 9007199254740000n));
  socket.message(envelope(3, false, 9007199254740001n));
  await settle();
  assert.deepEqual(decoder.chunks.map(({ type }) => type), ["key", "delta"]);
  assert.deepEqual(decoder.chunks.map(({ timestamp }) => timestamp), [9007199254740000, 9007199254740001]);
  assert.equal(decoder.chunks[0].data[4], 0x65);
  assert.doesNotMatch(socket.url, /\/robot(?:$|\?)/);
  stop();
});

test("draws native frames, closes them, and reports decoded FPS", async () => {
  resetFakes();
  const clock = [0, 200, 400];
  const { canvas, states, stop } = start({ now: () => clock.shift() ?? 400 });
  await settle();
  const decoder = FakeDecoder.instances[0];
  const first = fakeFrame();
  const second = fakeFrame();
  const third = fakeFrame();
  decoder.output(first);
  decoder.output(second);
  decoder.output(third);
  assert.equal(canvas.width, 2064);
  assert.equal(canvas.height, 1552);
  assert.equal(canvas.draws.length, 3);
  assert.equal(first.closed && second.closed && third.closed, true);
  assert.equal(states.at(-1).phase, "decoding");
  assert.equal(states.at(-1).fps, 3);
  stop();
});

test("drops overloaded deltas and resumes only from a keyframe", async () => {
  resetFakes();
  const { stop } = start();
  await settle();
  const socket = FakeWebSocket.instances[0];
  const decoder = FakeDecoder.instances[0];
  socket.open();
  socket.message(envelope(1, true));
  decoder.decodeQueueSize = 3;
  socket.message(envelope(2, false));
  socket.message(envelope(3, false));
  socket.message(envelope(4, true));
  await settle();
  assert.deepEqual(decoder.chunks.map(({ type }) => type), ["key", "key"]);
  assert.ok(decoder.resetCount >= 1);
  stop();
});

test("cleanup closes transport and decoder while protocol errors are visible", async () => {
  resetFakes();
  const first = start();
  await settle();
  const socket = FakeWebSocket.instances[0];
  const decoder = FakeDecoder.instances[0];
  socket.open();
  socket.message(new Uint8Array([1, 2, 3]).buffer);
  await settle();
  assert.equal(first.states.at(-1).phase, "error");
  first.stop();
  assert.equal(socket.closed, true);
  assert.equal(decoder.flushCount, 1);
  assert.ok(decoder.resetCount >= 1);
  assert.equal(decoder.closed, true);
});

test("derives the H264 endpoint only from the local relay URL", () => {
  assert.equal(
    getMasterH264PreviewUrl("ws://127.0.0.1:4173/robot"),
    "ws://127.0.0.1:4173/h264/front-right",
  );
});


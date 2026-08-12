import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const launcher = readFileSync(new URL("./master-camera-web-service/start-master-camera-web.sh", import.meta.url), "utf8");
const unit = readFileSync(new URL("./master-camera-web-service/agentech-master-camera-web.service", import.meta.url), "utf8");

test("Master camera service optimizes all four approved views and excludes rear", () => {
  for (const topic of ["front_main", "front_left", "front_right", "rgbd_color"]) {
    assert.match(launcher, new RegExp(`/agentech/web/${topic}/compressed`));
  }
  assert.doesNotMatch(launcher, /rear|rgb_head_rear/);
  assert.match(launcher, /--max-fps 30/);
});

test("Master camera service uses the proven low-latency wall resolution", () => {
  assert.equal((launcher.match(/--width 480 --height 360/g) ?? []).length, 4);
  assert.doesNotMatch(launcher, /--width (1280|1920|2064)/);
});

test("Master camera service defines subscriber-aware focus publishers", () => {
  for (const topic of ["front_main", "front_left", "front_right", "rgbd_color"]) {
    assert.match(launcher, new RegExp(`/agentech/web/focus/${topic}/compressed`));
  }
  assert.equal((launcher.match(/--width 1440 --height 1080 --quality 50 --max-fps 30/g) ?? []).length, 3);
  assert.equal((launcher.match(/--width 640 --height 480 --quality 50 --max-fps 30/g) ?? []).length, 1);
  assert.equal((launcher.match(/--pause-without-subscribers/g) ?? []).length, 4);
});

test("focus worker failures do not stop wall publishers", () => {
  assert.match(launcher, /start_focus_stream/);
  assert.match(launcher, /wait -n "\$\{wall_pids\[@\]\}"/);
  assert.match(launcher, /while true/);
});

test("Master camera service automatically recovers after a process or reboot", () => {
  assert.match(unit, /^Restart=always$/m);
  assert.match(unit, /^RestartSec=2$/m);
  assert.match(unit, /^WantedBy=default\.target$/m);
  assert.match(unit, /start-master-camera-web\.sh/);
});

test("Master camera launcher tolerates the vendor environment script status", () => {
  assert.match(
    launcher,
    /source \/agibot\/software\/entry\/cfg\/env\.sh[^\n]*\|\| true/,
  );
  assert.ok(
    launcher.indexOf("source /agibot/software/entry/cfg/env.sh") <
      launcher.indexOf("set -Eeu"),
    "strict unset-variable handling must start after the vendor environment loads",
  );
});

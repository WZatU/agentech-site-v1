import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const launcher = readFileSync(new URL("./master-camera-web-service/start-master-camera-web.sh", import.meta.url), "utf8");
const unit = readFileSync(new URL("./master-camera-web-service/agentech-master-camera-web.service", import.meta.url), "utf8");
const focusService = readFileSync(new URL("./master_camera_focus_service.py", import.meta.url), "utf8");

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

test("Front Main focus uses one dedicated subscriber-aware 2K worker", () => {
  assert.match(
    launcher,
    /start_focus_stream --input-topic \/aima\/hal\/sensor\/rgb_head_front_center\/rgb_image\/compressed --output-topic \/agentech\/web\/focus\/front_main\/compressed --node-name agentech_web_focus_front_main --width 2560 --height 1851 --quality 50 --max-fps 30 --pause-without-subscribers/,
  );
  assert.doesNotMatch(focusService, /rgb_head_front_center/);
  assert.doesNotMatch(focusService, /focus\/front_main/);
  assert.equal((launcher.match(/--pause-without-subscribers/g) ?? []).length, 5);
});

test("shared focus worker keeps Left Right and RGB-D at their current profiles", () => {
  for (const topic of ["front_left", "front_right", "rgbd_color"]) {
    assert.match(focusService, new RegExp(`/agentech/web/focus/${topic}/compressed`));
  }
  assert.equal((launcher.match(/master_camera_focus_service\.py/g) ?? []).length, 1);
  assert.match(focusService, /FOCUS_WIDTH = 960/);
  assert.match(focusService, /FOCUS_HEIGHT = 720/);
  assert.match(focusService, /FOCUS_MAX_FPS = 30/);
});

test("shared focus worker failures do not stop wall publishers", () => {
  assert.match(launcher, /start_focus_service/);
  assert.match(launcher, /wait -n "\$\{wall_pids\[@\]\}"/);
  assert.match(launcher, /while true/);
});

test("front focus cameras share one persistent NVIDIA pipeline", () => {
  assert.equal((focusService.match(/Gst\.parse_launch/g) ?? []).length, 1);
  assert.match(focusService, /select_active_front/);
  assert.match(focusService, /self\._front_pipeline/);
  assert.doesNotMatch(focusService, /set_state\(self\._gst\.State\.NULL\).*subscriber/s);
});

test("wall encoders pause while one focus stream owns the video budget", () => {
  assert.equal((launcher.match(/start_wall_stream [^\n]*--pause-without-subscribers/g) ?? []).length, 4);
});

test("RGB-D focus forwards the native compressed frame without re-encoding", () => {
  assert.match(focusService, /def _on_rgbd_image/);
  assert.match(focusService, /self\._rgbd_publisher\.publish\(message\)/);
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

#!/usr/bin/env bash
set -o pipefail
source /agibot/software/entry/cfg/env.sh >/dev/null 2>&1 || true
set -Eeu

optimizer=/home/run/.local/share/agentech/master_camera_web_optimizer.py
focus_service=/home/run/.local/share/agentech/master_camera_focus_service.py
wall_pids=()
focus_pids=()

stop_all() {
  trap - EXIT INT TERM
  local all_pids=("${wall_pids[@]}" "${focus_pids[@]}")
  if ((${#all_pids[@]})); then
    kill -TERM "${all_pids[@]}" 2>/dev/null || true
    wait "${all_pids[@]}" 2>/dev/null || true
  fi
}
trap stop_all EXIT INT TERM

start_wall_stream() {
  python3 "$optimizer" "$@" &
  wall_pids+=("$!")
}

start_focus_service() {
  (
    while true; do
      python3 "$focus_service" || true
      sleep 1
    done
  ) &
  focus_pids+=("$!")
}

start_wall_stream --input-topic /aima/hal/sensor/rgb_head_front_center/rgb_image/compressed --output-topic /agentech/web/front_main/compressed --node-name agentech_web_front_main --width 480 --height 360 --quality 25 --max-fps 30 --pause-without-subscribers
start_wall_stream --input-topic /aima/hal/sensor/stereo_head_front_left/rgb_image/compressed --output-topic /agentech/web/front_left/compressed --node-name agentech_web_front_left --width 480 --height 360 --quality 25 --max-fps 30 --pause-without-subscribers
start_wall_stream --input-topic /aima/hal/sensor/stereo_head_front_right/rgb_image/compressed --output-topic /agentech/web/front_right/compressed --node-name agentech_web_front_right --width 480 --height 360 --quality 25 --max-fps 30 --pause-without-subscribers
start_wall_stream --input-topic /aima/hal/sensor/rgbd_head_front/rgb_image/compressed --output-topic /agentech/web/rgbd_color/compressed --node-name agentech_web_rgbd_color --width 480 --height 360 --quality 25 --max-fps 30 --pause-without-subscribers

start_focus_service

wait -n "${wall_pids[@]}"

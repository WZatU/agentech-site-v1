"""Trusted robot-side executor. It accepts inert JSON, never customer Python."""
from __future__ import annotations

import json
import importlib.util
import sys
from pathlib import Path

from agentech import Agentech


def _load_device_results_module():
    module_path = Path(__file__).with_name("aegis-device-results.py")
    spec = importlib.util.spec_from_file_location("aegis_device_results", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("unable to load AEGIS device results serializer")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_device_results = _load_device_results_module()
TELEMETRY_COMMANDS = _device_results.TELEMETRY_COMMANDS
failure_record = _device_results.failure_record
success_record = _device_results.success_record
write_result = _device_results.write_result

LEGACY_LINEAR_COMMANDS = {"forward", "backward", "lateral", "lateral_left", "lateral_right"}
LOCAL_VELOCITY_COMMANDS = LEGACY_LINEAR_COMMANDS | {"diagonal"}
ALLOWED = {
    "forward", "backward", "lateral", "lateral_left", "lateral_right", "diagonal",
    "squat_forward", "squat_backward", "squat_lateral", "squat_diagonal", "squat_turn",
    "turn", "turn_right", "turn_left", "u_turn", "yaw", "pitch", "roll", "stay",
    "backflip", "jump", "stand", "squat", "sit", "stop", "emergency_stop",
    "get_battery_status", "get_body_state", "capture_image",
}


def end_session_lie_down() -> None:
    try:
        print("[robot-runner] booked session ended; Agentech.sit({})", flush=True)
        Agentech.sit(host="127.0.0.1")
    finally:
        Agentech.stop(host="127.0.0.1")


def main() -> None:
    if len(sys.argv) == 2 and sys.argv[1] == "--lie-down":
        end_session_lie_down()
        return
    if len(sys.argv) == 2:
        plan_path = Path(sys.argv[1])
        results_path = None
    elif len(sys.argv) == 4 and sys.argv[2] == "--results":
        plan_path = Path(sys.argv[1])
        results_path = Path(sys.argv[3])
    else:
        raise SystemExit(
            "usage: trusted-robot-runner.py PLAN.json [--results RESULTS.json] | --lie-down"
        )
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    if plan.get("version") != 1 or not isinstance(plan.get("commands"), list):
        raise ValueError("unsupported command plan")
    capture_index = 0
    records = []
    try:
        for command in plan["commands"]:
            name, args = command.get("name"), command.get("args")
            if name not in ALLOWED or not isinstance(args, dict):
                raise ValueError("unapproved command plan entry")
            if name == "capture_image":
                capture_index += 1
                source = args.get("source", "default")
                if not isinstance(source, str) or not source.strip():
                    raise ValueError("capture_image source must be a non-empty string")
                translated = {
                    "output": str(plan_path.with_name(f"{plan_path.stem}-capture-{capture_index}.jpg")),
                    "source": source,
                }
            else:
                aliases = {"speed_mps": "speed", "duration_s": "seconds"} if name in LEGACY_LINEAR_COMMANDS else {}
                translated = {aliases.get(key, key): value for key, value in args.items()}
            if name in LOCAL_VELOCITY_COMMANDS:
                translated.setdefault("backend", "dog_task")
            elif name != "capture_image":
                translated.setdefault("host", "127.0.0.1")
            if name in {"turn", "turn_left", "turn_right", "u_turn"}:
                angles = {"turn_left": -90.0, "turn_right": 90.0, "u_turn": -180.0}
                if name != "turn":
                    name = "turn"
                    translated.setdefault("angle_deg", angles[command["name"]])
                translated.setdefault("host", "127.0.0.1")
            try:
                value = getattr(Agentech, name)(**translated)
                if command["name"] in TELEMETRY_COMMANDS and results_path:
                    records.append(success_record(command, value))
                    write_result(results_path, records)
            except Exception as error:
                if command["name"] in TELEMETRY_COMMANDS and results_path:
                    records.append(failure_record(command, error))
                    write_result(results_path, records)
                raise
    finally:
        Agentech.stop(host="127.0.0.1")


if __name__ == "__main__":
    main()

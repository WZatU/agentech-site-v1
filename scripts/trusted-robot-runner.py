"""Trusted robot-side executor. It accepts inert JSON, never customer Python."""
from __future__ import annotations

import argparse
import importlib.util
import json
import signal
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from agentech import Agentech


def _load_sibling(module_name: str, filename: str):
    module_path = Path(__file__).with_name(filename)
    spec = importlib.util.spec_from_file_location(module_name, module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"unable to load trusted runner dependency {filename}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


_gateway_spec = _load_sibling("aegis_gateway_spec", "aegis_gateway_spec.py")
_device_results = _load_sibling("aegis_device_results", "aegis-device-results.py")
_runner_result = _load_sibling("aegis_runner_result", "aegis-runner-result.py")

validate_aegis_plan = _gateway_spec.validate_aegis_plan
TELEMETRY_COMMANDS = _device_results.TELEMETRY_COMMANDS
failure_record = _device_results.failure_record
not_supported_record = _device_results.not_supported_record
success_record = _device_results.success_record
write_result = _device_results.write_result
build_final_result = _runner_result.build_final_result
error_value = _runner_result.error_value
json_safe = _runner_result.json_safe
utc_timestamp = _runner_result.utc_timestamp
write_final_result = _runner_result.write_final_result

LEGACY_LINEAR_COMMANDS = {"forward", "backward", "lateral_left", "lateral_right"}
LOCAL_VELOCITY_COMMANDS = LEGACY_LINEAR_COMMANDS | {"diagonal"}


class SessionTerminated(RuntimeError):
    """Raised when the Gateway ends a runner at the booked boundary."""


def _termination_handler(signum, _frame) -> None:
    raise SessionTerminated(f"runner terminated by signal {signum}")


def _diary_path(plan_path: Path) -> Path:
    suffix = ".plan.json"
    if plan_path.name.endswith(suffix):
        return plan_path.with_name(plan_path.name[: -len(suffix)] + ".diary.jsonl")
    return plan_path.with_suffix(".diary.jsonl")


def _timestamps() -> tuple[str, str]:
    local = datetime.now().astimezone()
    utc = local.astimezone(timezone.utc)
    offset = local.strftime("%z")
    return (
        utc.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        local.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3]
        + offset[:3]
        + ":"
        + offset[3:],
    )


def _append_diary(diary_path: Path, event: str, **details: Any) -> None:
    timestamp_utc, timestamp_local = _timestamps()
    record = {
        "event": event,
        "timestamp_utc": timestamp_utc,
        "timestamp_local": timestamp_local,
        "timestamp_local_offset": timestamp_local[-6:],
        **details,
    }
    diary_path.parent.mkdir(parents=True, exist_ok=True)
    with diary_path.open("a", encoding="utf-8") as diary:
        diary.write(json.dumps(record, ensure_ascii=False, sort_keys=True) + "\n")


def _translated_call(plan_path: Path, command: dict[str, Any], capture_index: int):
    source_name = command["name"]
    arguments = dict(command["args"])
    name = source_name
    if name == "capture_image":
        source = arguments.get("source", "default")
        translated = {
            "output": str(
                plan_path.with_name(
                    f"{plan_path.stem}-capture-{capture_index}.jpg"
                )
            ),
            "source": source,
        }
    else:
        aliases = (
            {"speed_mps": "speed", "duration_s": "seconds"}
            if name in LEGACY_LINEAR_COMMANDS
            else {}
        )
        translated = {
            aliases.get(key, key): value for key, value in arguments.items()
        }
    if name in LOCAL_VELOCITY_COMMANDS:
        translated.setdefault("backend", "dog_task")
    elif name != "capture_image":
        translated.setdefault("host", "127.0.0.1")
    if name in {"turn", "turn_left", "turn_right", "u_turn"}:
        shortcut_angles = {
            "turn_left": -90.0,
            "turn_right": 90.0,
            "u_turn": -180.0,
        }
        if name != "turn":
            name = "turn"
            translated.setdefault("angle_deg", shortcut_angles[source_name])
        translated.setdefault("host", "127.0.0.1")
    return name, translated


def end_session_lie_down() -> None:
    try:
        print("[robot-runner] booked session ended; Agentech.sit({})", flush=True)
        Agentech.sit(host="127.0.0.1")
    finally:
        Agentech.stop(host="127.0.0.1")


def execute(
    plan_path: Path,
    *,
    results_path: Path | None = None,
    final_result_path: Path | None = None,
    agentech=Agentech,
) -> dict[str, Any]:
    plan_path = Path(plan_path)
    plan_bytes = plan_path.read_bytes()
    plan = json.loads(plan_bytes.decode("utf-8"))
    if not isinstance(plan, dict):
        raise ValueError("AEGIS plan must be a JSON object")

    diary_path = _diary_path(plan_path)
    started_at = utc_timestamp()
    commands: list[dict[str, Any]] = []
    telemetry_records: list[dict[str, Any]] = []
    primary_error: BaseException | None = None
    final_error: dict[str, Any] | None = None
    validated = False
    terminal_emergency_stop_started = False
    current_index: int | None = None
    current_command: dict[str, Any] | None = None

    try:
        validate_aegis_plan(plan)
        validated = True
        diary_path.unlink(missing_ok=True)
        _append_diary(
            diary_path,
            "session_started",
            status="started",
            submission_id=plan.get("submission_id"),
            source_sha256=plan.get("source_sha256"),
            command_count=len(plan["commands"]),
        )
        capture_index = 0
        for current_index, current_command in enumerate(plan["commands"], start=1):
            source_name = current_command["name"]
            if source_name == "capture_image":
                capture_index += 1
            name, translated = _translated_call(
                plan_path, current_command, capture_index
            )
            command_started_at = utc_timestamp()
            start_clock = time.perf_counter()
            _append_diary(
                diary_path,
                "command_started",
                status="started",
                command_index=current_index,
                command=source_name,
                source_line=current_command.get("line"),
                args=current_command["args"],
            )
            try:
                if source_name == "emergency_stop":
                    terminal_emergency_stop_started = True
                value = getattr(agentech, name)(**translated)
                if source_name in TELEMETRY_COMMANDS and results_path is not None:
                    telemetry_records.append(success_record(current_command, value))
                    write_result(Path(results_path), telemetry_records)
                duration_ms = round((time.perf_counter() - start_clock) * 1000, 3)
                command_result = {
                    "command_index": current_index,
                    "name": source_name,
                    "args": json_safe(current_command["args"]),
                    "source_args": json_safe(
                        current_command.get("source_args", current_command["args"])
                    ),
                    "line": current_command.get("line"),
                    "status": "completed",
                    "result": json_safe(value),
                    "error": None,
                    "started_at": command_started_at,
                    "duration_ms": duration_ms,
                }
                commands.append(command_result)
                _append_diary(
                    diary_path,
                    "command_completed",
                    status="completed",
                    command_index=current_index,
                    command=source_name,
                    source_line=current_command.get("line"),
                    args=current_command["args"],
                    result=command_result["result"],
                    duration_ms=duration_ms,
                )
            except Exception as error:
                duration_ms = round((time.perf_counter() - start_clock) * 1000, 3)
                structured_error = error_value(
                    error,
                    command_index=current_index,
                    command=source_name,
                    line=current_command.get("line"),
                )
                commands.append(
                    {
                        "command_index": current_index,
                        "name": source_name,
                        "args": json_safe(current_command["args"]),
                        "source_args": json_safe(
                            current_command.get("source_args", current_command["args"])
                        ),
                        "line": current_command.get("line"),
                        "status": "failed",
                        "result": None,
                        "error": structured_error,
                        "started_at": command_started_at,
                        "duration_ms": duration_ms,
                    }
                )
                _append_diary(
                    diary_path,
                    "command_failed",
                    status="failed",
                    command_index=current_index,
                    command=source_name,
                    source_line=current_command.get("line"),
                    args=current_command["args"],
                    duration_ms=duration_ms,
                    error=structured_error,
                )
                if source_name in TELEMETRY_COMMANDS and results_path is not None:
                    serializer = (
                        not_supported_record
                        if getattr(error, "reason", None) is not None
                        else failure_record
                    )
                    telemetry_records.append(serializer(current_command, error))
                    write_result(Path(results_path), telemetry_records)
                raise
    except Exception as error:
        primary_error = error
        if final_error is None:
            final_error = error_value(
                error,
                command_index=current_index,
                command=(current_command or {}).get("name"),
                line=(current_command or {}).get("line"),
            )
    finally:
        if validated and terminal_emergency_stop_started:
            _append_diary(
                diary_path,
                "cleanup_skipped",
                status="completed",
                reason="terminal_emergency_stop",
            )
        elif validated:
            try:
                agentech.stop(host="127.0.0.1")
                _append_diary(diary_path, "cleanup_completed", status="completed")
            except Exception as cleanup_error:
                cleanup_value = error_value(cleanup_error, command="stop")
                _append_diary(
                    diary_path,
                    "cleanup_failed",
                    status="failed",
                    error=cleanup_value,
                )
                if primary_error is None:
                    primary_error = cleanup_error
                    final_error = cleanup_value

        finished_at = utc_timestamp()
        if validated:
            _append_diary(
                diary_path,
                "session_failed" if final_error else "session_completed",
                status="failed" if final_error else "completed",
                command_count=len(plan.get("commands", [])),
                completed_count=sum(
                    item.get("status") == "completed" for item in commands
                ),
                error=final_error,
            )
        result = build_final_result(
            plan=plan,
            plan_path=plan_path,
            plan_bytes=plan_bytes,
            commands=commands,
            started_at=started_at,
            finished_at=finished_at,
            error=final_error,
            diary_path=diary_path,
        )
        if final_result_path is not None:
            write_final_result(Path(final_result_path), result)

    if primary_error is not None:
        raise primary_error
    return result


def _arguments(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("plan", nargs="?", type=Path)
    parser.add_argument("--results", type=Path)
    parser.add_argument("--final-result", type=Path)
    parser.add_argument("--lie-down", action="store_true")
    arguments = parser.parse_args(argv)
    if arguments.lie_down:
        if arguments.plan or arguments.results or arguments.final_result:
            parser.error("--lie-down cannot be combined with a command plan")
    elif arguments.plan is None:
        parser.error("PLAN.json is required")
    return arguments


def main() -> None:
    arguments = _arguments(sys.argv[1:])
    if arguments.lie_down:
        end_session_lie_down()
        return
    previous_handlers = {}
    for signum in (signal.SIGTERM, signal.SIGINT):
        previous_handlers[signum] = signal.getsignal(signum)
        signal.signal(signum, _termination_handler)
    try:
        execute(
            arguments.plan,
            results_path=arguments.results,
            final_result_path=arguments.final_result,
        )
    finally:
        for signum, handler in previous_handlers.items():
            signal.signal(signum, handler)


if __name__ == "__main__":
    main()

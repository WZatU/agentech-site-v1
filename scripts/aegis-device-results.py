"""Serialize allowlisted AEGIS telemetry returns into a private JSON sidecar."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


TELEMETRY_COMMANDS = {"get_battery_status", "get_body_state"}


def json_safe(value: Any) -> Any:
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    if isinstance(value, dict):
        return {str(key): json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [json_safe(item) for item in value]
    if hasattr(value, "__dict__"):
        return {
            key: json_safe(item)
            for key, item in vars(value).items()
            if not key.startswith("_")
        }
    return repr(value)


def _recorded_at(value: str | None) -> str:
    return value or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def _identity(command: dict[str, Any]) -> tuple[str, int | None]:
    name = command.get("name")
    if name not in TELEMETRY_COMMANDS:
        raise ValueError("device result command is not allowlisted")
    line = command.get("line")
    return name, line if isinstance(line, int) else None


def success_record(
    command: dict[str, Any], value: Any, recorded_at: str | None = None
) -> dict[str, Any]:
    name, line = _identity(command)
    return {
        "command": name,
        "line": line,
        "status": "completed",
        "result": json_safe(value),
        "error": None,
        "recorded_at": _recorded_at(recorded_at),
    }


def failure_record(
    command: dict[str, Any], error: BaseException, recorded_at: str | None = None
) -> dict[str, Any]:
    name, line = _identity(command)
    return {
        "command": name,
        "line": line,
        "status": "failed",
        "result": None,
        "error": {"type": type(error).__name__, "message": str(error)},
        "recorded_at": _recorded_at(recorded_at),
    }


def write_result(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(records, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)

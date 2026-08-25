"""Build and atomically persist authoritative AEGIS execution results."""
from __future__ import annotations

import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def utc_timestamp() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace(
        "+00:00", "Z"
    )


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


def plan_sha256(plan_bytes: bytes) -> str:
    return hashlib.sha256(plan_bytes).hexdigest()


def session_id_from_path(plan_path: Path) -> str:
    match = re.fullmatch(r"session-(.+)\.plan\.json", plan_path.name)
    if match:
        return match.group(1)
    name = plan_path.name
    if name.endswith(".plan.json"):
        name = name[: -len(".plan.json")]
    return name or "unknown"


def error_value(
    error: BaseException,
    *,
    command_index: int | None = None,
    command: str | None = None,
    line: int | None = None,
) -> dict[str, Any]:
    value: dict[str, Any] = {
        "type": type(error).__name__,
        "message": str(error),
    }
    if command_index is not None:
        value["command_index"] = command_index
    if command is not None:
        value["command"] = command
    if line is not None:
        value["line"] = line
    for field in ("capability", "reason", "device"):
        detail = getattr(error, field, None)
        if detail is not None:
            value[field] = str(detail)
    return value


def build_final_result(
    *,
    plan: dict[str, Any],
    plan_path: Path,
    plan_bytes: bytes,
    commands: list[dict[str, Any]],
    started_at: str,
    finished_at: str,
    error: dict[str, Any] | None,
    diary_path: Path,
) -> dict[str, Any]:
    completed_count = sum(item.get("status") == "completed" for item in commands)
    return {
        "schema_version": 1,
        "outcome": "failed" if error else "completed",
        "session_id": session_id_from_path(plan_path),
        "submission_id": plan.get("submission_id"),
        "source_sha256": plan.get("source_sha256"),
        "plan_sha256": plan_sha256(plan_bytes),
        "robot_model": plan.get("robot_model"),
        "device_profile": json_safe(plan.get("device_profile")),
        "command_count": len(plan.get("commands", [])),
        "completed_count": completed_count,
        "started_at": started_at,
        "finished_at": finished_at,
        "commands": commands,
        "error": error,
        "diary_path": str(diary_path),
    }


def write_final_result(path: Path, result: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


__all__ = [
    "build_final_result",
    "error_value",
    "json_safe",
    "session_id_from_path",
    "utc_timestamp",
    "write_final_result",
]

"""Website JSON adapter for the Navi MuJoCo SDK translator.

The adapter reads one request from stdin and writes the same preview-shaped JSON
contract used by the Aegis simulator. User code is parsed by the translator's
restricted AST pipeline and is never executed as Python.
"""

from __future__ import annotations

import base64
import io
import json
import math
import sys
from pathlib import Path
from typing import Any, Iterable, Sequence, TypeVar

from PIL import Image

from backends.mujoco_backend import MujocoBackend
from translator.limits import TranslationLimits
from translator.parser import TranslationParser
from translator.registry import MethodRegistry
from translator.scheduler import CommandScheduler
from translator.spec_loader import load_sdk_spec


PROJECT_ROOT = Path(__file__).resolve().parent
CONFIG_ROOT = PROJECT_ROOT / "config"
MODEL_PATH = PROJECT_ROOT / "scene.xml"
T = TypeVar("T")


class PreviewError(ValueError):
    """Readable validation or simulation error returned to the website."""


def _bounded_int(value: object, default: int, minimum: int, maximum: int) -> int:
    try:
        parsed = int(value)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        parsed = default
    return max(minimum, min(maximum, parsed))


def _sample(items: Sequence[T], maximum: int) -> list[T]:
    if not items:
        return []
    if maximum <= 1:
        return [items[-1]]
    if len(items) <= maximum:
        return list(items)
    indexes = {
        round(index * (len(items) - 1) / (maximum - 1))
        for index in range(maximum)
    }
    return [items[index] for index in sorted(indexes)]


def _format_issues(issues: Iterable[object]) -> str:
    messages: list[str] = []
    for issue in issues:
        to_dict = getattr(issue, "to_dict", None)
        payload = to_dict() if callable(to_dict) else {}
        message = str(payload.get("message") or issue)
        line = payload.get("line")
        messages.append(f"Line {line}: {message}" if line else message)
    return " ".join(messages)


def _pose(row: dict[str, Any]) -> dict[str, float]:
    return {
        "x": float(row.get("base_position_x", 0.0)),
        "y": float(row.get("base_position_y", 0.0)),
        "z": float(row.get("base_position_z", 0.0)),
        "roll": math.degrees(float(row.get("roll", 0.0))),
        "pitch": math.degrees(float(row.get("pitch", 0.0))),
        "yaw": math.degrees(float(row.get("yaw", 0.0))),
    }


def _render_data_url(frame: Any, width: int, height: int) -> str:
    image = Image.fromarray(frame)
    image.thumbnail((width, height), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (width, height), (0, 0, 0))
    offset = ((width - image.width) // 2, (height - image.height) // 2)
    canvas.paste(image.convert("RGB"), offset)
    buffer = io.BytesIO()
    canvas.save(buffer, format="JPEG", quality=82, optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return f"data:image/jpeg;base64,{encoded}"


def run_preview(payload: dict[str, Any]) -> dict[str, Any]:
    code = str(payload.get("code") or "")
    if not code.strip():
        raise PreviewError("No Navi code provided.")

    max_render_frames = _bounded_int(
        payload.get("max_render_frames"), 32, 1, 48
    )
    render_width = _bounded_int(payload.get("render_width"), 480, 240, 960)
    render_height = _bounded_int(payload.get("render_height"), 320, 180, 720)

    limits = TranslationLimits().with_overrides(max_simulation_time=45.0)
    spec = load_sdk_spec(CONFIG_ROOT / "sdk_spec.json")
    registry = MethodRegistry(spec)
    translation = TranslationParser(
        spec,
        registry,
        CONFIG_ROOT / "action_ground_truth.json",
        limits,
    ).parse_source(code, "<website>")
    if not translation.valid:
        raise PreviewError(_format_issues(translation.issues))

    schedule = CommandScheduler(limits).schedule(
        translation.commands, strict=False
    )
    if not schedule.valid:
        raise PreviewError(_format_issues(schedule.issues))

    backend = MujocoBackend(
        max_simulation_time=45.0,
        viewer=False,
        record_video=True,
        video_path=None,
        seed=0,
        config_dir=CONFIG_ROOT,
    )
    try:
        execution = backend.execute(schedule.commands)
        captured_frames = list(backend._video_frames)
        timestep = float(backend.model.opt.timestep)
    finally:
        backend.finalize()

    if execution.error_code:
        detail = next(
            (
                str(result.message)
                for result in backend.command_results
                if result.error_code and result.message
            ),
            execution.error_code,
        )
        raise PreviewError(detail)

    trace = _sample(execution.state_trace, 40)
    poses = [_pose(row) for row in trace]
    if not poses:
        final_state = execution.final_state or {}
        position = final_state.get("base_position") or (0.0, 0.0, 0.0)
        orientation = final_state.get("orientation_rpy") or (0.0, 0.0, 0.0)
        poses = [
            {
                "x": float(position[0]),
                "y": float(position[1]),
                "z": float(position[2]),
                "roll": math.degrees(float(orientation[0])),
                "pitch": math.degrees(float(orientation[1])),
                "yaw": math.degrees(float(orientation[2])),
            }
        ]

    rendered_frames = [
        _render_data_url(frame, render_width, render_height)
        for frame in _sample(captured_frames, max_render_frames)
    ]
    return {
        "robot_model": "Navi",
        "model_path": str(MODEL_PATH),
        "steps": round(execution.simulation_time / timestep),
        "duration_s": execution.simulation_time,
        "command_count": execution.commands_executed,
        "final_pose": poses[-1],
        "frames": poses,
        "rendered_frames": rendered_frames,
        "warnings": list(execution.warnings),
        "translator_version": "1.0.0",
    }


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        if not isinstance(payload, dict):
            raise PreviewError("Simulator request must be a JSON object.")
        print(json.dumps(run_preview(payload), separators=(",", ":")))
        return 0
    except PreviewError as exc:
        print(
            json.dumps(
                {"error": str(exc), "error_code": "NAVI_PREVIEW_REJECTED"},
                separators=(",", ":"),
            )
        )
        return 2
    except Exception as exc:  # Keep internal details available to the service log.
        print(
            json.dumps(
                {
                    "error": f"{type(exc).__name__}: {exc}",
                    "error_code": "NAVI_PREVIEW_FAILED",
                },
                separators=(",", ":"),
            )
        )
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

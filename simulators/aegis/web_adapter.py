"""Translate Aegis code into the website's shared MuJoCo preview contract."""

from __future__ import annotations

import json
import sys
from typing import Any

from aegis_runtime import MuJoCoPreview


def _sample_frames(frames: list[dict[str, Any]], limit: int = 40) -> list[dict[str, Any]]:
    if not frames:
        return []
    sampled = frames[:: max(1, len(frames) // limit)]
    if sampled[-1] != frames[-1]:
        sampled.append(frames[-1])
    return sampled


def main() -> int:
    try:
        payload = json.load(sys.stdin)
        code = str(payload.get("code") or "")
        if not code.strip():
            raise ValueError("No Agentech code provided.")

        preview = MuJoCoPreview.aegis()
        result = preview.run_code(code, timestep_s=0.02)
        response = {
            "robot_model": "Aegies",
            "model_path": result.model_path,
            "steps": result.steps,
            "duration_s": result.duration_s,
            "command_count": result.command_count,
            "final_pose": result.final_pose,
            "frames": _sample_frames(result.frames),
            "rendered_frames": preview.render_data_urls(
                result.frames,
                max_frames=int(payload.get("max_render_frames") or 32),
                width=int(payload.get("render_width") or 480),
                height=int(payload.get("render_height") or 320),
            ),
            "runtime_version": "1.0.0",
        }
        print(json.dumps(response))
        return 0
    except ValueError as exc:
        print(json.dumps({"error": str(exc)}))
        return 2
    except Exception as exc:
        print(json.dumps({"error": f"{type(exc).__name__}: {exc}"}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())

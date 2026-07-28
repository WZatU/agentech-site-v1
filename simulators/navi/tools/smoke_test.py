"""Fast installed-package smoke test for core translation and MuJoCo boundaries."""

from __future__ import annotations

import argparse
import json
import sys
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import navi_mujoco_sdk_translator

from backends.mujoco_backend import MujocoBackend
from simulation import load_model
from simulation.result_writer import write_mujoco_artifacts
from translator.cli_support import (
    EXIT_SUCCESS,
    EXIT_TEST_FAILED,
    add_release_arguments,
    default_output,
    new_run_id,
    prepare_output,
)
from translator.limits import TranslationLimits
from translator.parser import TranslationParser
from translator.registry import MethodRegistry
from translator.scheduler import CommandScheduler
from translator.schema_validation import validate_result
from translator.spec_loader import load_sdk_spec


def _execute_source(
    source: str,
    *,
    config_dir: Path,
    seed: int,
    output: Path,
) -> tuple[Any, Any, Any, dict[str, Any]]:
    input_path = output / "input.py"
    input_path.parent.mkdir(parents=True, exist_ok=True)
    input_path.write_text(source, encoding="utf-8")
    spec = load_sdk_spec(config_dir / "sdk_spec.json")
    registry = MethodRegistry(spec)
    limits = TranslationLimits().with_overrides(max_simulation_time=60.0)
    translation = TranslationParser(
        spec,
        registry,
        config_dir / "action_ground_truth.json",
        limits,
    ).parse_file(input_path)
    if not translation.valid:
        raise AssertionError(translation.issues)
    schedule = CommandScheduler(limits).schedule(
        translation.commands,
        strict=False,
    )
    if not schedule.valid:
        raise AssertionError(schedule.issues)
    backend = MujocoBackend(
        max_simulation_time=60.0,
        viewer=False,
        record_video=False,
        seed=seed,
        config_dir=config_dir,
    )
    try:
        execution = backend.execute(schedule.commands)
        result = write_mujoco_artifacts(
            output,
            input_path,
            new_run_id("smoke"),
            translation,
            schedule,
            execution,
            pretty=True,
            seed=seed,
            config_dir=config_dir,
            capability_registry=backend.capability_registry,
        )
    finally:
        backend.finalize()
    validate_result(result)
    return translation, schedule, execution, result


def _check(name: str, condition: bool, details: Any) -> dict[str, Any]:
    return {
        "name": name,
        "status": "PASS" if condition else "FAIL",
        "details": details,
    }


def run_smoke(*, output: Path, config_dir: Path, seed: int = 0) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []
    started = time.perf_counter()
    model = load_model()
    checks.append(
        _check(
            "package_import_and_version",
            navi_mujoco_sdk_translator.__version__ == "1.0.0",
            navi_mujoco_sdk_translator.__version__,
        )
    )
    checks.append(
        _check(
            "model_load",
            model.nq == 19 and model.nv == 18 and model.nu == 12,
            {"nq": model.nq, "nv": model.nv, "nu": model.nu},
        )
    )
    scenario = """from agentech import Agentech
from time import sleep

Agentech.stand()
Agentech.forward(speed_mps=0.10, duration_s=1.0)
Agentech.turn(angle_deg=15)
Agentech.forward(speed_mps=0.10, duration_s=1.0)
sleep(0.25)
status = Agentech.get_status()
"""
    _, _, execution, result = _execute_source(
        scenario,
        config_dir=config_dir,
        seed=seed,
        output=output / "core",
    )
    metrics = list(execution.command_metrics)
    stand = next(item for item in metrics if item["method"] == "stand")
    forward = [item for item in metrics if item["method"] == "forward"]
    turn = next(item for item in metrics if item["method"] == "turn")
    wait = next(item for item in metrics if item["method"] == "sleep")
    checks.extend(
        [
            _check(
                "minimum_stand",
                not stand["fell"] and stand["end_position"]["z"] > 0.20,
                stand,
            ),
            _check(
                "forward_motion",
                forward[0]["body_frame_displacement"]["forward"] > 0.02,
                forward[0]["body_frame_displacement"],
            ),
            _check(
                "turn_sign",
                turn["yaw_change"] < -0.02,
                turn["yaw_change"],
            ),
            _check(
                "turn_then_forward_body_frame",
                len(forward) == 2
                and forward[1]["body_frame_displacement"]["forward"] > 0.02,
                forward[1]["body_frame_displacement"],
            ),
            _check(
                "wait_advances_simulation_time",
                abs(wait["duration"] - 0.25) < 1e-9,
                wait["duration"],
            ),
            _check(
                "query_returns",
                any(item.get("method") == "get_status" for item in execution.query_results),
                list(execution.query_results),
            ),
            _check(
                "result_schema",
                result["schema_version"] == "1.0.0",
                {
                    "schema_version": result["schema_version"],
                    "tool_version": result["tool_version"],
                    "method_count": len(result["methods"]),
                },
            ),
        ]
    )
    _, _, hardware_execution, _ = _execute_source(
        "from agentech import Agentech\nvalue = Agentech.get_battery_status()\n",
        config_dir=config_dir,
        seed=seed,
        output=output / "hardware_only",
    )
    battery = hardware_execution.query_results[0]
    checks.append(
        _check(
            "hardware_only_not_fabricated",
            battery["status"] == "HARDWARE_ONLY"
            and battery["available"] is False
            and battery["value"] is None,
            battery,
        )
    )
    _, _, blocked_execution, blocked_result = _execute_source(
        "from agentech import Agentech\nAgentech.return_to_home(facing_angle_deg=0)\n",
        config_dir=config_dir,
        seed=seed,
        output=output / "blocked",
    )
    checks.append(
        _check(
            "blocked_method_structured",
            blocked_execution.error_code == "BACKEND_METHOD_BLOCKED_BY_MODEL"
            and blocked_result["status"] == "failed",
            {
                "error_code": blocked_execution.error_code,
                "status": blocked_result["status"],
            },
        )
    )
    status = "PASS" if all(item["status"] == "PASS" for item in checks) else "FAIL"
    return {
        "schema_version": "1.0.0",
        "tool_version": navi_mujoco_sdk_translator.__version__,
        "status": status,
        "seed": seed,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "elapsed_seconds": time.perf_counter() - started,
        "checks": checks,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run the Navi release smoke test")
    parser.add_argument("--output", type=Path)
    parser.add_argument("--seed", type=int, default=0)
    add_release_arguments(parser)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    run_id = new_run_id("smoke")
    output = prepare_output(
        args.output or default_output(run_id),
        overwrite=args.overwrite,
    )
    config_dir = args.config_dir.resolve() if args.config_dir else ROOT / "config"
    report = run_smoke(output=output, config_dir=config_dir, seed=args.seed)
    (output / "summary.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    lines = [
        "# Navi Release Smoke Test",
        "",
        f"Status: **{report['status']}**.",
        "",
        "| Check | Result |",
        "|---|:---:|",
        *[f"| `{item['name']}` | {item['status']} |" for item in report["checks"]],
    ]
    (output / "summary.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2, ensure_ascii=False))
    return EXIT_SUCCESS if report["status"] == "PASS" else EXIT_TEST_FAILED


if __name__ == "__main__":
    raise SystemExit(main())

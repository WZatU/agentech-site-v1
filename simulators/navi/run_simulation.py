"""Translate restricted Navi SDK Python and execute it in MuJoCo."""

from __future__ import annotations

import argparse
import logging
import sys
from dataclasses import replace
from pathlib import Path

from backends.mujoco_backend import MujocoBackend
from simulation.result_writer import write_mujoco_artifacts
from translator.limits import TranslationLimits
from translator.parser import TranslationParser
from translator.registry import MethodRegistry
from translator.scheduler import CommandScheduler
from translator.spec_loader import load_sdk_spec
from translator.cli_support import (
    EXIT_ARGUMENT_ERROR,
    EXIT_BACKEND_LIMITATION,
    EXIT_SAFETY_TERMINATION,
    EXIT_SCRIPT_PARSE_FAILED,
    EXIT_SDK_VALIDATION_FAILED,
    EXIT_SIMULATION_FAILED,
    EXIT_SUCCESS,
    OutputExistsError,
    add_release_arguments,
    configure_logging,
    default_output,
    new_run_id,
    prepare_output,
    safe_error,
)


PROJECT_ROOT = Path(__file__).resolve().parent


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Translate Navi SDK Python and run MuJoCo")
    parser.add_argument("input", type=Path)
    display = parser.add_mutually_exclusive_group()
    display.add_argument("--headless", action="store_true", help="Run without viewer (default)")
    display.add_argument("--viewer", action="store_true", help="Open passive MuJoCo viewer")
    parser.add_argument("--output", type=Path)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--strict", action="store_true", help="Reject unresolved scheduling (default)")
    mode.add_argument("--allow-unresolved", action="store_true")
    parser.add_argument("--max-sim-time", type=float, default=300.0)
    video = parser.add_mutually_exclusive_group()
    video.add_argument("--record-video", action="store_true")
    video.add_argument("--no-video", action="store_true")
    parser.add_argument("--seed", type=int, default=0)
    parser.add_argument("--pretty", action="store_true")
    add_release_arguments(parser)
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    logger = configure_logging(args.log_level, args.log_file)
    run_id = new_run_id("mujoco")
    try:
        output = prepare_output(
            args.output or default_output(run_id),
            overwrite=args.overwrite,
        )
    except OutputExistsError as exc:
        print(safe_error("OUTPUT_EXISTS", str(exc)), file=sys.stderr)
        return EXIT_ARGUMENT_ERROR
    config_dir = (
        args.config_dir.resolve()
        if args.config_dir
        else PROJECT_ROOT / "config"
    )
    strict = not args.allow_unresolved
    translation = None
    schedule = None
    execution = None
    backend = None
    try:
        limits = TranslationLimits().with_overrides(
            max_simulation_time=args.max_sim_time
        )
        spec = load_sdk_spec(config_dir / "sdk_spec.json")
        registry = MethodRegistry(spec)
        translation = TranslationParser(
            spec,
            registry,
            config_dir / "action_ground_truth.json",
            limits,
        ).parse_file(args.input)
        if translation.valid:
            schedule = CommandScheduler(limits).schedule(
                translation.commands, strict=strict
            )
        if translation.valid and schedule is not None and schedule.valid:
            backend = MujocoBackend(
                max_simulation_time=args.max_sim_time,
                viewer=args.viewer,
                record_video=args.record_video,
                video_path=output / "video.mp4" if args.record_video else None,
                seed=args.seed,
                config_dir=config_dir,
            )
            execution = backend.execute(schedule.commands)
        if backend is not None:
            backend.finalize()
            if execution is not None and tuple(backend.warnings) != execution.warnings:
                execution = replace(execution, warnings=tuple(backend.warnings))
        result = write_mujoco_artifacts(
            output,
            args.input,
            run_id,
            translation,
            schedule,
            execution,
            pretty=args.pretty,
            seed=args.seed,
            config_dir=config_dir,
            capability_registry=(
                backend.capability_registry if backend is not None else None
            ),
        )
        logger.info("Run %s completed with status=%s", run_id, result["status"])
        print(f"Result: {output / 'result.json'}")
        if not translation.security_valid:
            return EXIT_SCRIPT_PARSE_FAILED
        if not translation.valid:
            return EXIT_SCRIPT_PARSE_FAILED
        if schedule is not None and not schedule.valid:
            return EXIT_SDK_VALIDATION_FAILED
        if result["fatal_safety_events"]:
            return EXIT_SAFETY_TERMINATION
        if execution is not None and execution.error_code:
            return (
                EXIT_BACKEND_LIMITATION
                if execution.error_code.startswith("BACKEND_")
                else EXIT_SIMULATION_FAILED
            )
        return EXIT_SUCCESS if result["status"] == "passed" else EXIT_SIMULATION_FAILED
    except Exception as exc:
        if backend is not None:
            backend.finalize()
        logging.getLogger("navi_mujoco").exception("Simulation failed")
        print(
            safe_error("SIMULATION_INTERNAL_ERROR", str(exc)),
            file=sys.stderr,
        )
        return EXIT_SIMULATION_FAILED


if __name__ == "__main__":
    raise SystemExit(main())

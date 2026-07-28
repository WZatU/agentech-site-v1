"""CLI for restricted SDK translation and Fake Backend execution."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from backends.fake_backend import FakeBackend
from translator.limits import TranslationLimits
from translator.parser import TranslationParser
from translator.registry import MethodRegistry
from translator.result_writer import write_run_artifacts
from translator.scheduler import CommandScheduler
from translator.spec_loader import load_sdk_spec


PROJECT_ROOT = Path(__file__).resolve().parent


def build_argument_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Translate Navi SDK Python into IR and run the Fake Backend")
    parser.add_argument("input", type=Path, help="User Python program")
    parser.add_argument("--output", type=Path, help="Result directory")
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--strict", action="store_true", help="Reject unresolved scheduling semantics (default)")
    mode.add_argument("--allow-unresolved", action="store_true", help="Use labeled conservative scheduling assumptions")
    parser.add_argument("--max-commands", type=int, default=1000)
    parser.add_argument("--max-loop-iterations", type=int, default=100)
    parser.add_argument("--max-simulation-time", type=float, default=300.0)
    parser.add_argument("--pretty", action="store_true", help="Pretty-print JSON artifacts")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_argument_parser().parse_args(argv)
    run_id = "translation_" + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
    output = args.output or PROJECT_ROOT / "results" / run_id
    strict = not args.allow_unresolved
    try:
        limits = TranslationLimits().with_overrides(
            max_loop_iterations=args.max_loop_iterations,
            max_commands=args.max_commands,
            max_simulation_time=args.max_simulation_time,
        )
        spec = load_sdk_spec(PROJECT_ROOT / "config" / "sdk_spec.json")
        registry = MethodRegistry(spec)
        translator = TranslationParser(
            spec,
            registry,
            PROJECT_ROOT / "config" / "action_ground_truth.json",
            limits,
        )
        translation = translator.parse_file(args.input)
        schedule = None
        execution = None
        if translation.valid:
            schedule = CommandScheduler(limits).schedule(translation.commands, strict=strict)
            if schedule.valid:
                backend = FakeBackend()
                execution = backend.execute(schedule.commands)
                backend.finalize()
        result = write_run_artifacts(
            output,
            args.input,
            run_id,
            translation,
            schedule,
            execution,
            pretty=args.pretty,
        )
        print(f"Result: {output / 'result.json'}")
        if not translation.security_valid:
            return 3
        if not translation.valid:
            return 1
        if schedule is not None and not schedule.valid:
            return 2 if any(
                issue.error_code == "UNRESOLVED_METHOD_SEMANTICS"
                for issue in schedule.issues
            ) else 1
        return 0 if result["status"] == "passed" else 1
    except Exception as exc:
        print(f"Internal translation error: {exc}", file=sys.stderr)
        return 4


if __name__ == "__main__":
    raise SystemExit(main())

"""Run an auditable, independent acceptance case for canonical SDK methods."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backends.capabilities import (
    BackendCapabilityRegistry,
    BackendCapabilityStatus,
)
from backends.mujoco_backend import MujocoBackend
from simulation.result_writer import write_mujoco_artifacts
from translator.cli_support import (
    EXIT_ARGUMENT_ERROR,
    EXIT_SIMULATION_FAILED,
    EXIT_SUCCESS,
    EXIT_TEST_FAILED,
    OutputExistsError,
    add_release_arguments,
    configure_logging,
    default_output,
    new_run_id,
    prepare_output,
    safe_error,
)
from translator.limits import TranslationLimits
from translator.parser import TranslationParser
from translator.provenance import sha256_file
from translator.registry import MethodRegistry
from translator.scheduler import CommandScheduler
from translator.schema_validation import validate_result
from translator.spec_loader import load_sdk_spec
from translator.version import __version__


ROOT = Path(__file__).resolve().parent
MATRIX_FIELDS = [
    "public_method",
    "canonical_method",
    "category",
    "parameters_resolved",
    "return_resolved",
    "blocking_resolved",
    "video_status",
    "backend_status",
    "backend_behavior_status",
    "sdk_contract_status",
    "ground_truth_evidence_status",
    "evidence_status",
    "implementation_type",
    "execution_stage",
    "structured_rejection",
    "backend_mapping_expected",
    "physical_execution",
    "generated_video",
    "scenario_required",
    "hardware_dependency",
    "model_dependency",
    "test_status",
    "safety_status",
    "ground_truth_status",
    "known_limitations",
    "result_path",
]


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Full 117-method SDK backend acceptance")
    result.add_argument("--all", action="store_true")
    result.add_argument("--category")
    result.add_argument("--methods")
    result.add_argument("--batch")
    result.add_argument("--status")
    video = result.add_mutually_exclusive_group()
    video.add_argument("--record-video", action="store_true")
    video.add_argument("--no-video", action="store_true")
    result.add_argument("--continue-on-failure", action="store_true")
    result.add_argument("--allow-unresolved", action="store_true")
    result.add_argument("--headless", action="store_true")
    result.add_argument("--seed", type=int, default=0)
    result.add_argument("--output", type=Path)
    result.add_argument("--pretty", action="store_true")
    add_release_arguments(result)
    return result


def _resolved_schema(schema: dict[str, Any], definitions: dict[str, Any]) -> dict[str, Any]:
    if "$ref" not in schema:
        return schema
    merged = dict(definitions[schema["$ref"]])
    merged.update({key: value for key, value in schema.items() if key != "$ref"})
    return merged


def _sample_value(name: str, schema: dict[str, Any]) -> Any:
    default = schema.get("default")
    if default not in {None, "UNRESOLVED"}:
        return default
    if "enum" in schema:
        return schema["enum"][0]
    value_type = schema.get("type")
    if value_type == "boolean":
        return True
    if value_type == "string":
        return "simulation_acceptance"
    if value_type == "integer":
        minimum = int(schema.get("minimum", 0))
        return max(minimum, 1)
    if value_type == "number":
        minimum = float(schema.get("minimum", schema.get("exclusive_minimum", 0.0)))
        return max(minimum + (0.1 if "exclusive_minimum" in schema else 0.0), 0.1)
    raise ValueError(f"No safe acceptance value for {name}: {schema}")


def acceptance_arguments(
    method: str,
    definition: dict[str, Any],
    definitions: dict[str, Any],
) -> dict[str, Any]:
    fixed: dict[str, dict[str, Any]] = {
        "forward": {"speed_mps": 0.10, "duration_s": 2.0},
        "backward": {"speed_mps": 0.08, "duration_s": 2.0},
        "lateral_left": {"speed_mps": 0.10, "duration_s": 2.0},
        "lateral_right": {"speed_mps": 0.10, "duration_s": 2.0},
        "diagonal": {"angle_deg": 45.0, "speed_mps": 0.10, "duration_s": 2.0},
        "turn": {"angle_deg": 15.0},
        "return_to_home": {"facing_angle_deg": 0},
        "sideflip": {"direction": "left"},
        "step": {"direction": "forward"},
        "emergency_stop": {"reason": "full SDK simulation acceptance"},
    }
    if method in fixed:
        return fixed[method]
    parameters = definition.get("parameters", {})
    values: dict[str, Any] = {}
    for name, raw_schema in parameters.items():
        if "alias_for" in raw_schema:
            continue
        schema = _resolved_schema(raw_schema, definitions)
        if name == "duration_s":
            values[name] = 1.5
            continue
        if name == "time":
            values[name] = 1.0
            continue
        if name == "count":
            values[name] = 1
            continue
        values[name] = _sample_value(name, schema)
    return values


def call_source(package: str, robot_class: str, method: str, arguments: dict[str, Any]) -> str:
    rendered = ", ".join(f"{name}={value!r}" for name, value in arguments.items())
    return (
        f"from {package} import {robot_class}\n\n"
        f"{robot_class}.{method}({rendered})\n"
    )


def is_visual_category(category: str) -> bool:
    return category in {"movement", "athletics", "actions", "posture", "safety"}


def write_matrix(rows: list[dict[str, Any]], output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    matrix = output / "sdk_method_matrix.csv"
    with matrix.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=MATRIX_FIELDS)
        writer.writeheader()
        writer.writerows(rows)
    if len(rows) == 117:
        report = output / "sdk_method_matrix.md"
        lines = [
            "# SDK Method Acceptance Matrix",
            "",
            f"- Rows: {len(rows)}",
            f"- Unique canonical methods: {len({row['canonical_method'] for row in rows})}",
            "",
            "| Method | Category | Backend status | Physical | Test | Safety | GT | Result |",
            "|---|---|---|---:|---|---|---|---|",
        ]
        for row in rows:
            lines.append(
                f"| `{row['canonical_method']}` | {row['category']} | "
                f"{row['backend_status']} | {row['physical_execution']} | "
                f"{row['test_status']} | {row['safety_status']} | "
                f"{row['ground_truth_status']} | `{row['result_path']}` |"
            )
        report.write_text("\n".join(lines) + "\n", encoding="utf-8")


def run(argv: list[str] | None = None) -> int:
    args = parser().parse_args(argv)
    logger = configure_logging(args.log_level, args.log_file)
    if not (
        args.all
        or args.category
        or args.methods
        or args.batch
        or args.status
    ):
        parser().error("select --all, --category, --methods, --batch, or --status")
    acceptance_run_id = new_run_id("full_sdk_acceptance")
    try:
        output = prepare_output(
            args.output or default_output(acceptance_run_id),
            overwrite=args.overwrite,
        )
    except OutputExistsError as exc:
        print(safe_error("OUTPUT_EXISTS", str(exc)), file=sys.stderr)
        return EXIT_ARGUMENT_ERROR
    config_dir = args.config_dir.resolve() if args.config_dir else ROOT / "config"
    spec = load_sdk_spec(config_dir / "sdk_spec.json")
    raw_spec = json.loads(
        (config_dir / "sdk_spec.json").read_text(encoding="utf-8")
    )
    registry = MethodRegistry(spec)
    capabilities = BackendCapabilityRegistry.load(
        config_dir / "backend_capabilities.json"
    )
    limits = TranslationLimits().with_overrides(max_simulation_time=60.0)
    selected_methods = set(raw_spec["methods"])
    if args.methods:
        selected_methods &= {
            item.strip() for item in args.methods.split(",") if item.strip()
        }
    if args.category:
        category = args.category.lower()
        selected_methods &= {
            name
            for name, definition in raw_spec["methods"].items()
            if definition["category"].lower() == category
        }
    if args.batch:
        selected_methods &= {
            entry.method for entry in capabilities.entries
            if entry.batch.lower() == args.batch.lower()
        }
    if args.status:
        selected_methods &= {
            entry.method for entry in capabilities.entries
            if entry.status.value.lower() == args.status.lower()
        }
    unknown = (
        {item.strip() for item in (args.methods or "").split(",") if item.strip()}
        - set(raw_spec["methods"])
    )
    if unknown:
        raise ValueError(f"Unknown canonical methods: {sorted(unknown)}")

    rows: list[dict[str, Any]] = []
    failures = 0
    for method, definition in raw_spec["methods"].items():
        if method not in selected_methods:
            continue
        capability = capabilities.get(method)
        method_dir = output / method
        method_dir.mkdir(parents=True, exist_ok=True)
        arguments = acceptance_arguments(
            method, definition, raw_spec["definitions"]
        )
        source = call_source(spec.package, spec.robot_class, method, arguments)
        input_path = method_dir / "input.py"
        input_path.write_text(source, encoding="utf-8")
        translation = TranslationParser(
            spec,
            registry,
            config_dir / "action_ground_truth.json",
            limits,
        ).parse_file(input_path)
        schedule = None
        execution = None
        backend = None
        if translation.valid:
            schedule = CommandScheduler(limits).schedule(
                translation.commands,
                strict=not args.allow_unresolved,
            )
        should_record = (
            args.record_video
            and is_visual_category(capability.category)
            and capability.physical_execution
        )
        if translation.valid and schedule is not None and schedule.valid:
            backend = MujocoBackend(
                max_simulation_time=60.0,
                viewer=False,
                record_video=should_record,
                video_path=method_dir / "video.mp4" if should_record else None,
                seed=args.seed,
                config_dir=config_dir,
            )
            execution = backend.execute(schedule.commands)
            backend.finalize()
        run_id = (
            "full_sdk_"
            + method
            + "_"
            + datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%S%fZ")
        )
        result = write_mujoco_artifacts(
            method_dir,
            input_path,
            run_id,
            translation,
            schedule,
            execution,
            pretty=args.pretty,
            seed=args.seed,
            config_dir=config_dir,
            capability_registry=capabilities,
        )
        fatal = bool(result.get("fatal_safety_events"))
        command_metric = (
            execution.command_metrics[0]
            if execution is not None and execution.command_metrics
            else {}
        )
        physical_execution = bool(
            capability.physical_execution
            and execution is not None
            and execution.commands_executed == 1
            and execution.simulation_time > 0.0
        )
        expected_nonexecution = capability.status not in {
            BackendCapabilityStatus.IMPLEMENTED,
            BackendCapabilityStatus.SIMULATED,
            BackendCapabilityStatus.APPROXIMATE,
        }
        if expected_nonexecution:
            test_status = (
                "PASS"
                if not physical_execution
                and (
                    not translation.valid
                    or execution is None
                    or execution.error_code is not None
                    or capability.category == "sensing"
                )
                else "FAIL"
            )
        else:
            test_status = (
                "PASS"
                if execution is not None
                and execution.status == "completed"
                and not fatal
                else "FAIL"
            )
        if physical_execution and capability.implementation in {
            "data_driven_joint_profile",
            "athletic_joint_profile",
        }:
            if float(command_metric.get("max_joint_excursion_rad", 0.0)) < 0.02:
                test_status = "FAIL"
        if method == "jump" and float(command_metric.get("airborne_duration", 0.0)) <= 0.0:
            test_status = "FAIL"
        if method == "jump_forward" and (
            float(command_metric.get("airborne_duration", 0.0)) <= 0.0
            or float(
                command_metric.get("body_frame_displacement", {}).get(
                    "forward", 0.0
                )
            )
            <= 0.02
        ):
            test_status = "FAIL"
        if test_status == "FAIL":
            failures += 1
        execution_stage = (
            "parser_rejected"
            if not translation.valid
            else "scheduler_rejected"
            if schedule is None or not schedule.valid
            else "backend_completed"
            if execution is not None and execution.status == "completed"
            else "backend_rejected"
        )
        structured_rejection = bool(
            expected_nonexecution and test_status == "PASS"
        )
        backend_mapping_expected = execution_stage in {
            "backend_completed",
            "backend_rejected",
        }
        result["full_sdk_acceptance"] = {
            "canonical_method": method,
            "category": capability.category,
            "backend_capability_status": capability.status.value,
            "backend_behavior_status": capability.backend_behavior_status.value,
            "sdk_contract_status": capability.sdk_contract_status.value,
            "ground_truth_evidence_status": capability.ground_truth_status.value,
            "evidence_status": capability.evidence_status.value,
            "capability_reason": capability.reason,
            "implementation": capability.implementation,
            "execution_stage": execution_stage,
            "structured_rejection": structured_rejection,
            "backend_mapping_expected": backend_mapping_expected,
            "physical_execution": physical_execution,
            "test_status": test_status,
            "generated_video": bool(
                should_record and (method_dir / "video.mp4").exists()
            ),
            "return_contract": (
                "UNRESOLVED"
                if "return_type" in {
                    item
                    for command in translation.commands
                    for item in command.unresolved_metadata
                }
                else "RESOLVED"
            ),
        }
        result.update(
            {
                "method": method,
                "methods": [method],
                "backend_behavior_status": capability.backend_behavior_status.value,
                "sdk_contract_status": capability.sdk_contract_status.value,
                "ground_truth_status": capability.ground_truth_status.value,
                "evidence_status": capability.evidence_status.value,
                "limitations": list(capability.limitations),
            }
        )
        validate_result(result)
        (method_dir / "result.json").write_text(
            json.dumps(result, indent=2 if args.pretty else None, ensure_ascii=False)
            + "\n",
            encoding="utf-8",
        )
        if should_record and (method_dir / "video.mp4").is_file():
            video_metadata = {
                "schema_version": "1.0.0",
                "tool_version": __version__,
                "run_id": run_id,
                "method": method,
                "seed": args.seed,
                "video": "video.mp4",
                "sha256": sha256_file(method_dir / "video.mp4"),
            }
            (method_dir / "video_metadata.json").write_text(
                json.dumps(video_metadata, indent=2) + "\n",
                encoding="utf-8",
            )
        unresolved = {
            item
            for command in translation.commands
            for item in command.unresolved_metadata
        }
        rows.append({
            "public_method": method,
            "canonical_method": method,
            "category": capability.category,
            "parameters_resolved": str(translation.valid).lower(),
            "return_resolved": str("return_type" not in unresolved).lower(),
            "blocking_resolved": str("blocking" not in unresolved).lower(),
            "video_status": capability.video_status,
            "backend_status": capability.status.value,
            "backend_behavior_status": capability.backend_behavior_status.value,
            "sdk_contract_status": capability.sdk_contract_status.value,
            "ground_truth_evidence_status": capability.ground_truth_status.value,
            "evidence_status": capability.evidence_status.value,
            "implementation_type": capability.implementation,
            "execution_stage": execution_stage,
            "structured_rejection": str(structured_rejection).lower(),
            "backend_mapping_expected": str(backend_mapping_expected).lower(),
            "physical_execution": str(physical_execution).lower(),
            "generated_video": str(
                should_record and (method_dir / "video.mp4").exists()
            ).lower(),
            "scenario_required": str(capability.scenario_required).lower(),
            "hardware_dependency": ";".join(capability.hardware_dependency),
            "model_dependency": ";".join(capability.model_dependency),
            "test_status": test_status,
            "safety_status": (
                "FATAL"
                if fatal
                else "WARNING"
                if result.get("safety_violations")
                else "PASS"
            ),
            "ground_truth_status": command_metric.get(
                "ground_truth_result", "UNRESOLVED"
            ),
            "known_limitations": ";".join(capability.limitations),
            "result_path": str(
                (method_dir / "result.json").relative_to(output)
            ).replace("\\", "/"),
        })
        print(
            f"{method}: {capability.status.value} "
            f"test={test_status} physical={physical_execution}"
        )
        if test_status == "FAIL" and not args.continue_on_failure:
            break

    write_matrix(rows, output)
    summary = {
        "schema_version": "1.0.0",
        "tool_version": __version__,
        "run_id": acceptance_run_id,
        "seed": args.seed,
        "selected": len(rows),
        "failures": failures,
        "status_counts": dict(Counter(row["backend_status"] for row in rows)),
        "test_counts": dict(Counter(row["test_status"] for row in rows)),
        "matrix": "sdk_method_matrix.csv",
    }
    (output / "acceptance_summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(summary, indent=2))
    logger.info(
        "Acceptance %s completed: selected=%s failures=%s",
        acceptance_run_id,
        len(rows),
        failures,
    )
    return EXIT_SUCCESS if failures == 0 else EXIT_TEST_FAILED


def main(argv: list[str] | None = None) -> int:
    try:
        return run(argv)
    except Exception as exc:
        print(
            safe_error("ACCEPTANCE_INTERNAL_ERROR", str(exc)),
            file=sys.stderr,
        )
        return EXIT_SIMULATION_FAILED


if __name__ == "__main__":
    raise SystemExit(main())

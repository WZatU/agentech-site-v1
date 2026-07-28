"""Write complete MuJoCo Translation run artifacts."""

from __future__ import annotations

import csv
import json
import shutil
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backends.base import BackendExecutionResult
from backends.capabilities import BackendCapabilityRegistry
from translator.parser import TranslationResult
from translator.provenance import (
    configuration_hash,
    model_hash,
    sha256_file,
)
from translator.scheduler import ScheduleResult
from translator.schema_validation import validate_result
from translator.version import __version__


RESULT_SCHEMA_VERSION = "1.0.0"


def _write_json(path: Path, value: Any, pretty: bool) -> None:
    path.write_text(
        json.dumps(value, indent=2 if pretty else None, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )


def _write_trace(path: Path, rows: tuple[dict[str, Any], ...]) -> None:
    if not rows:
        path.write_text("", encoding="utf-8")
        return
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def build_mujoco_result(
    run_id: str,
    translation: TranslationResult,
    schedule: ScheduleResult | None,
    execution: BackendExecutionResult | None,
    *,
    seed: int = 0,
    input_hash: str,
    config_hash: str,
    model_resource_hash: str,
    capability_registry: BackendCapabilityRegistry | None = None,
) -> dict[str, Any]:
    final_state = execution.final_state if execution and execution.final_state else None
    safety_events = list(execution.safety_events) if execution else []
    fatal_events = [event for event in safety_events if event["severity"] == "fatal"]
    warnings: list[dict[str, Any]] = [item.to_dict() for item in translation.warnings]
    if schedule:
        warnings.extend(item.to_dict() for item in schedule.warnings)
    if execution:
        warnings.extend(execution.warnings)
    unresolved = sorted({
        item
        for command in translation.commands
        for item in command.unresolved_metadata
    })
    approximation = bool(schedule and schedule.approximation_used)
    if execution:
        approximation = approximation or any(
            mapping.get("approximations") for mapping in execution.backend_mapping
        )
    counts = {
        "pass": 0,
        "fail": 0,
        "approximate": 0,
        "not_evaluated": 0,
        "unresolved": 0,
    }
    if execution:
        for metric in execution.command_metrics:
            key = str(metric.get("ground_truth_result", "NOT_EVALUATED")).lower()
            counts[key if key in counts else "unresolved"] += 1
    capability_results = []
    if execution:
        capability_results = [
            {
                "command_id": mapping.get("command_id"),
                "method": mapping.get("canonical_method"),
                "status": mapping.get(
                    "backend_capability_status",
                    mapping.get("invocation_status", "FAILED"),
                ),
                "error_code": mapping.get("error_code"),
                "reason": mapping.get("reason"),
            }
            for mapping in execution.backend_mapping
        ]
    capability_summary = dict(
        Counter(item["status"] for item in capability_results)
    )
    registry = capability_registry or BackendCapabilityRegistry.load()
    methods = [command.canonical_method for command in translation.commands]
    capability_entries = [
        registry.get(method)
        for method in methods
        if method != "sleep" and method in registry
    ]

    def aggregate(attribute: str) -> str:
        values = {
            getattr(entry, attribute).value
            for entry in capability_entries
        }
        if not values:
            return "NOT_APPLICABLE"
        if len(values) == 1:
            return next(iter(values))
        return "MIXED"

    known_limitations = sorted({
        limitation
        for entry in capability_entries
        for limitation in entry.limitations
    })
    translation_ok = translation.valid
    schedule_ok = schedule is not None and schedule.valid
    simulation_ok = execution is not None and execution.status == "completed"
    orientation = None
    position = None
    if final_state:
        x, y, z = final_state["base_position"]
        roll, pitch, yaw = final_state["orientation_rpy"]
        position = {"x": x, "y": y, "z": z}
        orientation = {"roll": roll, "pitch": pitch, "yaw": yaw}
    result = {
        "schema_version": RESULT_SCHEMA_VERSION,
        "tool_version": __version__,
        "run_id": run_id,
        "method": methods[0] if len(methods) == 1 else ("MULTIPLE" if methods else None),
        "methods": methods,
        "backend_behavior_status": aggregate("backend_behavior_status"),
        "sdk_contract_status": aggregate("sdk_contract_status"),
        "ground_truth_status": aggregate("ground_truth_status"),
        "evidence_status": aggregate("evidence_status"),
        "status": "passed" if translation_ok and schedule_ok and simulation_ok else "failed",
        "backend": "mujoco",
        "translation_status": "success" if translation_ok else "failed",
        "simulation_status": execution.status if execution else "not_started",
        "backend_error_code": execution.error_code if execution else None,
        "commands_detected": len(translation.commands),
        "commands_scheduled": len(schedule.commands) if schedule else 0,
        "commands_executed": execution.commands_executed if execution else 0,
        "simulation_duration": execution.simulation_time if execution else 0.0,
        "final_position": position,
        "final_orientation": orientation,
        "fell": any(
            event["event_code"] in {"FALL_DETECTED", "BASE_HEIGHT_TOO_LOW"}
            for event in safety_events
        ),
        "safety_violations": safety_events,
        "fatal_safety_events": fatal_events,
        "warnings": warnings,
        "unresolved_items": unresolved,
        "approximation_used": approximation,
        "ground_truth_summary": counts,
        "capability_results": capability_results,
        "capability_summary": capability_summary,
        "execution": {
            "translation_status": "success" if translation_ok else "failed",
            "scheduling_status": (
                "success" if schedule_ok else "failed" if schedule is not None else "not_started"
            ),
            "simulation_status": execution.status if execution else "not_started",
            "commands_detected": len(translation.commands),
            "commands_scheduled": len(schedule.commands) if schedule else 0,
            "commands_executed": execution.commands_executed if execution else 0,
            "simulation_duration": execution.simulation_time if execution else 0.0,
            "backend_error_code": execution.error_code if execution else None,
        },
        "safety": {
            "events": safety_events,
            "fatal_events": fatal_events,
            "fell": any(
                event["event_code"] in {"FALL_DETECTED", "BASE_HEIGHT_TOO_LOW"}
                for event in safety_events
            ),
        },
        "limitations": [*known_limitations, *unresolved],
        "artifacts": {
            "result": "result.json",
            "validation": "validation.json",
            "trace": "state_trace.csv",
            "metrics": "command_metrics.json",
            "video": "video.mp4" if execution else None,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "seed": int(seed),
        "input_hash": input_hash,
        "config_hash": config_hash,
        "model_hash": model_resource_hash,
    }
    validate_result(result)
    return result


def write_mujoco_artifacts(
    output_dir: str | Path,
    input_path: str | Path,
    run_id: str,
    translation: TranslationResult,
    schedule: ScheduleResult | None,
    execution: BackendExecutionResult | None,
    *,
    pretty: bool = True,
    seed: int = 0,
    config_dir: str | Path | None = None,
    capability_registry: BackendCapabilityRegistry | None = None,
) -> dict[str, Any]:
    output = Path(output_dir)
    source_input = Path(input_path)
    output.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_input, output / "input_copy.py")
    _write_json(output / "validation.json", translation.validation_dict(), pretty)
    _write_json(
        output / "translated_commands.json",
        [command.to_dict() for command in translation.commands],
        pretty,
    )
    _write_json(
        output / "scheduled_commands.json",
        [command.to_dict() for command in schedule.commands] if schedule else [],
        pretty,
    )
    _write_json(
        output / "backend_mapping.json",
        list(execution.backend_mapping) if execution else [],
        pretty,
    )
    log = ""
    if execution:
        log = "".join(
            json.dumps(event, ensure_ascii=False) + "\n"
            for event in execution.execution_log
        )
    (output / "execution_log.jsonl").write_text(log, encoding="utf-8")
    _write_trace(output / "state_trace.csv", execution.state_trace if execution else ())
    _write_json(
        output / "command_metrics.json",
        list(execution.command_metrics) if execution else [],
        pretty,
    )
    _write_json(
        output / "query_results.json",
        list(execution.query_results) if execution else [],
        pretty,
    )
    _write_json(
        output / "safety_events.json",
        list(execution.safety_events) if execution else [],
        pretty,
    )
    result = build_mujoco_result(
        run_id,
        translation,
        schedule,
        execution,
        seed=seed,
        input_hash=sha256_file(source_input),
        config_hash=configuration_hash(config_dir),
        model_resource_hash=model_hash(),
        capability_registry=capability_registry,
    )
    if not (output / "video.mp4").is_file():
        result["artifacts"]["video"] = None
    validate_result(result)
    _write_json(output / "result.json", result, pretty)
    (output / "summary.md").write_text(
        _summary(run_id, translation, schedule, execution, result),
        encoding="utf-8",
    )
    return result


def _summary(
    run_id: str,
    translation: TranslationResult,
    schedule: ScheduleResult | None,
    execution: BackendExecutionResult | None,
    result: dict[str, Any],
) -> str:
    methods = ", ".join(command.canonical_method for command in translation.commands) or "none"
    approximations = []
    if execution:
        approximations = [
            f"{item['command_id']}: {', '.join(item.get('approximations', []))}"
            for item in execution.backend_mapping
            if item.get("approximations")
        ]
    return f"""# MuJoCo Translation Run {run_id}

## Translation

- Methods: {methods}
- Translation status: {result['translation_status']}
- Commands detected: {result['commands_detected']}
- Scheduling approximation: {str(bool(schedule and schedule.approximation_used)).lower()}
- Unresolved metadata: {', '.join(result['unresolved_items']) if result['unresolved_items'] else 'none'}

## MuJoCo execution

- Status: {result['simulation_status']}
- Backend error: {result['backend_error_code'] or 'none'}
- Commands executed: {result['commands_executed']}
- Simulation time: {result['simulation_duration']:.6f} s
- Final position: {result['final_position']}
- Final orientation: {result['final_orientation']}
- Fell: {str(result['fell']).lower()}

## Approximations

{chr(10).join('- ' + item for item in approximations) if approximations else '- none'}

The temporary scheduler policy is not written back to `sdk_spec.json`. Motion
end-state stand hold and controller speed clipping remain explicitly labeled.

## Safety and Ground Truth

- Safety events: {len(result['safety_violations'])}
- Fatal safety events: {len(result['fatal_safety_events'])}
- Ground Truth: {result['ground_truth_summary']}
- Contact-foot slip is measured from world-position change while the foot is in contact.

## Physical provenance

Position, orientation, velocities, joints, contacts, actuator controls/forces,
and IMU fields come from MuJoCo state. Hardware-only queries are returned as
unavailable; no Fake Backend values are used.
"""

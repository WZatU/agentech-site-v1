"""Write deterministic Translation Core run artifacts."""

from __future__ import annotations

import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from backends.base import BackendExecutionResult
from backends.capabilities import BackendCapabilityRegistry
from .parser import TranslationResult
from .provenance import configuration_hash, model_hash, sha256_file
from .scheduler import ScheduleResult
from .schema_validation import validate_result
from .version import __version__


def _json_dump(path: Path, value: Any, pretty: bool) -> None:
    path.write_text(
        json.dumps(
            value,
            indent=2 if pretty else None,
            ensure_ascii=False,
            sort_keys=False,
        ) + "\n",
        encoding="utf-8",
    )


def build_result(
    run_id: str,
    translation: TranslationResult,
    schedule: ScheduleResult | None,
    execution: BackendExecutionResult | None,
    *,
    input_hash: str,
    config_hash: str,
    model_resource_hash: str,
) -> dict[str, Any]:
    schedule_issues = list(schedule.issues) if schedule else []
    schedule_warnings = list(schedule.warnings) if schedule else []
    warnings = [issue.to_dict() for issue in translation.warnings + schedule_warnings]
    ground_truth_conflicts = [
        warning for warning in warnings if warning["error_code"] == "GROUND_TRUTH_CONFLICT"
    ]
    unresolved_items = sorted({
        item
        for command in translation.commands
        for item in command.unresolved_metadata
    })
    unresolved_items.extend(
        issue.to_dict() for issue in schedule_issues
        if issue.error_code == "UNRESOLVED_METHOD_SEMANTICS"
    )
    translation_success = translation.valid
    scheduling_success = schedule is not None and schedule.valid
    execution_success = execution is not None and execution.status == "completed"
    registry = BackendCapabilityRegistry.load()
    methods = [command.canonical_method for command in translation.commands]
    entries = [
        registry.get(method)
        for method in methods
        if method != "sleep" and method in registry
    ]

    def aggregate(attribute: str) -> str:
        values = {getattr(entry, attribute).value for entry in entries}
        return next(iter(values)) if len(values) == 1 else "MIXED" if values else "NOT_APPLICABLE"

    limitations = sorted({
        limitation
        for entry in entries
        for limitation in entry.limitations
    })
    result = {
        "schema_version": "1.0.0",
        "tool_version": __version__,
        "run_id": run_id,
        "method": methods[0] if len(methods) == 1 else ("MULTIPLE" if methods else None),
        "methods": methods,
        "backend_behavior_status": aggregate("backend_behavior_status"),
        "sdk_contract_status": aggregate("sdk_contract_status"),
        "ground_truth_status": aggregate("ground_truth_status"),
        "evidence_status": aggregate("evidence_status"),
        "status": "passed" if translation_success and scheduling_success and execution_success else "failed",
        "backend": "fake",
        "translation_status": "success" if translation_success else "failed",
        "execution_status": execution.status if execution else "not_started",
        "commands_detected": len(translation.commands),
        "commands_scheduled": len(schedule.commands) if schedule else 0,
        "commands_executed": execution.commands_executed if execution else 0,
        "query_count": len(execution.query_results) if execution else 0,
        "warnings": warnings,
        "unresolved_items": unresolved_items,
        "approximation_used": schedule.approximation_used if schedule else False,
        "ground_truth_conflicts": ground_truth_conflicts,
        "simulation_time": execution.simulation_time if execution else (
            schedule.simulation_time if schedule else 0.0
        ),
        "execution": {
            "translation_status": "success" if translation_success else "failed",
            "scheduling_status": "success" if scheduling_success else "failed",
            "simulation_status": execution.status if execution else "not_started",
            "commands_detected": len(translation.commands),
            "commands_scheduled": len(schedule.commands) if schedule else 0,
            "commands_executed": execution.commands_executed if execution else 0,
        },
        "safety": {"events": [], "fatal_events": [], "fell": False},
        "limitations": [*limitations, *unresolved_items],
        "artifacts": {
            "result": "result.json",
            "validation": "validation.json",
            "trace": None,
            "metrics": None,
            "video": None,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "seed": 0,
        "input_hash": input_hash,
        "config_hash": config_hash,
        "model_hash": model_resource_hash,
    }
    validate_result(result)
    return result


def write_run_artifacts(
    output_dir: str | Path,
    input_path: str | Path,
    run_id: str,
    translation: TranslationResult,
    schedule: ScheduleResult | None,
    execution: BackendExecutionResult | None,
    *,
    pretty: bool = True,
) -> dict[str, Any]:
    output = Path(output_dir)
    source_input = Path(input_path)
    output.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(source_input, output / "input_copy.py")
    _json_dump(output / "validation.json", translation.validation_dict(), pretty)
    _json_dump(
        output / "translated_commands.json",
        [command.to_dict() for command in translation.commands],
        pretty,
    )
    _json_dump(
        output / "scheduled_commands.json",
        [command.to_dict() for command in schedule.commands] if schedule else [],
        pretty,
    )
    log_lines = ""
    if execution:
        log_lines = "".join(
            json.dumps(event, ensure_ascii=False) + "\n"
            for event in execution.execution_log
        )
    (output / "execution_log.jsonl").write_text(log_lines, encoding="utf-8")
    _json_dump(
        output / "query_results.json",
        list(execution.query_results) if execution else [],
        pretty,
    )
    result = build_result(
        run_id,
        translation,
        schedule,
        execution,
        input_hash=sha256_file(source_input),
        config_hash=configuration_hash(),
        model_resource_hash=model_hash(),
    )
    _json_dump(output / "result.json", result, pretty)
    (output / "summary.md").write_text(
        _summary_markdown(run_id, translation, schedule, execution, result),
        encoding="utf-8",
    )
    return result


def _summary_markdown(
    run_id: str,
    translation: TranslationResult,
    schedule: ScheduleResult | None,
    execution: BackendExecutionResult | None,
    result: dict[str, Any],
) -> str:
    methods = ", ".join(command.source_method for command in translation.commands) or "none"
    defaults = [
        f"{command.command_id}: {', '.join(command.defaults_applied)}"
        for command in translation.commands if command.defaults_applied
    ]
    unresolved = sorted({
        item for command in translation.commands for item in command.unresolved_metadata
    })
    conflicts = [
        warning for warning in translation.warnings
        if warning.error_code == "GROUND_TRUTH_CONFLICT"
    ]
    return f"""# Translation Core Run {run_id}

## Input recognition

- SDK imports: {', '.join(translation.imports) or 'none'}
- SDK classes: {', '.join(translation.sdk_class_names) or 'none'}
- SDK objects/facades: {', '.join(translation.sdk_objects) or 'none'}
- Calls translated in source order: {methods}

## IR and defaults

- Commands detected: {len(translation.commands)}
- Defaults applied: {'; '.join(defaults) if defaults else 'none'}
- Unresolved metadata: {', '.join(unresolved) if unresolved else 'none'}

## Scheduling

- Commands scheduled: {len(schedule.commands) if schedule else 0}
- Approximate scheduling used: {str(result['approximation_used']).lower()}
- Scheduled simulation time: {schedule.simulation_time if schedule else 0.0}

## Ground Truth

- Conflicts: {len(conflicts)}
- Frontflip conflicts are preserved as `GROUND_TRUTH_CONFLICT`; no outcome is selected.
- SDK turn values remain right-positive. Backend sign conversion is deferred.

## Fake Backend

- Execution status: {execution.status if execution else 'not_started'}
- Commands executed: {execution.commands_executed if execution else 0}
- Query results: {len(execution.query_results) if execution else 0}
- No position, orientation, IMU, contact, fall, or actuator result is fabricated.

## Next MuJoCo boundary

The next-stage adapter consumes scheduled IR, converts SDK right-positive turn values at the backend boundary, drives the existing controller, and replaces fake query stubs with labeled MuJoCo sensor data.
"""

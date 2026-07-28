"""Validate canonical release results, traces, matrix, and capabilities."""

from __future__ import annotations

import argparse
import csv
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from translator.schema_validation import validate_payload, validate_result
from translator.version import __version__


def validate_tree(canonical_output: Path) -> dict:
    failures = []
    counts = {
        "capability_documents": 0,
        "results": 0,
        "matrix_rows": 0,
        "trace_rows": 0,
    }
    try:
        capabilities = json.loads(
            (ROOT / "config" / "backend_capabilities.json").read_text(
                encoding="utf-8"
            )
        )
        validate_payload(capabilities, "capability.schema.json")
        counts["capability_documents"] = 1
    except Exception as exc:
        failures.append({"artifact": "backend_capabilities.json", "error": str(exc)})
    for result_path in sorted(canonical_output.glob("*/result.json")):
        try:
            validate_result(json.loads(result_path.read_text(encoding="utf-8")))
            counts["results"] += 1
        except Exception as exc:
            failures.append(
                {
                    "artifact": result_path.relative_to(canonical_output).as_posix(),
                    "error": str(exc),
                }
            )
    matrix_path = canonical_output / "sdk_method_matrix.csv"
    if matrix_path.is_file():
        with matrix_path.open(encoding="utf-8", newline="") as stream:
            for index, row in enumerate(csv.DictReader(stream), start=2):
                try:
                    validate_payload(row, "sdk_method_matrix.schema.json")
                    counts["matrix_rows"] += 1
                except Exception as exc:
                    failures.append(
                        {
                            "artifact": f"sdk_method_matrix.csv:{index}",
                            "error": str(exc),
                        }
                    )
    for trace_path in sorted(canonical_output.glob("*/state_trace.csv")):
        with trace_path.open(encoding="utf-8", newline="") as stream:
            for index, row in enumerate(csv.DictReader(stream), start=2):
                try:
                    validate_payload(row, "trace.schema.json")
                    counts["trace_rows"] += 1
                except Exception as exc:
                    failures.append(
                        {
                            "artifact": (
                                f"{trace_path.relative_to(canonical_output).as_posix()}:{index}"
                            ),
                            "error": str(exc),
                        }
                    )
                    break
    expected = {
        "capability_documents": 1,
        "results": 117,
        "matrix_rows": 117,
    }
    complete = all(counts[key] == value for key, value in expected.items())
    return {
        "schema_version": "1.0.0",
        "tool_version": __version__,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "counts": counts,
        "expected": expected,
        "failures": failures,
        "status": "PASS" if complete and not failures else "FAIL",
    }


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--canonical-output",
        type=Path,
        default=ROOT / "results" / "release_validation" / "canonical_cli",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "outputs" / "release_validation",
    )
    args = parser.parse_args(argv)
    args.output.mkdir(parents=True, exist_ok=True)
    report = validate_tree(args.canonical_output)
    (args.output / "schema_validation.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    (args.output / "schema_validation.md").write_text(
        "\n".join(
            [
                "# Release Schema Validation",
                "",
                f"Status: **{report['status']}**.",
                "",
                f"- Capability documents: "
                f"{report['counts']['capability_documents']}/1.",
                f"- Canonical result JSON: {report['counts']['results']}/117.",
                f"- SDK matrix rows: {report['counts']['matrix_rows']}/117.",
                f"- Trace rows validated: {report['counts']['trace_rows']}.",
                f"- Failures: {len(report['failures'])}.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())

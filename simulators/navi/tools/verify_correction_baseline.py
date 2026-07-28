"""Verify that frozen pre-correction evidence was not changed."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
REPORT = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_correction"
BASELINE = REPORT / "correction_baseline_manifest.json"
FROZEN_GROUPS = (
    "original_acceptance_results",
    "independent_audit_reports",
    "independent_audit_results",
    "original_full_sdk_reports",
)


def digest(path: Path) -> str:
    value = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            value.update(chunk)
    return value.hexdigest()


def inspect(items: list[dict[str, object]]) -> dict[str, object]:
    changed = []
    missing = []
    unchanged = 0
    for item in items:
        path = ROOT / str(item["path"])
        if not path.is_file():
            missing.append(str(item["path"]))
        elif digest(path) != item["sha256"]:
            changed.append(str(item["path"]))
        else:
            unchanged += 1
    return {
        "expected": len(items),
        "unchanged": unchanged,
        "changed": changed,
        "missing": missing,
        "passed": not changed and not missing and unchanged == len(items),
    }


def main() -> int:
    baseline = json.loads(BASELINE.read_text(encoding="utf-8"))
    groups = {name: inspect(baseline["groups"][name]) for name in baseline["groups"]}
    frozen_passed = all(groups[name]["passed"] for name in FROZEN_GROUPS)
    production = groups["production_and_configuration"]
    result = {
        "generated_utc": datetime.now(timezone.utc).isoformat(),
        "baseline_manifest": str(BASELINE),
        "frozen_groups": list(FROZEN_GROUPS),
        "frozen_evidence_intact": frozen_passed,
        "groups": groups,
        "production_changes_expected": True,
        "production_changed_files": production["changed"],
        "production_missing_files": production["missing"],
    }
    REPORT.mkdir(parents=True, exist_ok=True)
    (REPORT / "correction_baseline_verification.json").write_text(
        json.dumps(result, indent=2) + "\n", encoding="utf-8"
    )
    lines = [
        "# Correction Baseline Verification",
        "",
        f"Frozen evidence intact: **{str(frozen_passed).upper()}**.",
        "",
        "| Group | Expected | Unchanged | Changed | Missing | Result |",
        "|---|---:|---:|---:|---:|:---:|",
    ]
    for name, record in groups.items():
        lines.append(
            f"| `{name}` | {record['expected']} | {record['unchanged']} | "
            f"{len(record['changed'])} | {len(record['missing'])} | "
            f"{'PASS' if record['passed'] else ('EXPECTED_CHANGES' if name == 'production_and_configuration' else 'FAIL')} |"
        )
    lines.extend(
        [
            "",
            "Production/configuration changes are expected in this correction phase; "
            "the four historical evidence groups must remain byte-for-byte unchanged.",
            "",
            "## Changed production/configuration files",
            "",
        ]
    )
    lines.extend(f"- `{path}`" for path in production["changed"])
    (REPORT / "correction_baseline_verification.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )
    print(json.dumps(result, indent=2))
    return 0 if frozen_passed else 1


if __name__ == "__main__":
    raise SystemExit(main())

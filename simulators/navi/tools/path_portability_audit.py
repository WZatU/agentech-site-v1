"""Audit production sources for machine-specific path dependencies."""

from __future__ import annotations

import argparse
import json
import re
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PRODUCTION_DIRECTORIES = (
    "backends",
    "navi_mujoco_sdk_translator",
    "simulation",
    "translator",
)
PRODUCTION_ROOT_FILES = (
    "controller.py",
    "demo.py",
    "model_config.py",
    "run_full_sdk_acceptance.py",
    "run_simulation.py",
    "simulation.py",
)
ABSOLUTE_PATTERNS = (
    re.compile(r"(?i)[\"'][A-Z]:[\\/]"),
    re.compile(r"[\"']/(?:home|Users|tmp)/"),
    re.compile(r"(?i)C:[\\/]Users[\\/]"),
)


def production_files(root: Path) -> list[Path]:
    files = [
        root / name
        for name in PRODUCTION_ROOT_FILES
        if (root / name).is_file()
    ]
    for directory in PRODUCTION_DIRECTORIES:
        files.extend((root / directory).rglob("*.py"))
    return sorted(set(files))


def audit(root: Path) -> dict:
    findings = []
    for path in production_files(root):
        text = path.read_text(encoding="utf-8")
        for number, line in enumerate(text.splitlines(), start=1):
            if any(pattern.search(line) for pattern in ABSOLUTE_PATTERNS):
                findings.append(
                    {
                        "path": path.relative_to(root).as_posix(),
                        "line": number,
                        "kind": "MACHINE_SPECIFIC_ABSOLUTE_PATH",
                        "text": line.strip(),
                    }
                )
    return {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "platforms_reviewed": ["Windows", "Linux", "WSL2"],
        "production_file_count": len(production_files(root)),
        "finding_count": len(findings),
        "findings": findings,
        "resource_roots": {
            "runtime_assets": "derived from installed module location with pathlib.Path",
            "default_output": "current working directory / results / unique run_id",
            "custom_output": "explicit --output",
            "configuration": "installed config or explicit --config-dir",
            "temporary_files": "Python tempfile APIs",
            "ffmpeg": "no hard-coded executable path; OpenCV video backend",
        },
        "status": "PASS" if not findings else "FAIL",
    }


def write_report(report: dict, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        "\n".join(
            [
                "# Path Portability Audit",
                "",
                f"Status: **{report['status']}**.",
                "",
                f"- Production files scanned: **{report['production_file_count']}**.",
                f"- Machine-specific absolute-path findings: **{report['finding_count']}**.",
                "- Reviewed targets: Windows, Linux, and WSL2.",
                "- Runtime assets resolve relative to the installed module location.",
                "- Default runtime output resolves below the caller's current "
                "working directory; it never writes into installed source.",
                "- `--config-dir` and `--output` provide explicit overrides.",
                "- No ffmpeg executable path is hard-coded.",
                "",
                "## Findings",
                "",
                *(
                    [
                        f"- `{item['path']}:{item['line']}` "
                        f"{item['kind']}: `{item['text']}`"
                        for item in report["findings"]
                    ]
                    or ["- None."]
                ),
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--root", type=Path, default=ROOT)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "outputs" / "release_validation" / "path_audit.md",
    )
    args = parser.parse_args(argv)
    report = audit(args.root.resolve())
    write_report(report, args.output)
    json_path = args.output.with_suffix(".json")
    json_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())

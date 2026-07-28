"""Freeze production and audit evidence before Full SDK correction changes."""

from __future__ import annotations

import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = (
    ROOT
    / "outputs"
    / "new_simulation_translate"
    / "full_sdk_correction"
    / "correction_baseline_manifest.json"
)


def digest(path: Path) -> dict[str, object]:
    stat = path.stat()
    return {
        "path": str(path.relative_to(ROOT)).replace("/", "\\"),
        "size": stat.st_size,
        "sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
        "modified_utc": datetime.fromtimestamp(
            stat.st_mtime, timezone.utc
        ).isoformat(),
    }


def collect_files() -> dict[str, list[Path]]:
    production = sorted(
        {
            *ROOT.glob("*.py"),
            *ROOT.glob("*.xml"),
            *ROOT.glob("translator/**/*.py"),
            *ROOT.glob("backends/**/*.py"),
            *ROOT.glob("simulation/**/*.py"),
            *ROOT.glob("config/**/*.json"),
            *ROOT.glob("urdf/**/*"),
            *ROOT.glob("meshes/**/*"),
        }
    )
    production = [
        path
        for path in production
        if path.is_file() and "__pycache__" not in path.parts
    ]
    return {
        "production_and_configuration": production,
        "original_acceptance_results": sorted(
            path
            for path in (ROOT / "results" / "full_sdk_acceptance").rglob("*")
            if path.is_file()
        ),
        "independent_audit_reports": sorted(
            path
            for path in (
                ROOT
                / "outputs"
                / "new_simulation_translate"
                / "full_sdk_audit"
            ).rglob("*")
            if path.is_file()
        ),
        "independent_audit_results": sorted(
            path
            for path in (
                ROOT / "results" / "full_sdk_independent_audit"
            ).rglob("*")
            if path.is_file()
        ),
        "original_full_sdk_reports": sorted(
            path
            for path in (
                ROOT
                / "outputs"
                / "new_simulation_translate"
                / "full_sdk_backend"
            ).rglob("*")
            if path.is_file()
        ),
    }


def main() -> int:
    groups = collect_files()
    manifest = {
        "schema_version": "1.0",
        "created_utc": datetime.now(timezone.utc).isoformat(),
        "project_root": str(ROOT),
        "purpose": (
            "Pre-correction freeze. Correction outputs and correction-only tests/"
            "tools are intentionally outside the frozen production evidence set."
        ),
        "groups": {
            name: [digest(path) for path in paths]
            for name, paths in groups.items()
        },
        "counts": {name: len(paths) for name, paths in groups.items()},
    }
    manifest["total_file_count"] = sum(manifest["counts"].values())
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(manifest["counts"], indent=2))
    print(f"total_file_count={manifest['total_file_count']}")
    print(f"manifest={OUTPUT}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

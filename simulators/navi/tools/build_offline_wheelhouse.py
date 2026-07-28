"""Repack the active, installed release dependencies into an offline wheelhouse.

This is intentionally a release-validation utility, not a dependency vendor
mechanism.  It lets the clean-install gate create a fresh virtual environment
without network access while retaining exact package/version/hash evidence.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_PACKAGES = (
    "setuptools",
    "wheel",
    "packaging",
    "jsonschema",
    "jsonschema-specifications",
    "referencing",
    "rpds-py",
    "attrs",
    "mujoco",
    "numpy",
    "absl-py",
    "etils",
    "fsspec",
    "glfw",
    "pyopengl",
    "typing-extensions",
    "zipp",
)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def safe_relative(value: str) -> Path | None:
    pure = PurePosixPath(value.replace("\\", "/"))
    if pure.is_absolute() or ".." in pure.parts:
        return None
    return Path(*pure.parts)


def repack_distribution(name: str, destination: Path, staging_root: Path) -> dict:
    distribution = importlib.metadata.distribution(name)
    version = distribution.version
    stage = staging_root / f"{name}-{version}"
    stage.mkdir(parents=True)
    copied = 0
    skipped_outside = []
    for package_path in distribution.files or ():
        relative = safe_relative(str(package_path))
        if relative is None:
            skipped_outside.append(str(package_path))
            continue
        source = Path(distribution.locate_file(package_path))
        target = stage / relative
        if source.is_dir():
            shutil.copytree(source, target, dirs_exist_ok=True)
        elif source.is_file():
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, target)
        else:
            continue
        copied += 1
    completed = subprocess.run(
        [
            sys.executable,
            "-m",
            "wheel",
            "pack",
            str(stage),
            "--dest-dir",
            str(destination),
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if completed.returncode != 0:
        raise RuntimeError(
            f"Could not repack {name}=={version}: {completed.stderr.strip()}"
        )
    candidates = sorted(
        destination.glob("*.whl"),
        key=lambda path: path.stat().st_mtime_ns,
    )
    if not candidates:
        raise RuntimeError(f"No wheel emitted for {name}=={version}")
    wheel_path = candidates[-1]
    return {
        "package": name,
        "version": version,
        "wheel": wheel_path.name,
        "size": wheel_path.stat().st_size,
        "sha256": sha256_file(wheel_path),
        "copied_distribution_files": copied,
        "skipped_external_entries": skipped_outside,
    }


def build(destination: Path, report_dir: Path) -> dict:
    destination.mkdir(parents=True, exist_ok=True)
    for old_wheel in destination.glob("*.whl"):
        old_wheel.unlink()
    records = []
    with tempfile.TemporaryDirectory(prefix="navi_offline_wheels_") as temporary:
        staging = Path(temporary)
        for name in DEFAULT_PACKAGES:
            records.append(repack_distribution(name, destination, staging))
    report = {
        "schema_version": "1.0.0",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "purpose": "offline_dependency_input_for_fresh_clean_install_only",
        "network_used": False,
        "source": "active_environment_installed_distributions",
        "wheel_count": len(records),
        "wheels": records,
        "status": "PASS",
    }
    report_dir.mkdir(parents=True, exist_ok=True)
    (report_dir / "offline_wheelhouse.json").write_text(
        json.dumps(report, indent=2) + "\n",
        encoding="utf-8",
    )
    lines = [
        "# Offline Wheelhouse Evidence",
        "",
        "Status: **PASS**.",
        "",
        "The wheelhouse was reconstructed from installed distribution files and "
        "used only as an offline dependency source for the fresh-environment gate.",
        "No network access was used.",
        "",
        "| Package | Version | Wheel SHA-256 |",
        "|---|---:|---|",
    ]
    lines.extend(
        f"| {record['package']} | {record['version']} | "
        f"`{record['sha256']}` |"
        for record in records
    )
    (report_dir / "offline_wheelhouse.md").write_text(
        "\n".join(lines) + "\n",
        encoding="utf-8",
    )
    return report


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(tempfile.gettempdir()) / "navi_v1_wheelhouse",
    )
    parser.add_argument(
        "--report-dir",
        type=Path,
        default=ROOT / "outputs" / "release_validation",
    )
    args = parser.parse_args(argv)
    report = build(args.output.resolve(), args.report_dir.resolve())
    print(
        json.dumps(
            {
                "status": report["status"],
                "wheel_count": report["wheel_count"],
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

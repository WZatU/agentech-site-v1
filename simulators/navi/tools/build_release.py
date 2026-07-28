"""Create, hash, and validate the source and evidence release ZIP files."""

from __future__ import annotations

import argparse
import hashlib
import importlib.metadata
import json
import os
import platform
import re
import subprocess
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath
from typing import Iterable


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from translator.provenance import sha256_file
from translator.version import __version__


RELEASE_SLUG = f"navi_mujoco_sdk_translator_v{__version__}"
RELEASE_DIR = ROOT / "release" / RELEASE_SLUG
DIST = ROOT / "dist"
SOURCE_ZIP = DIST / f"{RELEASE_SLUG}_source.zip"
EVIDENCE_ZIP = DIST / f"{RELEASE_SLUG}_evidence.zip"
VALIDATION = ROOT / "outputs" / "release_validation"

EXCLUDED_PARTS = {
    "__pycache__",
    ".pytest_cache",
    ".venv",
    "venv",
    "build",
    "dist",
    "dist_test",
    "release",
    "results",
    "outputs",
}
EXCLUDED_SUFFIXES = {".pyc", ".pyo"}
SOURCE_DIRS = (
    "backends",
    "config",
    "docs",
    "examples",
    "meshes",
    "navi_mujoco_sdk_translator",
    "schemas",
    "simulation",
    "tests",
    "tools",
    "translator",
    "urdf",
)
SOURCE_ROOT_FILES = (
    "MANIFEST.in",
    "README.md",
    "RELEASE_NOTES.md",
    "VERSION",
    "controller.py",
    "demo.py",
    "model_config.py",
    "pyproject.toml",
    "release_cleanup_plan.md",
    "requirements-dev.txt",
    "requirements-video.txt",
    "requirements.txt",
    "robot.xml",
    "run_full_sdk_acceptance.py",
    "run_simulation.py",
    "run_tests.py",
    "run_translation.py",
    "scene.xml",
    "setup.py",
    "simulation.py",
    "validate_model.py",
)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def iter_source_files() -> list[Path]:
    files = [ROOT / name for name in SOURCE_ROOT_FILES if (ROOT / name).is_file()]
    for directory in SOURCE_DIRS:
        for path in (ROOT / directory).rglob("*"):
            if not path.is_file():
                continue
            relative = path.relative_to(ROOT)
            if any(part in EXCLUDED_PARTS for part in relative.parts):
                continue
            if path.suffix.lower() in EXCLUDED_SUFFIXES:
                continue
            files.append(path)
    return sorted(set(files), key=lambda path: path.relative_to(ROOT).as_posix())


def category(path: Path) -> str:
    relative = path.relative_to(ROOT)
    first = relative.parts[0]
    if first == "tests":
        return "test_source"
    if first == "examples":
        return "examples"
    if first == "config":
        return "configuration"
    if first in {"meshes", "urdf"} or relative.name in {"scene.xml", "robot.xml"}:
        return "model_assets"
    if first == "docs" or relative.name in {"README.md", "RELEASE_NOTES.md"}:
        return "documentation"
    if first == "schemas":
        return "schemas"
    if first == "tools":
        return "tools"
    if relative.name in {
        "pyproject.toml",
        "setup.py",
        "MANIFEST.in",
        "VERSION",
        "requirements.txt",
        "requirements-dev.txt",
        "requirements-video.txt",
    }:
        return "packaging"
    return "production_source"


def environment() -> dict:
    versions = {}
    for name in ("mujoco", "numpy", "cv2", "jsonschema"):
        try:
            distribution = "opencv-python" if name == "cv2" else name
            versions[name] = importlib.metadata.version(distribution)
        except Exception:
            versions[name] = None
    return {
        "python": sys.version,
        "python_executable": Path(sys.executable).name,
        "operating_system": platform.platform(),
        "machine": platform.machine(),
        "dependencies": versions,
    }


def git_state() -> dict:
    try:
        commit = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
        status = subprocess.run(
            ["git", "status", "--short"],
            cwd=ROOT,
            capture_output=True,
            text=True,
            check=True,
        ).stdout.splitlines()
        return {"available": True, "commit": commit, "dirty": bool(status), "status": status}
    except Exception:
        return {"available": False, "commit": None, "dirty": None, "status": []}


def record(path: Path) -> dict:
    return {
        "path": path.relative_to(ROOT).as_posix(),
        "category": category(path),
        "size": path.stat().st_size,
        "sha256": sha256_file(path),
    }


def key_evidence() -> list[dict]:
    candidates = [
        ROOT / "outputs" / "new_simulation_translate" / "full_sdk_correction" / "final.md",
        ROOT / "outputs" / "new_simulation_translate" / "full_sdk_post_correction_audit" / "final.md",
        ROOT / "outputs" / "new_simulation_translate" / "full_sdk_post_correction_audit" / "post_correction_audit_summary.json",
        ROOT / "results" / "full_sdk_correction" / "acceptance_summary.json",
        ROOT / "results" / "full_sdk_correction" / "regressions" / "final" / "old_full_regression_67.log",
    ]
    return [
        {
            "path": path.relative_to(ROOT).as_posix(),
            "category": "historical_evidence",
            "size": path.stat().st_size,
            "sha256": sha256_file(path),
        }
        for path in candidates
        if path.is_file()
    ]


def write_manifest() -> dict:
    RELEASE_DIR.mkdir(parents=True, exist_ok=True)
    files = [record(path) for path in iter_source_files()]
    manifest = {
        "schema_version": "1.0.0",
        "release_name": "Navi MuJoCo SDK Translator",
        "version": __version__,
        "release_slug": RELEASE_SLUG,
        "generated_at": utc_now(),
        "environment": environment(),
        "git": git_state(),
        "files": files,
        "key_evidence": key_evidence(),
        "category_counts": {
            name: sum(item["category"] == name for item in files)
            for name in sorted({item["category"] for item in files})
        },
        "excluded": {
            "historical_outputs_from_source_zip": True,
            "caches": True,
            "virtual_environments": True,
            "build_directories": True,
        },
    }
    (RELEASE_DIR / "release_manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    lines = [
        f"# Release Manifest — v{__version__}",
        "",
        f"- Source/delivery files: **{len(files)}**.",
        f"- Generated: `{manifest['generated_at']}`.",
        f"- Python: `{platform.python_version()}`.",
        f"- OS: `{manifest['environment']['operating_system']}`.",
        f"- Git available: **{manifest['git']['available']}**.",
        "",
        "## Categories",
        "",
        "| Category | Files |",
        "|---|---:|",
        *[
            f"| `{name}` | {count} |"
            for name, count in manifest["category_counts"].items()
        ],
        "",
        "Every listed file has size and SHA-256 in `release_manifest.json`.",
        "Historical reports/results/videos are not part of the source ZIP; selected "
        "immutable evidence is packaged separately.",
    ]
    (RELEASE_DIR / "release_manifest.md").write_text(
        "\n".join(lines) + "\n", encoding="utf-8"
    )
    return manifest


def zip_files(
    destination: Path,
    mappings: Iterable[tuple[Path, str]],
) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(destination, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for source, name in mappings:
            archive.write(source, PurePosixPath(name).as_posix())


def build_source() -> Path:
    if not (RELEASE_DIR / "release_manifest.json").is_file():
        write_manifest()
    prefix = RELEASE_SLUG
    mappings = [
        (path, f"{prefix}/{path.relative_to(ROOT).as_posix()}")
        for path in iter_source_files()
    ]
    mappings.extend(
        [
            (
                RELEASE_DIR / name,
                f"{prefix}/release/{RELEASE_SLUG}/{name}",
            )
            for name in ("release_manifest.json", "release_manifest.md")
        ]
    )
    zip_files(SOURCE_ZIP, mappings)
    return SOURCE_ZIP


def changed_video_methods() -> list[str]:
    summary = json.loads(
        (ROOT / "results" / "full_sdk_correction" / "acceptance_summary.json").read_text(
            encoding="utf-8"
        )
    )
    return list(summary["changed_physical_methods"])


def write_video_metadata() -> Path:
    videos = []
    for method in changed_video_methods():
        path = ROOT / "results" / "full_sdk_correction" / method / "video.mp4"
        videos.append(
            {
                "method": method,
                "path": f"videos/{method}.mp4",
                "size": path.stat().st_size,
                "sha256": sha256_file(path),
                "tool_version": __version__,
                "schema_version": "1.0.0",
                "provenance": "regenerated_corrected_behavior",
            }
        )
    path = RELEASE_DIR / "video_metadata.json"
    path.write_text(
        json.dumps(
            {
                "tool_version": __version__,
                "video_count": len(videos),
                "videos": videos,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    return path


def evidence_mappings() -> list[tuple[Path, str]]:
    prefix = f"{RELEASE_SLUG}_evidence"
    mappings: list[tuple[Path, str]] = []

    def add(path: Path, destination: str) -> None:
        if path.is_file():
            mappings.append((path, f"{prefix}/{destination}"))

    for name in (
        "sdk_capabilities.md",
        "sdk_capabilities.csv",
        "known_limitations.md",
        "vendor_information_request.md",
        "security_model.md",
        "result_schema.md",
    ):
        add(ROOT / "docs" / name, f"docs/{name}")
    add(ROOT / "RELEASE_NOTES.md", "RELEASE_NOTES.md")
    add(RELEASE_DIR / "release_manifest.json", "release/release_manifest.json")
    add(RELEASE_DIR / "release_manifest.md", "release/release_manifest.md")
    video_metadata = write_video_metadata()
    add(video_metadata, "release/video_metadata.json")
    correction = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_correction"
    for path in sorted(correction.iterdir()):
        if path.is_file() and path.suffix.lower() in {".md", ".csv"}:
            add(path, f"correction/{path.name}")
    post = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_post_correction_audit"
    for name in (
        "final.md",
        "post_correction_audit_summary.json",
        "physical_execution_audit.md",
        "action_similarity_audit.md",
        "video_integrity.md",
        "cross_artifact_consistency.md",
    ):
        add(post / name, f"post_correction_audit/{name}")
    for name in (
        "summary.json",
        "summary.md",
        "environment.json",
        "test_commands.txt",
        "checksums.json",
    ):
        add(
            ROOT / "results" / "release_validation" / name,
            f"release_validation/{name}",
        )
    for name in (
        "clean_install.md",
        "offline_wheelhouse.md",
        "determinism.md",
        "path_audit.md",
        "schema_validation.md",
        "package_validation.md",
    ):
        add(VALIDATION / name, f"release_validation/{name}")
    canonical = ROOT / "results" / "release_validation" / "canonical_cli"
    add(canonical / "acceptance_summary.json", "canonical_cli/acceptance_summary.json")
    add(canonical / "sdk_method_matrix.csv", "canonical_cli/sdk_method_matrix.csv")
    add(canonical / "sdk_method_matrix.md", "canonical_cli/sdk_method_matrix.md")
    add(
        ROOT
        / "results"
        / "full_sdk_correction"
        / "regressions"
        / "final"
        / "old_full_regression_67.log",
        "regressions/old_full_regression_67.log",
    )
    for method in changed_video_methods():
        add(
            ROOT / "results" / "full_sdk_correction" / method / "video.mp4",
            f"videos/{method}.mp4",
        )
    return mappings


def build_evidence() -> Path:
    if not (RELEASE_DIR / "release_manifest.json").is_file():
        write_manifest()
    mappings = evidence_mappings()
    index = {
        "schema_version": "1.0.0",
        "tool_version": __version__,
        "generated_at": utc_now(),
        "file_count": len(mappings),
        "files": [
            {
                "path": PurePosixPath(name).as_posix(),
                "size": source.stat().st_size,
                "sha256": sha256_file(source),
            }
            for source, name in mappings
        ],
    }
    index_path = RELEASE_DIR / "evidence_bundle_index.json"
    index_path.write_text(json.dumps(index, indent=2) + "\n", encoding="utf-8")
    prefix = f"{RELEASE_SLUG}_evidence"
    mappings.append((index_path, f"{prefix}/bundle_index.json"))
    zip_files(EVIDENCE_ZIP, mappings)
    return EVIDENCE_ZIP


def validate_zip(path: Path, *, kind: str) -> dict:
    forbidden_parts = {"__pycache__", ".pytest_cache", ".venv", "venv", "build"}
    unsafe = []
    secret_findings = []
    current_user = os.environ.get("USERNAME", "")
    secret_patterns = (
        re.compile(rb"sk-[A-Za-z0-9_-]{20,}"),
        re.compile(rb"AKIA[0-9A-Z]{16}"),
        re.compile(rb"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
    )
    with zipfile.ZipFile(path) as archive:
        corrupt = archive.testzip()
        names = archive.namelist()
        for name in names:
            pure = PurePosixPath(name)
            if pure.is_absolute() or ".." in pure.parts or ":" in pure.parts[0]:
                unsafe.append(name)
            if forbidden_parts.intersection(pure.parts):
                unsafe.append(name)
            info = archive.getinfo(name)
            if info.file_size <= 5_000_000 and pure.suffix.lower() in {
                ".py", ".json", ".md", ".txt", ".toml", ".csv"
            }:
                data = archive.read(name)
                if current_user and current_user.lower().encode() in data.lower():
                    secret_findings.append(f"{name}: user directory/name")
                if any(pattern.search(data) for pattern in secret_patterns):
                    secret_findings.append(f"{name}: secret-like token")
        required = (
            ["README.md", "pyproject.toml", "scene.xml", "config/sdk_spec.json"]
            if kind == "source"
            else [
                "docs/sdk_capabilities.csv",
                "correction/final.md",
                "post_correction_audit/final.md",
                "release/video_metadata.json",
            ]
        )
        missing = [
            suffix
            for suffix in required
            if not any(name.endswith("/" + suffix) for name in names)
        ]
        video_count = sum(name.endswith(".mp4") for name in names)
    valid = not corrupt and not unsafe and not secret_findings and not missing
    if kind == "evidence":
        valid = valid and video_count == 27
    return {
        "kind": kind,
        "path": path.name,
        "sha256": sha256_file(path),
        "size": path.stat().st_size,
        "file_count": len(names),
        "video_count": video_count,
        "corrupt_entry": corrupt,
        "unsafe_entries": sorted(set(unsafe)),
        "secret_findings": secret_findings,
        "missing_required": missing,
        "status": "PASS" if valid else "FAIL",
    }


def write_package_validation(records: list[dict]) -> None:
    VALIDATION.mkdir(parents=True, exist_ok=True)
    payload = {
        "schema_version": "1.0.0",
        "tool_version": __version__,
        "generated_at": utc_now(),
        "status": "PASS" if all(item["status"] == "PASS" for item in records) else "FAIL",
        "packages": records,
    }
    (VALIDATION / "package_validation.json").write_text(
        json.dumps(payload, indent=2) + "\n", encoding="utf-8"
    )
    (VALIDATION / "package_validation.md").write_text(
        "\n".join(
            [
                "# Release Package Validation",
                "",
                f"Status: **{payload['status']}**.",
                "",
                "| Package | Files | Videos | Size | SHA-256 | Result |",
                "|---|---:|---:|---:|---|:---:|",
                *[
                    f"| `{item['path']}` | {item['file_count']} | "
                    f"{item['video_count']} | {item['size']} | "
                    f"`{item['sha256']}` | {item['status']} |"
                    for item in records
                ],
                "",
                "Checks: decompression, relative safe names, no traversal, no cache/"
                "venv/build entries, no current user directory, no common secret "
                "patterns, required files, and 27 evidence videos.",
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def write_checksums() -> dict:
    packages = [path for path in (SOURCE_ZIP, EVIDENCE_ZIP) if path.is_file()]
    checksums = {
        "schema_version": "1.0.0",
        "tool_version": __version__,
        "files": [
            {
                "path": path.name,
                "size": path.stat().st_size,
                "sha256": sha256_file(path),
            }
            for path in packages
        ],
    }
    DIST.mkdir(parents=True, exist_ok=True)
    (DIST / "checksums.json").write_text(
        json.dumps(checksums, indent=2) + "\n", encoding="utf-8"
    )
    return checksums


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "mode",
        choices=("manifest", "source", "evidence", "all"),
        default="all",
        nargs="?",
    )
    args = parser.parse_args(argv)
    if args.mode != "evidence" or not (
        RELEASE_DIR / "release_manifest.json"
    ).is_file():
        write_manifest()
    records = []
    if args.mode in {"source", "all"}:
        build_source()
        records.append(validate_zip(SOURCE_ZIP, kind="source"))
    if args.mode in {"evidence", "all"}:
        build_evidence()
        records.append(validate_zip(EVIDENCE_ZIP, kind="evidence"))
    if records:
        write_package_validation(records)
        write_checksums()
    print(json.dumps({"records": records}, indent=2))
    return 0 if all(item["status"] == "PASS" for item in records) else 1


if __name__ == "__main__":
    raise SystemExit(main())

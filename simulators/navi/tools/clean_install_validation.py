"""Validate the source ZIP in a fresh, non-editable temporary virtualenv."""

from __future__ import annotations

import argparse
import json
import os
import re
import subprocess
import sys
import tempfile
import zipfile
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from translator.version import __version__


def run_command(
    command: list[str],
    *,
    cwd: Path,
    env: dict[str, str],
    timeout: int = 300,
) -> dict:
    result = subprocess.run(
        command,
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
        timeout=timeout,
    )
    return {
        "command": [Path(part).name if index == 0 else part for index, part in enumerate(command)],
        "exit_code": result.returncode,
        "stdout_tail": result.stdout[-2000:],
        "stderr_tail": result.stderr[-2000:],
        "status": "PASS" if result.returncode == 0 else "FAIL",
    }


def validate(source_zip: Path, wheelhouse: Path | None = None) -> dict:
    records = []
    with tempfile.TemporaryDirectory(prefix="navi_release_clean_") as temporary:
        temp = Path(temporary).resolve()
        extract = temp / "source"
        venv = temp / "venv"
        work = temp / "work"
        extract.mkdir()
        work.mkdir()
        with zipfile.ZipFile(source_zip) as archive:
            archive.extractall(extract)
        roots = [path for path in extract.iterdir() if path.is_dir()]
        if len(roots) != 1:
            raise RuntimeError("Source ZIP must have one root directory")
        source = roots[0]
        records.append(
            run_command(
                [sys.executable, "-m", "venv", str(venv)],
                cwd=work,
                env=os.environ.copy(),
            )
        )
        python = (
            venv / "Scripts" / "python.exe"
            if os.name == "nt"
            else venv / "bin" / "python"
        )
        scripts = venv / ("Scripts" if os.name == "nt" else "bin")
        environment = os.environ.copy()
        environment.pop("PYTHONPATH", None)
        environment["PYTHONNOUSERSITE"] = "1"
        environment["PIP_NO_CACHE_DIR"] = "1"
        install_command = [
            str(python),
            "-m",
            "pip",
            "install",
            "--no-cache-dir",
        ]
        if wheelhouse is not None:
            install_command.extend(
                [
                    "--no-index",
                    "--find-links",
                    str(wheelhouse),
                ]
            )
        install_command.append(".")
        records.append(
            run_command(
                install_command,
                cwd=source,
                env=environment,
                timeout=600,
            )
        )
        records.append(
            run_command(
                [
                    str(python),
                    "-c",
                    (
                        "import navi_mujoco_sdk_translator as p; "
                        "print(p.__version__); print(p.__file__)"
                    ),
                ],
                cwd=work,
                env=environment,
            )
        )
        for executable, argument in (
            ("navi-sim", "--help"),
            ("navi-sim", "--version"),
            ("navi-sdk-acceptance", "--help"),
            ("navi-sdk-acceptance", "--version"),
        ):
            path = scripts / (executable + (".exe" if os.name == "nt" else ""))
            records.append(
                run_command([str(path), argument], cwd=work, env=environment)
            )
        smoke = scripts / (
            "navi-sim-smoke-test" + (".exe" if os.name == "nt" else "")
        )
        records.append(
            run_command(
                [str(smoke), "--output", str(work / "smoke"), "--seed", "0"],
                cwd=work,
                env=environment,
                timeout=180,
            )
        )
        sim = scripts / ("navi-sim" + (".exe" if os.name == "nt" else ""))
        records.append(
            run_command(
                [
                    str(sim),
                    str(source / "examples" / "basic" / "stand.py"),
                    "--allow-unresolved",
                    "--headless",
                    "--seed",
                    "0",
                    "--output",
                    str(work / "headless"),
                    "--pretty",
                ],
                cwd=work,
                env=environment,
                timeout=180,
            )
        )
        installed_outside_source = (
            records[2]["status"] == "PASS"
            and str(source).lower() not in records[2]["stdout_tail"].lower()
        )
        artifacts = {
            "smoke_summary": (work / "smoke" / "summary.json").is_file(),
            "headless_result": (work / "headless" / "result.json").is_file(),
            "installed_outside_source": installed_outside_source,
        }
        replacements = (
            (str(temp), "<TEMP>"),
            (str(Path.home()), "<USER_HOME>"),
        )

        def redact(value: str) -> str:
            for source, replacement in replacements:
                value = re.sub(
                    re.escape(source),
                    lambda _match: replacement,
                    value,
                    flags=re.IGNORECASE,
                )
            return value

        for record in records:
            record["command"] = [redact(value) for value in record["command"]]
            for field in ("stdout_tail", "stderr_tail"):
                record[field] = redact(record[field])
    status = (
        "PASS"
        if all(item["status"] == "PASS" for item in records)
        and all(artifacts.values())
        else "FAIL"
    )
    return {
        "schema_version": "1.0.0",
        "tool_version": __version__,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "source_package": source_zip.name,
        "fresh_virtualenv": True,
        "editable_install": False,
        "user_pythonpath_removed": True,
        "pip_cache_disabled": True,
        "network_dependency_source": wheelhouse is None,
        "offline_wheelhouse": wheelhouse is not None,
        "records": records,
        "artifacts": artifacts,
        "status": status,
    }


def write(report: dict, output: Path) -> None:
    output.mkdir(parents=True, exist_ok=True)
    (output / "clean_install.json").write_text(
        json.dumps(report, indent=2) + "\n", encoding="utf-8"
    )
    (output / "clean_install.md").write_text(
        "\n".join(
            [
                "# Clean Install Validation",
                "",
                f"Status: **{report['status']}**.",
                "",
                f"- Source package: `{report['source_package']}`.",
                "- Fresh temporary virtual environment: yes.",
                "- Installation: non-editable `pip install .`.",
                "- pip cache: disabled.",
                f"- Offline wheelhouse: **{report['offline_wheelhouse']}**.",
                f"- Network dependency source: "
                f"**{report['network_dependency_source']}**.",
                "- user `PYTHONPATH`: removed.",
                f"- Package imported outside extracted source: "
                f"**{report['artifacts']['installed_outside_source']}**.",
                f"- Installed smoke test: "
                f"**{report['artifacts']['smoke_summary']}**.",
                f"- Installed headless example: "
                f"**{report['artifacts']['headless_result']}**.",
                "",
                "| Step | Result | Exit |",
                "|---|:---:|---:|",
                *[
                    f"| `{record['command'][0]} {' '.join(record['command'][1:3])}` | "
                    f"{record['status']} | {record['exit_code']} |"
                    for record in report["records"]
                ],
            ]
        )
        + "\n",
        encoding="utf-8",
    )


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("source_zip", type=Path)
    parser.add_argument("--wheelhouse", type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / "outputs" / "release_validation",
    )
    args = parser.parse_args(argv)
    report = validate(
        args.source_zip.resolve(),
        args.wheelhouse.resolve() if args.wheelhouse else None,
    )
    write(report, args.output)
    print(json.dumps(report, indent=2))
    return 0 if report["status"] == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())

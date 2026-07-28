"""Generate correction artifacts while rendering only physically changed methods."""

from __future__ import annotations

import csv
import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import run_full_sdk_acceptance as acceptance

from tools.apply_grounded_profile_corrections import METHOD_PROFILE


OUTPUT = ROOT / "results" / "full_sdk_correction"
REPORT = ROOT / "outputs" / "new_simulation_translate" / "full_sdk_correction"
CHANGED_PHYSICAL_METHODS = tuple(
    sorted(
        {
            *METHOD_PROFILE,
            "stand_at_ease",
            "stand_at_attention",
            "lie_down",
        }
    )
)


def read_matrix(path: Path) -> list[dict[str, str]]:
    with path.open(encoding="utf-8", newline="") as stream:
        return list(csv.DictReader(stream))


def write_matrix(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=acceptance.MATRIX_FIELDS)
        writer.writeheader()
        writer.writerows(rows)


def main() -> int:
    acceptance.REPORT_DIR = REPORT
    base_args = [
        "--allow-unresolved",
        "--continue-on-failure",
        "--headless",
        "--pretty",
        "--seed",
        "0",
        "--output",
        str(OUTPUT),
    ]
    all_status = acceptance.run(["--all", "--no-video", *base_args])
    if all_status != 0:
        return all_status
    full_rows = read_matrix(OUTPUT / "sdk_method_matrix.csv")
    video_status = acceptance.run(
        [
            "--methods",
            ",".join(CHANGED_PHYSICAL_METHODS),
            "--record-video",
            *base_args,
        ]
    )
    if video_status != 0:
        return video_status
    changed = set(CHANGED_PHYSICAL_METHODS)
    for row in full_rows:
        if row["canonical_method"] in changed:
            video = OUTPUT / row["canonical_method"] / "video.mp4"
            row["generated_video"] = str(video.exists()).lower()
            if not video.exists():
                raise AssertionError(f"Missing corrected video: {video}")
    write_matrix(OUTPUT / "sdk_method_matrix.csv", full_rows)
    summary = {
        "selected": len(full_rows),
        "failures": sum(row["test_status"] != "PASS" for row in full_rows),
        "status_counts": dict(Counter(row["backend_status"] for row in full_rows)),
        "test_counts": dict(Counter(row["test_status"] for row in full_rows)),
        "changed_physical_method_count": len(CHANGED_PHYSICAL_METHODS),
        "changed_physical_methods": list(CHANGED_PHYSICAL_METHODS),
        "regenerated_video_count": sum(
            (OUTPUT / method / "video.mp4").exists()
            for method in CHANGED_PHYSICAL_METHODS
        ),
        "matrix": str(OUTPUT / "sdk_method_matrix.csv"),
    }
    (OUTPUT / "acceptance_summary.json").write_text(
        json.dumps(summary, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    (REPORT / "video_regeneration.md").write_text(
        "\n".join(
            [
                "# Video Regeneration",
                "",
                f"Regenerated videos: **{summary['regenerated_video_count']}**.",
                "",
                "Only methods whose physical profiles changed were rendered. Camera, "
                "resolution, frame rate, renderer and buffer policy remain the same.",
                "",
                ", ".join(f"`{method}`" for method in CHANGED_PHYSICAL_METHODS),
            ]
        )
        + "\n",
        encoding="utf-8",
    )
    print(json.dumps(summary, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

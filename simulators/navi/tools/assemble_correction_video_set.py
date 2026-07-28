"""Assemble regenerated videos plus unchanged baseline references for re-audit."""

from __future__ import annotations

import json
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from tools.run_full_sdk_correction_acceptance import CHANGED_PHYSICAL_METHODS


CORRECTION = ROOT / "results" / "full_sdk_correction"
BASELINE = ROOT / "results" / "full_sdk_acceptance"


def main() -> int:
    capabilities = json.loads(
        (ROOT / "config" / "backend_capabilities.json").read_text(encoding="utf-8")
    )
    physical = {
        entry["method"]
        for entry in capabilities["entries"]
        if entry["physical_execution"]
    }
    changed = set(CHANGED_PHYSICAL_METHODS)
    provenance = {}
    for method in sorted(physical):
        destination = CORRECTION / method / "video.mp4"
        if method in changed:
            if not destination.exists():
                raise FileNotFoundError(destination)
            source_type = "REGENERATED_AFTER_PHYSICAL_CHANGE"
            source = destination
        else:
            source = BASELINE / method / "video.mp4"
            if not source.exists():
                raise FileNotFoundError(source)
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(source, destination)
            source_type = "UNCHANGED_BASELINE_REFERENCE_COPY"
        item = {
            "method": method,
            "source_type": source_type,
            "source": str(source.relative_to(ROOT)).replace("/", "\\"),
            "artifact": str(destination.relative_to(ROOT)).replace("/", "\\"),
            "regenerated": method in changed,
        }
        provenance[method] = item
        (CORRECTION / method / "video_provenance.json").write_text(
            json.dumps(item, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
    payload = {
        "physical_method_count": len(physical),
        "regenerated_count": len(changed),
        "baseline_reference_count": len(physical - changed),
        "methods": provenance,
    }
    (CORRECTION / "video_provenance.json").write_text(
        json.dumps(payload, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    print(json.dumps({key: value for key, value in payload.items() if key != "methods"}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

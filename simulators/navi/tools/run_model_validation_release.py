"""Run model validation with release-isolated output paths."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import validate_model


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)
    args = parser.parse_args(argv)
    args.output.mkdir(parents=True, exist_ok=True)
    validate_model.RESULTS_DIRECTORY = args.output
    validate_model.JSON_REPORT = args.output / "model_validation.json"
    validate_model.MARKDOWN_REPORT = args.output / "model_validation.md"
    return validate_model.main()


if __name__ == "__main__":
    raise SystemExit(main())

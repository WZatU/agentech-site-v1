"""Load and validate versioned release JSON Schemas."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from jsonschema import Draft202012Validator, FormatChecker


SCHEMA_ROOT = Path(__file__).resolve().parents[1] / "schemas"


def load_schema(name: str) -> dict[str, Any]:
    path = SCHEMA_ROOT / name
    return json.loads(path.read_text(encoding="utf-8"))


def validate_payload(payload: Any, schema_name: str) -> None:
    schema = load_schema(schema_name)
    validator = Draft202012Validator(schema, format_checker=FormatChecker())
    errors = sorted(validator.iter_errors(payload), key=lambda item: list(item.path))
    if errors:
        details = "; ".join(
            f"{'/'.join(str(part) for part in error.path) or '$'}: {error.message}"
            for error in errors[:10]
        )
        raise ValueError(f"{schema_name} validation failed: {details}")


def validate_result(payload: dict[str, Any]) -> None:
    validate_payload(payload, "result.schema.json")


def validate_capabilities(payload: dict[str, Any]) -> None:
    validate_payload(payload, "capability.schema.json")

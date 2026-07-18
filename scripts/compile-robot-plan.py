"""Compile reviewed customer Python into inert robot commands on Code X.

The source is parsed, never executed. Only literal Agentech/dog method calls are
accepted; imports, variables, loops, helpers, attribute chains and expressions
are rejected so the resulting plan is deterministic and auditable.
"""
from __future__ import annotations

import ast
import hashlib
import json
import sys
from pathlib import Path

ALLOWED = {
    "forward", "backward", "lateral", "lateral_left", "lateral_right", "diagonal",
    "squat_forward", "squat_backward", "squat_lateral", "squat_diagonal", "squat_turn",
    "turn", "turn_right", "turn_left", "u_turn", "yaw", "pitch", "roll", "stay",
    "backflip", "jump", "stand", "squat", "sit", "stop", "emergency_stop", "battery",
    "get_body_state", "imu", "capture_image",
}
ROOTS = {"Agentech", "dog"}


def literal(node: ast.AST):
    value = ast.literal_eval(node)
    if value is None or isinstance(value, (bool, int, float, str)):
        return value
    raise ValueError("only scalar literal arguments are allowed")


def compile_plan(source: str, submission_id: str) -> dict:
    tree = ast.parse(source, filename=f"submission:{submission_id}", mode="exec")
    commands = []
    for statement in tree.body:
        if isinstance(statement, ast.ImportFrom) and statement.module == "agentech" and all(alias.name == "Agentech" for alias in statement.names):
            continue
        if isinstance(statement, ast.Import) and all(alias.name == "agentech" for alias in statement.names):
            continue
        if not isinstance(statement, ast.Expr) or not isinstance(statement.value, ast.Call):
            raise ValueError(f"line {statement.lineno}: only direct robot command calls are executable")
        call = statement.value
        if call.args or not isinstance(call.func, ast.Attribute) or not isinstance(call.func.value, ast.Name):
            raise ValueError(f"line {statement.lineno}: commands require a direct Agentech/dog call with named arguments")
        if call.func.value.id not in ROOTS or call.func.attr not in ALLOWED:
            raise ValueError(f"line {statement.lineno}: unapproved command")
        args = {}
        for keyword in call.keywords:
            if keyword.arg is None or keyword.arg in args:
                raise ValueError(f"line {statement.lineno}: invalid command arguments")
            args[keyword.arg] = literal(keyword.value)
        commands.append({"name": call.func.attr, "args": args, "line": statement.lineno})
    if not commands:
        raise ValueError("no robot commands found")
    return {
        "version": 1,
        "submission_id": submission_id,
        "source_sha256": hashlib.sha256(source.encode("utf-8")).hexdigest(),
        "commands": commands,
    }


def main() -> None:
    if len(sys.argv) != 4:
        raise SystemExit("usage: compile-robot-plan.py SOURCE SUBMISSION_ID OUTPUT")
    source = Path(sys.argv[1]).read_text(encoding="utf-8")
    plan = compile_plan(source, sys.argv[2])
    Path(sys.argv[3]).write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

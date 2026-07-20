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

from navi_gateway_spec import validate_navi_command

AEGIS_ALLOWED = {
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


def normalize_robot_model(value: str) -> str:
    normalized = value.strip().lower()
    if normalized in {"aegis", "aegies"}:
        return "aegis"
    if normalized == "navi":
        return "navi"
    raise ValueError(f"unsupported robot model: {value!r}")


def compile_plan(source: str, submission_id: str, robot_model: str = "aegis") -> dict:
    selected_model = normalize_robot_model(robot_model)
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
        if call.func.value.id not in ROOTS:
            raise ValueError(f"line {statement.lineno}: unapproved command")
        args = {}
        for keyword in call.keywords:
            if keyword.arg is None or keyword.arg in args:
                raise ValueError(f"line {statement.lineno}: invalid command arguments")
            args[keyword.arg] = literal(keyword.value)
        if selected_model == "navi":
            validate_navi_command(call.func.attr, args)
        elif call.func.attr not in AEGIS_ALLOWED:
            raise ValueError(f"line {statement.lineno}: unapproved command")
        commands.append({"name": call.func.attr, "args": args, "line": statement.lineno})
    if not commands:
        raise ValueError("no robot commands found")
    plan = {
        "version": 1,
        "submission_id": submission_id,
        "source_sha256": hashlib.sha256(source.encode("utf-8")).hexdigest(),
        "commands": commands,
    }
    if selected_model == "navi":
        plan["version"] = 2
        plan["robot_model"] = "navi"
    return plan


def main() -> None:
    if len(sys.argv) not in {4, 5}:
        raise SystemExit("usage: compile-robot-plan.py SOURCE SUBMISSION_ID [ROBOT_MODEL] OUTPUT")
    source = Path(sys.argv[1]).read_text(encoding="utf-8")
    robot_model = sys.argv[3] if len(sys.argv) == 5 else "aegis"
    output = sys.argv[4] if len(sys.argv) == 5 else sys.argv[3]
    plan = compile_plan(source, sys.argv[2], robot_model)
    Path(output).write_text(json.dumps(plan, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()

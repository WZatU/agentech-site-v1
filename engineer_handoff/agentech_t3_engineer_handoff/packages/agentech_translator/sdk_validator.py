"""Static validator for public Agentech SDK scripts."""

from __future__ import annotations

import ast
import difflib
import json
from pathlib import Path
from typing import Any


SUPPORTED_COMMANDS = [
    "stand",
    "stop",
    "damping",
    "walk_forward",
    "walk_backward",
    "move_left",
    "move_right",
    "turn_left",
    "turn_right",
    "set_body_height",
    "set_rpy",
    "do_action",
    "close",
]

_SUPPORTED_COMMAND_SET = set(SUPPORTED_COMMANDS)

_UNSUPPORTED_CONTEXTS = (
    ast.FunctionDef,
    ast.AsyncFunctionDef,
    ast.ClassDef,
    ast.For,
    ast.AsyncFor,
    ast.While,
    ast.If,
    ast.With,
    ast.AsyncWith,
    ast.Try,
    ast.Lambda,
    ast.ListComp,
    ast.SetComp,
    ast.DictComp,
    ast.GeneratorExp,
)


def validate_script(path: str | Path) -> dict[str, Any]:
    """Validate and extract straight-line ``dog.agt.xxx(...)`` SDK commands."""
    script_path = Path(path)
    source = script_path.read_text(encoding="utf-8")
    source_lines = source.splitlines()

    try:
        tree = ast.parse(source, filename=str(script_path))
    except SyntaxError as exc:
        line = int(exc.lineno or 1)
        code = source_lines[line - 1].strip() if 0 < line <= len(source_lines) else ""
        return {
            "status": "fail",
            "path": str(script_path),
            "items": [
                {
                    "line": line,
                    "code": code,
                    "status": "fail",
                    "reason": f"Python syntax error: {exc.msg}",
                    "supported_commands": SUPPORTED_COMMANDS,
                }
            ],
        }

    _attach_parents(tree)
    items: list[dict[str, Any]] = []

    for statement in tree.body:
        import_item = _validate_import(statement, source, source_lines)
        if import_item is not None:
            items.append(import_item)

    for node in sorted(
        (candidate for candidate in ast.walk(tree) if isinstance(candidate, ast.Call)),
        key=lambda candidate: (candidate.lineno, candidate.col_offset),
    ):
        if _is_allowed_setup_call(node):
            continue

        item = _validate_call(node, source, source_lines)
        items.append(item)

    status = "pass" if all(item["status"] == "pass" for item in items) else "fail"
    return {
        "status": status,
        "path": str(script_path),
        "items": items,
    }


def _validate_import(
    node: ast.AST,
    source: str,
    source_lines: list[str],
) -> dict[str, Any] | None:
    if isinstance(node, ast.Import):
        for alias in node.names:
            if alias.name != "agentech":
                return _fail_item(
                    node,
                    _source_for_node(node, source, source_lines),
                    "Only the public SDK import is allowed: import agentech as agt",
                )
        return None

    if isinstance(node, ast.ImportFrom):
        return _fail_item(
            node,
            _source_for_node(node, source, source_lines),
            "Only the public SDK import is allowed: import agentech as agt",
        )

    return None


def _attach_parents(tree: ast.AST) -> None:
    for parent in ast.walk(tree):
        for child in ast.iter_child_nodes(parent):
            setattr(child, "parent", parent)


def _is_allowed_setup_call(node: ast.Call) -> bool:
    if not (
        isinstance(node.func, ast.Attribute)
        and node.func.attr == "Dog"
        and isinstance(node.func.value, ast.Name)
        and node.func.value.id in {"agt", "agentech"}
    ):
        return False

    parent = getattr(node, "parent", None)
    return isinstance(parent, (ast.Assign, ast.AnnAssign))


def _validate_call(node: ast.Call, source: str, source_lines: list[str]) -> dict[str, Any]:
    code = _source_for_node(node, source, source_lines)
    blocked_context = _unsupported_context(node)
    if blocked_context is not None:
        return _fail_item(
            node,
            code,
            "Only straight-line dog.agt.xxx(...) calls are supported; "
            f"this call is inside {blocked_context}.",
        )

    if not (
        isinstance(node.func, ast.Attribute)
        and isinstance(node.func.value, ast.Attribute)
        and node.func.value.attr == "agt"
        and isinstance(node.func.value.value, ast.Name)
        and node.func.value.value.id == "dog"
    ):
        return _fail_item(
            node,
            code,
            "Only public dog.agt.xxx(...) SDK calls are allowed in runner scripts.",
        )

    command = node.func.attr
    if command not in _SUPPORTED_COMMAND_SET:
        alternatives = _alternatives(command)
        reason = f"Unsupported SDK command: {command}"
        if alternatives:
            reason += f". Supported alternatives: {', '.join(alternatives)}"
        return _fail_item(node, code, reason, command=command)

    literal_result = _literal_args(node)
    if literal_result["status"] == "fail":
        return _fail_item(
            node,
            code,
            literal_result["reason"],
            command=command,
        )

    return {
        "line": int(node.lineno),
        "code": code,
        "command": command,
        "args": literal_result["args"],
        "kwargs": literal_result["kwargs"],
        "status": "pass",
    }


def _unsupported_context(node: ast.AST) -> str | None:
    parent = getattr(node, "parent", None)
    while parent is not None:
        if isinstance(parent, _UNSUPPORTED_CONTEXTS):
            return type(parent).__name__
        parent = getattr(parent, "parent", None)
    return None


def _source_for_node(node: ast.AST, source: str, source_lines: list[str]) -> str:
    segment = ast.get_source_segment(source, node)
    if segment:
        return " ".join(line.strip() for line in segment.splitlines())
    line = int(getattr(node, "lineno", 1))
    if 0 < line <= len(source_lines):
        return source_lines[line - 1].strip()
    return ""


def _literal_args(node: ast.Call) -> dict[str, Any]:
    args: list[Any] = []
    kwargs: dict[str, Any] = {}

    for arg in node.args:
        if isinstance(arg, ast.Starred):
            return {
                "status": "fail",
                "reason": "Starred positional arguments are not supported; use literal arguments.",
            }
        parsed = _literal_value(arg)
        if parsed["status"] == "fail":
            return parsed
        args.append(parsed["value"])

    for keyword in node.keywords:
        if keyword.arg is None:
            return {
                "status": "fail",
                "reason": "Expanded keyword arguments are not supported; use literal keyword arguments.",
            }
        parsed = _literal_value(keyword.value)
        if parsed["status"] == "fail":
            return parsed
        kwargs[str(keyword.arg)] = parsed["value"]

    return {
        "status": "pass",
        "args": args,
        "kwargs": kwargs,
    }


def _literal_value(node: ast.AST) -> dict[str, Any]:
    try:
        value = ast.literal_eval(node)
    except (ValueError, TypeError):
        return {
            "status": "fail",
            "reason": "Arguments must be Python literals so the runner can execute safely.",
        }

    try:
        json.dumps(value)
    except TypeError:
        return {
            "status": "fail",
            "reason": "Arguments must be JSON-serializable literals.",
        }

    return {
        "status": "pass",
        "value": value,
    }


def _fail_item(
    node: ast.AST,
    code: str,
    reason: str,
    *,
    command: str | None = None,
) -> dict[str, Any]:
    item: dict[str, Any] = {
        "line": int(getattr(node, "lineno", 1)),
        "code": code,
        "status": "fail",
        "reason": reason,
        "supported_commands": SUPPORTED_COMMANDS,
    }
    if command is not None:
        item["command"] = command
    return item


def _alternatives(command: str) -> list[str]:
    matches = difflib.get_close_matches(command, SUPPORTED_COMMANDS, n=3, cutoff=0.6)
    if matches:
        return matches
    return ["stand", "stop", "do_action"]


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(description="Validate an SDK-style dog script.")
    parser.add_argument("script", help="Path to the SDK-style Python file.")
    args = parser.parse_args()
    print(json.dumps(validate_script(args.script), indent=2, ensure_ascii=False))

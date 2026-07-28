"""Static user-function call graph validation."""

from __future__ import annotations

import ast

from .errors import TranslationIssue


def validate_call_graph(tree: ast.Module, filename: str) -> list[TranslationIssue]:
    functions = {
        node.name: node for node in tree.body if isinstance(node, ast.FunctionDef)
    }
    graph: dict[str, set[str]] = {name: set() for name in functions}
    for name, function in functions.items():
        for node in ast.walk(function):
            if isinstance(node, ast.Call) and isinstance(node.func, ast.Name):
                if node.func.id in functions:
                    graph[name].add(node.func.id)

    issues: list[TranslationIssue] = []
    visiting: set[str] = set()
    visited: set[str] = set()

    def visit(name: str, path: list[str]) -> None:
        if name in visiting:
            cycle = path[path.index(name):] + [name]
            function = functions[name]
            code = "RECURSION_NOT_SUPPORTED" if len(set(cycle)) == 1 else "CALL_GRAPH_CYCLE"
            issues.append(
                TranslationIssue(
                    severity="error",
                    error_code=code,
                    message=f"User-function call cycle is not supported: {' -> '.join(cycle)}",
                    file=filename,
                    line=function.lineno,
                    column=function.col_offset,
                    details={"cycle": cycle},
                )
            )
            return
        if name in visited:
            return
        visiting.add(name)
        for target in graph[name]:
            visit(target, path + [target])
        visiting.remove(name)
        visited.add(name)

    for function_name in graph:
        visit(function_name, [function_name])
    return issues

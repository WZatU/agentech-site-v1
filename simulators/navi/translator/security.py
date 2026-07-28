"""AST-only source security scanner. It never executes submitted code."""

from __future__ import annotations

import ast
from pathlib import Path

from .errors import TranslationIssue
from .spec_loader import SdkSpec


FORBIDDEN_MODULES = {
    "os",
    "sys",
    "subprocess",
    "socket",
    "ctypes",
    "multiprocessing",
    "threading",
    "asyncio",
    "requests",
    "urllib",
    "http",
    "pathlib",
    "shutil",
    "pickle",
    "marshal",
    "importlib",
}
FORBIDDEN_CALLS = {
    "eval",
    "exec",
    "compile",
    "__import__",
    "globals",
    "locals",
    "getattr",
    "setattr",
    "delattr",
    "open",
    "input",
    "breakpoint",
    "print",
}


class SecurityScanner(ast.NodeVisitor):
    def __init__(self, spec: SdkSpec, filename: str):
        self.spec = spec
        self.filename = str(Path(filename))
        self.issues: list[TranslationIssue] = []

    def scan(self, tree: ast.AST) -> list[TranslationIssue]:
        self.visit(tree)
        return self.issues

    def _issue(self, node: ast.AST, code: str, message: str) -> None:
        self.issues.append(
            TranslationIssue(
                severity="error",
                error_code=code,
                message=message,
                file=self.filename,
                line=getattr(node, "lineno", None),
                column=getattr(node, "col_offset", None),
            )
        )

    def visit_Import(self, node: ast.Import) -> None:
        for alias in node.names:
            root = alias.name.split(".", 1)[0]
            if alias.name != "time":
                code = "DYNAMIC_IMPORT" if root == "importlib" else "FORBIDDEN_IMPORT"
                self._issue(node, code, f"Import {alias.name!r} is not allowed")

    def visit_ImportFrom(self, node: ast.ImportFrom) -> None:
        if node.level:
            self._issue(node, "FORBIDDEN_IMPORT", "Relative imports are not allowed")
            return
        names = {alias.name for alias in node.names}
        if node.module == self.spec.package and names == {self.spec.robot_class}:
            return
        if node.module == "time" and names == {"sleep"}:
            return
        code = "DYNAMIC_IMPORT" if node.module == "importlib" else "FORBIDDEN_IMPORT"
        self._issue(node, code, f"Import from {node.module!r} is not allowed")

    def visit_Call(self, node: ast.Call) -> None:
        if isinstance(node.func, ast.Name):
            if node.func.id in FORBIDDEN_CALLS:
                self._issue(node, "FORBIDDEN_CALL", f"Call {node.func.id!r} is forbidden")
        elif isinstance(node.func, ast.Attribute):
            root = node.func.value
            while isinstance(root, ast.Attribute):
                root = root.value
            if isinstance(root, ast.Name) and root.id in FORBIDDEN_MODULES:
                self._issue(node, "FORBIDDEN_CALL", f"Calls through {root.id!r} are forbidden")
        else:
            self._issue(node, "FORBIDDEN_CALL", "Dynamic call targets are forbidden")
        self.generic_visit(node)

    def visit_Attribute(self, node: ast.Attribute) -> None:
        if node.attr.startswith("__") or node.attr.endswith("__"):
            self._issue(node, "FORBIDDEN_ATTRIBUTE", "Dunder attribute access is forbidden")
        if isinstance(node.ctx, (ast.Store, ast.Del)):
            self._issue(node, "FORBIDDEN_ATTRIBUTE", "Attribute mutation is forbidden")
        self.generic_visit(node)

    def visit_Assign(self, node: ast.Assign) -> None:
        for target in node.targets:
            if isinstance(target, (ast.Attribute, ast.Subscript)):
                self._issue(target, "FORBIDDEN_ATTRIBUTE", "Object mutation is forbidden")
        self.generic_visit(node)

    def visit_AnnAssign(self, node: ast.AnnAssign) -> None:
        if isinstance(node.target, (ast.Attribute, ast.Subscript)):
            self._issue(node.target, "FORBIDDEN_ATTRIBUTE", "Object mutation is forbidden")
        self.generic_visit(node)

    def visit_While(self, node: ast.While) -> None:
        self._issue(node, "UNSUPPORTED_AST_NODE", "while loops are not supported")

    def visit_ClassDef(self, node: ast.ClassDef) -> None:
        self._issue(node, "UNSUPPORTED_AST_NODE", "Class definitions are not supported")

    def visit_Lambda(self, node: ast.Lambda) -> None:
        self._issue(node, "UNSUPPORTED_AST_NODE", "lambda is not supported")

    def visit_AsyncFunctionDef(self, node: ast.AsyncFunctionDef) -> None:
        self._issue(node, "UNSUPPORTED_AST_NODE", "Async functions are not supported")

    def visit_Await(self, node: ast.Await) -> None:
        self._issue(node, "UNSUPPORTED_AST_NODE", "await is not supported")

    def visit_Yield(self, node: ast.Yield) -> None:
        self._issue(node, "UNSUPPORTED_AST_NODE", "yield is not supported")

    def visit_YieldFrom(self, node: ast.YieldFrom) -> None:
        self._issue(node, "UNSUPPORTED_AST_NODE", "yield from is not supported")

    def visit_Try(self, node: ast.Try) -> None:
        self._issue(node, "UNSUPPORTED_AST_NODE", "try/except is not supported")

    def visit_With(self, node: ast.With) -> None:
        self._issue(node, "UNSUPPORTED_AST_NODE", "with statements are not supported")

    def visit_ListComp(self, node: ast.ListComp) -> None:
        self._issue(node, "UNSUPPORTED_AST_NODE", "Comprehensions are not supported")

    visit_SetComp = visit_ListComp
    visit_DictComp = visit_ListComp
    visit_GeneratorExp = visit_ListComp

    def visit_FunctionDef(self, node: ast.FunctionDef) -> None:
        if node.decorator_list:
            self._issue(node, "UNSUPPORTED_AST_NODE", "Function decorators are not supported")
        self.generic_visit(node)

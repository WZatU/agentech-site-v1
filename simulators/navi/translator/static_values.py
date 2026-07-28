"""Safe static evaluation for a deliberately small Python expression subset."""

from __future__ import annotations

import ast
import math
import operator
from dataclasses import dataclass
from typing import Any

from .errors import StaticEvaluationError
from .limits import TranslationLimits


@dataclass(frozen=True)
class QueryValue:
    query_id: str
    method: str


class Scope:
    def __init__(self, values: dict[str, Any] | None = None, parent: "Scope | None" = None):
        self.values = values or {}
        self.parent = parent

    def get(self, name: str) -> Any:
        if name in self.values:
            return self.values[name]
        if self.parent is not None:
            return self.parent.get(name)
        raise StaticEvaluationError(
            "DYNAMIC_ARGUMENT_UNRESOLVED", f"Name {name!r} is not statically defined"
        )

    def set(self, name: str, value: Any) -> None:
        self.values[name] = value


BIN_OPS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.FloorDiv: operator.floordiv,
    ast.Mod: operator.mod,
    ast.Pow: operator.pow,
}
UNARY_OPS = {ast.UAdd: operator.pos, ast.USub: operator.neg, ast.Not: operator.not_}
COMPARE_OPS = {
    ast.Eq: operator.eq,
    ast.NotEq: operator.ne,
    ast.Lt: operator.lt,
    ast.LtE: operator.le,
    ast.Gt: operator.gt,
    ast.GtE: operator.ge,
    ast.In: lambda left, right: left in right,
    ast.NotIn: lambda left, right: left not in right,
}


class StaticEvaluator:
    def __init__(self, limits: TranslationLimits | None = None):
        self.limits = limits or TranslationLimits()
        self._node_count = 0

    def evaluate(self, node: ast.AST, scope: Scope) -> Any:
        self._node_count = 0
        return self._evaluate(node, scope, depth=0)

    def _evaluate(self, node: ast.AST, scope: Scope, depth: int) -> Any:
        self._node_count += 1
        if depth > self.limits.max_ast_depth or self._node_count > self.limits.max_expression_nodes:
            raise StaticEvaluationError(
                "DYNAMIC_ARGUMENT_UNRESOLVED", "Static expression complexity limit exceeded"
            )
        if isinstance(node, ast.Constant):
            return self._validate_value(node.value)
        if isinstance(node, ast.Name):
            value = scope.get(node.id)
            if isinstance(value, QueryValue):
                raise StaticEvaluationError(
                    "QUERY_VALUE_USED_IN_UNSUPPORTED_EXPRESSION",
                    f"Query result {node.id!r} cannot control static translation",
                )
            return value
        if isinstance(node, (ast.List, ast.Tuple, ast.Set)):
            if len(node.elts) > self.limits.max_container_length:
                raise StaticEvaluationError("DYNAMIC_ARGUMENT_UNRESOLVED", "Container too large")
            values = [self._evaluate(item, scope, depth + 1) for item in node.elts]
            if isinstance(node, ast.Tuple):
                return tuple(values)
            if isinstance(node, ast.Set):
                return set(values)
            return values
        if isinstance(node, ast.Dict):
            if len(node.keys) > self.limits.max_container_length:
                raise StaticEvaluationError("DYNAMIC_ARGUMENT_UNRESOLVED", "Container too large")
            result: dict[Any, Any] = {}
            for key, value in zip(node.keys, node.values):
                if key is None:
                    raise StaticEvaluationError(
                        "DYNAMIC_ARGUMENT_UNRESOLVED", "Dictionary unpacking is not supported"
                    )
                result[self._evaluate(key, scope, depth + 1)] = self._evaluate(
                    value, scope, depth + 1
                )
            return result
        if isinstance(node, ast.BinOp) and type(node.op) in BIN_OPS:
            left = self._evaluate(node.left, scope, depth + 1)
            right = self._evaluate(node.right, scope, depth + 1)
            if isinstance(left, QueryValue) or isinstance(right, QueryValue):
                raise StaticEvaluationError(
                    "QUERY_VALUE_USED_IN_UNSUPPORTED_EXPRESSION",
                    "Query results cannot be used in arithmetic",
                )
            if isinstance(node.op, ast.Pow):
                if not isinstance(right, (int, float)) or abs(right) > self.limits.max_power_exponent:
                    raise StaticEvaluationError(
                        "DYNAMIC_ARGUMENT_UNRESOLVED", "Power exponent limit exceeded"
                    )
            try:
                return self._validate_value(BIN_OPS[type(node.op)](left, right))
            except (ArithmeticError, TypeError, OverflowError) as exc:
                raise StaticEvaluationError(
                    "DYNAMIC_ARGUMENT_UNRESOLVED", f"Static arithmetic failed: {exc}"
                ) from exc
        if isinstance(node, ast.UnaryOp) and type(node.op) in UNARY_OPS:
            value = self._evaluate(node.operand, scope, depth + 1)
            return self._validate_value(UNARY_OPS[type(node.op)](value))
        if isinstance(node, ast.BoolOp):
            values = [self._evaluate(value, scope, depth + 1) for value in node.values]
            return all(values) if isinstance(node.op, ast.And) else any(values)
        if isinstance(node, ast.Compare):
            left = self._evaluate(node.left, scope, depth + 1)
            for operation, comparator in zip(node.ops, node.comparators):
                right = self._evaluate(comparator, scope, depth + 1)
                if type(operation) not in COMPARE_OPS:
                    raise StaticEvaluationError(
                        "DYNAMIC_CONTROL_FLOW_UNRESOLVED", "Comparison is not supported"
                    )
                if not COMPARE_OPS[type(operation)](left, right):
                    return False
                left = right
            return True
        raise StaticEvaluationError(
            "DYNAMIC_ARGUMENT_UNRESOLVED",
            f"Expression node {type(node).__name__} is not statically supported",
        )

    def _validate_value(self, value: Any) -> Any:
        if value is None or isinstance(value, bool):
            return value
        if isinstance(value, int):
            if abs(value) > self.limits.max_integer_abs:
                raise StaticEvaluationError("DYNAMIC_ARGUMENT_UNRESOLVED", "Integer limit exceeded")
            return value
        if isinstance(value, float):
            if not math.isfinite(value) or abs(value) > self.limits.max_float_abs:
                raise StaticEvaluationError("DYNAMIC_ARGUMENT_UNRESOLVED", "Float limit exceeded")
            return value
        if isinstance(value, str):
            if len(value) > self.limits.max_string_length:
                raise StaticEvaluationError("DYNAMIC_ARGUMENT_UNRESOLVED", "String limit exceeded")
            return value
        if isinstance(value, (list, tuple, dict, set)):
            if len(value) > self.limits.max_container_length:
                raise StaticEvaluationError("DYNAMIC_ARGUMENT_UNRESOLVED", "Container too large")
            return value
        raise StaticEvaluationError(
            "DYNAMIC_ARGUMENT_UNRESOLVED", f"Value type {type(value).__name__} is unsupported"
        )

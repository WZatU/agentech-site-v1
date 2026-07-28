"""Restricted AST parser that extracts SDK semantics without executing user code."""

from __future__ import annotations

import ast
import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from .call_graph import validate_call_graph
from .errors import StaticEvaluationError, TranslationIssue
from .ir import SimulationCommand, SourceLocation, command_type_for
from .limits import TranslationLimits
from .registry import MethodRegistry
from .security import SecurityScanner
from .spec_loader import SdkSpec
from .static_values import QueryValue, Scope, StaticEvaluator
from .validator import SdkValidator


@dataclass
class TranslationResult:
    filename: str
    commands: list[SimulationCommand] = field(default_factory=list)
    issues: list[TranslationIssue] = field(default_factory=list)
    warnings: list[TranslationIssue] = field(default_factory=list)
    imports: list[str] = field(default_factory=list)
    sdk_class_names: list[str] = field(default_factory=list)
    sdk_objects: list[str] = field(default_factory=list)
    initialization_calls: list[dict[str, Any]] = field(default_factory=list)
    syntax_valid: bool = True
    security_valid: bool = True
    sdk_import_valid: bool = False

    @property
    def valid(self) -> bool:
        return self.syntax_valid and self.security_valid and not self.issues

    def validation_dict(self) -> dict[str, Any]:
        return {
            "status": "passed" if self.valid else "failed",
            "syntax_valid": self.syntax_valid,
            "security_valid": self.security_valid,
            "sdk_import_valid": self.sdk_import_valid,
            "sdk_class_valid": bool(self.sdk_class_names),
            "sdk_object_valid": bool(self.sdk_objects),
            "issues": [issue.to_dict() for issue in self.issues],
            "warnings": [warning.to_dict() for warning in self.warnings],
            "imports": self.imports,
            "sdk_classes": self.sdk_class_names,
            "sdk_objects": self.sdk_objects,
            "initialization_calls": self.initialization_calls,
        }


class TranslationParser:
    def __init__(
        self,
        spec: SdkSpec,
        registry: MethodRegistry,
        ground_truth_path: str | Path,
        limits: TranslationLimits | None = None,
    ):
        self.spec = spec
        self.registry = registry
        self.validator = SdkValidator(registry)
        self.limits = limits or TranslationLimits()
        self.evaluator = StaticEvaluator(self.limits)
        self.ground_truth_path = Path(ground_truth_path)
        self.ground_truth = json.loads(self.ground_truth_path.read_text(encoding="utf-8"))
        self._reset("", "")

    def _reset(self, source: str, filename: str) -> None:
        self.source = source
        self.filename = filename
        self.result = TranslationResult(filename=filename)
        self.global_scope = Scope({"__name__": "__main__"})
        self.sdk_classes: set[str] = set()
        self.sdk_objects: set[str] = set()
        self.time_modules: set[str] = set()
        self.sleep_names: set[str] = set()
        self.functions: dict[str, ast.FunctionDef] = {}
        self.call_depth = 0

    def parse_file(self, path: str | Path) -> TranslationResult:
        file_path = Path(path)
        return self.parse_source(file_path.read_text(encoding="utf-8"), str(file_path.resolve()))

    def parse_source(self, source: str, filename: str = "<memory>") -> TranslationResult:
        self._reset(source, filename)
        try:
            tree = ast.parse(source, filename=filename, mode="exec")
        except SyntaxError as exc:
            self.result.syntax_valid = False
            self.result.issues.append(
                TranslationIssue(
                    severity="error",
                    error_code="SYNTAX_ERROR",
                    message=exc.msg,
                    file=filename,
                    line=exc.lineno,
                    column=exc.offset,
                )
            )
            return self.result

        security_issues = SecurityScanner(self.spec, filename).scan(tree)
        graph_issues = validate_call_graph(tree, filename)
        if security_issues:
            self.result.security_valid = False
            self.result.issues.extend(security_issues)
        if graph_issues:
            self.result.issues.extend(graph_issues)
        if self.result.issues:
            return self.result

        self.functions = {
            node.name: node for node in tree.body if isinstance(node, ast.FunctionDef)
        }
        self._execute_block(tree.body, self.global_scope)

        if not self.result.sdk_import_valid:
            self._issue(
                tree,
                "SDK_IMPORT_NOT_FOUND",
                f"Expected 'from {self.spec.package} import {self.spec.robot_class}'",
            )
        self.result.sdk_class_names = sorted(self.sdk_classes)
        self.result.sdk_objects = sorted(self.sdk_objects)
        return self.result

    def _execute_block(self, statements: list[ast.stmt], scope: Scope) -> None:
        for statement in statements:
            if self.result.issues:
                return
            self._execute_statement(statement, scope)

    def _execute_statement(self, node: ast.stmt, scope: Scope) -> None:
        if isinstance(node, ast.Import):
            for alias in node.names:
                local_name = alias.asname or alias.name
                self.result.imports.append(f"import {alias.name}")
                if alias.name == "time":
                    self.time_modules.add(local_name)
            return
        if isinstance(node, ast.ImportFrom):
            self._handle_import_from(node)
            return
        if isinstance(node, ast.FunctionDef):
            return
        if isinstance(node, ast.Assign):
            self._handle_assign(node, scope)
            return
        if isinstance(node, ast.AnnAssign):
            if node.value is None or not isinstance(node.target, ast.Name):
                self._issue(node, "UNSUPPORTED_AST_NODE", "Only simple annotated assignments are supported")
                return
            self._assign_name(node.target.id, node.value, scope, node)
            return
        if isinstance(node, ast.Expr):
            self._handle_expression(node.value, scope)
            return
        if isinstance(node, ast.If):
            self._handle_if(node, scope)
            return
        if isinstance(node, ast.For):
            self._handle_for(node, scope)
            return
        if isinstance(node, ast.Pass):
            return
        self._issue(node, "UNSUPPORTED_AST_NODE", f"Statement {type(node).__name__} is not supported")

    def _handle_import_from(self, node: ast.ImportFrom) -> None:
        if node.module == self.spec.package:
            alias = node.names[0]
            local_name = alias.asname or alias.name
            self.sdk_classes.add(local_name)
            self.sdk_objects.add(local_name)
            self.result.sdk_import_valid = True
            self.result.imports.append(f"from {node.module} import {alias.name}")
        elif node.module == "time":
            alias = node.names[0]
            self.sleep_names.add(alias.asname or alias.name)
            self.result.imports.append(f"from time import {alias.name}")

    def _handle_assign(self, node: ast.Assign, scope: Scope) -> None:
        if len(node.targets) != 1 or not isinstance(node.targets[0], ast.Name):
            self._issue(node, "UNSUPPORTED_AST_NODE", "Only single-name assignments are supported")
            return
        self._assign_name(node.targets[0].id, node.value, scope, node)

    def _assign_name(self, name: str, value_node: ast.AST, scope: Scope, source_node: ast.AST) -> None:
        if isinstance(value_node, ast.Name) and value_node.id in self.sdk_classes | self.sdk_objects:
            self.sdk_objects.add(name)
            scope.set(name, value_node.id)
            return
        if isinstance(value_node, ast.Call):
            if isinstance(value_node.func, ast.Name) and value_node.func.id in self.sdk_classes:
                if self.spec.raw["setup"].get("instance_constructor") is None:
                    self._issue(
                        value_node,
                        "SDK_CLASS_NOT_FOUND",
                        f"{self.spec.robot_class} is a static facade; instance construction is not documented",
                    )
                    return
            classification = self._classify_call(value_node)
            if classification == "sdk":
                command = self._handle_sdk_call(value_node, scope)
                if command is not None:
                    scope.set(name, QueryValue(command.command_id, command.canonical_method))
                return
            if classification in {"sleep", "user_function"}:
                self._issue(
                    source_node,
                    "DYNAMIC_ARGUMENT_UNRESOLVED",
                    "The result of this call cannot be assigned statically",
                )
                return
        try:
            scope.set(name, self.evaluator.evaluate(value_node, scope))
        except StaticEvaluationError as exc:
            self._issue(source_node, exc.code, str(exc))

    def _handle_expression(self, node: ast.AST, scope: Scope) -> None:
        if not isinstance(node, ast.Call):
            self._issue(node, "UNSUPPORTED_AST_NODE", "Only call expressions are supported")
            return
        classification = self._classify_call(node)
        if classification == "sdk":
            self._handle_sdk_call(node, scope)
        elif classification == "sleep":
            self._handle_sleep(node, scope)
        elif classification == "user_function":
            self._call_user_function(node, scope)
        elif classification == "range":
            self._issue(node, "FORBIDDEN_CALL", "range() is only valid as a for-loop iterator")
        else:
            self._issue(node, "SDK_OBJECT_NOT_FOUND", "Call target is not an SDK object or supported user function")

    def _classify_call(self, node: ast.Call) -> str:
        if isinstance(node.func, ast.Attribute) and isinstance(node.func.value, ast.Name):
            base = node.func.value.id
            if base in self.sdk_objects | self.sdk_classes:
                return "sdk"
            if base in self.time_modules and node.func.attr == "sleep":
                return "sleep"
        if isinstance(node.func, ast.Name):
            if node.func.id in self.sleep_names:
                return "sleep"
            if node.func.id in self.functions:
                return "user_function"
            if node.func.id == "range":
                return "range"
        return "unknown"

    def _handle_sdk_call(self, node: ast.Call, scope: Scope) -> SimulationCommand | None:
        assert isinstance(node.func, ast.Attribute)
        assert isinstance(node.func.value, ast.Name)
        base = node.func.value.id
        public_name = node.func.attr
        self.sdk_objects.add(base)

        if public_name == "use" and base in self.sdk_classes | self.sdk_objects:
            return self._handle_initialization(node, scope)

        positional = self._evaluate_arguments(node.args, scope, node)
        if positional is None:
            return None
        keywords: list[tuple[str, Any]] = []
        for keyword in node.keywords:
            if keyword.arg is None:
                self._issue(keyword.value, "DYNAMIC_ARGUMENT_UNRESOLVED", "Keyword unpacking is not supported")
                return None
            try:
                value = self.evaluator.evaluate(keyword.value, scope)
            except StaticEvaluationError as exc:
                self._issue(keyword.value, exc.code, str(exc), method=public_name, parameter=keyword.arg)
                return None
            keywords.append((keyword.arg, value))

        validated = self.validator.validate(
            public_name,
            positional,
            keywords,
            filename=self.filename,
            line=node.lineno,
            column=node.col_offset,
        )
        for issue in validated.issues:
            if issue.severity == "error":
                self.result.issues.append(issue)
            else:
                self.result.warnings.append(issue)
        if not validated.valid or validated.bound is None or validated.resolution.method is None:
            return None
        if len(self.result.commands) >= self.limits.max_commands:
            self._issue(node, "MAX_COMMAND_COUNT_EXCEEDED", f"Maximum command count {self.limits.max_commands} exceeded")
            return None

        method = validated.resolution.method
        bound = validated.bound
        normalized = dict(bound.normalized_arguments)
        unresolved = list(bound.unresolved_metadata)
        if validated.resolution.alias is not None:
            unresolved.extend(
                f"alias.{path}" for path in self._find_unresolved(validated.resolution.alias.metadata)
            )

        global_contract = self.spec.raw.get("global_contract", {})
        blocking_raw = method.metadata.get("blocking", global_contract.get("blocking_default"))
        blocking = blocking_raw if isinstance(blocking_raw, bool) else None
        if blocking is None:
            unresolved.append("blocking")
        return_raw = method.metadata.get("return_type", global_contract.get("return_type_default"))
        if return_raw == "UNRESOLVED":
            unresolved.append("return_type")

        duration = None
        for duration_name in ("duration_s", "time"):
            value = normalized.get(duration_name)
            if isinstance(value, (int, float)) and not isinstance(value, bool):
                duration = float(value)
                break

        ground_truth = self._ground_truth_for(method.canonical_name)
        expected_end_state = method.metadata.get("end_state")
        if expected_end_state == "UNRESOLVED":
            unresolved.append("expected_end_state")
            expected_end_state = None
        if ground_truth and ground_truth.get("end_state"):
            expected_end_state = ground_truth["end_state"]

        warnings: list[dict[str, Any]] = [
            warning.to_dict()
            for warning in validated.issues
            if warning.severity == "warning"
        ]
        sdk_semantics: dict[str, Any] = {}
        if method.canonical_name == "turn":
            sdk_semantics["turn_direction_convention"] = "sdk_right_positive"
            sdk_semantics["backend_sign_conversion"] = "deferred_to_mujoco_adapter"
        if method.canonical_name == "frontflip" and ground_truth:
            conflict = {
                "severity": "warning",
                "error_code": "GROUND_TRUTH_CONFLICT",
                "message": "SDK stable-landing description conflicts with the real video outcome",
                "file": self.filename,
                "line": node.lineno,
                "column": node.col_offset,
                "method": "frontflip",
                "parameter": None,
                "details": {
                    "conflict_type": "SDK_DESCRIPTION_VS_VIDEO",
                    "sdk_expected_end_state": "stable_four_foot_landing",
                    "video_observed_end_state": ground_truth.get("end_state"),
                },
            }
            warnings.append(conflict)
            self.result.warnings.append(TranslationIssue(
                severity="warning",
                error_code="GROUND_TRUTH_CONFLICT",
                message=conflict["message"],
                file=self.filename,
                line=node.lineno,
                column=node.col_offset,
                method="frontflip",
                details=conflict["details"],
            ))
            sdk_semantics["ground_truth_conflict"] = conflict["details"]

        command_type = command_type_for(method.category, method.canonical_name)
        coordinate_frame = "BODY_FRAME" if method.category == "movement" else None
        command = SimulationCommand(
            command_id=f"cmd_{len(self.result.commands) + 1:04d}",
            sequence_index=len(self.result.commands),
            source_method=public_name,
            canonical_method=method.canonical_name,
            category=method.category,
            command_type=command_type,
            parameters=normalized,
            raw_arguments=dict(bound.raw_arguments),
            defaults_applied=bound.defaults_applied,
            start_time=None,
            duration=duration,
            blocking=blocking,
            coordinate_frame=coordinate_frame,
            expected_end_state=expected_end_state,
            ground_truth_reference=ground_truth,
            unresolved_metadata=tuple(dict.fromkeys(unresolved)),
            warnings=tuple(warnings),
            source_location=SourceLocation(self.filename, node.lineno, node.col_offset),
            sdk_semantics=sdk_semantics,
        )
        self.result.commands.append(command)
        return command

    def _handle_initialization(self, node: ast.Call, scope: Scope) -> None:
        positional = self._evaluate_arguments(node.args, scope, node)
        if positional is None:
            return None
        keywords: dict[str, Any] = {}
        for keyword in node.keywords:
            if keyword.arg is None:
                self._issue(node, "DYNAMIC_ARGUMENT_UNRESOLVED", "Initialization keyword unpacking is unsupported")
                return None
            try:
                keywords[keyword.arg] = self.evaluator.evaluate(keyword.value, scope)
            except StaticEvaluationError as exc:
                self._issue(keyword.value, exc.code, str(exc))
                return None
        if not positional or positional[0] != "navi":
            self._issue(node, "INVALID_ENUM_VALUE", "Agentech.use first argument must be 'navi'", method="use")
            return None
        if set(keywords) - {"host"}:
            self._issue(node, "UNKNOWN_KEYWORD_ARGUMENT", "Agentech.use only documents host", method="use")
            return None
        if "host" in keywords and not isinstance(keywords["host"], str):
            self._issue(node, "INVALID_ARGUMENT_TYPE", "Agentech.use host must be a string", method="use", parameter="host")
            return None
        self.result.initialization_calls.append({
            "facade": self.spec.robot_class,
            "robot": "navi",
            "host": keywords.get("host"),
            "source_location": {
                "file": self.filename,
                "line": node.lineno,
                "column": node.col_offset,
            },
        })
        return None

    def _handle_sleep(self, node: ast.Call, scope: Scope) -> None:
        if len(node.args) != 1 or node.keywords:
            self._issue(node, "INVALID_ARGUMENT_TYPE", "sleep requires one positional duration")
            return
        try:
            duration = self.evaluator.evaluate(node.args[0], scope)
        except StaticEvaluationError as exc:
            self._issue(node.args[0], exc.code, str(exc))
            return
        if isinstance(duration, bool) or not isinstance(duration, (int, float)) or duration < 0:
            self._issue(node, "ARGUMENT_OUT_OF_RANGE", "sleep duration must be a non-negative number")
            return
        if len(self.result.commands) >= self.limits.max_commands:
            self._issue(node, "MAX_COMMAND_COUNT_EXCEEDED", f"Maximum command count {self.limits.max_commands} exceeded")
            return
        command = SimulationCommand(
            command_id=f"cmd_{len(self.result.commands) + 1:04d}",
            sequence_index=len(self.result.commands),
            source_method="sleep",
            canonical_method="sleep",
            category="time",
            command_type="WAIT",
            parameters={"duration_s": float(duration)},
            raw_arguments={"duration_s": duration},
            defaults_applied=(),
            start_time=None,
            duration=float(duration),
            blocking=True,
            coordinate_frame=None,
            expected_end_state=None,
            ground_truth_reference=None,
            unresolved_metadata=(),
            warnings=(),
            source_location=SourceLocation(self.filename, node.lineno, node.col_offset),
        )
        self.result.commands.append(command)

    def _handle_if(self, node: ast.If, scope: Scope) -> None:
        if self._is_main_guard(node.test):
            self._execute_block(node.body, scope)
            return
        try:
            condition = self.evaluator.evaluate(node.test, scope)
        except StaticEvaluationError as exc:
            code = (
                "QUERY_VALUE_USED_IN_UNSUPPORTED_EXPRESSION"
                if exc.code == "QUERY_VALUE_USED_IN_UNSUPPORTED_EXPRESSION"
                else "DYNAMIC_CONTROL_FLOW_UNRESOLVED"
            )
            self._issue(node.test, code, str(exc))
            return
        if not isinstance(condition, bool):
            self._issue(node.test, "DYNAMIC_CONTROL_FLOW_UNRESOLVED", "if condition must resolve to bool")
            return
        self._execute_block(node.body if condition else node.orelse, scope)

    @staticmethod
    def _is_main_guard(node: ast.AST) -> bool:
        return (
            isinstance(node, ast.Compare)
            and isinstance(node.left, ast.Name)
            and node.left.id == "__name__"
            and len(node.ops) == 1
            and isinstance(node.ops[0], ast.Eq)
            and len(node.comparators) == 1
            and isinstance(node.comparators[0], ast.Constant)
            and node.comparators[0].value == "__main__"
        )

    def _handle_for(self, node: ast.For, scope: Scope) -> None:
        if node.orelse:
            self._issue(node, "UNSUPPORTED_AST_NODE", "for/else is not supported")
            return
        if not isinstance(node.target, ast.Name):
            self._issue(node.target, "UNSUPPORTED_AST_NODE", "for target must be a name")
            return
        if not isinstance(node.iter, ast.Call) or not isinstance(node.iter.func, ast.Name) or node.iter.func.id != "range":
            self._issue(node.iter, "DYNAMIC_CONTROL_FLOW_UNRESOLVED", "Only static range() loops are supported")
            return
        if node.iter.keywords or not 1 <= len(node.iter.args) <= 3:
            self._issue(node.iter, "DYNAMIC_CONTROL_FLOW_UNRESOLVED", "range requires 1 to 3 positional arguments")
            return
        values = self._evaluate_arguments(node.iter.args, scope, node.iter)
        if values is None:
            return
        if any(isinstance(value, bool) or not isinstance(value, int) for value in values):
            self._issue(node.iter, "INVALID_ARGUMENT_TYPE", "range arguments must be integers")
            return
        try:
            expanded = range(*values)
            iterations = len(expanded)
        except (ValueError, OverflowError) as exc:
            self._issue(node.iter, "DYNAMIC_CONTROL_FLOW_UNRESOLVED", f"Invalid range: {exc}")
            return
        if iterations > self.limits.max_loop_iterations:
            self._issue(
                node.iter,
                "MAX_LOOP_ITERATIONS_EXCEEDED",
                f"Loop expands to {iterations}, limit is {self.limits.max_loop_iterations}",
            )
            return
        for value in expanded:
            scope.set(node.target.id, value)
            self._execute_block(node.body, scope)
            if self.result.issues:
                return

    def _call_user_function(self, node: ast.Call, caller_scope: Scope) -> None:
        assert isinstance(node.func, ast.Name)
        function = self.functions[node.func.id]
        if self.call_depth >= self.limits.max_function_call_depth:
            self._issue(node, "CALL_GRAPH_CYCLE", "Maximum user-function call depth exceeded")
            return
        if function.args.vararg or function.args.kwarg or function.args.kwonlyargs:
            self._issue(function, "UNSUPPORTED_AST_NODE", "Variadic and keyword-only user parameters are unsupported")
            return
        parameters = list(function.args.posonlyargs) + list(function.args.args)
        if len(node.args) > len(parameters):
            self._issue(node, "POSITIONAL_ARGUMENT_OVERFLOW", f"{function.name} received too many positional arguments")
            return
        local = Scope(parent=self.global_scope)
        assigned: set[str] = set()
        for parameter, argument in zip(parameters, node.args):
            try:
                local.set(parameter.arg, self.evaluator.evaluate(argument, caller_scope))
                assigned.add(parameter.arg)
            except StaticEvaluationError as exc:
                self._issue(argument, exc.code, str(exc), parameter=parameter.arg)
                return
        for keyword in node.keywords:
            if keyword.arg is None:
                self._issue(keyword.value, "DYNAMIC_ARGUMENT_UNRESOLVED", "User-function keyword unpacking unsupported")
                return
            if keyword.arg not in {parameter.arg for parameter in parameters}:
                self._issue(keyword.value, "UNKNOWN_KEYWORD_ARGUMENT", f"Unknown parameter {keyword.arg!r}", parameter=keyword.arg)
                return
            if keyword.arg in assigned:
                self._issue(keyword.value, "DUPLICATE_ARGUMENT", f"Duplicate parameter {keyword.arg!r}", parameter=keyword.arg)
                return
            try:
                local.set(keyword.arg, self.evaluator.evaluate(keyword.value, caller_scope))
                assigned.add(keyword.arg)
            except StaticEvaluationError as exc:
                self._issue(keyword.value, exc.code, str(exc), parameter=keyword.arg)
                return
        default_start = len(parameters) - len(function.args.defaults)
        for index, parameter in enumerate(parameters):
            if parameter.arg in assigned:
                continue
            if index >= default_start:
                default_node = function.args.defaults[index - default_start]
                try:
                    local.set(parameter.arg, self.evaluator.evaluate(default_node, self.global_scope))
                except StaticEvaluationError as exc:
                    self._issue(default_node, exc.code, str(exc), parameter=parameter.arg)
                    return
            else:
                self._issue(node, "MISSING_REQUIRED_ARGUMENT", f"Missing user-function parameter {parameter.arg!r}", parameter=parameter.arg)
                return
        self.call_depth += 1
        try:
            self._execute_block(function.body, local)
        finally:
            self.call_depth -= 1

    def _evaluate_arguments(self, nodes: list[ast.AST], scope: Scope, call: ast.AST) -> list[Any] | None:
        values: list[Any] = []
        for argument in nodes:
            if isinstance(argument, ast.Starred):
                self._issue(argument, "DYNAMIC_ARGUMENT_UNRESOLVED", "Argument unpacking is not supported")
                return None
            try:
                values.append(self.evaluator.evaluate(argument, scope))
            except StaticEvaluationError as exc:
                self._issue(argument, exc.code, str(exc))
                return None
        return values

    def _ground_truth_for(self, method: str) -> dict[str, Any] | None:
        candidates: list[dict[str, Any]] = []
        candidates.extend(
            item for item in self.ground_truth.get("movements", []) if item.get("method") == method
        )
        candidates.extend(
            item for item in self.ground_truth.get("athletics", []) if item.get("method") == method
        )
        candidates.extend(
            item for item in self.ground_truth.get("actions_current_style", []) if item.get("method") == method
        )
        if not candidates:
            sequence = self.ground_truth.get("legacy_action_sequence", {}).get(
                "tokens_in_exact_video_order", []
            )
            confirmed = self.ground_truth.get("confirmed_legacy_mappings", {})
            for index, token in enumerate(sequence):
                mapping = confirmed.get(token)
                if token == method or (
                    isinstance(mapping, dict) and mapping.get("method") == method
                ):
                    number = 32 + index
                    return {
                        "evidence": "legacy_video",
                        "legacy_token": token,
                        "action_number": number,
                        "video": f"videos/actions/{number:02d}_{token}.mp4",
                        "mapping": mapping,
                        "public_status": "video_evidence_only_not_callable_wrapper",
                    }
            return None
        result = dict(candidates[0])
        if len(candidates) > 1:
            result["variant_count"] = len(candidates)
        return result

    @staticmethod
    def _find_unresolved(value: Any, prefix: str = "") -> list[str]:
        found: list[str] = []
        if value == "UNRESOLVED":
            found.append(prefix or "$")
        elif isinstance(value, dict):
            for key, child in value.items():
                child_prefix = f"{prefix}.{key}" if prefix else key
                found.extend(TranslationParser._find_unresolved(child, child_prefix))
        elif isinstance(value, list):
            for index, child in enumerate(value):
                found.extend(TranslationParser._find_unresolved(child, f"{prefix}[{index}]"))
        return found

    def _issue(
        self,
        node: ast.AST,
        code: str,
        message: str,
        *,
        method: str | None = None,
        parameter: str | None = None,
    ) -> None:
        self.result.issues.append(
            TranslationIssue(
                severity="error",
                error_code=code,
                message=message,
                file=self.filename,
                line=getattr(node, "lineno", None),
                column=getattr(node, "col_offset", None),
                method=method,
                parameter=parameter,
            )
        )

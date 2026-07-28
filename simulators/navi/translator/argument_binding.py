"""Python-like positional/keyword binding for SDK method specifications."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .errors import TranslationIssue
from .spec_loader import MethodSpec, ParameterSpec


@dataclass(frozen=True)
class BoundArguments:
    raw_arguments: dict[str, Any]
    normalized_arguments: dict[str, Any]
    defaults_applied: tuple[str, ...]
    unresolved_metadata: tuple[str, ...]
    issues: tuple[TranslationIssue, ...]

    @property
    def valid(self) -> bool:
        return not any(issue.severity == "error" for issue in self.issues)


class ArgumentBinder:
    def bind(
        self,
        method: MethodSpec,
        positional: list[Any],
        keywords: list[tuple[str, Any]],
        *,
        filename: str,
        line: int,
        column: int,
    ) -> BoundArguments:
        issues: list[TranslationIssue] = []
        raw: dict[str, Any] = {}
        normalized: dict[str, Any] = {}
        defaults: list[str] = []
        unresolved: list[str] = list(method.unresolved_fields)
        parameter_map = method.parameter_map()
        positional_parameters = [
            parameter for parameter in method.parameters
            if parameter.canonical_name == parameter.public_name
        ]

        def issue(code: str, message: str, parameter: str | None = None, severity: str = "error") -> None:
            issues.append(
                TranslationIssue(
                    severity=severity,
                    error_code=code,
                    message=message,
                    file=filename,
                    line=line,
                    column=column,
                    method=method.public_name,
                    parameter=parameter,
                )
            )

        if len(positional) > len(positional_parameters):
            issue(
                "POSITIONAL_ARGUMENT_OVERFLOW",
                f"{method.public_name} accepts at most {len(positional_parameters)} positional arguments",
            )
        for value, parameter in zip(positional, positional_parameters):
            raw[parameter.public_name] = value

        for name, value in keywords:
            if name not in parameter_map:
                issue("UNKNOWN_KEYWORD_ARGUMENT", f"Unknown argument {name!r}", name)
                continue
            if name in raw:
                issue("DUPLICATE_ARGUMENT", f"Argument {name!r} was provided twice", name)
                continue
            raw[name] = value

        for supplied_name, value in raw.items():
            parameter = parameter_map.get(supplied_name)
            if parameter is None:
                continue
            canonical_name = parameter.canonical_name
            if canonical_name in normalized:
                issue(
                    "DUPLICATE_ARGUMENT",
                    f"Argument {canonical_name!r} was supplied through multiple names",
                    canonical_name,
                )
                continue
            exclusive = parameter.definition.get("exclusive_with")
            if isinstance(exclusive, str) and exclusive in raw:
                issue(
                    "DUPLICATE_ARGUMENT",
                    f"Arguments {supplied_name!r} and {exclusive!r} are mutually exclusive",
                    supplied_name,
                )
                continue
            canonical_spec = parameter_map.get(canonical_name, parameter)
            if self._validate_value(canonical_spec, value, issue):
                normalized[canonical_name] = self._normalize_value(canonical_spec, value)

        for parameter in positional_parameters:
            name = parameter.public_name
            if name in normalized:
                continue
            if parameter.required is True:
                issue("MISSING_REQUIRED_ARGUMENT", f"Missing required argument {name!r}", name)
            elif parameter.default_present:
                if parameter.default == "UNRESOLVED":
                    unresolved.append(f"parameters.{name}.default")
                    issue(
                        "UNRESOLVED_DEFAULT_VALUE",
                        f"Default for {name!r} is unresolved; no value was invented",
                        name,
                        severity="warning",
                    )
                else:
                    normalized[name] = parameter.default
                    defaults.append(name)

        for parameter in positional_parameters:
            if parameter.public_name not in normalized:
                continue
            requires = parameter.definition.get("requires")
            forbids = parameter.definition.get("forbids")
            if isinstance(requires, str) and requires not in normalized:
                issue(
                    "MISSING_REQUIRED_ARGUMENT",
                    f"{parameter.public_name!r} requires {requires!r}",
                    requires,
                )
            if isinstance(forbids, str) and forbids in normalized:
                issue(
                    "DUPLICATE_ARGUMENT",
                    f"{parameter.public_name!r} forbids {forbids!r}",
                    forbids,
                )

        return BoundArguments(
            raw_arguments=raw,
            normalized_arguments=normalized,
            defaults_applied=tuple(defaults),
            unresolved_metadata=tuple(dict.fromkeys(unresolved)),
            issues=tuple(issues),
        )

    def _validate_value(self, parameter: ParameterSpec, value: Any, issue) -> bool:
        definition = parameter.definition
        type_name = definition.get("type")
        valid_type = True
        if type_name == "number":
            valid_type = isinstance(value, (int, float)) and not isinstance(value, bool)
        elif type_name == "integer":
            valid_type = isinstance(value, int) and not isinstance(value, bool)
        elif type_name == "boolean":
            valid_type = isinstance(value, bool)
        elif type_name == "string":
            valid_type = isinstance(value, str)
        if not valid_type:
            issue(
                "INVALID_ARGUMENT_TYPE",
                f"{parameter.public_name!r} expects {type_name}, got {type(value).__name__}",
                parameter.public_name,
            )
            return False
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            minimum = definition.get("minimum")
            maximum = definition.get("maximum")
            exclusive_minimum = definition.get("exclusive_minimum")
            if minimum is not None and value < minimum:
                issue("ARGUMENT_OUT_OF_RANGE", f"{parameter.public_name!r} is below {minimum}", parameter.public_name)
                return False
            if maximum is not None and value > maximum:
                issue("ARGUMENT_OUT_OF_RANGE", f"{parameter.public_name!r} exceeds {maximum}", parameter.public_name)
                return False
            if exclusive_minimum is not None and value <= exclusive_minimum:
                issue("ARGUMENT_OUT_OF_RANGE", f"{parameter.public_name!r} must be greater than {exclusive_minimum}", parameter.public_name)
                return False
            if definition.get("nonzero") and value == 0:
                issue("ARGUMENT_OUT_OF_RANGE", f"{parameter.public_name!r} must be nonzero", parameter.public_name)
                return False
            zero_or_range = definition.get("zero_or_abs_range")
            if isinstance(zero_or_range, list) and value != 0:
                magnitude = abs(value)
                if not zero_or_range[0] <= magnitude <= zero_or_range[1]:
                    issue("ARGUMENT_OUT_OF_RANGE", f"{parameter.public_name!r} magnitude is outside {zero_or_range}", parameter.public_name)
                    return False
        enum = definition.get("enum")
        if isinstance(enum, list) and value not in enum:
            issue(
                "INVALID_ENUM_VALUE",
                f"{parameter.public_name!r} must be one of {enum!r}",
                parameter.public_name,
            )
            return False
        conditional = definition.get("conditional_exclusion")
        # Cross-parameter conditional exclusions are checked by the validator after binding.
        _ = conditional
        return True

    @staticmethod
    def _normalize_value(parameter: ParameterSpec, value: Any) -> Any:
        if parameter.type_name == "number" and isinstance(value, int) and not isinstance(value, bool):
            return float(value)
        return value

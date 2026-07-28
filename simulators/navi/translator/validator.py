"""SDK method resolution and argument validation."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .argument_binding import ArgumentBinder, BoundArguments
from .errors import TranslationIssue
from .registry import MethodRegistry, MethodResolution, MethodStatus


@dataclass(frozen=True)
class ValidatedCall:
    resolution: MethodResolution
    bound: BoundArguments | None
    issues: tuple[TranslationIssue, ...]

    @property
    def valid(self) -> bool:
        return not any(issue.severity == "error" for issue in self.issues)


class SdkValidator:
    def __init__(self, registry: MethodRegistry):
        self.registry = registry
        self.binder = ArgumentBinder()

    def validate(
        self,
        public_name: str,
        positional: list[Any],
        keywords: list[tuple[str, Any]],
        *,
        filename: str,
        line: int,
        column: int,
    ) -> ValidatedCall:
        resolution = self.registry.resolve_method(public_name)
        issues: list[TranslationIssue] = []
        if resolution.status == MethodStatus.LEGACY_NOT_PUBLIC:
            issues.append(self._issue(
                "LEGACY_METHOD_NOT_PUBLIC",
                resolution.reason or f"{public_name!r} is a legacy non-public method",
                filename, line, column, public_name,
            ))
            return ValidatedCall(resolution, None, tuple(issues))
        if resolution.status == MethodStatus.UNKNOWN:
            issues.append(self._issue(
                "UNKNOWN_SDK_METHOD",
                f"Unknown SDK method {public_name!r}",
                filename, line, column, public_name,
            ))
            return ValidatedCall(resolution, None, tuple(issues))
        if resolution.status == MethodStatus.UNSUPPORTED:
            issues.append(self._issue(
                "UNRESOLVED_METHOD_SEMANTICS",
                f"SDK method {public_name!r} is not available: {resolution.reason or resolution.method.status if resolution.method else 'unsupported'}",
                filename, line, column, public_name,
            ))
            return ValidatedCall(resolution, None, tuple(issues))
        assert resolution.method is not None
        bound = self.binder.bind(
            resolution.method,
            positional,
            keywords,
            filename=filename,
            line=line,
            column=column,
        )
        issues.extend(bound.issues)

        brush = resolution.method.public_name == "brush_teeth"
        if brush and bound.valid:
            values = bound.normalized_arguments
            if values.get("direction") == "left" and values.get("phase") == "start":
                issues.append(self._issue(
                    "INVALID_ENUM_VALUE",
                    "brush_teeth phase='start' is unavailable for direction='left'",
                    filename, line, column, public_name, "phase",
                ))
        return ValidatedCall(resolution, bound, tuple(issues))

    @staticmethod
    def _issue(
        code: str,
        message: str,
        filename: str,
        line: int,
        column: int,
        method: str,
        parameter: str | None = None,
    ) -> TranslationIssue:
        return TranslationIssue(
            severity="error",
            error_code=code,
            message=message,
            file=filename,
            line=line,
            column=column,
            method=method,
            parameter=parameter,
        )

"""Deterministic scheduling for IR commands with explicit unresolved handling."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any

from .errors import TranslationIssue
from .ir import SimulationCommand
from .limits import TranslationLimits


@dataclass(frozen=True)
class ScheduledCommand:
    command: SimulationCommand
    start_time: float
    end_time: float
    blocking: bool
    scheduling_assumption: str | None
    dependency: str | None

    def to_dict(self) -> dict[str, Any]:
        result = self.command.to_dict()
        result.update({
            "start_time": self.start_time,
            "end_time": self.end_time,
            "blocking": self.blocking,
            "scheduling_assumption": self.scheduling_assumption,
            "dependency": self.dependency,
        })
        return result


@dataclass(frozen=True)
class ScheduleResult:
    commands: tuple[ScheduledCommand, ...]
    issues: tuple[TranslationIssue, ...]
    warnings: tuple[TranslationIssue, ...]
    approximation_used: bool
    simulation_time: float

    @property
    def valid(self) -> bool:
        return not self.issues


class CommandScheduler:
    def __init__(self, limits: TranslationLimits | None = None):
        self.limits = limits or TranslationLimits()

    def schedule(
        self,
        commands: list[SimulationCommand],
        *,
        strict: bool = True,
    ) -> ScheduleResult:
        scheduled: list[ScheduledCommand] = []
        issues: list[TranslationIssue] = []
        warnings: list[TranslationIssue] = []
        current_time = 0.0
        approximation_used = False
        dependency: str | None = None

        for command in commands:
            assumption: str | None = None
            if command.blocking is None:
                if strict:
                    issues.append(self._issue(
                        command,
                        "UNRESOLVED_METHOD_SEMANTICS",
                        f"Blocking behavior for {command.source_method!r} is unresolved",
                    ))
                    break
                blocking = True
                assumption = "sequential_conservative_for_unresolved_blocking"
                approximation_used = True
                warnings.append(self._issue(
                    command,
                    "APPROXIMATE_SCHEDULING",
                    f"Temporarily treating {command.source_method!r} as blocking",
                    severity="warning",
                ))
            else:
                blocking = command.blocking

            duration = command.duration if command.duration is not None else 0.0
            start_time = current_time
            end_time = start_time + duration
            scheduled.append(
                ScheduledCommand(
                    command=command,
                    start_time=start_time,
                    end_time=end_time,
                    blocking=blocking,
                    scheduling_assumption=assumption,
                    dependency=dependency,
                )
            )
            if blocking:
                current_time = end_time
                dependency = command.command_id
            if current_time > self.limits.max_simulation_time:
                issues.append(self._issue(
                    command,
                    "MAX_SIMULATION_TIME_EXCEEDED",
                    f"Scheduled time {current_time:.6g}s exceeds {self.limits.max_simulation_time:.6g}s",
                ))
                break

        return ScheduleResult(
            commands=tuple(scheduled),
            issues=tuple(issues),
            warnings=tuple(warnings),
            approximation_used=approximation_used,
            simulation_time=current_time,
        )

    @staticmethod
    def _issue(
        command: SimulationCommand,
        code: str,
        message: str,
        severity: str = "error",
    ) -> TranslationIssue:
        location = command.source_location
        return TranslationIssue(
            severity=severity,
            error_code=code,
            message=message,
            file=location.file,
            line=location.line,
            column=location.column,
            method=command.source_method,
        )

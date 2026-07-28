"""Backend contract shared by the fake backend and the future MuJoCo adapter."""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any

from translator.scheduler import ScheduledCommand


@dataclass(frozen=True)
class BackendExecutionResult:
    status: str
    commands_executed: int
    simulation_time: float
    execution_log: tuple[dict[str, Any], ...]
    query_results: tuple[dict[str, Any], ...]
    warnings: tuple[dict[str, Any], ...] = ()
    backend_mapping: tuple[dict[str, Any], ...] = ()
    command_metrics: tuple[dict[str, Any], ...] = ()
    state_trace: tuple[dict[str, Any], ...] = ()
    safety_events: tuple[dict[str, Any], ...] = ()
    final_state: dict[str, Any] | None = None
    error_code: str | None = None


@dataclass(frozen=True)
class BackendCommandResult:
    status: str
    command_id: str
    method: str
    start_time: float
    end_time: float
    mapping: dict[str, Any]
    metrics: dict[str, Any]
    error_code: str | None = None
    message: str | None = None


class SimulationBackend(ABC):
    name: str

    @abstractmethod
    def reset(self) -> None:
        raise NotImplementedError

    @abstractmethod
    def execute(self, commands: tuple[ScheduledCommand, ...]) -> BackendExecutionResult:
        raise NotImplementedError

    @abstractmethod
    def finalize(self) -> None:
        raise NotImplementedError

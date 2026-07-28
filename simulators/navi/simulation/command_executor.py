"""Execute scheduled IR through a SimulationBackend implementation."""

from __future__ import annotations

from typing import TYPE_CHECKING

from backends.base import BackendCommandResult, BackendExecutionResult
from translator.scheduler import ScheduledCommand

if TYPE_CHECKING:
    from backends.mujoco_backend import MujocoBackend


class CommandExecutor:
    def __init__(self, backend: "MujocoBackend"):
        self.backend = backend

    def execute(self, commands: tuple[ScheduledCommand, ...]) -> BackendExecutionResult:
        executed = 0
        error_code: str | None = None
        for scheduled in commands:
            result: BackendCommandResult = self.backend.execute_scheduled(scheduled)
            self.backend.command_results.append(result)
            self.backend.backend_mapping.append(result.mapping)
            self.backend.command_metrics.append(result.metrics)
            if result.status != "completed":
                error_code = result.error_code
                break
            executed += 1
            if self.backend.safety_monitor.fatal:
                error_code = "SAFETY_STOPPED"
                break
        final_state = self.backend.get_state().to_dict()
        final_state["runtime_state"] = self.backend.runtime_state
        status = "completed" if error_code is None else "failed"
        return BackendExecutionResult(
            status=status,
            commands_executed=executed,
            simulation_time=float(self.backend.data.time),
            execution_log=tuple(self.backend.execution_log),
            query_results=tuple(self.backend.query_results),
            warnings=tuple(self.backend.warnings),
            backend_mapping=tuple(self.backend.backend_mapping),
            command_metrics=tuple(self.backend.command_metrics),
            state_trace=tuple(self.backend.trace_recorder.rows),
            safety_events=tuple(
                event.to_dict() for event in self.backend.safety_monitor.events
            ),
            final_state=final_state,
            error_code=error_code,
        )

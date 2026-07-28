"""Non-physical backend used only to verify translation and scheduling."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from .base import BackendExecutionResult, SimulationBackend
from translator.scheduler import ScheduledCommand


@dataclass
class FakeRobotState:
    simulation_time: float = 0.0
    mode: str = "INITIAL"
    active_commands: list[str] = field(default_factory=list)
    command_history: list[str] = field(default_factory=list)
    query_values: dict[str, dict[str, Any]] = field(default_factory=dict)


class FakeBackend(SimulationBackend):
    name = "fake"

    def __init__(self):
        self.state = FakeRobotState()

    def reset(self) -> None:
        self.state = FakeRobotState()

    def execute(self, commands: tuple[ScheduledCommand, ...]) -> BackendExecutionResult:
        self.reset()
        execution_log: list[dict[str, Any]] = []
        query_results: list[dict[str, Any]] = []
        for scheduled in commands:
            command = scheduled.command
            self.state.simulation_time = scheduled.start_time
            self.state.active_commands.append(command.command_id)
            execution_log.append({
                "event": "command_started",
                "command_id": command.command_id,
                "method": command.canonical_method,
                "command_type": command.command_type,
                "time": scheduled.start_time,
                "parameters": command.parameters,
                "scheduling_assumption": scheduled.scheduling_assumption,
            })

            if command.command_type == "STATE_QUERY":
                query = self._query_value(command.command_id, command.canonical_method)
                self.state.query_values[command.command_id] = query
                query_results.append({
                    "command_id": command.command_id,
                    "method": command.canonical_method,
                    "time": scheduled.start_time,
                    **query,
                })
            self._apply_state_transition(command.canonical_method, command.command_type, command.parameters)

            self.state.simulation_time = scheduled.end_time
            self.state.active_commands.remove(command.command_id)
            self.state.command_history.append(command.command_id)
            execution_log.append({
                "event": "command_completed",
                "command_id": command.command_id,
                "method": command.canonical_method,
                "time": scheduled.end_time,
                "mode": self.state.mode,
            })

        return BackendExecutionResult(
            status="completed",
            commands_executed=len(commands),
            simulation_time=self.state.simulation_time,
            execution_log=tuple(execution_log),
            query_results=tuple(query_results),
        )

    def finalize(self) -> None:
        self.state.active_commands.clear()

    def _query_value(self, command_id: str, method: str) -> dict[str, Any]:
        if method == "get_status":
            value: Any = {
                "mode": self.state.mode,
                "commands_completed": len(self.state.command_history),
            }
        else:
            value = None
        return {
            "simulated": True,
            "source": "fake_backend",
            "value": value,
            "physical_measurement": False,
        }

    def _apply_state_transition(
        self,
        method: str,
        command_type: str,
        parameters: dict[str, Any],
    ) -> None:
        if method == "stand":
            self.state.mode = "STANDING_REGULAR"
        elif command_type in {"VELOCITY_MOTION", "ROTATION", "POSITION_MOTION"}:
            self.state.mode = "STANDING_OR_CURRENT" if parameters.get("stop", False) else "MOTION_ACTIVE"
        elif command_type in {"BODY_POSE", "BODY_HEIGHT"}:
            self.state.mode = method.upper()
        elif command_type == "PREDEFINED_ACTION":
            self.state.mode = "ROUTINE_COMPLETED"
        elif command_type == "SAFETY":
            self.state.mode = "SOFTWARE_STOPPED" if method == "emergency_stop" else "CURRENT_POSTURE_STOPPED"
        elif command_type == "CONFIGURATION":
            self.state.mode = self.state.mode

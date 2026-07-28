"""Central resource limits for static translation."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TranslationLimits:
    max_ast_depth: int = 40
    max_expression_nodes: int = 128
    max_container_length: int = 256
    max_string_length: int = 4096
    max_integer_abs: int = 10**12
    max_float_abs: float = 10**12
    max_power_exponent: int = 12
    max_function_call_depth: int = 32
    max_loop_iterations: int = 100
    max_commands: int = 1000
    max_simulation_time: float = 300.0

    def with_overrides(
        self,
        *,
        max_loop_iterations: int | None = None,
        max_commands: int | None = None,
        max_simulation_time: float | None = None,
    ) -> "TranslationLimits":
        return TranslationLimits(
            max_ast_depth=self.max_ast_depth,
            max_expression_nodes=self.max_expression_nodes,
            max_container_length=self.max_container_length,
            max_string_length=self.max_string_length,
            max_integer_abs=self.max_integer_abs,
            max_float_abs=self.max_float_abs,
            max_power_exponent=self.max_power_exponent,
            max_function_call_depth=self.max_function_call_depth,
            max_loop_iterations=(
                self.max_loop_iterations
                if max_loop_iterations is None
                else max_loop_iterations
            ),
            max_commands=self.max_commands if max_commands is None else max_commands,
            max_simulation_time=(
                self.max_simulation_time
                if max_simulation_time is None
                else max_simulation_time
            ),
        )

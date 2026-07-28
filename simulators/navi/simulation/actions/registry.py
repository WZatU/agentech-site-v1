"""Load and validate data-driven action profiles."""

from __future__ import annotations

import json
from pathlib import Path

from .types import ActionPhase, ActionProfile


class ActionRegistry:
    def __init__(self, path: str | Path | None = None):
        source = (
            Path(path)
            if path is not None
            else Path(__file__).resolve().parents[2]
            / "config"
            / "action_profiles"
            / "full_sdk_profiles.json"
        )
        payload = json.loads(source.read_text(encoding="utf-8"))
        self.profile_definitions = payload["profiles"]
        self.method_profiles = payload["method_profiles"]
        self.locomotion_compositions = frozenset(
            payload.get("locomotion_compositions", ())
        )

    def has_profile(self, method: str) -> bool:
        return method in self.method_profiles

    def profile_for(
        self, method: str, *, duration_override: float | None = None
    ) -> ActionProfile:
        try:
            profile_name = self.method_profiles[method]
            raw_phases = self.profile_definitions[profile_name]
        except KeyError as exc:
            raise KeyError(f"No action profile for {method!r}") from exc
        phases = tuple(
            ActionPhase(
                name=item["name"],
                duration_s=float(item["duration_s"]),
                joint_offsets_rad={
                    name: float(value)
                    for name, value in item["joint_offsets_rad"].items()
                },
            )
            for item in raw_phases
        )
        total = sum(phase.duration_s for phase in phases)
        if duration_override is not None:
            requested = float(duration_override)
            if requested <= 0.0:
                raise ValueError("Action duration override must be positive")
            scale = requested / total
            phases = tuple(
                ActionPhase(
                    name=phase.name,
                    duration_s=phase.duration_s * scale,
                    joint_offsets_rad=phase.joint_offsets_rad,
                )
                for phase in phases
            )
        return ActionProfile(
            name=profile_name,
            method=method,
            phases=phases,
        )


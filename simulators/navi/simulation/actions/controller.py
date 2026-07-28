"""Torque-controlled phase interpolation without direct state injection."""

from __future__ import annotations

import math

import mujoco
import numpy as np

from controller import StandingPDController
from model_config import JOINT_ORDER, STANDING_JOINT_TARGETS, clipped_target

from .types import ActionProfile


class ActionController:
    def __init__(self, model: mujoco.MjModel):
        self.pd = StandingPDController(model)
        self._joint_index = {name: index for index, name in enumerate(JOINT_ORDER)}
        self.profile: ActionProfile | None = None
        self.started_at = 0.0
        self.finished = True
        self.aborted = False
        self.damping = False
        self.current_phase = "idle"
        self._phase_targets: tuple[np.ndarray, ...] = ()
        self._phase_starts: tuple[float, ...] = ()
        self._phase_ends: tuple[float, ...] = ()
        self._initial_target = STANDING_JOINT_TARGETS.copy()

    def start(
        self,
        profile: ActionProfile,
        data: mujoco.MjData,
        simulation_time: float,
    ) -> None:
        self.profile = profile
        self.started_at = float(simulation_time)
        self.finished = False
        self.aborted = False
        self.damping = False
        self.current_phase = profile.phases[0].name if profile.phases else "complete"
        self._initial_target = np.asarray(
            data.qpos[self.pd.qpos_addresses], dtype=float
        ).copy()
        targets: list[np.ndarray] = []
        starts: list[float] = []
        ends: list[float] = []
        cursor = 0.0
        for phase in profile.phases:
            target = STANDING_JOINT_TARGETS.copy()
            for joint, offset in phase.joint_offsets_rad.items():
                target[self._joint_index[joint]] += float(offset)
            targets.append(clipped_target(target))
            starts.append(cursor)
            cursor += float(phase.duration_s)
            ends.append(cursor)
        self._phase_targets = tuple(targets)
        self._phase_starts = tuple(starts)
        self._phase_ends = tuple(ends)

    @property
    def expected_duration(self) -> float:
        return self.profile.duration_s if self.profile is not None else 0.0

    def abort(self, *, damping: bool = False) -> None:
        self.aborted = True
        self.damping = bool(damping)
        self.finished = True
        self.current_phase = "emergency_damping" if damping else "aborted"

    def update(self, data: mujoco.MjData, simulation_time: float) -> np.ndarray:
        if self.damping:
            return self.pd.apply_safety_damping(data)
        if self.profile is None or self.finished:
            self.pd.set_targets(STANDING_JOINT_TARGETS)
            return self.pd.apply(data)

        elapsed = max(0.0, float(simulation_time) - self.started_at)
        phase_index = len(self._phase_targets) - 1
        for index, end in enumerate(self._phase_ends):
            if elapsed <= end:
                phase_index = index
                break
        start_time = self._phase_starts[phase_index]
        end_time = self._phase_ends[phase_index]
        start_target = (
            self._initial_target
            if phase_index == 0
            else self._phase_targets[phase_index - 1]
        )
        end_target = self._phase_targets[phase_index]
        progress = min(
            1.0,
            max(0.0, (elapsed - start_time) / max(end_time - start_time, 1e-9)),
        )
        smooth = progress * progress * (3.0 - 2.0 * progress)
        target = start_target + smooth * (end_target - start_target)
        self.current_phase = self.profile.phases[phase_index].name
        self.pd.set_targets(target)
        torque = self.pd.apply(data)
        if elapsed >= self.profile.duration_s:
            self.finished = True
            self.current_phase = "complete"
        if not np.isfinite(torque).all():
            raise FloatingPointError("Non-finite action-controller torque")
        return torque


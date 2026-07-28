from __future__ import annotations

import unittest
from pathlib import Path

from backends.mujoco_backend import MujocoBackend
from translator.limits import TranslationLimits
from translator.parser import TranslationParser
from translator.registry import MethodRegistry
from translator.scheduler import CommandScheduler
from translator.spec_loader import load_sdk_spec


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SPEC = load_sdk_spec(PROJECT_ROOT / "config" / "sdk_spec.json")
REGISTRY = MethodRegistry(SPEC)
GROUND_TRUTH = PROJECT_ROOT / "config" / "action_ground_truth.json"
SCENARIO_CACHE = {}


def translate(body: str, *, max_time: float = 60.0):
    source = f"from {SPEC.package} import {SPEC.robot_class}\n{body}\n"
    limits = TranslationLimits().with_overrides(max_simulation_time=max_time)
    parsed = TranslationParser(SPEC, REGISTRY, GROUND_TRUTH, limits).parse_source(
        source, "<mujoco-test>"
    )
    scheduled = CommandScheduler(limits).schedule(parsed.commands, strict=False)
    return parsed, scheduled


def run_scenario(body: str, *, max_time: float = 60.0):
    key = (body, max_time)
    if key not in SCENARIO_CACHE:
        parsed, scheduled = translate(body, max_time=max_time)
        if not parsed.valid or not scheduled.valid:
            raise AssertionError((parsed.issues, scheduled.issues))
        backend = MujocoBackend(max_simulation_time=max_time, seed=0)
        execution = backend.execute(scheduled.commands)
        backend.finalize()
        SCENARIO_CACHE[key] = (parsed, scheduled, execution)
    return SCENARIO_CACHE[key]


class MujocoTranslationTestCase(unittest.TestCase):
    facade = SPEC.robot_class

    def run_scenario(self, body: str, *, max_time: float = 60.0):
        return run_scenario(body, max_time=max_time)

    @staticmethod
    def metric(execution, method: str, occurrence: int = 0):
        matches = [
            metric for metric in execution.command_metrics
            if metric["method"] == method
        ]
        return matches[occurrence]

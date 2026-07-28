import ast
import unittest
from pathlib import Path

from backends.mujoco_backend import MujocoBackend
from simulation.actions import ActionRegistry
from tests.full_sdk_backend.common import ROOT


class NoDirectStateInjectionTest(unittest.TestCase):
    def test_static_action_backend_has_no_state_assignment(self):
        files = [
            ROOT / "backends" / "mujoco_backend.py",
            ROOT / "simulation" / "controller_adapter.py",
            *(ROOT / "simulation" / "actions").glob("*.py"),
        ]
        forbidden = {"qpos", "qvel", "xpos", "xquat"}
        violations = []
        for path in files:
            tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
            for node in ast.walk(tree):
                if isinstance(node, (ast.Assign, ast.AugAssign, ast.AnnAssign)):
                    targets = node.targets if isinstance(node, ast.Assign) else [node.target]
                    for target in targets:
                        text = ast.unparse(target)
                        if any(f".{name}" in text for name in forbidden):
                            violations.append((path.name, node.lineno, text))
        self.assertEqual([], violations)

    def test_controller_update_does_not_inject_root(self):
        backend = MujocoBackend(seed=0)
        profile = ActionRegistry().profile_for("wave_hand")
        backend.adapter.start_action(profile, backend.data, 0.0, category="actions")
        qpos = backend.data.qpos[:7].copy()
        qvel = backend.data.qvel[:6].copy()
        backend.adapter.update(backend.data, 0.0)
        self.assertTrue((backend.data.qpos[:7] == qpos).all())
        self.assertTrue((backend.data.qvel[:6] == qvel).all())
        backend.finalize()


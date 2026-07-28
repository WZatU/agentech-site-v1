from __future__ import annotations

import unittest

import mujoco
import numpy as np

from controller import TrotGaitController
from simulation import load_model, reset_to_keyframe
from validate_model import dynamic_root_injection_audit, scan_root_injection


class NoRootInjectionTest(unittest.TestCase):
    def test_static_runtime_scan_has_no_root_state_assignment(self) -> None:
        self.assertEqual(scan_root_injection(), [])

    def test_controller_apply_never_changes_root_state(self) -> None:
        model = load_model()
        data = mujoco.MjData(model)
        reset_to_keyframe(model, data)
        controller = TrotGaitController(model)
        for command in (
            "forward",
            "backward",
            "strafe_left",
            "strafe_right",
            "turn_left",
            "turn_right",
        ):
            controller.set_command(command)
            for _ in range(100):
                qpos_before = data.qpos[0:7].copy()
                qvel_before = data.qvel[0:6].copy()
                controller.apply(data)
                self.assertTrue(np.array_equal(data.qpos[0:7], qpos_before))
                self.assertTrue(np.array_equal(data.qvel[0:6], qvel_before))
                mujoco.mj_step(model, data)

    def test_dynamic_audit_reports_exact_zero(self) -> None:
        audit = dynamic_root_injection_audit(load_model())
        self.assertEqual(audit["controller_apply_max_root_qpos_change"], 0.0)
        self.assertEqual(audit["controller_apply_max_root_qvel_change"], 0.0)


if __name__ == "__main__":
    unittest.main()


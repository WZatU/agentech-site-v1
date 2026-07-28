from __future__ import annotations

import unittest

import mujoco

from controller import StandingPDController
from model_config import JOINT_ORDER
from simulation import load_model


class JointMappingTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.model = load_model()
        cls.controller = StandingPDController(cls.model)

    def test_controller_order_matches_declared_order(self) -> None:
        self.assertEqual(
            [mapping.name for mapping in self.controller.mappings], JOINT_ORDER
        )

    def test_actuator_order_and_transmissions_match(self) -> None:
        for expected_id, mapping in enumerate(self.controller.mappings):
            with self.subTest(joint=mapping.name):
                actuator_name = mujoco.mj_id2name(
                    self.model, mujoco.mjtObj.mjOBJ_ACTUATOR, expected_id
                )
                self.assertEqual(actuator_name, f"{mapping.name}_motor")
                self.assertEqual(mapping.actuator_id, expected_id)
                self.assertEqual(
                    int(self.model.actuator_trnid[expected_id, 0]), mapping.joint_id
                )

    def test_qpos_and_dof_addresses_are_exact(self) -> None:
        self.assertEqual(self.controller.qpos_addresses.tolist(), list(range(7, 19)))
        self.assertEqual(self.controller.dof_addresses.tolist(), list(range(6, 18)))
        for mapping in self.controller.mappings:
            with self.subTest(joint=mapping.name):
                self.assertEqual(
                    mapping.qpos_address,
                    int(self.model.jnt_qposadr[mapping.joint_id]),
                )
                self.assertEqual(
                    mapping.dof_address,
                    int(self.model.jnt_dofadr[mapping.joint_id]),
                )


if __name__ == "__main__":
    unittest.main()


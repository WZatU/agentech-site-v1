from __future__ import annotations

import unittest

import mujoco

from model_config import JOINT_ORDER
from simulation import FOOT_GEOM_NAMES, load_model


class ModelLoadTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.model = load_model()

    def test_xml_loads_with_twelve_actuators(self) -> None:
        self.assertEqual(self.model.nu, 12)
        self.assertEqual(self.model.nq, 19)
        self.assertEqual(self.model.nv, 18)

    def test_all_driven_joints_exist(self) -> None:
        for joint_name in JOINT_ORDER:
            with self.subTest(joint=joint_name):
                self.assertGreaterEqual(
                    mujoco.mj_name2id(
                        self.model, mujoco.mjtObj.mjOBJ_JOINT, joint_name
                    ),
                    0,
                )

    def test_four_spherical_foot_contact_geoms_exist(self) -> None:
        for geom_name in FOOT_GEOM_NAMES:
            with self.subTest(geom=geom_name):
                geom_id = mujoco.mj_name2id(
                    self.model, mujoco.mjtObj.mjOBJ_GEOM, geom_name
                )
                self.assertGreaterEqual(geom_id, 0)
                self.assertEqual(
                    int(self.model.geom_type[geom_id]), int(mujoco.mjtGeom.mjGEOM_SPHERE)
                )


if __name__ == "__main__":
    unittest.main()


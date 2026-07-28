import math

import numpy as np

from simulation.orientation import (
    angle_difference,
    body_to_world,
    quaternion_to_euler,
    world_to_body,
    wrap_angle,
)
from tests.mujoco_translation.common import MujocoTranslationTestCase


class OrientationTest(MujocoTranslationTestCase):
    def test_mujoco_wxyz_quaternion(self):
        angle = math.radians(90)
        quaternion = (math.cos(angle / 2), 0, 0, math.sin(angle / 2))
        self.assertAlmostEqual(angle, quaternion_to_euler(quaternion)[2], places=12)

    def test_angle_wrap_across_pi(self):
        difference = angle_difference(math.radians(-179), math.radians(179))
        self.assertAlmostEqual(math.radians(2), difference, places=12)
        self.assertAlmostEqual(-math.pi, wrap_angle(math.pi), places=12)

    def test_body_world_round_trip(self):
        body = np.array((1.0, 0.2))
        world = body_to_world(body, 0.7)
        np.testing.assert_allclose(body, world_to_body(world, 0.7), atol=1e-12)

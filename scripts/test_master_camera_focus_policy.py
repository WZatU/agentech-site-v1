import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from master_camera_focus_policy import select_active_front, should_forward_rgbd


class MasterCameraFocusPolicyTest(unittest.TestCase):
    def test_selects_the_only_subscribed_front_camera(self):
        counts = {"front-main": 0, "front-left": 1, "front-right": 0}
        self.assertEqual(
            select_active_front(counts, ("front-main", "front-left", "front-right")),
            "front-left",
        )

    def test_uses_stable_priority_if_more_than_one_front_camera_is_subscribed(self):
        counts = {"front-main": 0, "front-left": 1, "front-right": 1}
        self.assertEqual(
            select_active_front(counts, ("front-main", "front-left", "front-right")),
            "front-left",
        )

    def test_returns_none_without_a_front_subscriber(self):
        self.assertIsNone(
            select_active_front(
                {"front-main": 0, "front-left": 0, "front-right": 0},
                ("front-main", "front-left", "front-right"),
            )
        )

    def test_rgbd_is_forwarded_only_while_subscribed(self):
        self.assertFalse(should_forward_rgbd(0))
        self.assertTrue(should_forward_rgbd(1))


if __name__ == "__main__":
    unittest.main()

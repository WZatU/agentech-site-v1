import unittest

from tests.full_sdk_backend.common import CAPABILITIES


class UnresolvedMethodsTest(unittest.TestCase):
    def test_underdevelopment_and_unresolved_methods_are_explicit(self):
        methods = {
            entry.method for entry in CAPABILITIES.entries
            if entry.status.value == "BLOCKED_BY_UNRESOLVED_SPEC"
        }
        self.assertEqual({
            "recovery_stand",
            "set_gait",
            "set_foot_height",
            "set_collision_protect",
            "set_jump_distance",
            "set_jump_angle",
            "duck_walk",
            "jump_round",
            "set_friction",
        }, methods)

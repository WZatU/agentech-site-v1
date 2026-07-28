import unittest

from tests.full_sdk_backend.common import CAPABILITIES


class EnvironmentScenariosTest(unittest.TestCase):
    def test_autonomy_methods_are_not_claimed_as_autonomous(self):
        methods = {
            "return_to_home",
            "observe",
            "explore_road",
            "search_environment",
            "search_tag",
            "body_tag_search",
            "explore_new_home",
        }
        for method in methods:
            entry = CAPABILITIES.get(method)
            with self.subTest(method=method):
                self.assertEqual("BLOCKED_BY_MODEL", entry.status.value)
                self.assertTrue(entry.scenario_required)
                self.assertFalse(entry.physical_execution)


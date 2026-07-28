import unittest

from tests.full_sdk_backend.common import CAPABILITIES


class ConfigurationMethodsTest(unittest.TestCase):
    def test_configuration_never_mutates_runtime_physics(self):
        statuses = {
            entry.method: entry.status.value for entry in CAPABILITIES.entries
            if entry.category == "configuration"
        }
        self.assertEqual("BLOCKED_BY_UNRESOLVED_SPEC", statuses["set_friction"])
        self.assertTrue(all(
            status == "BLOCKED_BY_UNRESOLVED_SPEC"
            for status in statuses.values()
        ))

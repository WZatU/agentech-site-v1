import unittest

from tests.full_sdk_backend.common import CAPABILITIES, run_method


class ModelBlockedMethodsTest(unittest.TestCase):
    def test_model_blocks_name_missing_dependencies(self):
        blocked = [
            entry for entry in CAPABILITIES.entries
            if entry.status.value == "BLOCKED_BY_MODEL"
        ]
        self.assertEqual(20, len(blocked))
        self.assertTrue(all(entry.model_dependency for entry in blocked))

    def test_search_tag_is_specific_nonphysical_rejection(self):
        _, _, execution = run_method("search_tag()")
        self.assertEqual("BACKEND_METHOD_BLOCKED_BY_MODEL", execution.error_code)
        self.assertEqual(0, execution.simulation_time)


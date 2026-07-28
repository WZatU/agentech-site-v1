import unittest

from tests.full_sdk_backend.common import CAPABILITIES, RAW_SPEC


class AllMethodsAccountedForTest(unittest.TestCase):
    def test_registry_and_capabilities_have_identical_keys(self):
        self.assertEqual(set(RAW_SPEC["methods"]), set(CAPABILITIES.methods()))

    def test_category_counts(self):
        expected = {
            "movement": 7,
            "athletics": 6,
            "actions": 78,
            "posture": 13,
            "safety": 2,
            "sensing": 5,
            "configuration": 6,
        }
        actual = {
            category: sum(
                entry.category == category for entry in CAPABILITIES.entries
            )
            for category in expected
        }
        self.assertEqual(expected, actual)


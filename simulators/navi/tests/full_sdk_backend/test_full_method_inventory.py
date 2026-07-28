import unittest

from tests.full_sdk_backend.common import INVENTORY


class FullMethodInventoryTest(unittest.TestCase):
    def test_exact_registry_counts(self):
        self.assertEqual(117, INVENTORY["counts"]["all_methods"])
        self.assertEqual(12, INVENTORY["counts"]["already_implemented"])
        self.assertEqual(105, INVENTORY["counts"]["remaining"])
        self.assertEqual(117, len(INVENTORY["methods"]))

    def test_alias_and_legacy_inventory(self):
        self.assertEqual(3, len(INVENTORY["aliases"]))
        self.assertEqual(2, len(INVENTORY["parameter_aliases"]))
        self.assertEqual(4, len(INVENTORY["legacy_non_public_methods"]))


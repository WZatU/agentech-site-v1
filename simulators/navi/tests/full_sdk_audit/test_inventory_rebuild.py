import unittest

from translator.spec_loader import load_sdk_spec
from translator.registry import MethodRegistry

from .common import ROOT, capability_entries


class InventoryRebuildTest(unittest.TestCase):
    def test_registry_and_capabilities_have_exact_canonical_inventory(self):
        registry = MethodRegistry(load_sdk_spec(ROOT / "config" / "sdk_spec.json"))
        canonical = registry.list_supported_methods()
        capability = [entry["method"] for entry in capability_entries()]
        self.assertEqual(117, len(canonical))
        self.assertEqual(117, len(set(canonical)))
        self.assertCountEqual(canonical, capability)
        self.assertNotIn("do_action", registry.list_public_names())
        self.assertNotIn("do_behavior", registry.list_public_names())
        self.assertEqual(120, len(registry.list_public_names()))

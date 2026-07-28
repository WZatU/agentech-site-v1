import unittest

from simulation.actions import SimulationActionHandle
from tests.full_sdk_backend.common import INVENTORY


class ReturnContractsTest(unittest.TestCase):
    def test_unresolved_returns_are_not_invented(self):
        unresolved = [
            item for item in INVENTORY["methods"]
            if "return_type" in item["unresolved_items"]
        ]
        self.assertEqual(117, len(unresolved))
        self.assertTrue(all(item["return_type"] is None for item in unresolved))

    def test_internal_handle_is_explicitly_non_sdk(self):
        handle = SimulationActionHandle("x", "wave_hand", 0.0, 1.0)
        self.assertTrue(handle.not_confirmed_sdk_contract)
        self.assertEqual("SimulationActionHandle", handle.internal_simulation_type)


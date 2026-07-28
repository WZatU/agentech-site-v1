import unittest

from backends.capabilities import (
    BackendBehaviorStatus,
    EvidenceStatus,
    GroundTruthStatus,
    SdkContractStatus,
)

from .common import CAPABILITIES, EXPECTED


class FourAxisStatusModelTest(unittest.TestCase):
    def test_every_method_has_valid_four_axis_status(self):
        self.assertEqual(117, len(CAPABILITIES.entries))
        for entry in CAPABILITIES.entries:
            with self.subTest(method=entry.method):
                self.assertIsInstance(entry.backend_behavior_status, BackendBehaviorStatus)
                self.assertIsInstance(entry.sdk_contract_status, SdkContractStatus)
                self.assertIsInstance(entry.ground_truth_status, GroundTruthStatus)
                self.assertIsInstance(entry.evidence_status, EvidenceStatus)

    def test_fixture_is_independent_of_capability_file(self):
        self.assertEqual(
            [
                "backend_behavior_status",
                "sdk_contract_status",
                "ground_truth_status",
                "evidence_status",
            ],
            EXPECTED["four_axis_fields"],
        )

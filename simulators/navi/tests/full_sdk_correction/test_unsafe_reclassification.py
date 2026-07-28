import unittest

from .common import CAPABILITIES, EXPECTED


class UnsafeReclassificationTest(unittest.TestCase):
    def test_no_current_model_unsafe_proven_claim_remains(self):
        self.assertFalse(
            any(
                entry.backend_behavior_status.value == "UNSAFE_PROVEN"
                for entry in CAPABILITIES.entries
            )
        )

    def test_fixed_external_evidence_dispositions(self):
        for method, expected in EXPECTED["unsafe_reassessment"].items():
            with self.subTest(method=method):
                entry = CAPABILITIES.get(method)
                self.assertEqual(expected["legacy_status"], entry.status.value)
                self.assertEqual("INSUFFICIENT", entry.evidence_status.value)

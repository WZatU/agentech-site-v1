import unittest

from .common import REPORT, audit_execution


class BlockedByModelEvidenceTest(unittest.TestCase):
    def test_all_model_blocks_have_specific_evidence(self):
        audit = audit_execution()["blocked_model_summary"]
        report = (REPORT / "blocked_by_model_audit.md").read_text(encoding="utf-8")
        self.assertEqual(20, audit["verified_count"])
        self.assertEqual(0, audit["unproven_count"])
        self.assertEqual(13, audit["visual_only_candidate_count"])
        self.assertIn("independent_head_or_neck_joint", report)
        self.assertIn("camera_or_external_input", report)
        self.assertIn("saved_home_pose", report)

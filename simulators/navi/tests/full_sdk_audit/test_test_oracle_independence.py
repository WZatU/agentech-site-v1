import unittest

from .common import REPORT, audit_execution


class TestOracleIndependenceTest(unittest.TestCase):
    def test_self_proving_loops_are_disclosed(self):
        audit = audit_execution()["test_oracle"]
        report = (REPORT / "test_oracle_audit.md").read_text(encoding="utf-8")
        self.assertEqual(5, audit["self_proving_oracle_findings"])
        self.assertEqual(1, audit["independent_physical_oracle_groups"])
        self.assertIn("generated inventory", report)
        self.assertIn("generated full_video_mapping.json", report)
        self.assertIn("fixed physics directions/model constraints", report)

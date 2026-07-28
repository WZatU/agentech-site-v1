import unittest

from .common import REPORT, audit_execution


class BlockedBySpecEvidenceTest(unittest.TestCase):
    def test_lie_down_is_not_overclaimed_as_physically_blocked(self):
        audit = audit_execution()["blocked_spec_summary"]
        report = (REPORT / "blocked_by_spec_audit.md").read_text(encoding="utf-8")
        self.assertEqual(7, audit["verified_count"])
        self.assertEqual(1, audit["unproven_count"])
        self.assertIn("`lie_down`", report)
        self.assertIn("conservative physical lie-down approximation is feasible", report)
        self.assertIn("same generic sentence", report)

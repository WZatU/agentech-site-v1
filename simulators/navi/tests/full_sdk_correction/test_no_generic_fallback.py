import json
import unittest

from .common import ROOT


class NoGenericFallbackTest(unittest.TestCase):
    def test_post_audit_finds_no_generic_success_fallback(self):
        summary = json.loads(
            (
                ROOT
                / "outputs"
                / "new_simulation_translate"
                / "full_sdk_post_correction_audit"
                / "post_correction_audit_summary.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(0, summary["generic_success_fallback_count"])

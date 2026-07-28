import json
import unittest

from .common import ROOT


class NoDirectStateInjectionTest(unittest.TestCase):
    def test_static_and_instrumented_runtime_findings_are_zero(self):
        summary = json.loads(
            (
                ROOT
                / "outputs"
                / "new_simulation_translate"
                / "full_sdk_post_correction_audit"
                / "post_correction_audit_summary.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(0, summary["state_injection_finding_count"])
        self.assertEqual(
            117,
            summary["baseline_integrity"]["key_artifact_checks"][
                "sdk_method_matrix"
            ]
            and summary["structured_methods"],
        )

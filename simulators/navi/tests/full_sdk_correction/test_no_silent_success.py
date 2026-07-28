import json
import unittest

from .common import CAPABILITIES, CORRECTION_RESULTS


class NoSilentSuccessTest(unittest.TestCase):
    def test_nonexecutable_methods_are_explicit_structured_outcomes(self):
        for entry in CAPABILITIES.entries:
            if entry.executable:
                continue
            payload = json.loads(
                (CORRECTION_RESULTS / entry.method / "result.json").read_text(
                    encoding="utf-8"
                )
            )["full_sdk_acceptance"]
            with self.subTest(method=entry.method):
                self.assertTrue(payload["structured_rejection"])
                self.assertFalse(payload["physical_execution"])
                self.assertIn(
                    payload["execution_stage"],
                    {
                        "parser_rejected",
                        "scheduler_rejected",
                        "backend_rejected",
                        "backend_completed",
                    },
                )

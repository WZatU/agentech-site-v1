import json
import tempfile
import unittest
from pathlib import Path

from run_full_sdk_acceptance import run


class FullResultOutputTest(unittest.TestCase):
    def test_single_method_output_is_structured(self):
        with tempfile.TemporaryDirectory() as directory:
            code = run([
                "--methods", "wave_hand",
                "--allow-unresolved",
                "--no-video",
                "--continue-on-failure",
                "--output", directory,
            ])
            self.assertEqual(0, code)
            result = json.loads(
                (Path(directory) / "wave_hand" / "result.json").read_text(
                    encoding="utf-8"
                )
            )
            full = result["full_sdk_acceptance"]
            self.assertEqual("APPROXIMATE", full["backend_capability_status"])
            self.assertTrue(full["physical_execution"])
            self.assertEqual("PASS", full["test_status"])


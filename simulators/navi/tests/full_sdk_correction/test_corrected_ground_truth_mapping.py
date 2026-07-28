import json
import unittest

from .common import ROOT


class CorrectedGroundTruthMappingTest(unittest.TestCase):
    def test_only_direct_and_legacy_mappings_are_implementation_usable(self):
        payload = json.loads(
            (
                ROOT / "config" / "full_sdk_corrected_ground_truth.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(140, len(payload["records"]))
        self.assertEqual(
            {
                "DIRECT_CONFIRMED": 39,
                "LEGACY_CONFIRMED": 24,
                "INFERRED": 28,
                "AMBIGUOUS": 28,
                "CONFLICT": 4,
                "UNMATCHED": 17,
            },
            payload["counts"],
        )
        self.assertEqual(63, payload["implementation_usable_count"])
        for row in payload["records"]:
            with self.subTest(video=row["video_id"]):
                self.assertEqual(
                    row["mapping_status"]
                    in {"DIRECT_CONFIRMED", "LEGACY_CONFIRMED"},
                    row["implementation_usable"],
                )
                if row["mapping_status"] in {
                    "AMBIGUOUS",
                    "CONFLICT",
                    "UNMATCHED",
                }:
                    self.assertIsNone(row["canonical_method"])

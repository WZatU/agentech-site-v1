import json
import unittest

from .common import EXPECTED, ROOT


class CorrectedVideoValidityTest(unittest.TestCase):
    def test_every_regenerated_video_is_decodable_and_has_motion(self):
        summary = json.loads(
            (
                ROOT
                / "outputs"
                / "new_simulation_translate"
                / "full_sdk_post_correction_audit"
                / "post_correction_audit_summary.json"
            ).read_text(encoding="utf-8")
        )
        thresholds = EXPECTED["post_correction_thresholds"]
        self.assertEqual(
            thresholds["expected_regenerated_videos"],
            summary["regenerated_video_count"],
        )
        self.assertEqual(
            thresholds["expected_valid_corrected_videos"],
            summary["valid_corrected_video_count"],
        )
        self.assertEqual(80, summary["video_counts"]["decodable"])

import unittest

from .common import REPORT, load_json


class GroundTruthMappingQualityTest(unittest.TestCase):
    def test_quality_buckets_are_complete_and_not_all_called_exact(self):
        audit = load_json(REPORT / "ground_truth_mapping_audit.json")
        counts = [
            audit["directly_confirmed"],
            audit["legacy_confirmed"],
            audit["inferred"],
            audit["ambiguous"],
            audit["conflicted"],
            audit["unmatched"],
        ]
        self.assertEqual(140, audit["audited_video_count"])
        self.assertEqual(140, sum(counts))
        self.assertEqual([39, 24, 28, 28, 4, 17], counts)
        self.assertEqual(
            {"look_around": 6}, audit["canonical_methods_with_five_or_more_videos"]
        )

import json
import unittest
from pathlib import Path

from .common import EXPECTED, ROOT


class CorrectedBehaviorClustersTest(unittest.TestCase):
    def test_post_audit_meets_fixed_distinctness_targets(self):
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
        self.assertGreaterEqual(
            summary["behavior_clusters"],
            thresholds["minimum_behavior_clusters"],
        )
        self.assertGreaterEqual(
            summary["singleton_behaviors"],
            thresholds["minimum_singleton_behaviors"],
        )
        self.assertLessEqual(
            summary["duplicate_members"],
            thresholds["maximum_duplicate_members"],
        )
        self.assertFalse(
            summary["audit_threshold_source"][
                "physics_similarity_video_thresholds_modified"
            ]
        )

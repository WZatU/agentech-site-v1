import unittest

from .common import REPORT, load_json


class ActionSimilarityTest(unittest.TestCase):
    def test_all_physical_pairs_are_classified(self):
        audit = load_json(REPORT / "action_similarity_clusters.json")
        counts = audit["pair_classification_counts"]
        self.assertEqual(79 * 78 // 2, audit["pair_count"])
        self.assertEqual(audit["pair_count"], sum(counts.values()))
        self.assertEqual(42, audit["behavior_cluster_count"])
        self.assertEqual(54, audit["duplicate_or_near_duplicate_member_count"])
        self.assertGreater(counts["EXACT_DUPLICATE"], 0)
        self.assertGreater(counts["NEAR_DUPLICATE"], 0)
        self.assertGreater(counts["DISTINCT"], 0)

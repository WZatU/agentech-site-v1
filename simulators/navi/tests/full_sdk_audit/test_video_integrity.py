import unittest

from .common import REPORT, read_csv, truth


class VideoIntegrityTest(unittest.TestCase):
    def test_every_video_was_fully_decoded_and_bound_to_frozen_evidence(self):
        rows = read_csv(REPORT / "video_integrity.csv")
        self.assertEqual(79, len(rows))
        self.assertTrue(all(truth(row["decodable"]) for row in rows))
        self.assertTrue(all(int(row["decoded_frame_count"]) > 0 for row in rows))
        self.assertTrue(all(truth(row["duration_matches_result"]) for row in rows))
        self.assertTrue(
            all(truth(row["baseline_manifest_hash_matches"]) for row in rows)
        )
        self.assertEqual(75, sum(truth(row["valid_motion"]) for row in rows))
        self.assertEqual(
            67, sum(truth(row["strong_visual_motion"]) for row in rows)
        )

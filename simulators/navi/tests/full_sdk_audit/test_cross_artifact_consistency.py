import unittest

from .common import REPORT, read_csv


class CrossArtifactConsistencyTest(unittest.TestCase):
    def test_seven_parser_stage_results_lack_backend_mapping(self):
        rows = read_csv(REPORT / "cross_artifact_consistency.csv")
        inconsistent = {
            row["method"] for row in rows if int(row["inconsistency_count"]) > 0
        }
        self.assertEqual(117, len(rows))
        self.assertEqual(
            {
                "recovery_stand",
                "set_gait",
                "set_foot_height",
                "set_collision_protect",
                "set_friction",
                "set_jump_distance",
                "set_jump_angle",
            },
            inconsistent,
        )

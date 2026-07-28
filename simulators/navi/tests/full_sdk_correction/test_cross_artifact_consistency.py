import csv
import unittest

from .common import CORRECTION, EXPECTED


class CrossArtifactConsistencyTest(unittest.TestCase):
    def test_all_corrected_artifacts_are_consistent(self):
        with (CORRECTION / "cross_artifact_corrections.csv").open(
            encoding="utf-8", newline=""
        ) as stream:
            rows = list(csv.DictReader(stream))
        self.assertEqual(117, len(rows))
        self.assertFalse(
            [row for row in rows if int(row["inconsistency_count"]) != 0]
        )
        self.assertEqual(
            EXPECTED["post_correction_thresholds"][
                "expected_cross_artifact_inconsistencies"
            ],
            0,
        )

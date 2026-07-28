import json
import unittest

from .common import CORRECTION, EXPECTED


class CorrectedActionSimilarityTest(unittest.TestCase):
    def test_all_26_problem_methods_selected_for_change_are_distinct(self):
        payload = json.loads(
            (
                CORRECTION / "behavior_differentiation_acceptance.json"
            ).read_text(encoding="utf-8")
        )
        by_method = {row["method"]: row for row in payload["records"]}
        for method in EXPECTED["corrected_problem_approximate_methods"]:
            with self.subTest(method=method):
                self.assertEqual(
                    "DISTINCT_AT_UNCHANGED_AUDIT_THRESHOLD",
                    by_method[method]["distinctness_result"],
                )
                self.assertTrue(by_method[method]["baseline_difference"])

    def test_weak_methods_are_explicitly_limited_not_randomized(self):
        self.assertEqual(
            26,
            len(EXPECTED["retained_limitation_problem_approximate_methods"]),
        )

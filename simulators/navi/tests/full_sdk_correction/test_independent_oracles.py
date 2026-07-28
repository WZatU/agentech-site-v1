import json
import unittest

from .common import CORRECTION, EXPECTED


class IndependentOraclesTest(unittest.TestCase):
    def test_fixed_fixture_partitions_all_52_problem_approximate_methods(self):
        inventory = json.loads(
            (CORRECTION / "correction_inventory.json").read_text(encoding="utf-8")
        )
        corrected = set(EXPECTED["corrected_problem_approximate_methods"])
        limited = set(
            EXPECTED["retained_limitation_problem_approximate_methods"]
        )
        self.assertFalse(corrected & limited)
        self.assertEqual(
            set(inventory["approximate_methods_requiring_correction"]),
            corrected | limited,
        )
        self.assertEqual(
            EXPECTED["audit_problem_approximate_count"],
            len(corrected | limited),
        )

    def test_fixture_does_not_read_production_capability_status(self):
        self.assertEqual(
            "independent_audit_and_fixed_correction_acceptance_rules",
            EXPECTED["source"],
        )

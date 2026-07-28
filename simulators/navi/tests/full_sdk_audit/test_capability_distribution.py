import unittest

from .common import audit_execution


class CapabilityDistributionTest(unittest.TestCase):
    def test_claimed_distribution_is_exact(self):
        observed = audit_execution()["capability_distribution"]["counts"]
        expected = {
            "IMPLEMENTED": 11,
            "SIMULATED": 2,
            "APPROXIMATE": 70,
            "UNAVAILABLE_IN_MUJOCO": 1,
            "BLOCKED_BY_MODEL": 20,
            "BLOCKED_BY_UNRESOLVED_SPEC": 8,
            "HARDWARE_ONLY": 1,
            "UNSAFE_TO_SIMULATE": 4,
            "FAILED": 0,
        }
        self.assertEqual(expected, observed)
        self.assertEqual(117, sum(observed.values()))

import unittest

from .common import audit_execution


class MethodTestCoverageTest(unittest.TestCase):
    def test_generic_references_are_not_counted_as_semantic_assertions(self):
        audit = audit_execution()["test_coverage"]
        self.assertEqual(117, audit["methods_with_any_test_reference"])
        self.assertEqual(11, audit["methods_actually_invoked"])
        self.assertEqual(7, audit["methods_with_physical_assertions"])
        self.assertEqual(0, audit["methods_with_video_assertions"])
        self.assertEqual(3, audit["methods_with_ground_truth_assertions"])
        self.assertEqual(103, audit["methods_only_generic_or_generated_artifact_assertions"])

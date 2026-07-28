import unittest

from .common import REPORT, load_json


class DispatchGraphCompleteTest(unittest.TestCase):
    def test_every_method_dispatches_or_is_structurally_rejected(self):
        graph = load_json(REPORT / "method_dispatch_graph.json")["methods"]
        self.assertEqual(117, len(graph))
        self.assertEqual(117, len({row["canonical_method"] for row in graph}))
        for row in graph:
            with self.subTest(method=row["canonical_method"]):
                self.assertNotEqual("UNKNOWN", row["dispatch_type"])
                self.assertTrue(
                    row["observed_dispatch"]
                    or row["observed_structured_rejection"]
                )

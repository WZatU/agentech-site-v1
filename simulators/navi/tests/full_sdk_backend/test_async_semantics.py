import unittest

from tests.full_sdk_backend.common import INVENTORY


class AsyncSemanticsTest(unittest.TestCase):
    def test_async_is_unresolved_for_every_canonical_method(self):
        self.assertTrue(all(
            item["async"] is None and "async" in item["unresolved_items"]
            for item in INVENTORY["methods"]
        ))


import unittest

from tests.full_sdk_backend.common import VIDEO_MAPPING


class VideoMappingTest(unittest.TestCase):
    def test_all_videos_and_methods_are_accounted(self):
        self.assertEqual(140, VIDEO_MAPPING["source_video_count"])
        self.assertEqual(117, len(VIDEO_MAPPING["method_mappings"]))
        self.assertEqual(140, len(VIDEO_MAPPING["all_videos"]))

    def test_conflicts_remain_conflicts(self):
        by_method = {
            item["canonical_method"]: item
            for item in VIDEO_MAPPING["method_mappings"]
        }
        self.assertEqual("CONFLICT", by_method["frontflip"]["video_status"])
        self.assertEqual("CONFLICT", by_method["sideflip"]["video_status"])
        self.assertEqual("CONFLICT", by_method["push_up"]["video_status"])


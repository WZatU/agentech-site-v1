import unittest

from .common import REPORT, load_json


class VideoDuplicatesTest(unittest.TestCase):
    def test_byte_uniqueness_is_separate_from_visual_uniqueness(self):
        audit = load_json(REPORT / "video_duplicate_groups.json")
        self.assertEqual(79, audit["file_count"])
        self.assertEqual(79, audit["unique_file_sha256_count"])
        self.assertEqual(0, audit["exact_duplicate_group_count"])
        self.assertEqual(17, audit["near_visual_duplicate_group_count"])
        self.assertEqual(55, audit["near_visual_duplicate_member_count"])
        self.assertEqual(24, audit["unique_video_count"])

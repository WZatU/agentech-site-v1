import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from master_camera_web_policy import should_process_frame


class MasterCameraWebPolicyTest(unittest.TestCase):
    def test_focus_stream_pauses_without_subscribers(self):
        self.assertFalse(should_process_frame(True, 0))
        self.assertTrue(should_process_frame(True, 1))

    def test_wall_stream_keeps_processing_without_subscribers(self):
        self.assertTrue(should_process_frame(False, 0))


if __name__ == "__main__":
    unittest.main()

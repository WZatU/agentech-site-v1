import unittest

from tests.mujoco_translation.common import translate


class BlockingSemanticsTest(unittest.TestCase):
    def test_strict_rejects_and_allow_labels(self):
        parsed, scheduled = translate("Agentech.wave_hand()")
        self.assertTrue(parsed.valid)
        self.assertTrue(scheduled.valid)
        self.assertTrue(scheduled.approximation_used)

        from translator.limits import TranslationLimits
        from translator.scheduler import CommandScheduler
        strict = CommandScheduler(TranslationLimits()).schedule(
            parsed.commands, strict=True
        )
        self.assertFalse(strict.valid)


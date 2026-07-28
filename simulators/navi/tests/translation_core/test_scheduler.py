from tests.translation_core.common import CoreTestCase
from translator.limits import TranslationLimits
from translator.scheduler import CommandScheduler


class SchedulerTest(CoreTestCase):
    def test_strict_rejects_unresolved_blocking(self):
        parsed = self.parse(f"{self.spec.robot_class}.stand()")
        scheduled = CommandScheduler().schedule(parsed.commands, strict=True)
        self.assertFalse(scheduled.valid)
        self.assertEqual("UNRESOLVED_METHOD_SEMANTICS", scheduled.issues[0].error_code)

    def test_allow_unresolved_is_labeled(self):
        parsed = self.parse(f"{self.spec.robot_class}.forward(duration_s=2)")
        scheduled = CommandScheduler().schedule(parsed.commands, strict=False)
        self.assertTrue(scheduled.valid)
        self.assertTrue(scheduled.approximation_used)
        self.assertEqual("sequential_conservative_for_unresolved_blocking", scheduled.commands[0].scheduling_assumption)
        self.assertEqual(2.0, scheduled.simulation_time)

    def test_wait_advances_time_without_approximation(self):
        parsed = self.parse("from time import sleep\nsleep(2)")
        scheduled = CommandScheduler().schedule(parsed.commands, strict=True)
        self.assertTrue(scheduled.valid)
        self.assertFalse(scheduled.approximation_used)
        self.assertEqual(2.0, scheduled.simulation_time)

    def test_max_simulation_time(self):
        parsed = self.parse("from time import sleep\nsleep(2)")
        scheduled = CommandScheduler(TranslationLimits(max_simulation_time=1)).schedule(parsed.commands)
        self.assertFalse(scheduled.valid)
        self.assertEqual("MAX_SIMULATION_TIME_EXCEEDED", scheduled.issues[0].error_code)

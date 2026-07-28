from backends.fake_backend import FakeBackend
from tests.translation_core.common import CoreTestCase
from translator.scheduler import CommandScheduler


class FakeBackendTest(CoreTestCase):
    def execute(self, body):
        parsed = self.parse(body)
        schedule = CommandScheduler().schedule(parsed.commands, strict=False)
        backend = FakeBackend()
        execution = backend.execute(schedule.commands)
        return backend, execution

    def test_order_and_stop_state(self):
        backend, execution = self.execute(
            f"{self.spec.robot_class}.stand()\n{self.spec.robot_class}.stop()"
        )
        self.assertEqual(2, execution.commands_executed)
        self.assertEqual(["cmd_0001", "cmd_0002"], backend.state.command_history)
        self.assertEqual("CURRENT_POSTURE_STOPPED", backend.state.mode)

    def test_query_is_explicit_stub(self):
        _, execution = self.execute(f"status = {self.spec.robot_class}.get_status()")
        query = execution.query_results[0]
        self.assertTrue(query["simulated"])
        self.assertEqual("fake_backend", query["source"])
        self.assertFalse(query["physical_measurement"])
        self.assertNotIn("position", query)

    def test_no_physical_fields_in_execution_result(self):
        _, execution = self.execute(f"{self.spec.robot_class}.stand()")
        text = repr(execution)
        for forbidden in ("final_position", "final_orientation", "contact", "actuator_saturation"):
            self.assertNotIn(forbidden, text)

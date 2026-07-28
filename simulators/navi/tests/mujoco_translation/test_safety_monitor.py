from dataclasses import replace

from backends.mujoco_backend import MujocoBackend
from tests.mujoco_translation.common import MujocoTranslationTestCase


class SafetyMonitorTest(MujocoTranslationTestCase):
    def test_low_height_is_fatal(self):
        backend = MujocoBackend(max_simulation_time=5)
        try:
            state = backend.get_state()
            low = replace(state, base_position=(0.0, 0.0, 0.1))
            events = backend.safety_monitor.check(low)
            self.assertIn("BASE_HEIGHT_TOO_LOW", [event.event_code for event in events])
            self.assertTrue(backend.safety_monitor.fatal)
        finally:
            backend.finalize()

    def test_saturation_is_warning(self):
        backend = MujocoBackend(max_simulation_time=5)
        try:
            state = replace(backend.get_state(), actuator_utilization=1.0)
            events = backend.safety_monitor.check(state)
            saturation = next(event for event in events if event.event_code == "ACTUATOR_SATURATION")
            self.assertEqual("warning", saturation.severity)
        finally:
            backend.finalize()

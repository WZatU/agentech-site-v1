from backends.capabilities import BackendCapabilityRegistry
from tests.mujoco_translation.common import MujocoTranslationTestCase


class StandIntegrationTest(MujocoTranslationTestCase):
    def test_stand_is_stable(self):
        _, _, execution = self.run_scenario(f"{self.facade}.stand()")
        metric = self.metric(execution, "stand")
        capability = BackendCapabilityRegistry.load().get("stand")
        self.assertEqual("APPROXIMATE", metric["ground_truth_result"])
        self.assertEqual(
            "PHYSICALLY_IMPLEMENTED",
            capability.backend_behavior_status.value,
        )
        self.assertEqual(
            "MULTIPLE_UNRESOLVED",
            capability.sdk_contract_status.value,
        )
        self.assertFalse(metric["fell"])
        self.assertLess(abs(metric["body_frame_displacement"]["forward"]), 0.03)
        self.assertLess(metric["max_roll"], 0.2)
        self.assertLess(metric["max_pitch"], 0.2)

from tests.mujoco_translation.common import MujocoTranslationTestCase


class QueryProviderTest(MujocoTranslationTestCase):
    def test_body_query_matches_trace_time_and_position(self):
        _, _, execution = self.run_scenario(
            f"{self.facade}.stand()\nbody = {self.facade}.body_status()"
        )
        query = execution.query_results[0]
        self.assertTrue(query["simulated"])
        self.assertEqual("mujoco_data", query["source"])
        row = min(
            execution.state_trace,
            key=lambda item: abs(item["simulation_time"] - query["simulation_time"]),
        )
        self.assertAlmostEqual(query["simulation_time"], row["simulation_time"], places=12)
        self.assertAlmostEqual(query["value"]["position"][0], row["base_position_x"], places=12)

    def test_battery_is_explicitly_unavailable(self):
        _, _, execution = self.run_scenario(
            f"battery = {self.facade}.get_battery_status()"
        )
        query = execution.query_results[0]
        self.assertFalse(query["available"])
        self.assertIsNone(query["value"])
        self.assertEqual("unsupported_hardware_state", query["source"])

    def test_joint_query_includes_canonical_twelve_joint_names(self):
        _, _, execution = self.run_scenario(
            f"joints = {self.facade}.joint_states()"
        )
        query = execution.query_results[0]
        self.assertEqual(12, len(query["value"]["joint_names"]))
        self.assertEqual(12, len(query["value"]["positions"]))

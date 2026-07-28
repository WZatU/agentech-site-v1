import tempfile
from pathlib import Path

from simulation.result_writer import write_mujoco_artifacts
from tests.mujoco_translation.common import MujocoTranslationTestCase


class ResultOutputTest(MujocoTranslationTestCase):
    def test_required_artifacts_and_real_final_state(self):
        parsed, schedule, execution = self.run_scenario(f"{self.facade}.stand()")
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "input.py"
            source.write_text(
                f"from agentech import Agentech\n{self.facade}.stand()\n",
                encoding="utf-8",
            )
            output = root / "out"
            result = write_mujoco_artifacts(
                output, source, "test", parsed, schedule, execution
            )
            required = {
                "input_copy.py", "validation.json", "translated_commands.json",
                "scheduled_commands.json", "backend_mapping.json",
                "execution_log.jsonl", "state_trace.csv", "command_metrics.json",
                "query_results.json", "safety_events.json", "result.json", "summary.md",
            }
            self.assertEqual(required, {path.name for path in output.iterdir()})
            self.assertEqual("mujoco", result["backend"])
            self.assertIsNotNone(result["final_position"])
            self.assertNotIn("fake", str(result).lower())

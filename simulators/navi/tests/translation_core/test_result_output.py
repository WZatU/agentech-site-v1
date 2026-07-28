import json
import tempfile
from pathlib import Path

from backends.fake_backend import FakeBackend
from tests.translation_core.common import CoreTestCase
from translator.result_writer import write_run_artifacts
from translator.scheduler import CommandScheduler


class ResultOutputTest(CoreTestCase):
    def test_all_artifacts_and_result_boundary(self):
        source = f"from {self.spec.package} import {self.spec.robot_class}\n{self.spec.robot_class}.stand()\n"
        parsed = self.parser().parse_source(source, "<result>")
        schedule = CommandScheduler().schedule(parsed.commands, strict=False)
        execution = FakeBackend().execute(schedule.commands)
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            input_path = root / "input.py"
            input_path.write_text(source, encoding="utf-8")
            output = root / "out"
            result = write_run_artifacts(output, input_path, "test_run", parsed, schedule, execution)
            expected = {
                "input_copy.py",
                "validation.json",
                "translated_commands.json",
                "scheduled_commands.json",
                "execution_log.jsonl",
                "query_results.json",
                "result.json",
                "summary.md",
            }
            self.assertEqual(expected, {path.name for path in output.iterdir()})
            payload = json.loads((output / "result.json").read_text(encoding="utf-8"))
            self.assertEqual("fake", payload["backend"])
            self.assertTrue(payload["approximation_used"])
            for forbidden in ("final_position", "final_orientation", "fell", "contact"):
                self.assertNotIn(forbidden, payload)
            self.assertEqual("passed", result["status"])

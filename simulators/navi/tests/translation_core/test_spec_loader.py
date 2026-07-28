import json
import tempfile
from pathlib import Path

from tests.translation_core.common import CoreTestCase, SDK_SPEC_PATH
from translator.spec_loader import SpecValidationError, load_sdk_spec


class SpecLoaderTest(CoreTestCase):
    def test_real_spec_shape_and_counts(self):
        self.assertEqual(117, len(self.spec.methods))
        self.assertEqual(3, len(self.spec.aliases))
        self.assertEqual("agentech", self.spec.package)
        self.assertEqual("Agentech", self.spec.robot_class)

    def test_ref_and_default_call_are_expanded(self):
        forward = self.spec.methods["forward"].parameter_map()
        self.assertEqual(1.0, forward["speed_mps"].default)
        self.assertEqual("number", forward["duration_s"].type_name)
        self.assertEqual(10, forward["duration_s"].definition["maximum"])

    def test_duplicate_json_key_is_rejected(self):
        text = SDK_SPEC_PATH.read_text(encoding="utf-8")
        duplicate = text.replace('"schema_version": "1.0.0-analysis",', '"schema_version": "a", "schema_version": "b",', 1)
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "duplicate.json"
            path.write_text(duplicate, encoding="utf-8")
            with self.assertRaises(SpecValidationError):
                load_sdk_spec(path)

    def test_unresolved_information_is_preserved(self):
        sensing = self.spec.methods["get_status"]
        self.assertIn("return_schema", sensing.unresolved_fields)

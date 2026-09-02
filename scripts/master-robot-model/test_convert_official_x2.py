import json
import os
import struct
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("convert_official_x2.py")
OFFICIAL_REVISION = "77f43eb0904dae4c48ccd9154fee824f8ffd4d38"
SOURCE_ROOT = Path(os.environ.get("AGIBOT_X2_SOURCE", ""))
PROJECT_ROOT = Path(__file__).resolve().parents[2]
WEB_ASSET = (
    PROJECT_ROOT
    / "public/assets/products/eaic-hub/master-robot-3d/agibot-x2-official-web.glb"
)
WEB_MANIFEST = WEB_ASSET.with_name("agibot-x2-official-nodes.json")
PREVIEW = Path(__file__).with_name("preview-official.html")


def read_glb_json(path: Path) -> dict:
    data = path.read_bytes()
    magic, version, total_length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or total_length != len(data):
        raise AssertionError("output is not a valid glTF 2.0 binary container")
    json_length, json_type = struct.unpack_from("<I4s", data, 12)
    if json_type != b"JSON":
        raise AssertionError("first GLB chunk is not JSON")
    return json.loads(data[20 : 20 + json_length].decode("utf-8").rstrip(" \x00"))


def rendered_triangle_count(document: dict) -> int:
    count = 0
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            accessor_index = primitive.get("indices")
            if accessor_index is None:
                accessor_index = primitive["attributes"]["POSITION"]
            count += document["accessors"][accessor_index]["count"] // 3
    return count


class OfficialX2ConversionTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.urdf = SOURCE_ROOT / "X2_URDF-v1.3.0" / "x2_ultra.urdf"
        if not cls.urdf.is_file():
            raise unittest.SkipTest(
                "set AGIBOT_X2_SOURCE to the pinned AgibotTech/agibot_x2_urdf checkout"
            )
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.output = Path(cls.temp_dir.name) / "agibot-x2-official-raw.glb"
        cls.manifest = Path(cls.temp_dir.name) / "agibot-x2-official-nodes.json"
        cls.result = subprocess.run(
            [
                sys.executable,
                str(SCRIPT),
                "--urdf",
                str(cls.urdf),
                "--output",
                str(cls.output),
                "--manifest",
                str(cls.manifest),
                "--source-revision",
                OFFICIAL_REVISION,
            ],
            capture_output=True,
            text=True,
        )

    @classmethod
    def tearDownClass(cls) -> None:
        if hasattr(cls, "temp_dir"):
            cls.temp_dir.cleanup()

    def assert_conversion_succeeded(self) -> None:
        self.assertEqual(self.result.returncode, 0, self.result.stderr)
        self.assertTrue(self.output.is_file())
        self.assertTrue(self.manifest.is_file())

    def test_embeds_official_source_identity(self) -> None:
        self.assert_conversion_succeeded()
        document = read_glb_json(self.output)
        self.assertEqual(
            document["asset"]["extras"]["sourceRevision"], OFFICIAL_REVISION
        )
        self.assertEqual(
            document["asset"]["extras"]["sourceModel"],
            "X2_URDF-v1.3.0/x2_ultra.urdf",
        )
        self.assertIn("official URDF converter", document["asset"]["generator"])
        self.assertNotIn("procedural robot builder", document["asset"]["generator"])

    def test_preserves_real_link_and_joint_hierarchy(self) -> None:
        self.assert_conversion_succeeded()
        document = read_glb_json(self.output)
        names = {node.get("name") for node in document["nodes"]}
        required = {
            "base_link",
            "pelvis",
            "torso_link",
            "head_yaw_joint",
            "head_pitch_joint",
            "left_shoulder_pitch_joint",
            "left_elbow_joint",
            "left_wrist_roll_joint",
            "right_shoulder_pitch_joint",
            "right_elbow_joint",
            "right_wrist_roll_joint",
            "left_knee_joint",
            "right_knee_joint",
            "left_ankle_roll_joint",
            "right_ankle_roll_joint",
        }
        self.assertTrue(required.issubset(names), required - names)
        generated_primitives = {"sphere", "cylinder", "box", "torus", "arc"}
        self.assertFalse(generated_primitives.intersection(names))
        self.assertNotIn("uri", document["buffers"][0])

    def test_outputs_substantial_official_mesh_geometry(self) -> None:
        self.assert_conversion_succeeded()
        document = read_glb_json(self.output)
        manifest = json.loads(self.manifest.read_text())
        self.assertGreaterEqual(manifest["linkCount"], 39)
        self.assertGreaterEqual(manifest["jointCount"], 39)
        self.assertGreaterEqual(manifest["visibleMeshCount"], 35)
        self.assertGreater(manifest["renderedTriangleCount"], 1_000_000)
        self.assertGreater(len(document["meshes"]), 35)
        self.assertEqual(document["scenes"][0]["nodes"], [0])


class OfficialX2WebAssetTest(unittest.TestCase):
    def test_web_asset_meets_budget_without_losing_joint_names(self) -> None:
        self.assertTrue(WEB_ASSET.is_file(), f"missing web asset: {WEB_ASSET}")
        self.assertTrue(WEB_MANIFEST.is_file(), f"missing manifest: {WEB_MANIFEST}")
        self.assertLess(WEB_ASSET.stat().st_size, 15_000_000)

        document = read_glb_json(WEB_ASSET)
        names = {node.get("name") for node in document["nodes"]}
        required = {
            "AGIBOT_X2_ULTRA_OFFICIAL",
            "base_link",
            "pelvis",
            "torso_link",
            "head_yaw_joint",
            "head_pitch_joint",
            "left_elbow_joint",
            "right_elbow_joint",
            "left_knee_joint",
            "right_knee_joint",
        }
        self.assertTrue(required.issubset(names), required - names)
        triangles = rendered_triangle_count(document)
        self.assertGreater(triangles, 250_000)
        self.assertLess(triangles, 600_000)
        self.assertIn("KHR_draco_mesh_compression", document.get("extensionsUsed", []))

        manifest = json.loads(WEB_MANIFEST.read_text())
        self.assertEqual(manifest["renderedTriangleCount"], triangles)
        self.assertEqual(manifest["sourceRevision"], OFFICIAL_REVISION)

    def test_preview_loads_only_the_official_derived_asset(self) -> None:
        self.assertTrue(PREVIEW.is_file(), f"missing preview: {PREVIEW}")
        preview = PREVIEW.read_text()
        self.assertIn("agibot-x2-official-web.glb", preview)
        self.assertNotIn("agentech-master-web.glb", preview)


if __name__ == "__main__":
    unittest.main()

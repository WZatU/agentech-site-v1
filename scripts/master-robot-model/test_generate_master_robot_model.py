import json
import struct
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


SCRIPT = Path(__file__).with_name("generate_master_robot_model.py")


def read_glb_json(path: Path) -> dict:
    data = path.read_bytes()
    magic, version, total_length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or total_length != len(data):
        raise AssertionError("output is not a valid glTF 2.0 binary container")
    json_length, json_type = struct.unpack_from("<I4s", data, 12)
    if json_type != b"JSON":
        raise AssertionError("first GLB chunk is not JSON")
    return json.loads(data[20 : 20 + json_length].decode("utf-8").rstrip(" \x00"))


class MasterRobotModelTest(unittest.TestCase):
    def test_builds_glb_with_required_articulation_nodes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "agentech-master-web.glb"
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--output", str(output)],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)

            document = read_glb_json(output)
            names = {node.get("name") for node in document["nodes"]}
            required = {
                "AGENTECH_MASTER_ROBOT",
                "Head_Yaw",
                "Head_Pitch",
                "Chest",
                "Left_Shoulder",
                "Left_Elbow",
                "Left_Wrist",
                "Right_Shoulder",
                "Right_Elbow",
                "Right_Wrist",
                "Left_Hip",
                "Left_Knee",
                "Left_Ankle",
                "Right_Hip",
                "Right_Knee",
                "Right_Ankle",
            }
            self.assertTrue(required.issubset(names), required - names)
            self.assertEqual(document["scenes"][0]["nodes"], [0])
            self.assertNotIn("uri", document["buffers"][0])

    def test_uses_reference_palette_and_emissive_accents(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "agentech-master-web.glb"
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--output", str(output)],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)

            document = read_glb_json(output)
            materials = {material["name"]: material for material in document.get("materials", [])}
            self.assertEqual(
                set(materials),
                {"Carbon Black", "Armor White", "Safety Yellow", "Face Glass", "Signal Blue"},
            )
            self.assertEqual(materials["Signal Blue"]["emissiveFactor"], [0.02, 0.35, 1.0])
            self.assertEqual(materials["Face Glass"]["alphaMode"], "BLEND")

    def test_model_has_web_budgeted_visible_geometry(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "agentech-master-web.glb"
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--output", str(output)],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)

            document = read_glb_json(output)
            accessors = document.get("accessors", [])
            visible_nodes = [node for node in document["nodes"] if "mesh" in node]
            rendered_triangles = 0
            for node in visible_nodes:
                for primitive in document["meshes"][node["mesh"]]["primitives"]:
                    rendered_triangles += accessors[primitive["indices"]]["count"] // 3

            self.assertGreaterEqual(len(visible_nodes), 45)
            self.assertGreaterEqual(rendered_triangles, 12_000)
            self.assertLessEqual(rendered_triangles, 60_000)
            self.assertGreater(output.stat().st_size, 15_000)
            self.assertLess(output.stat().st_size, 3_000_000)

    def test_writes_preview_and_node_manifest(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "agentech-master-web.glb"
            preview = Path(temp_dir) / "agentech-master-preview.svg"
            manifest = Path(temp_dir) / "agentech-master-nodes.json"
            result = subprocess.run(
                [
                    sys.executable,
                    str(SCRIPT),
                    "--output",
                    str(output),
                    "--preview",
                    str(preview),
                    "--manifest",
                    str(manifest),
                ],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("<svg", preview.read_text())
            self.assertIn("AGENTECH MASTER", preview.read_text())
            details = json.loads(manifest.read_text())
            self.assertGreaterEqual(details["visibleNodeCount"], 45)
            self.assertGreaterEqual(details["renderedTriangleCount"], 12_000)
            self.assertLessEqual(details["renderedTriangleCount"], 60_000)
            self.assertIn("Head_Yaw", details["articulationNodes"])
            self.assertIn("Left_Shoulder", details["articulationNodes"])

    def test_reference_armor_uses_black_core_blue_chest_arc_and_yellow_foot_arcs(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir) / "agentech-master-web.glb"
            result = subprocess.run(
                [sys.executable, str(SCRIPT), "--output", str(output)],
                capture_output=True,
                text=True,
            )
            self.assertEqual(result.returncode, 0, result.stderr)
            document = read_glb_json(output)
            nodes = {node["name"]: node for node in document["nodes"]}
            materials = document["materials"]

            def material_name(node_name: str) -> str:
                mesh = document["meshes"][nodes[node_name]["mesh"]]
                return materials[mesh["primitives"][0]["material"]]["name"]

            def mesh_name(node_name: str) -> str:
                return document["meshes"][nodes[node_name]["mesh"]]["name"]

            self.assertEqual(material_name("Pelvis_Armor"), "Carbon Black")
            self.assertEqual(material_name("Chest_Faceplate"), "Carbon Black")
            self.assertEqual(mesh_name("Chest_Signal_Ring"), "arc_Signal_Blue")
            self.assertEqual(mesh_name("Left_Foot_Yellow"), "arc_Safety_Yellow")
            self.assertEqual(mesh_name("Right_Foot_Yellow"), "arc_Safety_Yellow")


if __name__ == "__main__":
    unittest.main()

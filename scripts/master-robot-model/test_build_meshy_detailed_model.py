import json
import shutil
import struct
import subprocess
import tempfile
import unittest
import zlib
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[1]
SCRIPT = SCRIPT_DIR / "build_meshy_detailed_model.py"
SOURCE_BLEND = SCRIPT_DIR / "agibot-x2-official.blend"
BLENDER = Path("/Applications/Blender.app/Contents/MacOS/Blender")


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


def node_mesh_dimensions(document: dict, node_name: str) -> tuple[float, float, float]:
    node = next((entry for entry in document.get("nodes", []) if entry.get("name") == node_name), None)
    if node is None or "mesh" not in node:
        raise AssertionError(f"missing mesh node: {node_name}")
    mesh = document["meshes"][node["mesh"]]
    minima = [float("inf")] * 3
    maxima = [float("-inf")] * 3
    for primitive in mesh.get("primitives", []):
        accessor = document["accessors"][primitive["attributes"]["POSITION"]]
        for axis in range(3):
            minima[axis] = min(minima[axis], accessor["min"][axis])
            maxima[axis] = max(maxima[axis], accessor["max"][axis])
    return tuple(maxima[axis] - minima[axis] for axis in range(3))


def node_mesh_name(document: dict, node_name: str) -> str:
    node = next((entry for entry in document.get("nodes", []) if entry.get("name") == node_name), None)
    if node is None or "mesh" not in node:
        raise AssertionError(f"missing mesh node: {node_name}")
    return document["meshes"][node["mesh"]].get("name", "")


def read_png_dimensions(path: Path) -> tuple[int, int]:
    data = path.read_bytes()[:24]
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        raise AssertionError("preview is not a PNG")
    return struct.unpack(">II", data[16:24])


def average_png_channel(path: Path) -> float:
    data = path.read_bytes()
    width, height = struct.unpack(">II", data[16:24])
    bit_depth, color_type = data[24], data[25]
    if bit_depth != 8 or color_type not in (2, 6):
        raise AssertionError("test expects an 8-bit RGB or RGBA PNG")
    bytes_per_pixel = 3 if color_type == 2 else 4
    position = 8
    compressed = bytearray()
    while position < len(data):
        length = struct.unpack(">I", data[position : position + 4])[0]
        chunk_type = data[position + 4 : position + 8]
        if chunk_type == b"IDAT":
            compressed.extend(data[position + 8 : position + 8 + length])
        position += 12 + length
    raw = zlib.decompress(bytes(compressed))
    stride = width * bytes_per_pixel
    previous = bytearray(stride)
    channel_sum = 0
    channel_count = 0

    def paeth(a: int, b: int, c: int) -> int:
        estimate = a + b - c
        distances = (abs(estimate - a), abs(estimate - b), abs(estimate - c))
        return (a, b, c)[distances.index(min(distances))]

    for row_index in range(height):
        offset = row_index * (stride + 1)
        filter_type = raw[offset]
        row = bytearray(raw[offset + 1 : offset + 1 + stride])
        for index in range(stride):
            left = row[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            up = previous[index]
            upper_left = previous[index - bytes_per_pixel] if index >= bytes_per_pixel else 0
            if filter_type == 1:
                row[index] = (row[index] + left) & 0xFF
            elif filter_type == 2:
                row[index] = (row[index] + up) & 0xFF
            elif filter_type == 3:
                row[index] = (row[index] + ((left + up) // 2)) & 0xFF
            elif filter_type == 4:
                row[index] = (row[index] + paeth(left, up, upper_left)) & 0xFF
        for index in range(0, stride, bytes_per_pixel):
            channel_sum += row[index] + row[index + 1] + row[index + 2]
            channel_count += 3
        previous = row
    return channel_sum / channel_count


class MeshyDetailedModelBuildTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        if not BLENDER.is_file():
            raise unittest.SkipTest("Blender is not installed")
        if not SOURCE_BLEND.is_file():
            raise unittest.SkipTest(f"missing source scene: {SOURCE_BLEND}")
        cls.temp_dir = tempfile.TemporaryDirectory()
        cls.output_dir = Path(cls.temp_dir.name)
        cls.blend = cls.output_dir / "agibot-x2-meshy-detailed.blend"
        cls.glb = cls.output_dir / "agibot-x2-meshy-detailed.glb"
        cls.render = cls.output_dir / "agibot-x2-meshy-detailed.png"
        cls.front_render = cls.output_dir / "agibot-x2-meshy-detailed-front.png"
        cls.side_render = cls.output_dir / "agibot-x2-meshy-detailed-side.png"
        cls.back_render = cls.output_dir / "agibot-x2-meshy-detailed-back.png"
        cls.manifest = cls.output_dir / "agibot-x2-meshy-detailed.json"
        cls.preview = cls.output_dir / "preview-meshy-detailed.html"
        cls.result = subprocess.run(
            [
                str(BLENDER),
                "--background",
                str(SOURCE_BLEND),
                "--python",
                str(SCRIPT),
                "--",
                "--output-blend",
                str(cls.blend),
                "--output-glb",
                str(cls.glb),
                "--output-render",
                str(cls.render),
                "--output-manifest",
                str(cls.manifest),
                "--output-preview",
                str(cls.preview),
                "--resolution",
                "640",
            ],
            capture_output=True,
            text=True,
            timeout=180,
        )

    @classmethod
    def tearDownClass(cls) -> None:
        cls.temp_dir.cleanup()

    def assert_build_succeeded(self) -> None:
        self.assertEqual(self.result.returncode, 0, self.result.stderr + self.result.stdout)
        for path in (self.blend, self.glb, self.render, self.manifest, self.preview):
            self.assertTrue(path.is_file(), f"missing build artifact: {path}")

    def test_outputs_editable_scene_web_model_and_preview(self) -> None:
        self.assert_build_succeeded()
        self.assertGreater(self.blend.stat().st_size, 1_000_000)
        self.assertGreater(self.glb.stat().st_size, 500_000)
        self.assertEqual(read_png_dimensions(self.render), (640, 640))
        html = self.preview.read_text()
        self.assertIn("<model-viewer", html)
        self.assertIn("agibot-x2-meshy-detailed.glb", html)

    def test_outputs_front_side_and_back_structure_checks(self) -> None:
        self.assert_build_succeeded()
        for path in (self.front_render, self.side_render, self.back_render):
            self.assertTrue(path.is_file(), f"missing structure-check render: {path}")
            self.assertEqual(read_png_dimensions(path), (640, 640))
            self.assertGreater(average_png_channel(path), 5.0, f"structure-check render is effectively black: {path}")

    def test_preserves_articulation_and_adds_meshy_reference_details(self) -> None:
        self.assert_build_succeeded()
        document = read_glb_json(self.glb)
        names = {node.get("name") for node in document.get("nodes", [])}
        required = {
            "Meshy_Detailed_Robot",
            "head_yaw_joint",
            "head_pitch_joint",
            "left_elbow_joint",
            "right_elbow_joint",
            "left_knee_joint",
            "right_knee_joint",
            "Face_Screen",
            "Head_Housing_Rounded",
            "Eye_Left",
            "Eye_Right",
            "Top_Camera_Left",
            "Top_Camera_Center",
            "Top_Camera_Right",
            "Face_Lower_Groove",
            "Chest_Arc",
            "Chest_Sensor_Upper",
            "Chest_Sensor_Middle",
            "Chest_Sensor_Lower",
            "Waist_Sleeve_Core",
            "Left_Foot_Pad",
            "Right_Foot_Pad",
        }
        self.assertTrue(required.issubset(names), required - names)

    def test_uses_official_shell_and_back_without_primitive_overlays(self) -> None:
        self.assert_build_succeeded()
        document = read_glb_json(self.glb)
        names = {node.get("name") for node in document.get("nodes", [])}
        forbidden = {
            "Face_Frame",
            "Head_Vent_Left",
            "Head_Vent_Right",
            "Head_Vent_Ring_Left",
            "Head_Vent_Ring_Right",
            "Head_Shell",
            "Backplate",
            "Backpack_Module",
            "Back_Cable_Left",
            "Back_Cable_Right",
            "Integrated_Back_Panel",
            "Back_Control_Module",
            "Back_Power_Module",
            "Waist_Rib_1",
            "Waist_Rib_2",
            "Waist_Rib_3",
            "Waist_Rib_4",
            "Waist_Rib_5",
        }
        self.assertFalse(forbidden & names, forbidden & names)
        self.assertEqual(
            node_mesh_name(document, "Face_Screen"),
            "Face_Screen_Rounded_Profile_Mesh",
        )
        head_dimensions = sorted(node_mesh_dimensions(document, "Head_Housing_Rounded"))
        self.assertGreaterEqual(head_dimensions[0], 0.140)
        self.assertLessEqual(head_dimensions[-1], 0.190)
        waist_dimensions = sorted(node_mesh_dimensions(document, "Waist_Sleeve_Core"))
        self.assertGreaterEqual(waist_dimensions[0], 0.085)
        self.assertLessEqual(waist_dimensions[-1], 0.180)

    def test_exports_reference_pbr_palette_and_emissive_materials(self) -> None:
        self.assert_build_succeeded()
        document = read_glb_json(self.glb)
        materials = {material["name"]: material for material in document.get("materials", [])}
        required = {
            "Meshy Armor White",
            "Meshy Graphite Black",
            "Meshy Face Glass",
            "Meshy Signal Blue",
            "Meshy Eye White",
            "Meshy Safety Orange",
            "Meshy Brushed Metal",
        }
        self.assertTrue(required.issubset(materials), required - set(materials))
        self.assertGreater(sum(materials["Meshy Signal Blue"].get("emissiveFactor", [])), 0.5)
        self.assertGreater(sum(materials["Meshy Eye White"].get("emissiveFactor", [])), 1.0)

    def test_web_asset_stays_inside_agreed_geometry_budget(self) -> None:
        self.assert_build_succeeded()
        document = read_glb_json(self.glb)
        triangles = rendered_triangle_count(document)
        self.assertGreaterEqual(triangles, 70_000)
        self.assertLessEqual(triangles, 180_000)
        self.assertLess(self.glb.stat().st_size, 18_000_000)

        manifest = json.loads(self.manifest.read_text())
        self.assertEqual(manifest["modelName"], "Agibot X2 Meshy Detailed")
        self.assertEqual(manifest["triangleCount"], triangles)
        self.assertEqual(manifest["sourceReference"], "Meshy humanoid-robot-base")
        self.assertFalse(manifest["rigged"])


class HeadReferenceContourTest(unittest.TestCase):
    """Catch the square-box silhouette and flat screen seen in the old head."""

    @classmethod
    def setUpClass(cls) -> None:
        if not BLENDER.is_file():
            raise unittest.SkipTest("Blender is not installed")
        expression = f"""
import bpy, importlib.util, json
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
spec = importlib.util.spec_from_file_location('robot_builder', {str(SCRIPT)!r})
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)
builder.add_head_details(builder.build_materials())
bpy.context.view_layer.update()
result = {{obj.name: {{'vertices': [list(obj.matrix_world @ vertex.co) for vertex in obj.data.vertices],
                      'minimum_face_area': min(poly.area for poly in obj.data.polygons),
                      'smooth': all(poly.use_smooth for poly in obj.data.polygons)}}
          for obj in bpy.context.scene.objects if obj.type == 'MESH'}}
print('HEAD_GEOMETRY=' + json.dumps(result))
"""
        result = subprocess.run(
            [str(BLENDER), "--background", "--factory-startup", "--python-expr", expression],
            capture_output=True, text=True, timeout=60,
        )
        if result.returncode:
            raise AssertionError(result.stdout + result.stderr)
        cls.geometry = json.loads(next(line.split("=", 1)[1] for line in result.stdout.splitlines()
                                      if line.startswith("HEAD_GEOMETRY=")))

    def test_crown_is_a_continuous_dome_instead_of_a_flat_box(self) -> None:
        vertices = self.geometry["Head_Housing_Rounded"]["vertices"]
        top = max(point[2] for point in vertices)
        crown = [point[0] for point in vertices if point[2] > top - 0.001]
        self.assertLess(max(crown) - min(crown), 0.055,
                        "the crown still has the broad flat top of a beveled cube")
        self.assertTrue(self.geometry["Head_Housing_Rounded"]["smooth"],
                        "head-shell faces must shade smoothly")

    def test_chin_tapers_and_rear_shell_curves_in_under_the_crown(self) -> None:
        vertices = self.geometry["Head_Housing_Rounded"]["vertices"]
        middle = [point for point in vertices if 0.495 <= point[2] <= 0.615]
        lower = [point for point in vertices if point[2] < 0.492]
        upper = [point for point in vertices if point[2] > 0.623]
        middle_width = max(point[1] for point in middle) - min(point[1] for point in middle)
        lower_width = max(point[1] for point in lower) - min(point[1] for point in lower)
        self.assertLess(lower_width, middle_width - 0.020,
                        "the chin must narrow rather than retain square-box width")
        self.assertGreater(min(point[0] for point in upper),
                           min(point[0] for point in middle) + 0.020,
                           "the rear profile must round forward into the crown")

    def test_screen_is_convex_and_side_insets_follow_the_shell(self) -> None:
        screen = self.geometry["Face_Screen"]["vertices"]
        center = [point[0] for point in screen if abs(point[1]) < 0.012 and abs(point[2] - 0.553) < 0.014]
        edge = [point[0] for point in screen if abs(point[1]) > 0.048]
        self.assertTrue(center, "the screen needs a curved surface, not one flat n-gon")
        self.assertGreater(max(center), max(edge) + 0.002)
        for name in ("Head_Side_Inset_Left", "Head_Side_Inset_Right"):
            self.assertIn(name, self.geometry)
            points = self.geometry[name]["vertices"]
            self.assertLess(max(abs(point[1]) for point in points), 0.081,
                            "side insets must sit flush, not protrude as ear cups")

    def test_face_surfaces_have_no_collapsed_corner_faces(self) -> None:
        for name in ("Face_Screen", "Eye_Left", "Eye_Right", "Top_Sensor_Brow", "Face_Lower_Groove"):
            self.assertGreater(self.geometry[name]["minimum_face_area"], 1e-12,
                               f"{name} contains collapsed faces that pinch the highlights")


if __name__ == "__main__":
    unittest.main()

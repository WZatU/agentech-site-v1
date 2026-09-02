#!/usr/bin/env python3
"""Convert the pinned official AgiBot X2 Ultra URDF/STL model to GLB.

This converter intentionally does not synthesize replacement geometry. Every
visible triangle comes from a mesh referenced by the upstream URDF. The link
and joint transform nodes are retained so the web model can be articulated by
name later.
"""

from __future__ import annotations

import argparse
import json
import math
import struct
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, Sequence


SOURCE_REPOSITORY = "https://github.com/AgibotTech/agibot_x2_urdf"
SOURCE_MODEL = "X2_URDF-v1.3.0/x2_ultra.urdf"

BLACK_LINKS = {
    "pelvis",
    "imu_in_pelvis_link",
    "left_hip_pitch_link",
    "right_hip_pitch_link",
    "left_ankle_pitch_link",
    "right_ankle_pitch_link",
    "waist_yaw_link",
    "waist_pitch_link",
    "torso_link",
    "imu_in_torso_link",
    "left_shoulder_pitch_link",
    "right_shoulder_pitch_link",
    "left_wrist_pitch_link",
    "right_wrist_pitch_link",
    "head_yaw_link",
    "head_pitch_link",
    "imu_in_head_link",
    "rgbd_head_front",
    "stereo_head_front",
    "rgb_head_rear",
    "rgb_head_center",
    "lidar_chest_front",
}

YELLOW_LINKS = {"left_ankle_roll_link", "right_ankle_roll_link"}

PALETTE = {
    "Carbon Black": {
        "rgba": (0.022, 0.028, 0.038, 1.0),
        "metallic": 0.55,
        "roughness": 0.3,
    },
    "Armor White": {
        "rgba": (0.82, 0.835, 0.84, 1.0),
        "metallic": 0.18,
        "roughness": 0.34,
    },
    "Safety Yellow": {
        "rgba": (1.0, 0.62, 0.0, 1.0),
        "metallic": 0.14,
        "roughness": 0.3,
    },
}


@dataclass(frozen=True)
class LinkVisual:
    link_name: str
    mesh_path: Path | None
    translation: tuple[float, float, float]
    rotation: tuple[float, float, float, float]
    material_name: str


@dataclass(frozen=True)
class Joint:
    name: str
    joint_type: str
    parent: str
    child: str
    translation: tuple[float, float, float]
    rotation: tuple[float, float, float, float]
    axis: tuple[float, float, float]
    lower: float | None
    upper: float | None


@dataclass(frozen=True)
class MeshPayload:
    interleaved: bytes
    vertex_count: int
    triangle_count: int
    minimum: tuple[float, float, float]
    maximum: tuple[float, float, float]


@dataclass(frozen=True)
class ConversionStats:
    link_count: int
    joint_count: int
    visible_mesh_count: int
    rendered_triangle_count: int
    articulation_nodes: tuple[str, ...]

    def to_json(self, revision: str) -> dict:
        return {
            "sourceRepository": SOURCE_REPOSITORY,
            "sourceRevision": revision,
            "sourceModel": SOURCE_MODEL,
            "linkCount": self.link_count,
            "jointCount": self.joint_count,
            "visibleMeshCount": self.visible_mesh_count,
            "renderedTriangleCount": self.rendered_triangle_count,
            "articulationNodes": list(self.articulation_nodes),
        }


def _floats(value: str | None, count: int, default: Sequence[float]) -> tuple[float, ...]:
    if not value:
        return tuple(default)
    parsed = tuple(float(item) for item in value.split())
    if len(parsed) != count:
        raise ValueError(f"expected {count} numbers, got {value!r}")
    return parsed


def _quaternion_from_rpy(rpy: Sequence[float]) -> tuple[float, float, float, float]:
    roll, pitch, yaw = rpy
    cr, sr = math.cos(roll / 2.0), math.sin(roll / 2.0)
    cp, sp = math.cos(pitch / 2.0), math.sin(pitch / 2.0)
    cy, sy = math.cos(yaw / 2.0), math.sin(yaw / 2.0)
    return (
        sr * cp * cy - cr * sp * sy,
        cr * sp * cy + sr * cp * sy,
        cr * cp * sy - sr * sp * cy,
        cr * cp * cy + sr * sp * sy,
    )


def _origin(element: ET.Element | None) -> tuple[tuple[float, float, float], tuple[float, float, float, float]]:
    if element is None:
        return (0.0, 0.0, 0.0), (0.0, 0.0, 0.0, 1.0)
    xyz = _floats(element.get("xyz"), 3, (0.0, 0.0, 0.0))
    rpy = _floats(element.get("rpy"), 3, (0.0, 0.0, 0.0))
    return (xyz[0], xyz[1], xyz[2]), _quaternion_from_rpy(rpy)


def _material_for_link(link_name: str) -> str:
    if link_name in YELLOW_LINKS:
        return "Safety Yellow"
    if link_name in BLACK_LINKS:
        return "Carbon Black"
    return "Armor White"


def parse_links(robot: ET.Element, model_dir: Path) -> list[LinkVisual]:
    links: list[LinkVisual] = []
    for link in robot.findall("link"):
        link_name = link.get("name")
        if not link_name:
            raise ValueError("URDF link is missing a name")
        visual = link.find("visual")
        mesh_path: Path | None = None
        translation = (0.0, 0.0, 0.0)
        rotation = (0.0, 0.0, 0.0, 1.0)
        if visual is not None:
            translation, rotation = _origin(visual.find("origin"))
            mesh = visual.find("./geometry/mesh")
            if mesh is not None and mesh.get("filename"):
                mesh_path = (model_dir / mesh.get("filename")).resolve()
                if not mesh_path.is_file():
                    raise FileNotFoundError(f"missing upstream mesh: {mesh_path}")
        links.append(
            LinkVisual(
                link_name=link_name,
                mesh_path=mesh_path,
                translation=translation,
                rotation=rotation,
                material_name=_material_for_link(link_name),
            )
        )
    return links


def parse_joints(robot: ET.Element) -> list[Joint]:
    joints: list[Joint] = []
    for element in robot.findall("joint"):
        parent = element.find("parent")
        child = element.find("child")
        if parent is None or child is None:
            raise ValueError(f"joint {element.get('name')!r} has no parent or child")
        translation, rotation = _origin(element.find("origin"))
        axis_element = element.find("axis")
        axis = _floats(
            axis_element.get("xyz") if axis_element is not None else None,
            3,
            (0.0, 0.0, 0.0),
        )
        limit = element.find("limit")
        lower = float(limit.get("lower")) if limit is not None and limit.get("lower") else None
        upper = float(limit.get("upper")) if limit is not None and limit.get("upper") else None
        name = element.get("name")
        if not name:
            raise ValueError("URDF joint is missing a name")
        joints.append(
            Joint(
                name=name,
                joint_type=element.get("type", "fixed"),
                parent=parent.get("link", ""),
                child=child.get("link", ""),
                translation=(translation[0], translation[1], translation[2]),
                rotation=rotation,
                axis=(axis[0], axis[1], axis[2]),
                lower=lower,
                upper=upper,
            )
        )
    return joints


def _binary_stl_payload(data: bytes, path: Path) -> MeshPayload:
    triangle_count = struct.unpack_from("<I", data, 80)[0]
    expected_size = 84 + triangle_count * 50
    if expected_size != len(data):
        raise ValueError(f"invalid binary STL size for {path}: expected {expected_size}, got {len(data)}")
    if triangle_count == 0:
        return MeshPayload(b"", 0, 0, (0.0, 0.0, 0.0), (0.0, 0.0, 0.0))

    # Store positions only. The optimizer welds identical source vertices and
    # model-viewer then derives smooth vertex normals from the indexed mesh.
    # Keeping the STL's per-face normals would preserve every triangle split
    # and make the official curved armor render as visibly faceted.
    output = bytearray(triangle_count * 36)
    unpack_triangle = struct.Struct("<12fH").unpack_from
    pack_triangle = struct.Struct("<9f").pack_into
    minimum = [math.inf, math.inf, math.inf]
    maximum = [-math.inf, -math.inf, -math.inf]
    output_offset = 0
    input_offset = 84
    for _ in range(triangle_count):
        values = unpack_triangle(data, input_offset)
        vertices = values[3:12]
        for index in range(0, 9, 3):
            for axis in range(3):
                coordinate = vertices[index + axis]
                minimum[axis] = min(minimum[axis], coordinate)
                maximum[axis] = max(maximum[axis], coordinate)
        pack_triangle(
            output,
            output_offset,
            vertices[0], vertices[1], vertices[2],
            vertices[3], vertices[4], vertices[5],
            vertices[6], vertices[7], vertices[8],
        )
        input_offset += 50
        output_offset += 36
    return MeshPayload(
        bytes(output),
        triangle_count * 3,
        triangle_count,
        (minimum[0], minimum[1], minimum[2]),
        (maximum[0], maximum[1], maximum[2]),
    )


def _ascii_stl_payload(text: str, path: Path) -> MeshPayload:
    vertices: list[tuple[float, float, float]] = []
    for raw_line in text.splitlines():
        line = raw_line.strip()
        if line.startswith("vertex "):
            values = _floats(line.removeprefix("vertex "), 3, (0.0, 0.0, 0.0))
            vertices.append((values[0], values[1], values[2]))
    if len(vertices) % 3:
        raise ValueError(f"ASCII STL has an incomplete triangle in {path}")
    if not vertices:
        return MeshPayload(b"", 0, 0, (0.0, 0.0, 0.0), (0.0, 0.0, 0.0))
    interleaved = bytearray()
    for vertex in vertices:
        interleaved.extend(struct.pack("<3f", *vertex))
    minimum = tuple(min(vertex[axis] for vertex in vertices) for axis in range(3))
    maximum = tuple(max(vertex[axis] for vertex in vertices) for axis in range(3))
    return MeshPayload(
        bytes(interleaved),
        len(vertices),
        len(vertices) // 3,
        (minimum[0], minimum[1], minimum[2]),
        (maximum[0], maximum[1], maximum[2]),
    )


def load_stl(path: Path) -> MeshPayload:
    data = path.read_bytes()
    if len(data) >= 84:
        triangle_count = struct.unpack_from("<I", data, 80)[0]
        if 84 + triangle_count * 50 == len(data):
            return _binary_stl_payload(data, path)
    try:
        return _ascii_stl_payload(data.decode("utf-8"), path)
    except UnicodeDecodeError as error:
        raise ValueError(f"unsupported STL encoding: {path}") from error


class GltfBuilder:
    def __init__(self) -> None:
        self.binary = bytearray()
        self.buffer_views: list[dict] = []
        self.accessors: list[dict] = []
        self.meshes: list[dict] = []

    def append_interleaved(self, payload: MeshPayload, name: str, material: int) -> int:
        while len(self.binary) % 4:
            self.binary.append(0)
        byte_offset = len(self.binary)
        self.binary.extend(payload.interleaved)
        view_index = len(self.buffer_views)
        self.buffer_views.append(
            {
                "name": f"{name}_vertex_data",
                "buffer": 0,
                "byteOffset": byte_offset,
                "byteLength": len(payload.interleaved),
                "byteStride": 12,
                "target": 34962,
            }
        )
        position_index = len(self.accessors)
        self.accessors.append(
            {
                "name": f"{name}_positions",
                "bufferView": view_index,
                "byteOffset": 0,
                "componentType": 5126,
                "count": payload.vertex_count,
                "type": "VEC3",
                "min": list(payload.minimum),
                "max": list(payload.maximum),
            }
        )
        mesh_index = len(self.meshes)
        self.meshes.append(
            {
                "name": name,
                "primitives": [
                    {
                        "attributes": {"POSITION": position_index},
                        "material": material,
                        "mode": 4,
                    }
                ],
            }
        )
        return mesh_index


def _gltf_materials() -> list[dict]:
    materials: list[dict] = []
    for name, settings in PALETTE.items():
        materials.append(
            {
                "name": name,
                "doubleSided": True,
                "pbrMetallicRoughness": {
                    "baseColorFactor": list(settings["rgba"]),
                    "metallicFactor": settings["metallic"],
                    "roughnessFactor": settings["roughness"],
                },
                "extras": {
                    "materialBasis": "official URDF class adjusted to supplied robot photographs"
                },
            }
        )
    return materials


def _non_identity_transform(node: dict, translation: Sequence[float], rotation: Sequence[float]) -> None:
    if any(abs(value) > 1e-12 for value in translation):
        node["translation"] = list(translation)
    identity = (0.0, 0.0, 0.0, 1.0)
    if any(abs(rotation[index] - identity[index]) > 1e-12 for index in range(4)):
        node["rotation"] = list(rotation)


def build_gltf(
    links: list[LinkVisual],
    joints: list[Joint],
    source_revision: str,
) -> tuple[dict, bytes, ConversionStats]:
    link_names = {link.link_name for link in links}
    for joint in joints:
        if joint.parent not in link_names or joint.child not in link_names:
            raise ValueError(f"joint {joint.name} references an unknown link")

    materials = _gltf_materials()
    material_index = {material["name"]: index for index, material in enumerate(materials)}
    builder = GltfBuilder()
    root_rotation = (-math.sqrt(0.5), 0.0, 0.0, math.sqrt(0.5))
    nodes: list[dict] = [
        {
            "name": "AGIBOT_X2_ULTRA_OFFICIAL",
            "rotation": list(root_rotation),
            "children": [],
            "extras": {
                "sourceRepository": SOURCE_REPOSITORY,
                "sourceRevision": source_revision,
                "sourceModel": SOURCE_MODEL,
            },
        }
    ]

    link_node: dict[str, int] = {}
    for link in links:
        link_node[link.link_name] = len(nodes)
        nodes.append(
            {
                "name": link.link_name,
                "extras": {"nodeType": "urdf-link"},
                "children": [],
            }
        )

    joint_node: dict[str, int] = {}
    child_links: set[str] = set()
    for joint in joints:
        node = {
            "name": joint.name,
            "children": [link_node[joint.child]],
            "extras": {
                "nodeType": "urdf-joint",
                "jointType": joint.joint_type,
                "axis": list(joint.axis),
                "lower": joint.lower,
                "upper": joint.upper,
            },
        }
        _non_identity_transform(node, joint.translation, joint.rotation)
        joint_node[joint.name] = len(nodes)
        nodes.append(node)
        nodes[link_node[joint.parent]]["children"].append(joint_node[joint.name])
        child_links.add(joint.child)

    triangle_count = 0
    visible_mesh_count = 0
    for link in links:
        if link.mesh_path is None:
            continue
        payload = load_stl(link.mesh_path)
        if payload.triangle_count == 0:
            continue
        mesh_index = builder.append_interleaved(
            payload,
            f"{link.link_name}__official_mesh",
            material_index[link.material_name],
        )
        visual_node = {
            "name": f"{link.link_name}__visual",
            "mesh": mesh_index,
            "extras": {
                "nodeType": "urdf-visual",
                "sourceMesh": link.mesh_path.name,
            },
        }
        _non_identity_transform(visual_node, link.translation, link.rotation)
        visual_index = len(nodes)
        nodes.append(visual_node)
        nodes[link_node[link.link_name]]["children"].insert(0, visual_index)
        triangle_count += payload.triangle_count
        visible_mesh_count += 1

    root_links = [link.link_name for link in links if link.link_name not in child_links]
    if len(root_links) != 1:
        raise ValueError(f"expected one URDF root link, got {root_links}")
    nodes[0]["children"] = [link_node[root_links[0]]]

    for node in nodes:
        if node.get("children") == []:
            node.pop("children", None)

    while len(builder.binary) % 4:
        builder.binary.append(0)
    binary = bytes(builder.binary)
    document = {
        "asset": {
            "version": "2.0",
            "generator": "Agentech official URDF converter 1.0",
            "copyright": "AgiBotTech; derived under Mulan PSL v2",
            "extras": {
                "sourceRepository": SOURCE_REPOSITORY,
                "sourceRevision": source_revision,
                "sourceModel": SOURCE_MODEL,
                "geometryPolicy": "official referenced meshes only; no procedural replacement body",
            },
        },
        "scene": 0,
        "scenes": [{"name": "AgiBot X2 Ultra Official", "nodes": [0]}],
        "nodes": nodes,
        "materials": materials,
        "meshes": builder.meshes,
        "bufferViews": builder.buffer_views,
        "accessors": builder.accessors,
        "buffers": [{"byteLength": len(binary)}],
    }
    stats = ConversionStats(
        link_count=len(links),
        joint_count=len(joints),
        visible_mesh_count=visible_mesh_count,
        rendered_triangle_count=triangle_count,
        articulation_nodes=tuple(joint.name for joint in joints),
    )
    return document, binary, stats


def _pad4(payload: bytes, fill: bytes) -> bytes:
    return payload + fill * ((-len(payload)) % 4)


def write_glb(output: Path, document: dict, binary: bytes) -> None:
    json_payload = _pad4(json.dumps(document, separators=(",", ":")).encode("utf-8"), b" ")
    binary_payload = _pad4(binary, b"\x00")
    total_length = 12 + 8 + len(json_payload) + 8 + len(binary_payload)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("wb") as file:
        file.write(struct.pack("<4sII", b"glTF", 2, total_length))
        file.write(struct.pack("<I4s", len(json_payload), b"JSON"))
        file.write(json_payload)
        file.write(struct.pack("<I4s", len(binary_payload), b"BIN\x00"))
        file.write(binary_payload)


def convert_urdf(
    urdf_path: Path,
    output_path: Path,
    manifest_path: Path | None,
    source_revision: str,
) -> ConversionStats:
    robot = ET.parse(urdf_path).getroot()
    links = parse_links(robot, urdf_path.parent)
    joints = parse_joints(robot)
    document, binary, stats = build_gltf(links, joints, source_revision)
    write_glb(output_path, document, binary)
    if manifest_path is not None:
        manifest_path.parent.mkdir(parents=True, exist_ok=True)
        manifest_path.write_text(
            json.dumps(stats.to_json(source_revision), indent=2) + "\n",
            encoding="utf-8",
        )
    return stats


def parse_args(argv: Iterable[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--urdf", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--source-revision", required=True)
    return parser.parse_args(argv)


def main(argv: Iterable[str] | None = None) -> int:
    args = parse_args(argv)
    stats = convert_urdf(
        args.urdf.resolve(),
        args.output.resolve(),
        args.manifest.resolve() if args.manifest else None,
        args.source_revision,
    )
    print(
        f"Converted {stats.visible_mesh_count} official meshes / "
        f"{stats.rendered_triangle_count:,} triangles to {args.output}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

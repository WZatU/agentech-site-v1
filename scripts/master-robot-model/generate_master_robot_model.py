#!/usr/bin/env python3
"""Generate Agentech's lightweight articulated Master robot GLB asset."""

from __future__ import annotations

import argparse
import json
import math
import struct
from pathlib import Path
from typing import Iterable, Sequence


ARTICULATION_NODES = (
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
)

MATERIALS = (
    {
        "name": "Carbon Black",
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.018, 0.024, 0.034, 1.0],
            "metallicFactor": 0.72,
            "roughnessFactor": 0.26,
        },
    },
    {
        "name": "Armor White",
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.82, 0.84, 0.84, 1.0],
            "metallicFactor": 0.18,
            "roughnessFactor": 0.34,
        },
    },
    {
        "name": "Safety Yellow",
        "pbrMetallicRoughness": {
            "baseColorFactor": [1.0, 0.58, 0.0, 1.0],
            "metallicFactor": 0.12,
            "roughnessFactor": 0.3,
        },
    },
    {
        "name": "Face Glass",
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.008, 0.018, 0.04, 0.78],
            "metallicFactor": 0.62,
            "roughnessFactor": 0.12,
        },
        "alphaMode": "BLEND",
        "doubleSided": True,
    },
    {
        "name": "Signal Blue",
        "pbrMetallicRoughness": {
            "baseColorFactor": [0.01, 0.14, 0.55, 1.0],
            "metallicFactor": 0.05,
            "roughnessFactor": 0.2,
        },
        "emissiveFactor": [0.02, 0.35, 1.0],
    },
)


def _pad4(payload: bytes, fill: bytes) -> bytes:
    return payload + fill * ((-len(payload)) % 4)


def _uv_sphere(segments: int = 24, rings: int = 14) -> tuple[list[tuple[float, float, float]], list[tuple[float, float, float]], list[int]]:
    positions: list[tuple[float, float, float]] = []
    normals: list[tuple[float, float, float]] = []
    indices: list[int] = []
    for ring in range(rings + 1):
        phi = math.pi * ring / rings
        y = math.cos(phi)
        radius = math.sin(phi)
        for segment in range(segments + 1):
            theta = math.tau * segment / segments
            point = (radius * math.cos(theta), y, radius * math.sin(theta))
            positions.append(point)
            normals.append(point)
    stride = segments + 1
    for ring in range(rings):
        for segment in range(segments):
            a = ring * stride + segment
            b = a + stride
            c = b + 1
            d = a + 1
            if ring != 0:
                indices.extend((a, d, b))
            if ring != rings - 1:
                indices.extend((d, c, b))
    return positions, normals, indices


def _cylinder(segments: int = 24) -> tuple[list[tuple[float, float, float]], list[tuple[float, float, float]], list[int]]:
    positions: list[tuple[float, float, float]] = []
    normals: list[tuple[float, float, float]] = []
    indices: list[int] = []
    for segment in range(segments + 1):
        theta = math.tau * segment / segments
        normal = (math.cos(theta), 0.0, math.sin(theta))
        positions.extend(((normal[0], -1.0, normal[2]), (normal[0], 1.0, normal[2])))
        normals.extend((normal, normal))
    for segment in range(segments):
        lower = segment * 2
        upper = lower + 1
        next_lower = lower + 2
        next_upper = upper + 2
        indices.extend((lower, upper, next_lower, next_lower, upper, next_upper))

    for y, normal, reverse in ((1.0, (0.0, 1.0, 0.0), True), (-1.0, (0.0, -1.0, 0.0), False)):
        center = len(positions)
        positions.append((0.0, y, 0.0))
        normals.append(normal)
        ring_start = len(positions)
        for segment in range(segments):
            theta = math.tau * segment / segments
            positions.append((math.cos(theta), y, math.sin(theta)))
            normals.append(normal)
        for segment in range(segments):
            current = ring_start + segment
            following = ring_start + (segment + 1) % segments
            indices.extend((center, following, current) if reverse else (center, current, following))
    return positions, normals, indices


def _box() -> tuple[list[tuple[float, float, float]], list[tuple[float, float, float]], list[int]]:
    faces = (
        ((1.0, 0.0, 0.0), ((1, -1, -1), (1, 1, -1), (1, 1, 1), (1, -1, 1))),
        ((-1.0, 0.0, 0.0), ((-1, -1, 1), (-1, 1, 1), (-1, 1, -1), (-1, -1, -1))),
        ((0.0, 1.0, 0.0), ((-1, 1, -1), (-1, 1, 1), (1, 1, 1), (1, 1, -1))),
        ((0.0, -1.0, 0.0), ((-1, -1, 1), (-1, -1, -1), (1, -1, -1), (1, -1, 1))),
        ((0.0, 0.0, 1.0), ((-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1))),
        ((0.0, 0.0, -1.0), ((1, -1, -1), (-1, -1, -1), (-1, 1, -1), (1, 1, -1))),
    )
    positions: list[tuple[float, float, float]] = []
    normals: list[tuple[float, float, float]] = []
    indices: list[int] = []
    for normal, corners in faces:
        start = len(positions)
        positions.extend((float(x), float(y), float(z)) for x, y, z in corners)
        normals.extend((normal,) * 4)
        indices.extend((start, start + 1, start + 2, start, start + 2, start + 3))
    return positions, normals, indices


def _torus(major_segments: int = 32, minor_segments: int = 10, major_radius: float = 0.72, minor_radius: float = 0.28) -> tuple[list[tuple[float, float, float]], list[tuple[float, float, float]], list[int]]:
    positions: list[tuple[float, float, float]] = []
    normals: list[tuple[float, float, float]] = []
    indices: list[int] = []
    for major in range(major_segments + 1):
        u = math.tau * major / major_segments
        cos_u, sin_u = math.cos(u), math.sin(u)
        for minor in range(minor_segments + 1):
            v = math.tau * minor / minor_segments
            cos_v, sin_v = math.cos(v), math.sin(v)
            radius = major_radius + minor_radius * cos_v
            positions.append((radius * cos_u, minor_radius * sin_v, radius * sin_u))
            normals.append((cos_v * cos_u, sin_v, cos_v * sin_u))
    stride = minor_segments + 1
    for major in range(major_segments):
        for minor in range(minor_segments):
            a = major * stride + minor
            b = a + stride
            c = b + 1
            d = a + 1
            indices.extend((a, d, b, d, c, b))
    return positions, normals, indices


def _torus_arc(major_segments: int = 24, minor_segments: int = 10, major_radius: float = 0.72, minor_radius: float = 0.28) -> tuple[list[tuple[float, float, float]], list[tuple[float, float, float]], list[int]]:
    positions: list[tuple[float, float, float]] = []
    normals: list[tuple[float, float, float]] = []
    indices: list[int] = []
    start, end = math.pi, math.tau
    for major in range(major_segments + 1):
        u = start + (end - start) * major / major_segments
        cos_u, sin_u = math.cos(u), math.sin(u)
        for minor in range(minor_segments + 1):
            v = math.tau * minor / minor_segments
            cos_v, sin_v = math.cos(v), math.sin(v)
            radius = major_radius + minor_radius * cos_v
            positions.append((radius * cos_u, minor_radius * sin_v, radius * sin_u))
            normals.append((cos_v * cos_u, sin_v, cos_v * sin_u))
    stride = minor_segments + 1
    for major in range(major_segments):
        for minor in range(minor_segments):
            a = major * stride + minor
            b = a + stride
            c = b + 1
            d = a + 1
            indices.extend((a, d, b, d, c, b))
    return positions, normals, indices


def _quat(axis: str, angle: float) -> list[float]:
    half = angle * 0.5
    value = math.sin(half)
    xyz = {"x": (value, 0.0, 0.0), "y": (0.0, value, 0.0), "z": (0.0, 0.0, value)}[axis]
    return [xyz[0], xyz[1], xyz[2], math.cos(half)]


class RobotSceneBuilder:
    def __init__(self) -> None:
        self.binary = bytearray()
        self.buffer_views: list[dict] = []
        self.accessors: list[dict] = []
        self.meshes: list[dict] = []
        self.nodes: list[dict] = []
        self.geometry: dict[str, tuple[int, int, int]] = {}
        self.mesh_cache: dict[tuple[str, int], int] = {}
        self.material_index = {material["name"]: index for index, material in enumerate(MATERIALS)}

    def _append_bytes(self, payload: bytes, target: int) -> int:
        while len(self.binary) % 4:
            self.binary.append(0)
        offset = len(self.binary)
        self.binary.extend(payload)
        index = len(self.buffer_views)
        self.buffer_views.append({"buffer": 0, "byteOffset": offset, "byteLength": len(payload), "target": target})
        return index

    def _add_accessor(self, buffer_view: int, component_type: int, count: int, accessor_type: str, minimum: Sequence[float] | None = None, maximum: Sequence[float] | None = None) -> int:
        accessor: dict = {
            "bufferView": buffer_view,
            "componentType": component_type,
            "count": count,
            "type": accessor_type,
        }
        if minimum is not None:
            accessor["min"] = list(minimum)
        if maximum is not None:
            accessor["max"] = list(maximum)
        index = len(self.accessors)
        self.accessors.append(accessor)
        return index

    def add_geometry(self, name: str, data: tuple[list[tuple[float, float, float]], list[tuple[float, float, float]], list[int]]) -> None:
        positions, normals, indices = data
        position_payload = b"".join(struct.pack("<3f", *point) for point in positions)
        normal_payload = b"".join(struct.pack("<3f", *normal) for normal in normals)
        index_payload = b"".join(struct.pack("<H", index) for index in indices)
        position_view = self._append_bytes(position_payload, 34962)
        normal_view = self._append_bytes(normal_payload, 34962)
        index_view = self._append_bytes(index_payload, 34963)
        minimum = [min(point[axis] for point in positions) for axis in range(3)]
        maximum = [max(point[axis] for point in positions) for axis in range(3)]
        self.geometry[name] = (
            self._add_accessor(position_view, 5126, len(positions), "VEC3", minimum, maximum),
            self._add_accessor(normal_view, 5126, len(normals), "VEC3"),
            self._add_accessor(index_view, 5123, len(indices), "SCALAR"),
        )

    def mesh(self, shape: str, material: str) -> int:
        material_index = self.material_index[material]
        key = (shape, material_index)
        if key not in self.mesh_cache:
            position, normal, indices = self.geometry[shape]
            self.mesh_cache[key] = len(self.meshes)
            self.meshes.append(
                {
                    "name": f"{shape}_{material.replace(' ', '_')}",
                    "primitives": [
                        {
                            "attributes": {"POSITION": position, "NORMAL": normal},
                            "indices": indices,
                            "material": material_index,
                            "mode": 4,
                        }
                    ],
                }
            )
        return self.mesh_cache[key]

    def node(
        self,
        name: str,
        parent: int | None = None,
        *,
        shape: str | None = None,
        material: str = "Carbon Black",
        translation: Sequence[float] | None = None,
        rotation: Sequence[float] | None = None,
        scale: Sequence[float] | None = None,
    ) -> int:
        node: dict = {"name": name}
        if shape is not None:
            node["mesh"] = self.mesh(shape, material)
        if translation is not None:
            node["translation"] = list(translation)
        if rotation is not None:
            node["rotation"] = list(rotation)
        if scale is not None:
            node["scale"] = list(scale)
        index = len(self.nodes)
        self.nodes.append(node)
        if parent is not None:
            self.nodes[parent].setdefault("children", []).append(index)
        return index


def _add_arm(builder: RobotSceneBuilder, chest: int, side: str, sign: float) -> None:
    shoulder = builder.node(
        f"{side}_Shoulder",
        chest,
        translation=(0.68 * sign, 0.52, 0.0),
        rotation=_quat("z", 0.11 * sign),
    )
    builder.node(f"{side}_Shoulder_Pod", shoulder, shape="sphere", scale=(0.25, 0.24, 0.24))
    builder.node(f"{side}_Shoulder_Ring", shoulder, shape="torus", material="Armor White", rotation=_quat("z", math.pi / 2), scale=(0.18, 0.18, 0.18))
    builder.node(f"{side}_Upper_Arm_Core", shoulder, shape="cylinder", translation=(0.0, -0.29, 0.0), scale=(0.14, 0.29, 0.14))
    builder.node(f"{side}_Upper_Arm_Armor", shoulder, shape="sphere", material="Armor White", translation=(0.0, -0.33, 0.0), scale=(0.205, 0.26, 0.18))
    elbow = builder.node(f"{side}_Elbow", shoulder, translation=(0.0, -0.63, 0.0))
    builder.node(f"{side}_Elbow_Joint", elbow, shape="sphere", scale=(0.17, 0.17, 0.17))
    builder.node(f"{side}_Forearm_Core", elbow, shape="cylinder", translation=(0.0, -0.27, 0.0), scale=(0.115, 0.27, 0.115))
    builder.node(f"{side}_Forearm_Armor", elbow, shape="sphere", material="Armor White", translation=(0.0, -0.27, 0.015), scale=(0.19, 0.27, 0.16))
    wrist = builder.node(f"{side}_Wrist", elbow, translation=(0.0, -0.56, 0.0))
    builder.node(f"{side}_Wrist_Joint", wrist, shape="cylinder", rotation=_quat("z", math.pi / 2), scale=(0.12, 0.11, 0.12))
    builder.node(f"{side}_Palm", wrist, shape="sphere", material="Armor White", translation=(0.0, -0.16, 0.0), scale=(0.145, 0.18, 0.07))
    for finger in range(5):
        x = (finger - 2) * 0.048
        length = 0.105 if finger in (0, 4) else 0.13
        builder.node(
            f"{side}_Finger_{finger + 1}",
            wrist,
            shape="cylinder",
            material="Armor White",
            translation=(x, -0.32, 0.005),
            rotation=_quat("z", (finger - 2) * -0.035),
            scale=(0.017, length, 0.017),
        )


def _add_leg(builder: RobotSceneBuilder, pelvis: int, side: str, sign: float) -> None:
    hip = builder.node(f"{side}_Hip", pelvis, translation=(0.32 * sign, -0.03, 0.0))
    builder.node(f"{side}_Hip_Pod", hip, shape="sphere", scale=(0.26, 0.28, 0.25))
    builder.node(f"{side}_Thigh_Core", hip, shape="cylinder", translation=(0.0, -0.34, 0.0), scale=(0.16, 0.34, 0.16))
    builder.node(f"{side}_Thigh_Armor", hip, shape="sphere", scale=(0.245, 0.31, 0.20), translation=(0.0, -0.34, 0.015))
    builder.node(f"{side}_Thigh_Badge", hip, shape="box", material="Armor White", translation=(0.0, -0.30, 0.205), scale=(0.07, 0.04, 0.012))
    knee = builder.node(f"{side}_Knee", hip, translation=(0.0, -0.69, 0.0))
    builder.node(f"{side}_Knee_Joint", knee, shape="sphere", scale=(0.18, 0.18, 0.18))
    builder.node(f"{side}_Shin_Core", knee, shape="cylinder", translation=(0.0, -0.34, 0.0), scale=(0.14, 0.34, 0.14))
    builder.node(f"{side}_Shin_Armor", knee, shape="sphere", material="Armor White", translation=(0.0, -0.34, 0.015), scale=(0.23, 0.34, 0.185))
    builder.node(f"{side}_Shin_Panel", knee, shape="box", translation=(0.0, -0.35, 0.19), scale=(0.09, 0.16, 0.018))
    ankle = builder.node(f"{side}_Ankle", knee, translation=(0.0, -0.70, 0.0))
    builder.node(f"{side}_Ankle_Joint", ankle, shape="sphere", scale=(0.15, 0.15, 0.15))
    builder.node(f"{side}_Foot_Core", ankle, shape="sphere", translation=(0.0, -0.12, 0.05), scale=(0.22, 0.13, 0.30))
    builder.node(f"{side}_Foot_Yellow", ankle, shape="arc", material="Safety Yellow", translation=(0.0, -0.10, 0.06), rotation=_quat("y", math.pi), scale=(0.34, 0.16, 0.36))
    builder.node(f"{side}_Foot_Heel", ankle, shape="sphere", translation=(0.0, -0.10, -0.18), scale=(0.21, 0.12, 0.18))


def build_scene() -> RobotSceneBuilder:
    builder = RobotSceneBuilder()
    builder.add_geometry("sphere", _uv_sphere())
    builder.add_geometry("cylinder", _cylinder())
    builder.add_geometry("box", _box())
    builder.add_geometry("torus", _torus())
    builder.add_geometry("arc", _torus_arc())

    root = builder.node("AGENTECH_MASTER_ROBOT")
    pelvis = builder.node("Pelvis", root, translation=(0.0, 1.62, 0.0))
    builder.node("Pelvis_Core", pelvis, shape="sphere", scale=(0.51, 0.30, 0.34))
    builder.node("Pelvis_Armor", pelvis, shape="sphere", translation=(0.0, 0.03, 0.19), scale=(0.41, 0.22, 0.16))
    builder.node("Waist_Column", pelvis, shape="cylinder", translation=(0.0, 0.31, 0.0), scale=(0.27, 0.25, 0.27))
    builder.node("Waist_Ring", pelvis, shape="torus", translation=(0.0, 0.54, 0.0), scale=(0.37, 0.20, 0.37))

    chest = builder.node("Chest", pelvis, translation=(0.0, 0.50, 0.0))
    builder.node("Chest_Core", chest, shape="sphere", scale=(0.61, 0.57, 0.38), translation=(0.0, 0.31, 0.0))
    builder.node("Chest_Upper_Armor", chest, shape="sphere", translation=(0.0, 0.46, 0.05), scale=(0.58, 0.34, 0.35))
    builder.node("Chest_Faceplate", chest, shape="sphere", translation=(0.0, 0.25, 0.31), scale=(0.39, 0.25, 0.10))
    builder.node("Chest_Signal_Ring", chest, shape="arc", material="Signal Blue", rotation=_quat("x", math.pi / 2), translation=(0.0, 0.37, 0.37), scale=(0.45, 0.17, 0.45))
    builder.node("Chest_Camera_Block", chest, shape="box", translation=(0.0, 0.12, 0.39), scale=(0.13, 0.19, 0.07))
    for sensor in range(3):
        builder.node(
            f"Chest_Camera_{sensor + 1}",
            chest,
            shape="sphere",
            material="Signal Blue",
            translation=(0.0, 0.24 - sensor * 0.11, 0.47),
            scale=(0.035, 0.035, 0.025),
        )

    head_yaw = builder.node("Head_Yaw", chest, translation=(0.0, 1.07, 0.0))
    head_pitch = builder.node("Head_Pitch", head_yaw)
    builder.node("Head_Shell", head_pitch, shape="sphere", scale=(0.36, 0.39, 0.32))
    builder.node("Face_Glass", head_pitch, shape="sphere", material="Face Glass", translation=(0.0, -0.02, 0.085), scale=(0.31, 0.28, 0.29))
    for eye_sign in (-1.0, 1.0):
        builder.node(
            "Left_Eye" if eye_sign < 0 else "Right_Eye",
            head_pitch,
            shape="sphere",
            material="Signal Blue",
            translation=(0.105 * eye_sign, -0.035, 0.325),
            scale=(0.052, 0.095, 0.026),
        )
    for sensor in range(3):
        builder.node(
            f"Head_Sensor_{sensor + 1}",
            head_pitch,
            shape="cylinder",
            material="Face Glass",
            translation=((sensor - 1) * 0.12, 0.20, 0.27),
            rotation=_quat("x", math.pi / 2),
            scale=(0.035, 0.022, 0.035),
        )
    builder.node("Head_Left_Cap", head_pitch, shape="cylinder", translation=(-0.34, 0.0, 0.0), rotation=_quat("z", math.pi / 2), scale=(0.09, 0.05, 0.09))
    builder.node("Head_Right_Cap", head_pitch, shape="cylinder", translation=(0.34, 0.0, 0.0), rotation=_quat("z", math.pi / 2), scale=(0.09, 0.05, 0.09))
    builder.node("Neck_Collar", head_yaw, shape="torus", scale=(0.35, 0.17, 0.35), translation=(0.0, -0.36, 0.0))

    _add_arm(builder, chest, "Left", 1.0)
    _add_arm(builder, chest, "Right", -1.0)
    _add_leg(builder, pelvis, "Left", 1.0)
    _add_leg(builder, pelvis, "Right", -1.0)
    return builder


def write_glb(output: Path) -> RobotSceneBuilder:
    builder = build_scene()
    while len(builder.binary) % 4:
        builder.binary.append(0)
    binary_payload = bytes(builder.binary)
    document = {
        "asset": {"version": "2.0", "generator": "Agentech procedural robot builder"},
        "scene": 0,
        "scenes": [{"name": "Agentech Master Robot", "nodes": [0]}],
        "nodes": builder.nodes,
        "materials": list(MATERIALS),
        "meshes": builder.meshes,
        "bufferViews": builder.buffer_views,
        "accessors": builder.accessors,
        "buffers": [{"byteLength": len(binary_payload)}],
    }
    json_payload = _pad4(json.dumps(document, separators=(",", ":")).encode("utf-8"), b" ")
    total_length = 12 + 8 + len(json_payload) + 8 + len(binary_payload)
    glb = bytearray(struct.pack("<4sII", b"glTF", 2, total_length))
    glb.extend(struct.pack("<I4s", len(json_payload), b"JSON"))
    glb.extend(json_payload)
    glb.extend(struct.pack("<I4s", len(binary_payload), b"BIN\x00"))
    glb.extend(binary_payload)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(glb)
    return builder


def write_preview_svg(output: Path) -> None:
    """Write a transparent vector preview matching the procedural model's palette."""
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(
        """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 1000" role="img" aria-labelledby="title desc">
  <title id="title">AGENTECH MASTER web robot preview</title>
  <desc id="desc">Stylized black and white humanoid robot with blue lights and yellow feet.</desc>
  <defs>
    <linearGradient id="black" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#242c38"/><stop offset=".55" stop-color="#090d14"/><stop offset="1" stop-color="#010205"/></linearGradient>
    <linearGradient id="white" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#ffffff"/><stop offset=".45" stop-color="#d9dde1"/><stop offset="1" stop-color="#8c949d"/></linearGradient>
    <linearGradient id="yellow" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#ffd43b"/><stop offset="1" stop-color="#f08a00"/></linearGradient>
    <radialGradient id="glass"><stop stop-color="#16345d"/><stop offset=".45" stop-color="#071426"/><stop offset="1" stop-color="#01040a"/></radialGradient>
    <filter id="blueGlow" x="-200%" y="-200%" width="400%" height="400%"><feGaussianBlur stdDeviation="12" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
  </defs>
  <ellipse cx="450" cy="920" rx="250" ry="42" fill="#081224" opacity=".22" filter="url(#shadow)"/>
  <g stroke="#111722" stroke-width="5" stroke-linejoin="round">
    <g id="left-leg">
      <ellipse cx="345" cy="585" rx="73" ry="93" fill="url(#black)"/>
      <rect x="292" y="636" width="106" height="190" rx="48" fill="url(#white)"/>
      <ellipse cx="345" cy="650" rx="55" ry="42" fill="url(#black)"/>
      <rect x="310" y="710" width="70" height="92" rx="22" fill="#b9c0c8" opacity=".72"/>
      <ellipse cx="345" cy="835" rx="48" ry="38" fill="url(#black)"/>
      <path d="M268 854 Q345 824 424 858 L415 912 Q342 946 265 908Z" fill="url(#yellow)"/>
    </g>
    <g id="right-leg">
      <ellipse cx="555" cy="585" rx="73" ry="93" fill="url(#black)"/>
      <rect x="502" y="636" width="106" height="190" rx="48" fill="url(#white)"/>
      <ellipse cx="555" cy="650" rx="55" ry="42" fill="url(#black)"/>
      <rect x="520" y="710" width="70" height="92" rx="22" fill="#b9c0c8" opacity=".72"/>
      <ellipse cx="555" cy="835" rx="48" ry="38" fill="url(#black)"/>
      <path d="M478 858 Q555 824 634 854 L637 908 Q560 946 487 912Z" fill="url(#yellow)"/>
    </g>
    <path d="M320 480 Q450 420 580 480 L590 580 Q450 640 310 580Z" fill="url(#black)"/>
    <rect x="390" y="426" width="120" height="92" rx="45" fill="url(#black)"/>
    <g id="torso">
      <path d="M278 230 Q450 158 622 230 L650 405 Q585 492 450 505 Q315 492 250 405Z" fill="url(#black)"/>
      <path d="M340 304 Q450 246 560 304 L575 415 Q450 454 325 415Z" fill="#182131" opacity=".95"/>
      <path d="M345 338 Q450 302 555 338" fill="none" stroke="#1175ff" stroke-width="20" stroke-linecap="round" filter="url(#blueGlow)"/>
      <rect x="420" y="350" width="60" height="95" rx="16" fill="#050912" stroke="#657080"/>
      <circle cx="450" cy="374" r="9" fill="#34a4ff"/><circle cx="450" cy="400" r="9" fill="#34a4ff"/><circle cx="450" cy="426" r="9" fill="#34a4ff"/>
    </g>
    <g id="left-arm">
      <ellipse cx="230" cy="292" rx="78" ry="75" fill="url(#black)"/>
      <rect x="179" y="322" width="102" height="176" rx="48" fill="url(#white)" transform="rotate(5 230 410)"/>
      <ellipse cx="225" cy="492" rx="49" ry="45" fill="url(#black)"/>
      <rect x="187" y="520" width="82" height="155" rx="39" fill="url(#white)" transform="rotate(2 228 598)"/>
      <ellipse cx="225" cy="690" rx="43" ry="58" fill="url(#white)"/>
    </g>
    <g id="right-arm">
      <ellipse cx="670" cy="292" rx="78" ry="75" fill="url(#black)"/>
      <rect x="619" y="322" width="102" height="176" rx="48" fill="url(#white)" transform="rotate(-5 670 410)"/>
      <ellipse cx="675" cy="492" rx="49" ry="45" fill="url(#black)"/>
      <rect x="631" y="520" width="82" height="155" rx="39" fill="url(#white)" transform="rotate(-2 672 598)"/>
      <ellipse cx="675" cy="690" rx="43" ry="58" fill="url(#white)"/>
    </g>
    <ellipse cx="450" cy="205" rx="112" ry="42" fill="url(#black)"/>
    <g id="head">
      <rect x="342" y="45" width="216" height="207" rx="92" fill="url(#black)"/>
      <rect x="368" y="82" width="164" height="128" rx="55" fill="url(#glass)" stroke="#25364e"/>
      <rect x="405" y="127" width="34" height="58" rx="17" fill="#7fd5ff" stroke="none" filter="url(#blueGlow)"/>
      <rect x="461" y="127" width="34" height="58" rx="17" fill="#7fd5ff" stroke="none" filter="url(#blueGlow)"/>
      <circle cx="402" cy="80" r="10" fill="#071426" stroke="#43536a"/><circle cx="450" cy="72" r="10" fill="#071426" stroke="#43536a"/><circle cx="498" cy="80" r="10" fill="#071426" stroke="#43536a"/>
    </g>
  </g>
  <text x="450" y="982" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" letter-spacing="8" fill="#0b1728">AGENTECH MASTER</text>
</svg>
""",
        encoding="utf-8",
    )


def write_manifest(output: Path, builder: RobotSceneBuilder, glb_path: Path) -> None:
    visible_nodes = [node for node in builder.nodes if "mesh" in node]
    rendered_triangles = 0
    for node in visible_nodes:
        for primitive in builder.meshes[node["mesh"]]["primitives"]:
            rendered_triangles += builder.accessors[primitive["indices"]]["count"] // 3
    document = {
        "asset": glb_path.name,
        "fileSizeBytes": glb_path.stat().st_size,
        "visibleNodeCount": len(visible_nodes),
        "renderedTriangleCount": rendered_triangles,
        "materials": [material["name"] for material in MATERIALS],
        "articulationNodes": list(ARTICULATION_NODES),
        "allNodeNames": [node["name"] for node in builder.nodes],
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(document, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--preview", type=Path)
    parser.add_argument("--manifest", type=Path)
    args = parser.parse_args()
    builder = write_glb(args.output)
    if args.preview:
        write_preview_svg(args.preview)
    if args.manifest:
        write_manifest(args.manifest, builder, args.output)


if __name__ == "__main__":
    main()

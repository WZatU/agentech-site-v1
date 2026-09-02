"""Build a Meshy-reference Agibot X2 asset in Blender.

This script starts from the editable official X2 scene, adds the visual details
visible in the Meshy humanoid-robot-base reference, preserves the mechanical
joint hierarchy, creates an editable studio scene, exports a web GLB, and
renders a square product preview.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import struct
import sys
from pathlib import Path

import bpy
from mathutils import Vector


SCRIPT_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = SCRIPT_DIR.parents[1]
DEFAULT_SOURCE = SCRIPT_DIR / "agibot-x2-official.blend"
DEFAULT_BLEND = SCRIPT_DIR / "agibot-x2-meshy-detailed.blend"
DEFAULT_GLB = (
    PROJECT_ROOT
    / "public/assets/products/eaic-hub/master-robot-3d/agibot-x2-meshy-detailed.glb"
)
DEFAULT_RENDER = PROJECT_ROOT / "output/agibot-x2-meshy-detailed.png"
DEFAULT_MANIFEST = DEFAULT_GLB.with_suffix(".json")
DEFAULT_PREVIEW = SCRIPT_DIR / "preview-meshy-detailed.html"

TARGET_BASE_TRIANGLES = 118_000


def parse_args() -> argparse.Namespace:
    arguments = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output-blend", type=Path, default=DEFAULT_BLEND)
    parser.add_argument("--output-glb", type=Path, default=DEFAULT_GLB)
    parser.add_argument("--output-render", type=Path, default=DEFAULT_RENDER)
    parser.add_argument("--output-manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output-preview", type=Path, default=DEFAULT_PREVIEW)
    parser.add_argument("--resolution", type=int, default=1400)
    return parser.parse_args(arguments)


def set_principled(material: bpy.types.Material, values: dict[str, object]) -> None:
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    if shader is None:
        return
    for name, value in values.items():
        socket = shader.inputs.get(name)
        if socket is not None:
            socket.default_value = value


def make_material(name: str, values: dict[str, object]) -> bpy.types.Material:
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    set_principled(material, values)
    return material


def build_materials() -> dict[str, bpy.types.Material]:
    return {
        "white": make_material(
            "Meshy Armor White",
            {
                "Base Color": (0.70, 0.74, 0.79, 1.0),
                "Metallic": 0.06,
                "Roughness": 0.22,
                "Specular IOR Level": 0.42,
                "Coat Weight": 0.30,
                "Coat Roughness": 0.10,
            },
        ),
        "black": make_material(
            "Meshy Graphite Black",
            {
                "Base Color": (0.006, 0.009, 0.015, 1.0),
                "Metallic": 0.40,
                "Roughness": 0.24,
                "Specular IOR Level": 0.38,
                "Coat Weight": 0.26,
                "Coat Roughness": 0.12,
            },
        ),
        "glass": make_material(
            "Meshy Face Glass",
            {
                "Base Color": (0.0003, 0.0008, 0.0025, 1.0),
                "Metallic": 0.10,
                "Roughness": 0.12,
                "Specular IOR Level": 0.34,
                "Coat Weight": 0.50,
                "Coat Roughness": 0.05,
            },
        ),
        "blue": make_material(
            "Meshy Signal Blue",
            {
                "Base Color": (0.003, 0.035, 0.44, 1.0),
                "Metallic": 0.04,
                "Roughness": 0.18,
                "Emission Color": (0.02, 0.24, 1.0, 1.0),
                "Emission Strength": 3.2,
            },
        ),
        "eye": make_material(
            "Meshy Eye White",
            {
                "Base Color": (0.64, 0.82, 1.0, 1.0),
                "Roughness": 0.10,
                "Emission Color": (0.55, 0.80, 1.0, 1.0),
                "Emission Strength": 7.5,
            },
        ),
        "orange": make_material(
            "Meshy Safety Orange",
            {
                "Base Color": (1.0, 0.31, 0.005, 1.0),
                "Metallic": 0.02,
                "Roughness": 0.38,
                "Coat Weight": 0.15,
                "Coat Roughness": 0.18,
            },
        ),
        "metal": make_material(
            "Meshy Brushed Metal",
            {
                "Base Color": (0.11, 0.14, 0.18, 1.0),
                "Metallic": 0.82,
                "Roughness": 0.30,
                "Anisotropic": 0.22,
            },
        ),
        "rubber": make_material(
            "Meshy Rubber Black",
            {
                "Base Color": (0.003, 0.004, 0.006, 1.0),
                "Metallic": 0.0,
                "Roughness": 0.62,
            },
        ),
    }


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    if obj.data.materials:
        for index in range(len(obj.data.materials)):
            obj.data.materials[index] = material
    else:
        obj.data.materials.append(material)


def parent_keep_world(obj: bpy.types.Object, parent: bpy.types.Object | None) -> None:
    if parent is None:
        return
    world = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = world


def select_only(obj: bpy.types.Object) -> None:
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj


def apply_modifier(obj: bpy.types.Object, modifier: bpy.types.Modifier) -> None:
    select_only(obj)
    bpy.ops.object.modifier_apply(modifier=modifier.name)


def add_rounded_box(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    material: bpy.types.Material,
    bevel: float,
    parent: bpy.types.Object | None,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dimensions
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new(name="Machined edge", type="BEVEL")
    modifier.width = bevel
    modifier.segments = 3
    apply_modifier(obj, modifier)
    assign_material(obj, material)
    parent_keep_world(obj, parent)
    return obj


def add_cylinder(
    name: str,
    location: tuple[float, float, float],
    radius: float,
    depth: float,
    material: bpy.types.Material,
    parent: bpy.types.Object | None,
    rotation: tuple[float, float, float] = (0.0, math.pi / 2.0, 0.0),
    vertices: int = 24,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=vertices,
        radius=radius,
        depth=depth,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    bevel = obj.modifiers.new(name="Cylinder edge", type="BEVEL")
    bevel.width = min(radius * 0.16, 0.004)
    bevel.segments = 2
    apply_modifier(obj, bevel)
    parent_keep_world(obj, parent)
    return obj


def add_uv_sphere(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material: bpy.types.Material,
    parent: bpy.types.Object | None,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    assign_material(obj, material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    parent_keep_world(obj, parent)
    return obj


def add_profiled_sleeve(
    name: str,
    profile: tuple[tuple[float, float], ...],
    center_x: float,
    y_scale: float,
    material: bpy.types.Material,
    parent: bpy.types.Object | None,
    segments: int = 64,
) -> bpy.types.Object:
    vertices = []
    for z, radius in profile:
        for segment in range(segments):
            angle = 2.0 * math.pi * segment / segments
            vertices.append(
                (
                    center_x + radius * math.cos(angle),
                    radius * y_scale * math.sin(angle),
                    z,
                )
            )
    faces = []
    for ring in range(len(profile) - 1):
        for segment in range(segments):
            next_segment = (segment + 1) % segments
            a = ring * segments + segment
            b = ring * segments + next_segment
            c = (ring + 1) * segments + next_segment
            d = (ring + 1) * segments + segment
            faces.append((a, b, c, d))
    mesh = bpy.data.meshes.new(f"{name}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    parent_keep_world(obj, parent)
    return obj


def add_rounded_panel(
    name: str,
    location: tuple[float, float, float],
    dimensions: tuple[float, float, float],
    corner_radius: float,
    material: bpy.types.Material,
    parent: bpy.types.Object | None,
    corner_segments: int = 6,
) -> bpy.types.Object:
    """Create a shallow rounded-rectangle panel without bevel-depth clamping.

    Blender's regular bevel modifier clamps the visible corner radius to half
    the panel depth.  These face components are intentionally very shallow, so
    their rounded silhouette is built directly in the Y/Z plane instead.
    """
    depth, width, height = dimensions
    x, y, z = location
    radius = min(corner_radius, width * 0.5, height * 0.5)
    centers = (
        (y + width * 0.5 - radius, z + height * 0.5 - radius, 0.0),
        (y - width * 0.5 + radius, z + height * 0.5 - radius, math.pi * 0.5),
        (y - width * 0.5 + radius, z - height * 0.5 + radius, math.pi),
        (y + width * 0.5 - radius, z - height * 0.5 + radius, math.pi * 1.5),
    )
    outline = []
    for center_y, center_z, start_angle in centers:
        for step in range(corner_segments + 1):
            angle = start_angle + math.pi * 0.5 * step / corner_segments
            outline.append(
                (
                    center_y + radius * math.cos(angle),
                    center_z + radius * math.sin(angle),
                )
            )

    half_depth = depth * 0.5
    vertices = [(x + half_depth, py, pz) for py, pz in outline]
    vertices.extend((x - half_depth, py, pz) for py, pz in outline)
    count = len(outline)
    faces = [tuple(range(count)), tuple(reversed(range(count, count * 2)))]
    for index in range(count):
        next_index = (index + 1) % count
        faces.append((index, count + index, count + next_index, next_index))

    mesh = bpy.data.meshes.new(f"{name}_Rounded_Profile_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    parent_keep_world(obj, parent)
    return obj


def add_curve_mesh(
    name: str,
    points: list[tuple[float, float, float]],
    material: bpy.types.Material,
    bevel_depth: float,
    parent: bpy.types.Object | None,
    cyclic: bool = False,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name=f"{name}_Curve", type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 16
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 3
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    spline.use_cyclic_u = cyclic
    for handle, coordinate in zip(spline.bezier_points, points):
        handle.co = coordinate
        handle.handle_left_type = "AUTO"
        handle.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    select_only(obj)
    bpy.ops.object.convert(target="MESH")
    obj = bpy.context.object
    obj.name = name
    parent_keep_world(obj, parent)
    return obj


def add_torus(
    name: str,
    location: tuple[float, float, float],
    major_radius: float,
    minor_radius: float,
    material: bpy.types.Material,
    parent: bpy.types.Object | None,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_torus_add(
        major_segments=28,
        minor_segments=8,
        major_radius=major_radius,
        minor_radius=minor_radius,
        location=location,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    assign_material(obj, material)
    for polygon in obj.data.polygons:
        polygon.use_smooth = True
    parent_keep_world(obj, parent)
    return obj


def triangle_count(obj: bpy.types.Object) -> int:
    if obj.type != "MESH":
        return 0
    return sum(max(len(polygon.vertices) - 2, 0) for polygon in obj.data.polygons)


def prepare_source_robot(materials: dict[str, bpy.types.Material]) -> bpy.types.Object:
    source_root = bpy.data.objects.get("AGIBOT_X2_ULTRA_OFFICIAL")
    if source_root is None:
        raise RuntimeError("official X2 root object is missing")

    root = bpy.data.objects.new("Meshy_Detailed_Robot", None)
    bpy.context.collection.objects.link(root)
    source_root.parent = root

    original_meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    total_triangles = sum(triangle_count(obj) for obj in original_meshes)
    ratio = min(1.0, TARGET_BASE_TRIANGLES / max(total_triangles, 1))

    black_tokens = (
        "pelvis__visual",
        "waist_",
        "torso_link__visual",
        "hip_pitch_link__visual",
        "hip_roll_link__visual",
        "hip_yaw_link__visual",
        "shoulder_pitch_link__visual",
        "shoulder_roll_link__visual",
        "wrist_yaw_link__visual",
        "wrist_pitch_link__visual",
        "ankle_pitch_link__visual",
        "head_",
    )

    for obj in original_meshes:
        current_materials = {material.name for material in obj.data.materials if material}
        if "waist_yaw_link__visual" in obj.name:
            assign_material(obj, materials["rubber"])
        elif "Safety Yellow" in current_materials:
            assign_material(obj, materials["black"])
        elif any(token in obj.name for token in black_tokens):
            assign_material(obj, materials["black"])
        else:
            assign_material(obj, materials["white"])

        if triangle_count(obj) > 180:
            modifier = obj.modifiers.new(name="Web detail budget", type="DECIMATE")
            modifier.decimate_type = "COLLAPSE"
            modifier.ratio = ratio
            modifier.use_collapse_triangulate = True
            apply_modifier(obj, modifier)

        select_only(obj)
        bpy.ops.object.shade_smooth_by_angle()

    return root


# Height, rear X, front X, half-width.  Front is +X.  The reference has a
# nearly upright face and a swept occiput, not a symmetric rounded cuboid.
HEAD_SECTIONS = (
    (0.464, 0.001, 0.030, 0.020),
    (0.471, -0.025, 0.056, 0.041),
    (0.482, -0.048, 0.078, 0.055),
    (0.494, -0.064, 0.088, 0.065),
    (0.518, -0.080, 0.092, 0.074),
    (0.546, -0.088, 0.094, 0.077),
    (0.570, -0.087, 0.094, 0.077),
    (0.594, -0.078, 0.094, 0.074),
    (0.614, -0.058, 0.092, 0.069),
    (0.630, -0.033, 0.086, 0.057),
    (0.641, -0.006, 0.072, 0.041),
    (0.647, 0.015, 0.052, 0.022),
    (0.649, 0.031, 0.033, 0.001),
)
HEAD_FRONT_EXPONENT = 0.60
HEAD_REAR_EXPONENT = 0.92


def head_section(z: float) -> tuple[float, float, float]:
    """Monotone cubic loft: continuous slopes without overshoot at the chin."""
    rows = HEAD_SECTIONS
    z = max(rows[0][0], min(rows[-1][0], z))
    index = next((i for i in range(len(rows) - 1) if z <= rows[i + 1][0]), len(rows) - 2)
    h = rows[index + 1][0] - rows[index][0]
    t = (z - rows[index][0]) / h
    values = []
    for column in (1, 2, 3):
        slopes = [(b[column] - a[column]) / (b[0] - a[0]) for a, b in zip(rows, rows[1:])]
        tangents = [slopes[0]]
        for i in range(1, len(rows) - 1):
            left, right = slopes[i - 1], slopes[i]
            if left * right <= 0.0:
                tangents.append(0.0)
            else:
                h0, h1 = rows[i][0] - rows[i - 1][0], rows[i + 1][0] - rows[i][0]
                w0, w1 = 2 * h1 + h0, h1 + 2 * h0
                tangents.append((w0 + w1) / (w0 / left + w1 / right))
        tangents.append(slopes[-1])
        values.append((2*t**3 - 3*t**2 + 1)*rows[index][column]
                      + (t**3 - 2*t**2 + t)*h*tangents[index]
                      + (-2*t**3 + 3*t**2)*rows[index + 1][column]
                      + (t**3 - t**2)*h*tangents[index + 1])
    return tuple(values)


def head_front_x(y: float, z: float) -> float:
    rear, front, width = head_section(z)
    center = (rear + front) * 0.5
    sine = min(abs(y) / width, 1.0) ** (1.0 / HEAD_FRONT_EXPONENT)
    return center + (front - center) * max(0.0, 1.0 - sine*sine) ** (HEAD_FRONT_EXPONENT * 0.5)


def add_head_surface(name, vertices, faces, material, parent):
    mesh = bpy.data.meshes.new(f"{name}_Rounded_Profile_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    parent_keep_world(obj, parent)
    return obj


def add_head_housing(materials, parent):
    segments = 96
    heights = [a[0] + (b[0] - a[0]) * step / 6
               for a, b in zip(HEAD_SECTIONS, HEAD_SECTIONS[1:]) for step in range(6)]
    heights.append(HEAD_SECTIONS[-1][0])
    vertices = []
    for z in heights:
        rear, front, width = head_section(z)
        center = (rear + front) * 0.5
        for segment in range(segments):
            angle = math.tau * segment / segments
            cosine, sine = math.cos(angle), math.sin(angle)
            exponent = HEAD_FRONT_EXPONENT if cosine >= 0 else HEAD_REAR_EXPONENT
            x = center + (front - rear) * 0.5 * math.copysign(abs(cosine)**exponent, cosine)
            y = width * math.copysign(abs(sine)**exponent, sine)
            vertices.append((x, y, z))
    faces = []
    for row in range(len(heights) - 1):
        for segment in range(segments):
            a = row * segments + segment
            b = row * segments + (segment + 1) % segments
            faces.append((a, b, b + segments, a + segments))
    faces.append(tuple(reversed(range(segments))))
    faces.append(tuple((len(heights) - 1) * segments + i for i in range(segments)))
    shell = add_head_surface("Head_Housing_Rounded", vertices, faces, materials["black"], parent)
    shell["reference_shape"] = "D-profile: arched crown, rounded rear, tapered chin"

    # Small flush rounded-triangular side panels, projected onto the actual
    # shell rather than attached cylinders or floating planar ear pieces.
    outline = ((-.059, .544), (-.053, .568), (-.032, .594), (.000, .609),
               (.030, .603), (.054, .581), (.061, .549), (.056, .515),
               (.039, .500), (.010, .504), (-.027, .522))
    boundary = []
    for i, p1 in enumerate(outline):
        p0, p2, p3 = outline[i - 1], outline[(i + 1) % len(outline)], outline[(i + 2) % len(outline)]
        for step in range(8):
            t = step / 8
            boundary.append(tuple(0.5 * ((2*p1[k]) + (-p0[k] + p2[k])*t
                                  + (2*p0[k] - 5*p1[k] + 4*p2[k] - p3[k])*t*t
                                  + (-p0[k] + 3*p1[k] - 3*p2[k] + p3[k])*t**3) for k in (0, 1)))
    for sign, name in ((1, "Left"), (-1, "Right")):
        def project(x, z):
            rear, front, width = head_section(z)
            center = (rear + front) * 0.5
            exponent = HEAD_FRONT_EXPONENT if x >= center else HEAD_REAR_EXPONENT
            cosine = min(abs((x - center) / ((front - rear) * 0.5)), 1.0)**(1.0/exponent)
            y = width * max(0.0, 1.0 - cosine*cosine)**(exponent*0.5)
            return (x, sign*(y + 0.00065), z)
        points = [project(.003, .553)]
        for ring in range(1, 9):
            r = ring / 8
            points.extend(project(.003 + (x - .003)*r, .553 + (z - .553)*r) for x, z in boundary)
        count = len(boundary)
        panels = [(0, 1 + i, 1 + (i + 1) % count) for i in range(count)]
        for ring in range(7):
            for i in range(count):
                a, b = 1 + ring*count + i, 1 + ring*count + (i + 1) % count
                panels.append((a, a + count, b + count, b))
        if sign < 0:
            panels = [tuple(reversed(face)) for face in panels]
        add_head_surface(f"Head_Side_Inset_{name}", points, panels, materials["rubber"], parent)


def add_curved_face_panel(name, center_y, center_z, width, height, radius, lift, material, parent):
    """Tessellate a rounded rectangular patch that follows the curved face."""
    outline = []
    for cy, cz, angle in ((width/2-radius, height/2-radius, 0),
                          (-width/2+radius, height/2-radius, math.pi/2),
                          (-width/2+radius, -height/2+radius, math.pi),
                          (width/2-radius, -height/2+radius, 3*math.pi/2)):
        # Exclude each arc endpoint: capsule corners can share a center, and
        # duplicate endpoints otherwise create zero-area faces after solidify.
        for step in range(12):
            a = angle + math.pi/2*step/12
            outline.append((cy + radius*math.cos(a), cz + radius*math.sin(a)))
    vertices = [(head_front_x(center_y, center_z) + lift, center_y, center_z)]
    radial_rings = 16
    for ring in range(1, radial_rings + 1):
        r = ring/radial_rings
        for dy, dz in outline:
            y, z = center_y + dy*r, center_z + dz*r
            vertices.append((head_front_x(y, z) + lift, y, z))
    count = len(outline)
    faces = [(0, 1+i, 1+(i+1) % count) for i in range(count)]
    for ring in range(radial_rings - 1):
        for i in range(count):
            a, b = 1+ring*count+i, 1+ring*count+(i+1) % count
            faces.append((a, a+count, b+count, b))
    panel = add_head_surface(name, vertices, faces, material, parent)
    thickness = panel.modifiers.new("Inset panel thickness", "SOLIDIFY")
    thickness.thickness = 0.0008
    thickness.offset = -1.0
    apply_modifier(panel, thickness)
    return panel


def add_head_details(materials: dict[str, bpy.types.Material]) -> None:
    parent = bpy.data.objects.get("head_pitch_link")
    # Keep the rest of the robot's palette unchanged.  The head reference has
    # a satin molded shell, not the highly reflective metal of the mechanisms.
    materials = dict(materials)
    materials["black"] = make_material("Meshy Head Satin Graphite", {
        "Base Color": (.007, .009, .013, 1.0), "Metallic": .20,
        "Roughness": .34, "Specular IOR Level": .30,
        "Coat Weight": .15, "Coat Roughness": .20,
    })
    materials["rubber"] = make_material("Meshy Head Matte Inset", {
        "Base Color": (.0015, .0018, .0025, 1.0), "Metallic": 0.0,
        "Roughness": .78, "Specular IOR Level": .12,
    })
    # Replace the outer shell in this derived scene; preserve the articulated
    # head/neck transforms and leave the original source .blend untouched.
    for name in ("head_pitch_link__visual", "rgb_head_center__visual", "rgb_head_rear__visual",
                 "rgbd_head_front__visual", "stereo_head_front__visual"):
        old = bpy.data.objects.get(name)
        if old is not None:
            bpy.data.objects.remove(old, do_unlink=True)
    add_head_housing(materials, parent)
    add_curved_face_panel("Face_Screen", 0.0, 0.553, .112, .088, .020, .0028, materials["glass"], parent)
    for name, y in (("Eye_Left", .026), ("Eye_Right", -.026)):
        add_curved_face_panel(name, y, .561, .020, .038, .010, .0043, materials["eye"], parent)
    add_curved_face_panel("Top_Sensor_Brow", 0.0, .613, .104, .026, .011, .0020, materials["rubber"], parent)
    for name, y, radius in (("Top_Camera_Left", .034, .0075),
                            ("Top_Camera_Center", 0.0, .004),
                            ("Top_Camera_Right", -.034, .0075)):
        add_uv_sphere(name, (head_front_x(y, .613) + .002, y, .613),
                      (.0030, radius, radius), materials["glass"], parent)
    add_curved_face_panel("Face_Lower_Groove", 0.0, .500, .062, .010, .005, .0011, materials["rubber"], parent)


def add_chest_details(materials: dict[str, bpy.types.Material]) -> None:
    parent = bpy.data.objects.get("torso_link")
    chest_points = [
        (0.119, -0.105, 0.342),
        (0.126, -0.099, 0.386),
        (0.132, -0.062, 0.424),
        (0.135, 0.0, 0.440),
        (0.132, 0.062, 0.424),
        (0.126, 0.099, 0.386),
        (0.119, 0.105, 0.342),
    ]
    add_curve_mesh("Chest_Arc", chest_points, materials["blue"], 0.007, parent)
    add_rounded_box(
        "Chest_Sensor_Housing",
        (0.132, 0.0, 0.342),
        (0.030, 0.055, 0.116),
        materials["black"],
        0.010,
        parent,
    )
    for name, z, material in (
        ("Chest_Sensor_Upper", 0.378, materials["glass"]),
        ("Chest_Sensor_Middle", 0.342, materials["eye"]),
        ("Chest_Sensor_Lower", 0.306, materials["glass"]),
    ):
        add_cylinder(name, (0.151, 0.0, z), 0.010, 0.009, material, parent)

    # Four short bars recreate the small geometric chest emblem.
    logo_specs = (
        ("Chest_Logo_1", 0.012, 0.466, math.radians(45)),
        ("Chest_Logo_2", -0.012, 0.466, math.radians(-45)),
        ("Chest_Logo_3", 0.012, 0.447, math.radians(-45)),
        ("Chest_Logo_4", -0.012, 0.447, math.radians(45)),
    )
    for name, y, z, angle in logo_specs:
        add_rounded_box(
            name,
            (0.137, y, z),
            (0.006, 0.025, 0.005),
            materials["eye"],
            0.002,
            parent,
            rotation=(angle, 0.0, 0.0),
        )


def add_limb_details(materials: dict[str, bpy.types.Material]) -> None:
    for side, y in (("Left", 0.276), ("Right", -0.276)):
        parent = bpy.data.objects.get(f"{side.lower()}_wrist_roll_link")
        add_torus(
            f"{side}_Wrist_Mechanical_Ring",
            (0.004, y, 0.032),
            0.030,
            0.006,
            materials["metal"],
            parent,
        )


def add_waist_details(materials: dict[str, bpy.types.Material]) -> None:
    parent = bpy.data.objects.get("waist_yaw_link")
    add_profiled_sleeve(
        "Waist_Sleeve_Core",
        (
            (0.058, 0.073),
            (0.064, 0.076),
            (0.071, 0.074),
            (0.078, 0.076),
            (0.085, 0.074),
            (0.092, 0.076),
            (0.099, 0.074),
            (0.106, 0.075),
            (0.113, 0.0735),
            (0.120, 0.075),
            (0.127, 0.074),
            (0.134, 0.076),
            (0.141, 0.078),
            (0.149, 0.082),
            (0.157, 0.086),
        ),
        -0.004,
        1.02,
        materials["rubber"],
        parent,
        segments=64,
    )

    for side, y in (("Left", 0.137), ("Right", -0.137)):
        knee_parent = bpy.data.objects.get(f"{side.lower()}_knee_link")
        add_rounded_box(
            f"{side}_Shin_Inset",
            (0.055, y, -0.445),
            (0.010, 0.032, 0.085),
            materials["black"],
            0.008,
            knee_parent,
        )
        add_rounded_box(
            f"{side}_Knee_Indicator",
            (0.062, y, -0.283),
            (0.008, 0.026, 0.010),
            materials["eye"],
            0.004,
            knee_parent,
        )


def add_foot_pads(materials: dict[str, bpy.types.Material]) -> None:
    for side, center_y in (("Left", 0.137), ("Right", -0.137)):
        parent = bpy.data.objects.get(f"{side.lower()}_ankle_roll_link")
        points = [
            (-0.055, center_y - 0.045, -0.675),
            (0.040, center_y - 0.066, -0.676),
            (0.145, center_y - 0.058, -0.676),
            (0.195, center_y, -0.676),
            (0.145, center_y + 0.058, -0.676),
            (0.040, center_y + 0.066, -0.676),
            (-0.055, center_y + 0.045, -0.675),
        ]
        add_curve_mesh(
            f"{side}_Foot_Pad",
            points,
            materials["orange"],
            0.018,
            parent,
        )


def descendant_objects(root: bpy.types.Object) -> list[bpy.types.Object]:
    result = [root]
    queue = list(root.children)
    while queue:
        obj = queue.pop(0)
        result.append(obj)
        queue.extend(obj.children)
    return result


def export_glb(root: bpy.types.Object, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for obj in descendant_objects(root):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_yup=True,
        export_apply=True,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_materials="EXPORT",
        export_extras=True,
        export_draco_mesh_compression_enable=True,
        export_draco_mesh_compression_level=6,
    )


def read_glb_json(path: Path) -> dict:
    data = path.read_bytes()
    magic, version, total_length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or total_length != len(data):
        raise RuntimeError("GLB export validation failed")
    json_length, json_type = struct.unpack_from("<I4s", data, 12)
    if json_type != b"JSON":
        raise RuntimeError("GLB JSON chunk is missing")
    return json.loads(data[20 : 20 + json_length].decode("utf-8").rstrip(" \x00"))


def glb_triangle_count(document: dict) -> int:
    total = 0
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            accessor_index = primitive.get("indices")
            if accessor_index is None:
                accessor_index = primitive["attributes"]["POSITION"]
            total += document["accessors"][accessor_index]["count"] // 3
    return total


def write_manifest(glb: Path, output: Path) -> None:
    document = read_glb_json(glb)
    manifest = {
        "modelName": "Agibot X2 Meshy Detailed",
        "sourceReference": "Meshy humanoid-robot-base",
        "sourceModelId": "786514fd-f310-4e7d-bac0-ebe32717de13",
        "rigged": False,
        "triangleCount": glb_triangle_count(document),
        "nodeCount": len(document.get("nodes", [])),
        "meshCount": len(document.get("meshes", [])),
        "materialNames": sorted(material.get("name", "") for material in document.get("materials", [])),
        "webReady": True,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n")


def write_preview(glb: Path, output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    relative_model = Path(os.path.relpath(glb, output.parent)).as_posix()
    html = f"""<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Agibot X2 · Meshy Detailed</title>
    <script type="module" src="https://ajax.googleapis.com/ajax/libs/model-viewer/4.1.0/model-viewer.min.js"></script>
    <style>
      html, body {{ margin: 0; width: 100%; height: 100%; background: #070a10; color: #eaf2ff; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; }}
      model-viewer {{ width: 100%; height: 100%; background: radial-gradient(circle at 55% 42%, #1b2c48 0%, #0b111b 44%, #05070b 100%); }}
      .label {{ position: fixed; left: 26px; top: 22px; z-index: 2; letter-spacing: .18em; font-size: 12px; color: #9fd3ff; }}
      .hint {{ position: fixed; left: 26px; bottom: 22px; z-index: 2; font-size: 12px; color: #8290a6; }}
    </style>
  </head>
  <body>
    <div class="label">AGIBOT X2 · MESHY DETAILED</div>
    <div class="hint">DRAG TO ROTATE · SCROLL TO ZOOM</div>
    <model-viewer
      src="{relative_model}"
      alt="Agibot X2 Meshy detailed robot"
      camera-controls
      auto-rotate
      rotation-per-second="14deg"
      camera-orbit="28deg 78deg 2.55m"
      min-camera-orbit="auto auto 1.35m"
      max-camera-orbit="auto auto 5m"
      shadow-intensity="1.15"
      shadow-softness="0.72"
      exposure="1.05"
      tone-mapping="agx"
    ></model-viewer>
  </body>
</html>
"""
    output.write_text(html)


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()


def add_area_light(
    name: str,
    location: tuple[float, float, float],
    target: tuple[float, float, float],
    energy: float,
    size: float,
    color: tuple[float, float, float],
) -> bpy.types.Object:
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    look_at(obj, Vector(target))
    return obj


def add_point_light(
    name: str,
    location: tuple[float, float, float],
    energy: float,
    color: tuple[float, float, float],
    radius: float,
) -> None:
    data = bpy.data.lights.new(name=name, type="POINT")
    data.energy = energy
    data.color = color
    data.shadow_soft_size = radius
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location


def create_cyclorama(material: bpy.types.Material) -> bpy.types.Object:
    profile = [
        (-1.55, 2.7),
        (-1.55, 0.3),
        (-1.48, -0.28),
        (-1.25, -0.57),
        (-0.88, -0.69),
        (4.0, -0.69),
    ]
    vertices = []
    for x, z in profile:
        vertices.extend([(x, -5.0, z), (x, 5.0, z)])
    faces = []
    for index in range(len(profile) - 1):
        base = index * 2
        faces.append((base, base + 1, base + 3, base + 2))
    mesh = bpy.data.meshes.new("Meshy Studio Cyclorama Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj = bpy.data.objects.new("Meshy Studio Cyclorama", mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    return obj


def configure_compositor() -> None:
    scene = bpy.context.scene
    group = bpy.data.node_groups.get("Meshy Studio Compositor")
    if group is not None:
        bpy.data.node_groups.remove(group)
    group = bpy.data.node_groups.new("Meshy Studio Compositor", "CompositorNodeTree")
    scene.compositing_node_group = group
    group.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    layers = group.nodes.new("CompositorNodeRLayers")
    glare = group.nodes.new("CompositorNodeGlare")
    glare.inputs["Type"].default_value = "Fog Glow"
    glare.inputs["Quality"].default_value = "High"
    glare.inputs["Threshold"].default_value = 0.70
    glare.inputs["Smoothness"].default_value = 0.40
    glare.inputs["Strength"].default_value = 0.30
    glare.inputs["Size"].default_value = 0.38
    output = group.nodes.new("NodeGroupOutput")
    group.links.new(layers.outputs["Image"], glare.inputs["Image"])
    group.links.new(glare.outputs["Image"], output.inputs["Image"])


def configure_studio(materials: dict[str, bpy.types.Material], resolution: int, render_path: Path) -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = resolution
    scene.render.resolution_y = resolution
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    scene.render.image_settings.compression = 18
    scene.render.filepath = str(render_path)
    scene.render.film_transparent = False
    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.10
    scene.view_settings.gamma = 1.0

    if scene.world is None:
        scene.world = bpy.data.worlds.new("Meshy Studio World")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (0.001, 0.002, 0.005, 1.0)
        background.inputs["Strength"].default_value = 0.04

    backdrop = make_material(
        "Meshy Studio Backdrop",
        {
            "Base Color": (0.00018, 0.00028, 0.00060, 1.0),
            "Metallic": 0.02,
            "Roughness": 0.76,
            "Specular IOR Level": 0.18,
        },
    )
    create_cyclorama(backdrop)

    camera_data = bpy.data.cameras.new("Meshy Hero Camera")
    camera = bpy.data.objects.new("Meshy Hero Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (3.1, -2.2, 0.92)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 1.62
    look_at(camera, Vector((0.0, 0.0, -0.015)))
    scene.camera = camera

    add_area_light("Meshy Key Light", (2.9, -3.5, 3.7), (0.0, 0.0, 0.08), 560.0, 2.5, (1.0, 0.88, 0.80))
    add_area_light("Meshy Fill Light", (2.0, 3.0, 1.5), (0.0, 0.0, 0.05), 170.0, 2.3, (0.42, 0.66, 1.0))
    add_area_light("Meshy Rim Light", (-1.4, 2.8, 2.5), (0.0, 0.0, 0.20), 620.0, 2.0, (0.08, 0.24, 1.0))
    add_area_light("Meshy Top Light", (0.3, -0.3, 4.0), (0.0, 0.0, 0.0), 280.0, 2.0, (0.62, 0.78, 1.0))
    add_point_light("Meshy Face Glow", (0.18, 0.0, 0.57), 20.0, (0.20, 0.56, 1.0), 0.20)
    add_point_light("Meshy Chest Glow", (0.25, 0.0, 0.38), 60.0, (0.02, 0.15, 1.0), 0.34)
    configure_compositor()


def render_structure_checks(hero_path: Path) -> dict[str, Path]:
    """Render neutral orthographic checks without changing the saved hero camera."""
    scene = bpy.context.scene
    camera = scene.camera
    target = Vector((0.0, 0.0, -0.015))
    original_location = camera.location.copy()
    original_rotation = camera.rotation_euler.copy()
    original_filepath = scene.render.filepath
    views = {
        "front": (3.1, 0.0, 0.78),
        "side": (0.0, -3.1, 0.78),
        # Stay inside the cyclorama's rear wall at X=-1.55 so it cannot occlude the robot.
        "back": (-1.25, 0.0, 0.78),
    }
    outputs: dict[str, Path] = {}
    for name, location in views.items():
        output = hero_path.with_name(f"{hero_path.stem}-{name}{hero_path.suffix}")
        camera.location = location
        look_at(camera, target)
        scene.render.filepath = str(output)
        bpy.ops.render.render(write_still=True)
        outputs[name] = output
    camera.location = original_location
    camera.rotation_euler = original_rotation
    scene.render.filepath = original_filepath
    return outputs


def main() -> None:
    args = parse_args()
    for path in (
        args.output_blend,
        args.output_glb,
        args.output_render,
        args.output_manifest,
        args.output_preview,
    ):
        path.parent.mkdir(parents=True, exist_ok=True)

    if Path(bpy.data.filepath).resolve() != args.source.resolve():
        bpy.ops.wm.open_mainfile(filepath=str(args.source))

    materials = build_materials()
    root = prepare_source_robot(materials)
    add_head_details(materials)
    add_chest_details(materials)
    add_limb_details(materials)
    add_waist_details(materials)
    add_foot_pads(materials)

    export_glb(root, args.output_glb)
    write_manifest(args.output_glb, args.output_manifest)
    write_preview(args.output_glb, args.output_preview)

    configure_studio(materials, args.resolution, args.output_render)
    bpy.ops.wm.save_as_mainfile(filepath=str(args.output_blend))
    bpy.ops.render.render(write_still=True)
    structure_renders = render_structure_checks(args.output_render)

    print(f"BLEND_OUTPUT={args.output_blend}")
    print(f"GLB_OUTPUT={args.output_glb}")
    print(f"RENDER_OUTPUT={args.output_render}")
    for view_name, view_path in structure_renders.items():
        print(f"{view_name.upper()}_RENDER_OUTPUT={view_path}")
    print(f"MANIFEST_OUTPUT={args.output_manifest}")
    print(f"PREVIEW_OUTPUT={args.output_preview}")


if __name__ == "__main__":
    main()

"""Create a Meshy-inspired studio render from the editable Agibot X2 scene.

The source .blend is never overwritten. The script produces a separate editable
studio scene and a square PNG intended for the Agentech website.
"""

from __future__ import annotations

import math
import os
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
SOURCE_BLEND = Path(__file__).with_name("agibot-x2-official.blend")
OUTPUT_DIR = ROOT / "output"
OUTPUT_BLEND = Path(__file__).with_name("agibot-x2-meshy-studio.blend")
OUTPUT_PNG = OUTPUT_DIR / "agibot-x2-meshy-studio.png"

TEST_RENDER = os.environ.get("AGENTECH_RENDER_TEST") == "1"
RESOLUTION = 720 if TEST_RENDER else 1600


def set_principled(material: bpy.types.Material, **values) -> None:
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    if shader is None:
        return
    for name, value in values.items():
        socket = shader.inputs.get(name)
        if socket is not None:
            socket.default_value = value


def make_material(name: str, **values) -> bpy.types.Material:
    material = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    set_principled(material, **values)
    return material


def assign_material(obj: bpy.types.Object, material: bpy.types.Material) -> None:
    if obj.data.materials:
        obj.data.materials[0] = material
    else:
        obj.data.materials.append(material)


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


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
) -> bpy.types.Object:
    data = bpy.data.lights.new(name=name, type="POINT")
    data.energy = energy
    data.color = color
    data.shadow_soft_size = radius
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    return obj


def add_rounded_box(
    name: str,
    location: tuple[float, float, float],
    scale: tuple[float, float, float],
    material: bpy.types.Material,
    bevel: float,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    modifier = obj.modifiers.new(name="Soft machined edges", type="BEVEL")
    modifier.width = bevel
    modifier.segments = 5
    modifier.limit_method = "ANGLE"
    assign_material(obj, material)
    return obj


def add_curve_strip(
    name: str,
    points: list[tuple[float, float, float]],
    material: bpy.types.Material,
    bevel_depth: float,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name=name, type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 12
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 5
    curve.resolution_u = 24
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for control, coordinate in zip(spline.bezier_points, points):
        control.co = coordinate
        control.handle_left_type = "AUTO"
        control.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    return obj


def create_cyclorama(material: bpy.types.Material) -> bpy.types.Object:
    # Cross-section runs from the wall behind the robot into the studio floor.
    profile = [
        (-1.55, 2.8),
        (-1.55, 1.2),
        (-1.52, 0.3),
        (-1.48, -0.25),
        (-1.30, -0.52),
        (-1.05, -0.66),
        (-0.72, -0.686),
        (0.1, -0.69),
        (4.4, -0.69),
    ]
    half_width = 5.5
    vertices = []
    for x, z in profile:
        vertices.extend([(x, -half_width, z), (x, half_width, z)])
    faces = []
    for index in range(len(profile) - 1):
        base = index * 2
        faces.append((base, base + 1, base + 3, base + 2))
    mesh = bpy.data.meshes.new("Studio cyclorama mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    for polygon in mesh.polygons:
        polygon.use_smooth = True
    obj = bpy.data.objects.new("Studio cyclorama", mesh)
    bpy.context.collection.objects.link(obj)
    assign_material(obj, material)
    bevel = obj.modifiers.new(name="Backdrop softness", type="BEVEL")
    bevel.width = 0.08
    bevel.segments = 4
    return obj


def remove_previous_studio_objects() -> None:
    prefixes = (
        "Studio ",
        "Hero Camera",
        "Key Light",
        "Fill Light",
        "Rim Light",
        "Top Light",
        "Chest Glow",
        "Eye Glow",
        "Chest Sensor",
        "Chest Arc",
    )
    for obj in list(bpy.data.objects):
        if obj.name.startswith(prefixes):
            bpy.data.objects.remove(obj, do_unlink=True)


def configure_original_materials() -> None:
    white = bpy.data.materials.get("Armor White")
    black = bpy.data.materials.get("Carbon Black")
    yellow = bpy.data.materials.get("Safety Yellow")
    if white:
        set_principled(
            white,
            **{
                "Base Color": (0.58, 0.64, 0.72, 1.0),
                "Metallic": 0.08,
                "Roughness": 0.21,
                "Specular IOR Level": 0.44,
                "Coat Weight": 0.33,
                "Coat Roughness": 0.10,
            },
        )
    if black:
        set_principled(
            black,
            **{
                "Base Color": (0.007, 0.010, 0.016, 1.0),
                "Metallic": 0.38,
                "Roughness": 0.24,
                "Specular IOR Level": 0.38,
                "Coat Weight": 0.24,
                "Coat Roughness": 0.14,
            },
        )
    if yellow:
        # The yellow safety bumpers are useful on the real robot, but the Meshy
        # reference uses an all-black/white studio palette.
        set_principled(
            yellow,
            **{
                "Base Color": (0.006, 0.008, 0.013, 1.0),
                "Metallic": 0.48,
                "Roughness": 0.26,
                "Coat Weight": 0.20,
                "Coat Roughness": 0.16,
            },
        )

    # Match the reference model's large black shoulder and upper-leg armor
    # blocks while keeping forearms, hands and lower legs ceramic white.
    if black:
        black_part_tokens = (
            "hip_roll_link__visual",
            "hip_yaw_link__visual",
            "shoulder_roll_link__visual",
        )
        for obj in bpy.context.scene.objects:
            if obj.type == "MESH" and any(token in obj.name for token in black_part_tokens):
                assign_material(obj, black)

    # The imported source deliberately preserves raw topology. Smooth by angle
    # gives the studio render the polished molded-shell finish of the reference
    # while retaining mechanical seams and hard panel breaks.
    for obj in bpy.context.scene.objects:
        if obj.type != "MESH":
            continue
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.shade_smooth_by_angle()


def add_robot_accents() -> None:
    face_glass = make_material(
        "Studio Face Glass",
        **{
            "Base Color": (0.0003, 0.0006, 0.0018, 1.0),
            "Metallic": 0.0,
            "Roughness": 0.30,
            "Specular IOR Level": 0.22,
            "Coat Weight": 0.10,
            "Coat Roughness": 0.16,
        },
    )
    eye = make_material(
        "Studio Eye Emission",
        **{
            "Base Color": (0.45, 0.75, 1.0, 1.0),
            "Roughness": 0.12,
            "Emission Color": (0.45, 0.78, 1.0, 1.0),
            "Emission Strength": 14.0,
        },
    )
    blue = make_material(
        "Studio Blue Emission",
        **{
            "Base Color": (0.002, 0.025, 0.30, 1.0),
            "Metallic": 0.10,
            "Roughness": 0.18,
            "Emission Color": (0.001, 0.018, 1.0, 1.0),
            "Emission Strength": 2.8,
        },
    )
    sensor = make_material(
        "Studio Sensor Black",
        **{
            "Base Color": (0.003, 0.006, 0.011, 1.0),
            "Metallic": 0.50,
            "Roughness": 0.16,
            "Coat Weight": 0.45,
            "Coat Roughness": 0.08,
        },
    )

    # Front direction is +X in the imported robot scene.
    add_rounded_box("Studio face panel", (0.091, 0.0, 0.560), (0.004, 0.054, 0.050), face_glass, 0.012)
    add_rounded_box("Eye Glow L", (0.099, 0.024, 0.568), (0.004, 0.009, 0.019), eye, 0.007)
    add_rounded_box("Eye Glow R", (0.099, -0.024, 0.568), (0.004, 0.009, 0.019), eye, 0.007)

    # Glowing inverted-U chest signature and a small center sensor stack.
    chest_points = [
        (0.121, -0.102, 0.344),
        (0.126, -0.094, 0.385),
        (0.130, -0.060, 0.417),
        (0.132, 0.000, 0.432),
        (0.130, 0.060, 0.417),
        (0.126, 0.094, 0.385),
        (0.121, 0.102, 0.344),
    ]
    add_curve_strip("Chest Arc Glow", chest_points, blue, 0.008)
    add_rounded_box("Chest Sensor Housing", (0.127, 0.0, 0.342), (0.013, 0.026, 0.053), sensor, 0.009)
    for index, z in enumerate((0.370, 0.342, 0.314), start=1):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, location=(0.142, 0.0, z), scale=(0.006, 0.009, 0.009))
        lens = bpy.context.object
        lens.name = f"Chest Sensor Lens {index}"
        assign_material(lens, eye if index == 2 else face_glass)

    # Local blue sources make the emissive geometry illuminate nearby armor.
    add_point_light("Eye Glow Light", (0.16, 0.0, 0.58), 18.0, (0.22, 0.55, 1.0), 0.20)
    add_point_light("Chest Glow Light", (0.25, 0.0, 0.38), 58.0, (0.025, 0.12, 1.0), 0.35)


def configure_compositor() -> None:
    """Add a restrained fog glow, matching the Meshy viewer's emissive bloom."""
    scene = bpy.context.scene
    node_group = bpy.data.node_groups.get("Studio Compositor")
    if node_group is not None:
        bpy.data.node_groups.remove(node_group)
    node_group = bpy.data.node_groups.new("Studio Compositor", "CompositorNodeTree")
    scene.compositing_node_group = node_group
    node_group.interface.new_socket(name="Image", in_out="OUTPUT", socket_type="NodeSocketColor")
    render_layers = node_group.nodes.new("CompositorNodeRLayers")
    render_layers.location = (-260, 0)
    glare = node_group.nodes.new("CompositorNodeGlare")
    glare.location = (0, 0)
    glare.inputs["Type"].default_value = "Fog Glow"
    glare.inputs["Quality"].default_value = "High"
    glare.inputs["Threshold"].default_value = 0.72
    glare.inputs["Smoothness"].default_value = 0.42
    glare.inputs["Strength"].default_value = 0.34
    glare.inputs["Size"].default_value = 0.42
    output = node_group.nodes.new("NodeGroupOutput")
    output.location = (270, 0)
    node_group.links.new(render_layers.outputs["Image"], glare.inputs["Image"])
    node_group.links.new(glare.outputs["Image"], output.inputs["Image"])


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = RESOLUTION
    scene.render.resolution_y = RESOLUTION
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.filepath = str(OUTPUT_PNG)
    scene.render.image_settings.color_depth = "8"

    scene.render.resolution_percentage = 100
    scene.render.use_file_extension = True
    scene.render.image_settings.compression = 18

    scene.view_settings.look = "None"
    scene.view_settings.exposure = 0.08
    scene.view_settings.gamma = 1.0

    # Stable EEVEE settings available in Blender 5.2.
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.image_settings.color_mode = "RGB"
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 96

    if scene.world is None:
        scene.world = bpy.data.worlds.new("Studio World")
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    if background:
        background.inputs["Color"].default_value = (0.0015, 0.0025, 0.0055, 1.0)
        background.inputs["Strength"].default_value = 0.035
    configure_compositor()


def build_scene() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    remove_previous_studio_objects()
    configure_original_materials()

    backdrop = make_material(
        "Studio Backdrop",
        **{
            "Base Color": (0.00018, 0.00028, 0.00055, 1.0),
            "Metallic": 0.02,
            "Roughness": 0.72,
            "Specular IOR Level": 0.22,
        },
    )
    create_cyclorama(backdrop)
    add_robot_accents()

    camera_data = bpy.data.cameras.new("Hero Camera")
    camera = bpy.data.objects.new("Hero Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (3.15, -2.25, 0.92)
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = 1.62
    camera.data.lens = 62
    look_at(camera, Vector((0.0, 0.0, -0.015)))
    bpy.context.scene.camera = camera

    add_area_light("Key Light", (2.8, -3.6, 3.8), (0.0, 0.0, 0.05), 540.0, 2.5, (1.0, 0.87, 0.78))
    add_area_light("Fill Light", (2.1, 3.0, 1.4), (0.0, 0.0, 0.05), 160.0, 2.3, (0.45, 0.68, 1.0))
    add_area_light("Rim Light", (-1.4, 2.7, 2.5), (0.0, 0.0, 0.20), 560.0, 2.0, (0.10, 0.26, 1.0))
    add_area_light("Top Light", (0.3, -0.4, 4.1), (0.0, 0.0, 0.0), 260.0, 2.0, (0.62, 0.76, 1.0))

    # Small front strip creates clean product highlights on the white shells.
    add_area_light("Studio Front Strip", (3.5, 0.2, 0.8), (0.0, 0.0, 0.1), 150.0, 1.0, (0.73, 0.84, 1.0))


def main() -> None:
    if bpy.data.filepath != str(SOURCE_BLEND):
        bpy.ops.wm.open_mainfile(filepath=str(SOURCE_BLEND))
    configure_scene()
    build_scene()
    if not TEST_RENDER:
        bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    bpy.ops.render.render(write_still=True)
    print(f"RENDER_OUTPUT={OUTPUT_PNG}")
    if not TEST_RENDER:
        print(f"BLEND_OUTPUT={OUTPUT_BLEND}")


if __name__ == "__main__":
    main()

"""Create a Linear-inspired isometric stack study in Blender.

The output is an original Agentech visual study: a set of editable rounded
plates, an orthographic camera, and a restrained dark technical palette.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = PROJECT_ROOT / "output" / "blender-isometric-stack-study"
BLEND_PATH = OUTPUT_DIR / "agentech-isometric-stack-study.blend"
RENDER_PATH = OUTPUT_DIR / "agentech-isometric-stack-study.png"

BACKGROUND = (0.0055, 0.0064, 0.0075, 1.0)
PLATE_COLOR = (0.0075, 0.0090, 0.0110, 1.0)
EDGE_COLOR = (0.245, 0.270, 0.305, 1.0)
ACCENT_COLOR = (0.125, 0.150, 0.180, 1.0)


def reset_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    for datablocks in (
        bpy.data.curves,
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            datablocks.remove(datablock)


def create_material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    material = bpy.data.materials.new(name=name)
    material.diffuse_color = color
    material.metallic = 0.0
    material.roughness = 0.78
    return material


def rounded_rectangle_points(
    width: float,
    height: float,
    radius: float,
    segments_per_corner: int = 8,
) -> list[tuple[float, float]]:
    radius = min(radius, width * 0.5, height * 0.5)
    corners = (
        (width * 0.5 - radius, radius, -90.0, 0.0),
        (width * 0.5 - radius, height - radius, 0.0, 90.0),
        (-width * 0.5 + radius, height - radius, 90.0, 180.0),
        (-width * 0.5 + radius, radius, 180.0, 270.0),
    )
    points: list[tuple[float, float]] = []
    for cx, cz, start, end in corners:
        for index in range(segments_per_corner + 1):
            angle = math.radians(start + (end - start) * index / segments_per_corner)
            points.append((cx + radius * math.cos(angle), cz + radius * math.sin(angle)))
    return points


def create_plate_mesh(
    index: int,
    width: float,
    height: float,
    thickness: float,
    y_position: float,
    plate_material: bpy.types.Material,
) -> tuple[bpy.types.Object, list[tuple[float, float]]]:
    perimeter = rounded_rectangle_points(width, height, radius=0.105)
    half_depth = thickness * 0.5

    vertices = [(x, -half_depth, z) for x, z in perimeter]
    vertices.extend((x, half_depth, z) for x, z in perimeter)
    count = len(perimeter)

    faces: list[list[int]] = []
    faces.append(list(reversed(range(count))))
    faces.append(list(range(count, count * 2)))
    for point_index in range(count):
        next_index = (point_index + 1) % count
        faces.append(
            [
                point_index,
                next_index,
                count + next_index,
                count + point_index,
            ]
        )

    mesh = bpy.data.meshes.new(f"StackPlate_{index:02d}_Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()

    plate = bpy.data.objects.new(f"StackPlate_{index:02d}", mesh)
    bpy.context.collection.objects.link(plate)
    plate.location.y = y_position
    plate.data.materials.append(plate_material)
    return plate, perimeter


def create_polyline(
    name: str,
    coordinates: list[tuple[float, float, float]],
    material: bpy.types.Material,
    line_radius: float,
    cyclic: bool = False,
) -> bpy.types.Object:
    curve_data = bpy.data.curves.new(name=f"{name}_Curve", type="CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 1
    curve_data.bevel_depth = line_radius
    curve_data.bevel_resolution = 2
    curve_data.resolution_u = 1

    spline = curve_data.splines.new(type="POLY")
    spline.points.add(len(coordinates) - 1)
    for point, coordinate in zip(spline.points, coordinates):
        point.co = (*coordinate, 1.0)
    spline.use_cyclic_u = cyclic

    curve_object = bpy.data.objects.new(name, curve_data)
    bpy.context.collection.objects.link(curve_object)
    curve_data.materials.append(material)
    return curve_object


def add_plate_outlines(
    index: int,
    perimeter: list[tuple[float, float]],
    y_position: float,
    thickness: float,
    edge_material: bpy.types.Material,
    accent_material: bpy.types.Material,
) -> None:
    half_depth = thickness * 0.5
    front = [(x, y_position - half_depth - 0.002, z) for x, z in perimeter]
    back = [(x, y_position + half_depth + 0.002, z) for x, z in perimeter]

    create_polyline(
        f"Plate_{index:02d}_FrontOutline",
        front,
        edge_material,
        line_radius=0.0065,
        cyclic=True,
    )
    create_polyline(
        f"Plate_{index:02d}_BackOutline",
        back,
        accent_material,
        line_radius=0.0045,
        cyclic=True,
    )

    # Four quiet connector strokes reveal the plate thickness without adding
    # bright shading or breaking the vector-like appearance.
    points_per_corner = 9
    for corner_index in range(4):
        point_index = corner_index * points_per_corner
        x, z = perimeter[point_index]
        create_polyline(
            f"Plate_{index:02d}_Depth_{corner_index}",
            [
                (x, y_position - half_depth - 0.002, z),
                (x, y_position + half_depth + 0.002, z),
            ],
            accent_material,
            line_radius=0.0045,
        )


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_camera() -> bpy.types.Object:
    camera_data = bpy.data.cameras.new("Isometric_Orthographic_Camera")
    camera = bpy.data.objects.new("Isometric_Orthographic_Camera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (8.4, -10.2, 7.4)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 10.8
    camera_data.lens = 50
    look_at(camera, Vector((0.10, 0.20, 2.45)))
    bpy.context.scene.camera = camera
    return camera


def configure_render() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_WORKBENCH"
    scene.render.resolution_x = 720
    scene.render.resolution_y = 720
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.film_transparent = False
    scene.render.filepath = str(RENDER_PATH)

    scene.display.shading.light = "FLAT"
    scene.display.shading.color_type = "MATERIAL"
    scene.display.shading.background_type = "VIEWPORT"
    scene.display.shading.background_color = BACKGROUND[:3]
    scene.display.shading.show_shadows = False
    scene.display.shading.show_cavity = False
    scene.display.shading.show_specular_highlight = False
    scene.display.shading.show_object_outline = False
    try:
        scene.display.render_aa = "16"
    except (AttributeError, TypeError):
        pass

    scene.view_settings.look = "AgX - Medium High Contrast"


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    reset_scene()

    plate_material = create_material("Plate_Dark", PLATE_COLOR)
    edge_material = create_material("Edge_Hairline", EDGE_COLOR)
    accent_material = create_material("Edge_Depth", ACCENT_COLOR)

    heights = [
        0.62,
        0.78,
        0.96,
        1.18,
        1.48,
        1.88,
        2.42,
        3.18,
        4.28,
        6.35,
        4.42,
        3.30,
        2.50,
        1.92,
        1.45,
    ]
    spacing = 0.37
    first_y = -spacing * (len(heights) - 1) * 0.5

    for index, height in enumerate(heights):
        y_position = first_y + index * spacing
        _plate, perimeter = create_plate_mesh(
            index=index,
            width=4.88,
            height=height,
            thickness=0.075,
            y_position=y_position,
            plate_material=plate_material,
        )
        add_plate_outlines(
            index=index,
            perimeter=perimeter,
            y_position=y_position,
            thickness=0.075,
            edge_material=edge_material,
            accent_material=accent_material,
        )

    add_camera()
    configure_render()

    bpy.context.scene["study_title"] = "Agentech Isometric Stack Study"
    bpy.context.scene["reference_note"] = (
        "Original Blender study of a layered, orthographic technical graphic."
    )

    bpy.ops.wm.save_as_mainfile(filepath=str(BLEND_PATH))
    bpy.ops.render.render(write_still=True)
    print(f"Saved Blender study: {BLEND_PATH}")
    print(f"Saved render: {RENDER_PATH}")


if __name__ == "__main__":
    main()

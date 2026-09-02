"""Render neutral close-ups from the saved Blender scene without changing it."""

from pathlib import Path
import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "output"
scene = bpy.context.scene
for obj in scene.objects:
    if obj.type == "LIGHT":
        obj.hide_render = True

scene.world.node_tree.nodes["Background"].inputs["Color"].default_value = (.12, .14, .18, 1)
scene.world.node_tree.nodes["Background"].inputs["Strength"].default_value = .35
scene.render.resolution_x = 900
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.view_settings.exposure = 0
scene.render.film_transparent = False
target = Vector((.004, 0, .553))
camera = scene.camera
camera.data.type = "ORTHO"
camera.data.ortho_scale = .255

for name, location, energy, size in (
    ("Head Check Key", (1.1, -1.8, 2.0), 125, 1.5),
    ("Head Check Fill", (.2, 1.5, .8), 75, 1.3),
    ("Head Check Rim", (-1.0, -.5, 1.5), 100, 1.0),
):
    light = bpy.data.lights.new(name, "AREA")
    light.energy = energy
    light.shape = "DISK"
    light.size = size
    obj = bpy.data.objects.new(name, light)
    scene.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (target - obj.location).to_track_quat("-Z", "Y").to_euler()

for name, location in (
    ("front", (1.2, 0, .565)),
    ("side", (.004, -1.2, .565)),
    ("back", (-1.2, 0, .565)),
    ("three-quarter", (.95, -.90, .76)),
):
    camera.location = location
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = str(OUT / f"agibot-x2-head-{name}.png")
    bpy.ops.render.render(write_still=True)
    print(f"HEAD_CHECK_{name.upper()}={scene.render.filepath}")

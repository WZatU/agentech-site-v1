"""Generate MuJoCo-safe mirrored visual meshes from the immutable Navi STL files.

The source URDF mirrors several meshes with negative scale components.  MuJoCo
expects positive mesh scales, so this tool applies the reflections to copied STL
geometry and reverses triangle winding when handedness changes.
"""

from __future__ import annotations

import argparse
import struct
from pathlib import Path


HEADER_BYTES = 80
TRIANGLE_BYTES = 50


def _transform(vector: tuple[float, float, float], scale: tuple[int, int, int]):
    return tuple(component * sign for component, sign in zip(vector, scale))


def mirror_binary_stl(source: Path, destination: Path, scale: tuple[int, int, int]) -> None:
    raw = source.read_bytes()
    if len(raw) < 84:
        raise ValueError(f"Not a binary STL: {source}")
    triangle_count = struct.unpack_from("<I", raw, HEADER_BYTES)[0]
    expected_size = 84 + TRIANGLE_BYTES * triangle_count
    if expected_size != len(raw):
        raise ValueError(f"Only binary STL is supported: {source}")

    determinant = scale[0] * scale[1] * scale[2]
    output = bytearray(raw[:84])
    for index in range(triangle_count):
        offset = 84 + TRIANGLE_BYTES * index
        values = struct.unpack_from("<12fH", raw, offset)
        normal = _transform(values[0:3], scale)
        vertices = [
            _transform(values[3:6], scale),
            _transform(values[6:9], scale),
            _transform(values[9:12], scale),
        ]
        if determinant < 0:
            vertices[1], vertices[2] = vertices[2], vertices[1]
        output.extend(
            struct.pack(
                "<12fH",
                *normal,
                *vertices[0],
                *vertices[1],
                *vertices[2],
                values[12],
            )
        )
    destination.write_bytes(output)


def generate(mesh_directory: Path) -> list[Path]:
    variants = {
        "abad_link_mirror_y.STL": ("abad_link.STL", (1, -1, 1)),
        "abad_link_mirror_x.STL": ("abad_link.STL", (-1, 1, 1)),
        "abad_link_mirror_xy.STL": ("abad_link.STL", (-1, -1, 1)),
        "hip_link_mirror_y.STL": ("hip_link.STL", (1, -1, 1)),
        "knee_link_mirror_y.STL": ("knee_link.STL", (1, -1, 1)),
    }
    generated = []
    for output_name, (source_name, scale) in variants.items():
        output_path = mesh_directory / output_name
        mirror_binary_stl(mesh_directory / source_name, output_path, scale)
        generated.append(output_path)
    return generated


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "mesh_directory",
        nargs="?",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "meshes",
    )
    args = parser.parse_args()
    for path in generate(args.mesh_directory.resolve()):
        print(path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

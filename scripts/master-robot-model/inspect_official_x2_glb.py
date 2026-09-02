#!/usr/bin/env python3
"""Write final metrics for an optimized official X2 Ultra GLB."""

from __future__ import annotations

import argparse
import json
import struct
from pathlib import Path


def read_glb_json(path: Path) -> dict:
    data = path.read_bytes()
    magic, version, total_length = struct.unpack_from("<4sII", data, 0)
    if magic != b"glTF" or version != 2 or total_length != len(data):
        raise ValueError(f"not a valid GLB 2.0 file: {path}")
    json_length, json_type = struct.unpack_from("<I4s", data, 12)
    if json_type != b"JSON":
        raise ValueError(f"GLB has no leading JSON chunk: {path}")
    return json.loads(data[20 : 20 + json_length].decode("utf-8").rstrip(" \x00"))


def rendered_triangle_count(document: dict) -> int:
    count = 0
    for mesh in document.get("meshes", []):
        for primitive in mesh.get("primitives", []):
            accessor = primitive.get("indices")
            if accessor is None:
                accessor = primitive["attributes"]["POSITION"]
            count += document["accessors"][accessor]["count"] // 3
    return count


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--glb", type=Path, required=True)
    parser.add_argument("--base-manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    document = read_glb_json(args.glb)
    manifest = json.loads(args.base_manifest.read_text())
    manifest["originalRenderedTriangleCount"] = manifest["renderedTriangleCount"]
    manifest["renderedTriangleCount"] = rendered_triangle_count(document)
    manifest["visibleMeshCount"] = len(document.get("meshes", []))
    manifest["nodeCount"] = len(document.get("nodes", []))
    manifest["optimizedFileBytes"] = args.glb.stat().st_size
    manifest["compression"] = "KHR_draco_mesh_compression"
    manifest["optimizationPolicy"] = (
        "official mesh decimation at 30%, minimum 750 faces per source mesh; "
        "joint hierarchy preserved; no procedural replacement geometry"
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    print(
        f"Final GLB: {manifest['renderedTriangleCount']:,} triangles / "
        f"{manifest['optimizedFileBytes']:,} bytes"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

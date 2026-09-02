#!/usr/bin/env python3
"""Create a web-budgeted copy of the official X2 Ultra STL source meshes."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

try:
    import trimesh
except ImportError as error:
    raise SystemExit(
        "Install scripts/master-robot-model/requirements-official-x2.txt "
        "into the selected MODEL_PYTHON environment before building."
    ) from error


def simplify_model_source(
    model_dir: Path,
    output_dir: Path,
    ratio: float,
    minimum_faces: int,
) -> dict:
    if output_dir.exists():
        raise FileExistsError(f"output directory already exists: {output_dir}")
    if not (model_dir / "x2_ultra.urdf").is_file():
        raise FileNotFoundError(f"missing X2 Ultra URDF in {model_dir}")
    shutil.copytree(model_dir, output_dir)

    original_faces = 0
    simplified_faces = 0
    processed_meshes = 0
    for path in sorted((output_dir / "meshes").glob("*.[Ss][Tt][Ll]")):
        mesh = trimesh.load_mesh(path, file_type="stl", process=True)
        if mesh.is_empty:
            continue
        before = len(mesh.faces)
        target = max(minimum_faces, int(before * ratio))
        if target < before:
            mesh = mesh.simplify_quadric_decimation(
                face_count=target,
                aggression=5,
            )
        after = len(mesh.faces)
        mesh.export(path, file_type="stl")
        original_faces += before
        simplified_faces += after
        processed_meshes += 1

    stats = {
        "processedMeshCount": processed_meshes,
        "originalSourceTriangleCount": original_faces,
        "simplifiedSourceTriangleCount": simplified_faces,
        "simplificationRatio": ratio,
        "minimumFacesPerMesh": minimum_faces,
    }
    (output_dir / "WEB-SIMPLIFICATION.json").write_text(
        json.dumps(stats, indent=2) + "\n",
        encoding="utf-8",
    )
    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model-dir", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--ratio", type=float, default=0.30)
    parser.add_argument("--minimum-faces", type=int, default=750)
    args = parser.parse_args()
    if not 0.0 < args.ratio <= 1.0:
        parser.error("--ratio must be greater than 0 and at most 1")
    stats = simplify_model_source(
        args.model_dir.resolve(),
        args.output_dir.resolve(),
        args.ratio,
        args.minimum_faces,
    )
    print(
        f"Simplified {stats['processedMeshCount']} official STL meshes: "
        f"{stats['originalSourceTriangleCount']:,} → "
        f"{stats['simplifiedSourceTriangleCount']:,} triangles"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

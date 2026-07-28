"""Deterministic hashes for inputs, configuration, and model resources."""

from __future__ import annotations

import hashlib
from pathlib import Path


RUNTIME_ROOT = Path(__file__).resolve().parents[1]


def sha256_file(path: str | Path) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def sha256_paths(paths: list[Path], *, base: Path) -> str:
    digest = hashlib.sha256()
    for path in sorted(paths, key=lambda item: item.as_posix()):
        relative = path.relative_to(base).as_posix().encode("utf-8")
        digest.update(len(relative).to_bytes(8, "big"))
        digest.update(relative)
        digest.update(bytes.fromhex(sha256_file(path)))
    return digest.hexdigest()


def configuration_hash(config_dir: str | Path | None = None) -> str:
    root = Path(config_dir).resolve() if config_dir else RUNTIME_ROOT / "config"
    return sha256_paths(
        [path for path in root.rglob("*") if path.is_file()],
        base=root,
    )


def model_hash(root: str | Path | None = None) -> str:
    runtime = Path(root).resolve() if root else RUNTIME_ROOT
    paths = [runtime / "scene.xml", runtime / "robot.xml"]
    paths.extend(path for path in (runtime / "meshes").rglob("*") if path.is_file())
    return sha256_paths(paths, base=runtime)

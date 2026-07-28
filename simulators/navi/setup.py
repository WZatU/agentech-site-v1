"""Setuptools build hook that installs runtime data beside the legacy modules."""

from __future__ import annotations

import shutil
from pathlib import Path

from setuptools import setup
from setuptools.command.build_py import build_py


ROOT = Path(__file__).resolve().parent


class BuildPyWithRuntimeData(build_py):
    """Copy model/config/schema assets into the wheel's purelib root."""

    def run(self) -> None:
        super().run()
        build_root = Path(self.build_lib)
        for relative in ("VERSION", "scene.xml", "robot.xml"):
            target = build_root / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(ROOT / relative, target)
        for directory in ("config", "meshes", "schemas", "urdf"):
            shutil.copytree(
                ROOT / directory,
                build_root / directory,
                dirs_exist_ok=True,
            )


setup(cmdclass={"build_py": BuildPyWithRuntimeData})

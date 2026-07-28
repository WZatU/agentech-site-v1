"""Single source of truth for the release version."""

from __future__ import annotations

from pathlib import Path


VERSION_FILE = Path(__file__).resolve().parents[1] / "VERSION"
__version__ = VERSION_FILE.read_text(encoding="utf-8").strip()
if not __version__:
    raise RuntimeError(f"Empty version file: {VERSION_FILE}")


def release_name() -> str:
    return f"Navi MuJoCo SDK Translator v{__version__}"

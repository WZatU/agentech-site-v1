"""Restricted, non-executing SDK-to-IR translation core."""

from .errors import TranslationIssue
from .ir import SimulationCommand, SourceLocation
from .parser import TranslationParser, TranslationResult
from .registry import MethodRegistry
from .spec_loader import SdkSpec, load_sdk_spec

__all__ = [
    "MethodRegistry",
    "SdkSpec",
    "SimulationCommand",
    "SourceLocation",
    "TranslationIssue",
    "TranslationParser",
    "TranslationResult",
    "load_sdk_spec",
]

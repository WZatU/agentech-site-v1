from __future__ import annotations

import unittest
from pathlib import Path

from translator.limits import TranslationLimits
from translator.parser import TranslationParser
from translator.registry import MethodRegistry
from translator.spec_loader import load_sdk_spec


PROJECT_ROOT = Path(__file__).resolve().parents[2]
SDK_SPEC_PATH = PROJECT_ROOT / "config" / "sdk_spec.json"
GROUND_TRUTH_PATH = PROJECT_ROOT / "config" / "action_ground_truth.json"


class CoreTestCase(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.spec = load_sdk_spec(SDK_SPEC_PATH)
        cls.registry = MethodRegistry(cls.spec)

    def parser(self, limits: TranslationLimits | None = None) -> TranslationParser:
        return TranslationParser(
            self.spec,
            self.registry,
            GROUND_TRUTH_PATH,
            limits,
        )

    def parse(self, body: str, *, limits: TranslationLimits | None = None):
        source = f"from {self.spec.package} import {self.spec.robot_class}\n{body}\n"
        return self.parser(limits).parse_source(source, "<test>")

    def error_codes(self, result):
        return [issue.error_code for issue in result.issues]

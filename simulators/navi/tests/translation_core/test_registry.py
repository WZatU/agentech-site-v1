from tests.translation_core.common import CoreTestCase
from translator.registry import MethodStatus


class RegistryTest(CoreTestCase):
    def test_real_public_and_alias_counts(self):
        self.assertEqual(117, len(self.registry.list_supported_methods()))
        self.assertEqual(120, len(self.registry.list_public_names()))

    def test_turn_shortcuts_resolve_to_turn(self):
        for name in ("turn_left", "turn_right", "u_turn"):
            resolution = self.registry.resolve_method(name)
            self.assertEqual("turn", resolution.canonical_name)
            self.assertEqual(MethodStatus.SUPPORTED_WITH_UNRESOLVED_METADATA, resolution.status)

    def test_legacy_methods_are_not_public(self):
        for name in ("do_action", "do_behavior"):
            self.assertEqual(
                MethodStatus.LEGACY_NOT_PUBLIC,
                self.registry.resolve_method(name).status,
            )

    def test_under_development_is_unsupported(self):
        self.assertEqual(
            MethodStatus.UNSUPPORTED,
            self.registry.resolve_method("set_gait").status,
        )

    def test_unknown_is_unknown(self):
        self.assertEqual(
            MethodStatus.UNKNOWN,
            self.registry.resolve_method("not_real").status,
        )

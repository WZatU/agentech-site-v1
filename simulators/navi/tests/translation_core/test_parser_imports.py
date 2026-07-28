from tests.translation_core.common import CoreTestCase


class ParserImportsTest(CoreTestCase):
    def test_official_facade_and_use(self):
        result = self.parse(
            f'{self.spec.robot_class}.use("navi", host="192.168.4.65")\n{self.spec.robot_class}.stand()'
        )
        self.assertTrue(result.valid)
        self.assertEqual(1, len(result.initialization_calls))
        self.assertEqual(["stand"], [command.canonical_method for command in result.commands])

    def test_import_alias(self):
        source = f"from {self.spec.package} import {self.spec.robot_class} as Navi\nNavi.stand()\n"
        result = self.parser().parse_source(source, "<imports>")
        self.assertTrue(result.valid)

    def test_missing_sdk_import(self):
        result = self.parser().parse_source("x = 1\n", "<imports>")
        self.assertIn("SDK_IMPORT_NOT_FOUND", self.error_codes(result))

    def test_undocumented_instance_constructor_rejected(self):
        result = self.parse(f"dog = {self.spec.robot_class}()\ndog.stand()")
        self.assertIn("SDK_CLASS_NOT_FOUND", self.error_codes(result))

    def test_static_facade_alias_assignment(self):
        result = self.parse(f"dog = {self.spec.robot_class}\ndog.stand()")
        self.assertTrue(result.valid)
        self.assertIn("dog", result.sdk_objects)

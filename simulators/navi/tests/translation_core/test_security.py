from tests.translation_core.common import CoreTestCase


class SecurityTest(CoreTestCase):
    def test_forbidden_modules(self):
        for statement in ("import os", "import subprocess", "import socket", "from pathlib import Path"):
            with self.subTest(statement=statement):
                result = self.parser().parse_source(statement, "<security>")
                self.assertIn("FORBIDDEN_IMPORT", self.error_codes(result))
                self.assertFalse(result.security_valid)

    def test_forbidden_builtins(self):
        for call in ("open('x')", "eval('1')", "exec('x=1')", "__import__('os')", "getattr(object(), 'x')"):
            with self.subTest(call=call):
                result = self.parse(call)
                self.assertIn("FORBIDDEN_CALL", self.error_codes(result))

    def test_forbidden_module_calls_without_import_are_still_rejected(self):
        for call in ("os.system('x')", "subprocess.run(['x'])", "socket.socket()"):
            with self.subTest(call=call):
                result = self.parse(call)
                self.assertIn("FORBIDDEN_CALL", self.error_codes(result))

    def test_dunder_and_while_rejected(self):
        dunder = self.parse(f"{self.spec.robot_class}.__dict__")
        self.assertIn("FORBIDDEN_ATTRIBUTE", self.error_codes(dunder))
        loop = self.parse("while True:\n    pass")
        self.assertIn("UNSUPPORTED_AST_NODE", self.error_codes(loop))

    def test_dynamic_call_target_and_lambda_rejected(self):
        result = self.parse("(lambda value: value)(1)")
        codes = self.error_codes(result)
        self.assertIn("FORBIDDEN_CALL", codes)
        self.assertIn("UNSUPPORTED_AST_NODE", codes)

    def test_allowed_imports_pass_security(self):
        result = self.parser().parse_source(
            f"from {self.spec.package} import {self.spec.robot_class}\nimport time\n{self.spec.robot_class}.stand()",
            "<security>",
        )
        self.assertTrue(result.security_valid)

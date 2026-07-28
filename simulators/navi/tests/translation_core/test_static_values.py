import ast

from tests.translation_core.common import CoreTestCase
from translator.errors import StaticEvaluationError
from translator.limits import TranslationLimits
from translator.static_values import QueryValue, Scope, StaticEvaluator


class StaticValuesTest(CoreTestCase):
    def test_arithmetic_and_containers(self):
        evaluator = StaticEvaluator()
        scope = Scope({"x": 2})
        self.assertEqual(5.0, evaluator.evaluate(ast.parse("x * 2 + 1", mode="eval").body, scope))
        self.assertEqual(
            {"x": [1, 2]},
            evaluator.evaluate(ast.parse("{'x': [1, 2]}", mode="eval").body, scope),
        )

    def test_power_limit(self):
        evaluator = StaticEvaluator(TranslationLimits(max_power_exponent=3))
        with self.assertRaises(StaticEvaluationError):
            evaluator.evaluate(ast.parse("2 ** 4", mode="eval").body, Scope())

    def test_query_value_cannot_be_used(self):
        evaluator = StaticEvaluator()
        with self.assertRaises(StaticEvaluationError) as caught:
            evaluator.evaluate(
                ast.parse("battery < 20", mode="eval").body,
                Scope({"battery": QueryValue("q1", "get_battery_status")}),
            )
        self.assertEqual("QUERY_VALUE_USED_IN_UNSUPPORTED_EXPRESSION", caught.exception.code)

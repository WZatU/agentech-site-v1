"""Load and validate the actual Navi SDK JSON structure without inventing fields."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping


class SpecValidationError(ValueError):
    pass


@dataclass(frozen=True)
class ParameterSpec:
    public_name: str
    canonical_name: str
    definition: Mapping[str, Any]
    required: bool | None
    default_present: bool
    default: Any
    unresolved_fields: tuple[str, ...] = ()

    @property
    def type_name(self) -> str | None:
        value = self.definition.get("type")
        return value if isinstance(value, str) else None


@dataclass(frozen=True)
class MethodSpec:
    public_name: str
    canonical_name: str
    category: str
    status: str
    parameters: tuple[ParameterSpec, ...]
    metadata: Mapping[str, Any]
    unresolved_fields: tuple[str, ...] = ()

    def parameter_map(self) -> dict[str, ParameterSpec]:
        return {parameter.public_name: parameter for parameter in self.parameters}


@dataclass(frozen=True)
class AliasSpec:
    public_name: str
    canonical_name: str
    metadata: Mapping[str, Any]


@dataclass(frozen=True)
class SdkSpec:
    path: Path
    raw: Mapping[str, Any]
    package: str
    robot_class: str
    initialization: str
    methods: Mapping[str, MethodSpec]
    aliases: Mapping[str, AliasSpec]
    parameter_aliases: Mapping[str, Mapping[str, Any]]
    blocked_names: Mapping[str, Mapping[str, Any]]
    definitions: Mapping[str, Mapping[str, Any]]
    unresolved_fields: tuple[str, ...] = field(default_factory=tuple)


REQUIRED_TOP_LEVEL = {
    "schema_version",
    "source",
    "setup",
    "global_contract",
    "aliases",
    "blocked_names",
    "definitions",
    "methods",
}


def _find_unresolved(value: Any, prefix: str = "") -> list[str]:
    found: list[str] = []
    if value == "UNRESOLVED":
        found.append(prefix or "$")
    elif isinstance(value, Mapping):
        for key, child in value.items():
            child_prefix = f"{prefix}.{key}" if prefix else str(key)
            found.extend(_find_unresolved(child, child_prefix))
    elif isinstance(value, list):
        for index, child in enumerate(value):
            found.extend(_find_unresolved(child, f"{prefix}[{index}]"))
    return found


def _expand_parameter(
    name: str,
    raw_parameter: Any,
    definitions: Mapping[str, Mapping[str, Any]],
    method_defaults: Mapping[str, Any],
) -> ParameterSpec:
    if not name:
        raise SpecValidationError("Missing parameter identifier")
    if not isinstance(raw_parameter, Mapping):
        raise SpecValidationError(f"Parameter {name!r} must be an object")

    definition = dict(raw_parameter)
    reference = definition.pop("$ref", None)
    if reference is not None:
        if not isinstance(reference, str) or reference not in definitions:
            raise SpecValidationError(f"Parameter {name!r} has unknown $ref {reference!r}")
        merged = dict(definitions[reference])
        merged.update(definition)
        definition = merged
    if "default" not in definition and name in method_defaults:
        definition["default"] = method_defaults[name]

    alias_for = definition.get("alias_for")
    canonical_name = alias_for if isinstance(alias_for, str) else name
    required_raw = definition.get("required")
    if required_raw is not None and not isinstance(required_raw, bool):
        raise SpecValidationError(f"Parameter {name!r} required must be boolean")
    default_present = "default" in definition
    default = definition.get("default")

    semantic_keys = {
        "type",
        "alias_for",
        "enum",
        "minimum",
        "maximum",
        "exclusive_minimum",
        "zero_or_abs_range",
        "nonzero",
        "finite",
    }
    if not semantic_keys.intersection(definition):
        raise SpecValidationError(
            f"Parameter {name!r} is incomplete: no type, alias, enum, or range semantics"
        )

    return ParameterSpec(
        public_name=name,
        canonical_name=canonical_name,
        definition=definition,
        required=required_raw,
        default_present=default_present,
        default=default,
        unresolved_fields=tuple(_find_unresolved(definition)),
    )


def load_sdk_spec(path: str | Path) -> SdkSpec:
    spec_path = Path(path).resolve()
    def no_duplicate_keys(pairs):
        result = {}
        for key, value in pairs:
            if key in result:
                raise SpecValidationError(f"Duplicate JSON object key: {key}")
            result[key] = value
        return result
    try:
        raw = json.loads(
            spec_path.read_text(encoding="utf-8"),
            object_pairs_hook=no_duplicate_keys,
        )
    except (OSError, json.JSONDecodeError, SpecValidationError) as exc:
        raise SpecValidationError(f"Cannot load SDK spec {spec_path}: {exc}") from exc
    if not isinstance(raw, dict):
        raise SpecValidationError("SDK spec root must be an object")

    missing = sorted(REQUIRED_TOP_LEVEL - raw.keys())
    if missing:
        raise SpecValidationError(f"SDK spec missing top-level fields: {missing}")

    setup = raw["setup"]
    methods_raw = raw["methods"]
    aliases_raw = raw["aliases"]
    definitions = raw["definitions"]
    blocked_names = raw["blocked_names"]
    if not all(isinstance(item, dict) for item in (setup, methods_raw, aliases_raw, definitions, blocked_names)):
        raise SpecValidationError("setup/methods/aliases/definitions/blocked_names must be objects")

    package = setup.get("package")
    robot_class = setup.get("facade")
    initialization = setup.get("activation")
    if not all(isinstance(value, str) and value for value in (package, robot_class, initialization)):
        raise SpecValidationError("setup must define package, facade, and activation strings")

    methods: dict[str, MethodSpec] = {}
    for method_name, method_raw in methods_raw.items():
        if not isinstance(method_name, str) or not method_name:
            raise SpecValidationError("Missing method identifier")
        if method_name in methods:
            raise SpecValidationError(f"Duplicate public method name: {method_name}")
        if not isinstance(method_raw, dict):
            raise SpecValidationError(f"Method {method_name!r} must be an object")
        category = method_raw.get("category")
        status = method_raw.get("status")
        parameters_raw = method_raw.get("parameters")
        method_defaults = method_raw.get("default_call", {})
        if not isinstance(category, str) or not category:
            raise SpecValidationError(f"Method {method_name!r} missing category")
        if not isinstance(status, str) or not status:
            raise SpecValidationError(f"Method {method_name!r} missing status")
        if not isinstance(parameters_raw, dict):
            raise SpecValidationError(f"Method {method_name!r} parameters must be an object")
        if not isinstance(method_defaults, dict):
            raise SpecValidationError(f"Method {method_name!r} default_call must be an object")
        parameters = tuple(
            _expand_parameter(parameter_name, parameter_raw, definitions, method_defaults)
            for parameter_name, parameter_raw in parameters_raw.items()
        )
        methods[method_name] = MethodSpec(
            public_name=method_name,
            canonical_name=method_name,
            category=category,
            status=status,
            parameters=parameters,
            metadata=dict(method_raw),
            unresolved_fields=tuple(_find_unresolved(method_raw)),
        )

    method_aliases: dict[str, AliasSpec] = {}
    parameter_aliases: dict[str, Mapping[str, Any]] = {}
    for alias_name, alias_raw in aliases_raw.items():
        if not isinstance(alias_name, str) or not alias_name or not isinstance(alias_raw, dict):
            raise SpecValidationError("Alias names and definitions must be non-empty")
        if alias_raw.get("kind") == "parameter_alias":
            parameter_aliases[alias_name] = dict(alias_raw)
            continue
        canonical = alias_raw.get("canonical")
        if not isinstance(canonical, str) or canonical not in methods:
            raise SpecValidationError(f"Method alias {alias_name!r} has unknown canonical target")
        if alias_name in methods or alias_name in method_aliases:
            raise SpecValidationError(f"Alias conflicts with public method: {alias_name}")
        method_aliases[alias_name] = AliasSpec(alias_name, canonical, dict(alias_raw))

    return SdkSpec(
        path=spec_path,
        raw=raw,
        package=package,
        robot_class=robot_class,
        initialization=initialization,
        methods=methods,
        aliases=method_aliases,
        parameter_aliases=parameter_aliases,
        blocked_names={key: dict(value) for key, value in blocked_names.items()},
        definitions={key: dict(value) for key, value in definitions.items()},
        unresolved_fields=tuple(_find_unresolved(raw)),
    )

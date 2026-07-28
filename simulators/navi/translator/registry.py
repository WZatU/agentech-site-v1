"""Dynamic method registry built exclusively from sdk_spec.json."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum

from .spec_loader import AliasSpec, MethodSpec, SdkSpec


class MethodStatus(str, Enum):
    SUPPORTED = "SUPPORTED"
    SUPPORTED_WITH_UNRESOLVED_METADATA = "SUPPORTED_WITH_UNRESOLVED_METADATA"
    UNSUPPORTED = "UNSUPPORTED"
    UNKNOWN = "UNKNOWN"
    LEGACY_NOT_PUBLIC = "LEGACY_NOT_PUBLIC"


@dataclass(frozen=True)
class MethodResolution:
    public_name: str
    canonical_name: str | None
    status: MethodStatus
    method: MethodSpec | None
    alias: AliasSpec | None = None
    reason: str | None = None


class MethodRegistry:
    def __init__(self, spec: SdkSpec):
        self.spec = spec
        global_contract = spec.raw.get("global_contract", {})
        self._global_unresolved = any(
            value == "UNRESOLVED" for value in global_contract.values()
        )

    def resolve_alias(self, public_name: str) -> AliasSpec | None:
        return self.spec.aliases.get(public_name)

    def get_method_spec(self, canonical_name: str) -> MethodSpec | None:
        return self.spec.methods.get(canonical_name)

    def resolve_method(self, public_name: str) -> MethodResolution:
        if public_name in {"do_action", "do_behavior"}:
            return MethodResolution(
                public_name,
                None,
                MethodStatus.LEGACY_NOT_PUBLIC,
                None,
                reason="Video-era legacy method is not a current public SDK method",
            )
        direct = self.spec.methods.get(public_name)
        alias = self.spec.aliases.get(public_name)
        method = direct
        canonical = public_name if direct else None
        if alias:
            canonical = alias.canonical_name
            method = self.spec.methods[canonical]
        if method is None:
            blocked = self.spec.blocked_names.get(public_name)
            if blocked:
                status = (
                    MethodStatus.LEGACY_NOT_PUBLIC
                    if blocked.get("status") == "legacy_video_only"
                    else MethodStatus.UNSUPPORTED
                )
                return MethodResolution(
                    public_name,
                    blocked.get("canonical_candidate"),
                    status,
                    None,
                    reason=str(blocked.get("decision") or blocked.get("status")),
                )
            return MethodResolution(public_name, None, MethodStatus.UNKNOWN, None)
        if method.status != "available":
            status = MethodStatus.UNSUPPORTED
        elif method.unresolved_fields or alias is not None or self._global_unresolved:
            status = MethodStatus.SUPPORTED_WITH_UNRESOLVED_METADATA
        else:
            status = MethodStatus.SUPPORTED
        return MethodResolution(public_name, canonical, status, method, alias)

    def list_supported_methods(self) -> list[str]:
        return sorted(self.spec.methods)

    def list_public_names(self) -> list[str]:
        return sorted(set(self.spec.methods) | set(self.spec.aliases))

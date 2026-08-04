# 01 - Client Entry Points

Client products consume the unified contract and present only the capabilities appropriate to their role.

| Client | Responsibility | Status |
| --- | --- | --- |
| EAIC Hub | Accounts, resources, reservations, livestream, state, and results | Current / Alpha |
| eaic CLI | Project lifecycle, local validation, internal API entry, and MCP gateway | Near-term priority |
| World macOS | Atmosphere programming, local validation, MCP, and livestream module | Future |
| World iOS | Remote view and limited control through World macOS | Future |

## Boundary rules

- Clients share one versioned API and event contract.
- Clients do not connect directly to backend databases.
- World iOS connects through World macOS, not directly to cloud services or robots.
- Product-specific UI remains separate even when contracts are shared.

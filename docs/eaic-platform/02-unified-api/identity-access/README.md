# Identity and Access API

## Owns

- Accounts and verified identities.
- Organizations and memberships.
- Roles and permissions.
- Credits, quotas, and billing entitlements.
- Feature and service access decisions.

## Contract rules

- This domain is the source of truth for access decisions.
- Client-side labels never grant privileges.
- Credit and entitlement mutations require idempotency and audit records.
- Other domains reference stable account and organization identifiers.

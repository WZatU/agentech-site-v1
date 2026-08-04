# Projects and Validation API

## Owns

- Projects and immutable artifacts.
- Versions, dependencies, target resources, and hashes.
- Local/cloud validation parity.
- Validation checks and review results.
- Approved package identity used by reservations and deployments.

## Contract rules

- Every executable package has a stable version and hash.
- Revalidation is required when package content changes.
- Validation results are immutable evidence; a new review creates a new result.
- Deployment authorization references the exact approved package hash.

# 03 — Cloud Core and Business State

## Ownership and current state

Cloud Core owns business state and authorization; it coordinates work but never performs hard real-time robot control. The numbered `features/eaic/03-cloud-core/` directory is currently an ownership pointer. Most implementation still lives in `app/api/`, `lib/`, `supabase-schema.sql`, and `supabase/migrations/`.

The intended state machine is:

1. Receive a versioned project/submission and hash.
2. Validate it against the same contracts used locally.
3. Run AI/language review when required.
4. Reserve and bind account profile, robot, venue, time, and run type.
5. Authorize only the exact approved package and reservation.
6. Store run events, results, usage, anomalies, and audit evidence.

## Persisted domains

- Accounts and profiles, children, education accounts/courses/enrollments.
- Credits, invoices, credit payments, subscriptions, feature entitlements, and feature payments.
- Code submissions, physical/AI gate state, AI caps and usage.
- Robot sessions with profile, schedule, run type, submission link, device results, execution result/error, and timestamps.
- Admin allowlist/roles and internal account policy.
- Club, internship, workshop, preorder, and field-interest applications.
- Master camera selection in a service-role-only table.
- Latest Master heartbeat: local atomic `0600` file outside production; private Supabase Storage object in production. Missing/corrupt storage yields unavailable state rather than fabricated telemetry.

## Decisions already made

- Supabase service-role credentials remain server-only. Client code never connects directly to business tables to bypass the API.
- Account-domain classification is a billing/operations policy; it does not independently grant admin access.
- Admin authorization comes from server-side admin records.
- Software Check gates and charging are persisted, re-read after navigation/refresh, and revalidated on POST.
- One-time premium access is fulfilled only from a verified Stripe webhook, never from the browser success URL.
- Master's view-only test uses an allowlisted internal account, a three-minute `preset_demo` session, a zero-command audit artifact, and no executable code. Do not broaden access or duration to work around a camera issue.
- Reservation creation must be conflict-safe and atomic. Concurrent requests reuse the row returned by the authoritative reservation operation.
- Deployment authorization is for the exact approved hash and reservation. Cloud approval never overrides edge/robot safety or operator refusal.
- Logs/errors exposed to users are sanitized; detailed evidence remains internal.

## Key source routes and helpers

- `lib/account-records.ts`, `lib/server-account-session.ts`, `lib/company-accounts.ts`.
- `lib/billing.ts`, `lib/invoices.ts`, `lib/premium-features.ts`, `lib/return-to-home-access-policy.ts`.
- `lib/agentech-live-session.ts`, `lib/robot-session-reservation.ts`, `lib/master-live-test-*`.
- `lib/eai-ai-gateway.ts`, `features/eaic/02-unified-api/projects-validation/agentech-ai-review.ts`.
- `lib/master-heartbeat-store.ts` and `app/api/master-heartbeat/route.ts`.
- `app/api/robot-slot`, `app/api/agentech-code-submit`, `app/api/master-live-test`, account/admin/billing routes.

## Tests and evidence

Use focused route/contract tests before broad checks:

```bash
pnpm test:auth-sign-in
pnpm test:account-profile-selection
pnpm test:login-bypass
pnpm test:return-to-home-access
pnpm test:master-live-test
pnpm test:master-heartbeat
pnpm test:session-device-results
pnpm test:aegis-runner
pnpm typecheck
```

Schema or persistence changes also require inspecting `supabase-schema.sql`, existing migrations, RLS/grants, backward compatibility, and rollback. Never run a production mutation merely to verify a UI change.

## Common failure modes

- Assuming `features/eaic/03-cloud-core/` being small means cloud behavior is unimplemented; follow the route/helper pointers above.
- Granting access from a visible button, query parameter, localStorage, or unsigned client cookie.
- Splitting one state transition across non-atomic writes and creating double reservations or double charges.
- Conflating authorization with media availability or physical execution success.
- Storing secrets or detailed robot/network data in application records or agent handoffs.
- Marking a failed hardware session PASS because compilation, scheduling, or delivery succeeded.

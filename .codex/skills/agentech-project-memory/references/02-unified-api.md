# 02 — Unified API and Shared Contracts

## Ownership and shape

This is the near-term integration layer. It owns versioned contracts for identity/access, projects/validation, resources/runs, and live/results. Protected operations require server-side authentication/authorization, traceable state, idempotent mutations where applicable, and stable safe errors.

Primary locations:

- `features/eaic/02-unified-api/projects-validation/` — Aegis/Navi/Master SDK references, shared validation, and AI review.
- `features/eaic/02-unified-api/resources-runs/` — robot-model normalization and robot-slot pricing rules.
- `app/api/` — Next.js HTTP entry points.
- `lib/*.ts` — business contracts and compatibility exports.
- `supabase-schema.sql` and `supabase/migrations/` — persisted contract shape.

The one-line files such as `lib/agentech-validation.ts` and `lib/navi-sdk-reference.ts` intentionally re-export `features/eaic/02-unified-api/*`. Keep old imports working while ownership stays visible.

## Implemented contract decisions

- Public robot model options currently normalize `Aegis`/`Aegies` to the legacy stored value `Aegies`, and `Navi` to `Navi`. Do not casually rename the stored value; migrate data and all callers first. Master is a special live-test model in the live-camera contract, not part of the normal two-model option list.
- External robot viewing costs 100 credits/minute and must be 5–60 whole minutes. Internal company accounts may request any positive whole-minute duration.
- Physical Hardware Check and Software Check are one persisted submission chain. Software Check must use the exact submission/code that passed the physical gate; editing invalidates the unlock.
- External accounts need sufficient credits before Software Check. Internal accounts are charged when possible but are not blocked by an insufficient balance. Step 3 is still mandatory for both.
- The server counts/checks OpenAI input, runs review server-side, stores official usage, and never exposes the OpenAI key to the browser.
- CLI/web authentication was unified around Supabase identity and a signed server session. The CLI live handoff exchanges an authenticated bearer identity for a short-lived browser handoff, then removes the token from the URL by redirecting.
- Navi `return_to_home()` accepts only fixed final headings `0/90/180/270`; public input cannot change the saved home coordinate. Physical use is enforced by subscription, lifetime entitlement, or internal-account policy.
- API errors must be JSON and must not expose upstream database, SDK, network, or secret details. Authentication and upstream failures fail closed.

## Important API families

- Identity/account: `app/api/auth/*`, `app/api/account*`, account profile and credit routes.
- Code flow: `app/api/agentech-code-submit`, `app/api/agentech-simulate`, admin AI-usage/submission routes.
- Scheduling/runs: `app/api/robot-slot`, `app/api/agentech-live-session`, `app/api/master-live-test`.
- Live delivery: `app/api/livekit-token`, `app/api/agentech-capture`, `app/api/master-live-camera*`, `app/api/master-heartbeat`.
- CLI bridge: `app/api/cli-live-handoff`.
- Commerce/entitlements: Stripe checkout/webhook, account credits, invoices, and premium-feature routes.
- Applications: education, club, internship, workshop, preorder, and field-interest endpoints.

## Validation boundary

Accepted customer code is parsed and validated; it is not executed with Python `exec`/`eval`. Translators accept supported literal SDK calls and reject variables/expressions where the contract demands literals, unknown calls or keywords, model-incompatible calls, non-finite/out-of-range arguments, and unsupported control flow. The output is an inert plan with identifiers and hashes; Layer 04 validates it again.

The standalone reference prototype in `engineer_handoff/agentech_t3_engineer_handoff/` demonstrates upload -> SDK-only check -> translation check -> MuJoCo preview -> unlock. Its translated robot code must never be returned to customers.

## Tests and evidence

```bash
pnpm test:auth-sign-in
pnpm test:login-bypass
pnpm test:sdk-reference
pnpm test:return-to-home-access
pnpm test:navi-cli-gateway
pnpm test:aegis-gateway-spec
pnpm test:aegis-device-results
pnpm test:session-device-results
pnpm typecheck
```

For a changed route, test the allowed path, denied path, malformed input, absent configuration, and upstream failure. UI state does not count as API enforcement.

## Common failure modes

- Duplicating a contract in `app/` instead of importing from `lib/` or `features/eaic/02-unified-api/`.
- Renaming `Aegies` as a cosmetic fix without a compatibility migration.
- Trusting a browser-provided email, pass flag, code string, price, or entitlement.
- Calling OpenAI or Supabase service-role APIs from a client component.
- Returning raw translator output, internal exception text, or robot connection detail.
- Treating a compiled plan as a completed run; execution result is a separate authoritative record.

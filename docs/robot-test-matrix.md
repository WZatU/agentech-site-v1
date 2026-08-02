# Offline Website Verification Matrix

Run these gates from the website repository before merging a website change:

```bash
npm test
npm run lint
npm run typecheck
npm run build
```

| Gate | What it verifies | Boundary |
| --- | --- | --- |
| `npm test` — compiler acceptance and rejection | The reviewed compiler accepts approved literal Agentech calls and rejects removed, model-incompatible, nonliteral, or loop-based calls. | It writes inert plans to temporary files; it does not execute customer Python. |
| `npm test` — read-only stream relay | The gateway source transfers an inert plan and trusted runner, never the customer source; session cleanup and stream-status policy are checked. | The bridge is not started and no SSH, OBS, LiveKit, Supabase, or robot connection is made. |
| `npm test` — access policy | Internal, subscription, entitlement, expired, and revoked return-to-home access decisions are deterministic. | No account, payment, or robot state is changed. |
| `npm test` — reference consistency | Aegis, Navi, and Master SDK cards use private-address-free setup, expected counts, unique fields, and approved public names. | It reads local reference files only. |
| `npm run lint` | JavaScript and TypeScript source follows configured ESLint rules. | Static analysis only. |
| `npm run typecheck` | TypeScript checks without writing compiled output. | Static analysis only. |
| `npm run build` | Next.js can produce the production website build. | Build-time validation only; it is not a live robot session. |

None of these tests or gates move a robot. A passing result proves the offline
website implementation and its checked policies, not physical safety,
calibration, camera/stream availability, or real motion behavior. Those
remain supervised hardware checks with the intended robot, operator, and
environment.

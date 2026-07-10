# Software Check Access Policy

This document is the operator and engineering source of truth for Step 3 Physical Hardware Check, Step 4 Software Check, company accounts, and credits.

## Company Identity

An email ending in `@agent-tech.ai` is an Agentech company/internal account. Code must use `lib/company-accounts.ts` for this decision. A company-domain match identifies account policy; it does not independently grant protected admin access.

## Decision Table

| Account | Step 3 status | Credit balance | Step 4 result |
| --- | --- | --- | --- |
| Internal `@agent-tech.ai` | Not passed | Any | Locked until Step 3 passes |
| Internal `@agent-tech.ai` | Passed | Enough credits | Unlocked; charge configured credits |
| Internal `@agent-tech.ai` | Passed | Insufficient credits | Unlocked; run without blocking |
| External | Not passed | Any | Locked until Step 3 passes |
| External | Passed | Enough credits | Unlocked; charge configured credits |
| External | Passed | Insufficient credits | Blocked with recharge required |

Step 4 must always use the exact submission and code that passed Step 3. Editing the code invalidates the client unlock and the API rejects mismatched code.

## Persistence And Enforcement

- The Step 3 API stores the submission and marks the account review gate in Supabase.
- The Software Check page requests the signed-in account's latest submission from `GET /api/agentech-code-submit` and restores a valid hardware pass after navigation or refresh. Production requests require the signed server session rather than the legacy client email cookie.
- `POST /api/agentech-code-submit` rechecks account ownership, latest submission ID, physical status, and unchanged code before calling OpenAI.
- External credit sufficiency is checked before the OpenAI call and charged after a completed review.
- Internal accounts are charged when possible. A missing or insufficient internal balance does not prevent the review result from being saved.

## Admin Dashboard

The AI Gateway admin dashboard at `/admin/ai-gateway` shows:

- `Company / Internal` or `External` on developer accounts and submissions
- current account Software Check credit balance
- the credit rule for each account type
- credits charged on each code submission
- counts of internal profiles and submissions

Admin authorization still comes from the server-side `agentech_admin_users` table. The dashboard's account-type badges are informational.

## Relevant Files

| File | Responsibility |
| --- | --- |
| `lib/company-accounts.ts` | Company-domain and credit-policy source of truth |
| `app/api/agentech-code-submit/route.ts` | Persisted gate lookup, Step 3/4 enforcement, and charging |
| `components/agentech-library-workbench.tsx` | Restore/display the saved gate and run review actions |
| `components/ai-gateway-admin-dashboard.tsx` | Admin account type, balances, and submission charges |
| `app/api/admin/ai-usage/route.ts` | Admin dashboard account and review data |
| `supabase-schema.sql` | Account, submission, credit, and admin tables |

## Operator Verification

Confirm the account gate:

```sql
select
  email,
  credit_balance,
  developer_latest_code_submission_id,
  developer_physical_safety_status,
  developer_ai_security_status
from public.agentech_accounts
where email = 'USER_EMAIL_HERE';
```

Confirm the submission and charge:

```sql
select
  id,
  email,
  physical_safety_status,
  ai_security_status,
  credits_charged,
  created_at
from public.agentech_code_submissions
where email = 'USER_EMAIL_HERE'
order by created_at desc
limit 5;
```

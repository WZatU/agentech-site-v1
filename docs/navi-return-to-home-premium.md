# Navi Return to Home Premium Feature

`Agentech.return_to_home()` is the Navi SDK Library's premium positioning
function. It returns the dog to one fixed OBS+Camo home coordinate and then uses
one of four final headings:

```python
Agentech.return_to_home()                       # 0: saved default heading
Agentech.return_to_home(facing_angle_deg=90)   # right
Agentech.return_to_home(facing_angle_deg=180)  # backward
Agentech.return_to_home(facing_angle_deg=270)  # left
```

No website field or public SDK argument can modify the home X/Y coordinate.

## Automatic scheduled-session cleanup

When a Navi booking reaches its scheduled end, the trusted robot gateway checks
the inert plan created from the reviewed submission. If that plan does not
contain `return_to_home()`, the gateway runs it automatically. After a successful
return—or immediately when the plan already included a return—the gateway calls
`damping()` to mark the session as finished. A failed automatic return is stopped
and retried; damping is not sent before the return succeeds.

This server-injected cleanup is an operational reset and does not consume the
customer's premium entitlement. A customer-authored `return_to_home()` call is
still subject to the access rules below. Direct SDK calls remain composable during
a session; the automatic damping step belongs only to scheduled-end cleanup.
The validator and trusted runner accept only `0`, `90`, `180`, or `270`.

## Access Policy

The server grants access when any one condition is true:

- The signed-in account has an `active` or `trialing` monthly subscription
  whose period has not ended.
- The signed-in account has an active `navi_return_to_home` lifetime
  entitlement from a completed one-time purchase.
- The account is an internal Agentech company account used for operations,
  support, or testing.

All other physical submissions containing `return_to_home()` are denied with
HTTP `402` and `PREMIUM_FEATURE_REQUIRED`. The access check runs in the
server-side code-submission route, so hiding or changing the browser UI does not
bypass it. Local preview remains available without entitlement because it does
not command the physical robot.

## Production Configuration

Apply the tables in `supabase-schema.sql`:

- `agentech_subscriptions`
- `agentech_feature_entitlements`
- `agentech_feature_payments`

Configure these server-only environment variables:

```text
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
AGENTECH_RETURN_TO_HOME_PRICE_CENTS=
```

`AGENTECH_RETURN_TO_HOME_PRICE_CENTS` must be a positive integer amount in USD
cents. There is intentionally no source-code default. Until it is configured,
the SDK Library displays `Price coming soon` and the purchase endpoint returns
`503`; subscribers and existing entitlement holders are unaffected.

## One-Time Purchase Flow

1. The signed-in customer starts checkout from the premium SDK card.
2. The server creates a Stripe Checkout Session in one-time payment mode and
   records a pending feature payment in Supabase.
3. Stripe sends a signed `checkout.session.completed` webhook.
4. After `payment_status=paid`, the webhook marks the payment paid and upserts
   a non-expiring `navi_return_to_home` entitlement.
5. Subsequent server access checks allow the function.

Do not grant access from the browser success URL alone. The Stripe webhook is
the authoritative fulfillment event and is verified using
`STRIPE_WEBHOOK_SECRET`.

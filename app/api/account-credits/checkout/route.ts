import { NextResponse } from "next/server";
import { createAccountCreditPayment, getAccountRecord } from "@/lib/account-records";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { siteUrl } from "@/lib/site-config";

type CreditCheckoutPayload = {
  email?: string;
  credits?: number | string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function toCreditAmount(value: unknown) {
  const amount = typeof value === "number" ? value : Number(clean(value));
  if (!Number.isFinite(amount)) {
    return 0;
  }

  return Math.max(0, Math.floor(amount));
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as CreditCheckoutPayload | null;
  const email = normalizeEmail(payload?.email);
  const credits = toCreditAmount(payload?.credits);
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid account email is required." }, { status: 400 });
  }

  if (credits < 100) {
    return NextResponse.json({ error: "Enter at least 100 credits." }, { status: 400 });
  }

  if (!secretKey) {
    return NextResponse.json({ error: "Stripe is not configured yet. Set STRIPE_SECRET_KEY to enable card payments." }, { status: 500 });
  }

  const account = await getAccountRecord(email);
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  const amountCents = credits;
  const accountUrl = `${siteUrl}/account`;
  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("customer_email", email);
  body.set("client_reference_id", `account-credit:${email}`);
  body.set("success_url", `${accountUrl}?credits=success`);
  body.set("cancel_url", `${accountUrl}?credits=cancelled`);
  body.set("metadata[purpose]", "account_credit_recharge");
  body.set("metadata[email]", email);
  body.set("metadata[credits]", String(credits));
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", String(amountCents));
  body.set("line_items[0][price_data][product_data][name]", `${credits.toLocaleString()} Agentech account credits`);

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });
  const result = (await response.json().catch(() => null)) as { id?: string; url?: string; error?: { message?: string } } | null;

  if (!response.ok || !result?.id || !result.url) {
    return NextResponse.json({ error: result?.error?.message || "Unable to create Stripe Checkout session." }, { status: 400 });
  }

  await createAccountCreditPayment({
    email,
    credits,
    amountCents,
    stripeSessionId: result.id
  });

  return NextResponse.json({ ok: true, checkoutUrl: result.url, sessionId: result.id });
}

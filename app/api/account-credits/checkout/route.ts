import { NextRequest, NextResponse } from "next/server";
import { addAccountCredits, createAccountCreditPayment, getAccountRecord } from "@/lib/account-records";
import { isInternalAccountEmail, isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { getServerAccountEmail } from "@/lib/server-account-session";
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

function calculateCardChargeCents(creditValueCents: number) {
  return Math.ceil((creditValueCents + 30) / 0.971);
}

export async function POST(request: NextRequest) {
  const payload = (await request.json().catch(() => null)) as CreditCheckoutPayload | null;
  const requestedEmail = normalizeEmail(payload?.email);
  const email = normalizeEmail(await getServerAccountEmail(request));
  const credits = toCreditAmount(payload?.credits);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Sign in again before adding account credits." }, { status: 401 });
  }

  if (requestedEmail && requestedEmail !== email) {
    return NextResponse.json({ error: "Credits can only be added to the signed-in account." }, { status: 403 });
  }

  if (credits < 100) {
    return NextResponse.json({ error: "Enter at least 100 credits." }, { status: 400 });
  }

  const account = await getAccountRecord(email);
  if (!account) {
    return NextResponse.json({ error: "Account not found." }, { status: 404 });
  }

  if (isInternalAccountEmail(email)) {
    const result = await addAccountCredits(email, "bonus", credits);
    if (!result) {
      return NextResponse.json({ error: "The internal credit balance could not be saved." }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      creditedDirectly: true,
      creditsAdded: credits,
      ...result
    });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    return NextResponse.json({ error: "Stripe is not configured yet. Set STRIPE_SECRET_KEY to enable card payments." }, { status: 500 });
  }

  const amountCents = calculateCardChargeCents(credits);
  const processingFeeCents = amountCents - credits;
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
  body.set("metadata[processing_fee_cents]", String(processingFeeCents));
  body.set("line_items[0][quantity]", "1");
  body.set("line_items[0][price_data][currency]", "usd");
  body.set("line_items[0][price_data][unit_amount]", String(amountCents));
  body.set("line_items[0][price_data][product_data][name]", `${credits.toLocaleString()} Agentech account credits plus card processing`);

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

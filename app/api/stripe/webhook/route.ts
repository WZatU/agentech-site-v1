import { NextResponse } from "next/server";
import { fulfillAccountCreditPayment } from "@/lib/account-records";
import { markBillingInvoicePaid, verifyStripeSignature } from "@/lib/billing";
import { fulfillFeaturePayment, RETURN_TO_HOME_FEATURE_CODE } from "@/lib/premium-features";

type StripeCheckoutSession = {
  id?: string;
  client_reference_id?: string | null;
  payment_intent?: string | null;
  metadata?: {
    purpose?: string;
    email?: string;
    credits?: string;
    invoice_number?: string;
    feature_code?: string;
  } | null;
  payment_status?: string | null;
};

type StripeEvent = {
  type?: string;
  data?: {
    object?: StripeCheckoutSession;
  };
};

export async function POST(request: Request) {
  const payload = await request.text();
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    return NextResponse.json({ error: "Stripe webhook is not configured." }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!verifyStripeSignature(payload, signature, endpointSecret)) {
    return NextResponse.json({ error: "Invalid Stripe signature." }, { status: 400 });
  }

  const event = JSON.parse(payload) as StripeEvent;

  if (event.type === "checkout.session.completed") {
    const session = event.data?.object;
    const purpose = session?.metadata?.purpose || "";

    if (purpose === "account_credit_recharge" && session?.id && session.payment_status === "paid") {
      await fulfillAccountCreditPayment({
        stripeSessionId: session.id,
        paymentIntentId: session.payment_intent || null
      });

      return NextResponse.json({ received: true });
    }

    if (
      purpose === "premium_feature_purchase" &&
      session?.metadata?.feature_code === RETURN_TO_HOME_FEATURE_CODE &&
      session?.id &&
      session.payment_status === "paid"
    ) {
      await fulfillFeaturePayment({
        stripeSessionId: session.id,
        paymentIntentId: session.payment_intent || null
      });

      return NextResponse.json({ received: true });
    }

    const invoiceNumber = session?.metadata?.invoice_number || session?.client_reference_id || "";

    if (invoiceNumber && session?.payment_status === "paid") {
      await markBillingInvoicePaid(invoiceNumber, {
        stripeSessionId: session.id || null,
        paymentIntentId: session.payment_intent || null
      });
    }
  }

  return NextResponse.json({ received: true });
}

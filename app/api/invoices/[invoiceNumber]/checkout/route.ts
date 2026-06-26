import { NextResponse } from "next/server";
import { createStripeCheckoutSession, getBillingInvoice, isBillingAdmin } from "@/lib/billing";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

type CheckoutRouteContext = {
  params: Promise<{
    invoiceNumber: string;
  }>;
};

type CheckoutPayload = {
  email?: string;
};

export async function POST(request: Request, context: CheckoutRouteContext) {
  const { invoiceNumber } = await context.params;
  const payload = (await request.json().catch(() => null)) as CheckoutPayload | null;
  const email = normalizeEmail(payload?.email);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const invoice = await getBillingInvoice(invoiceNumber);

  if (!invoice) {
    return NextResponse.json({ error: "Invoice not found." }, { status: 404 });
  }

  if (invoice.email !== email && !(await isBillingAdmin(email))) {
    return NextResponse.json({ error: "You do not have access to this invoice." }, { status: 403 });
  }

  const result = await createStripeCheckoutSession(invoice);

  if ("error" in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, checkoutUrl: result.checkoutUrl, sessionId: result.sessionId });
}

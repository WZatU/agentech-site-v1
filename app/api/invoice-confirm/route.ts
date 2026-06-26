import { NextResponse } from "next/server";
import { createBillingInvoiceFromCart, sendBillingInvoiceEmail } from "@/lib/billing";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

type ConfirmPayload = {
  email?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as ConfirmPayload | null;
  const email = normalizeEmail(payload?.email);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
  }

  const invoice = await createBillingInvoiceFromCart(email);

  if (!invoice) {
    return NextResponse.json({ error: "There are no items to confirm." }, { status: 400 });
  }

  const emailResult = await sendBillingInvoiceEmail(invoice).catch(() => ({ sent: false }));

  return NextResponse.json({
    ok: true,
    invoiceNumber: invoice.invoice_number,
    emailSent: emailResult.sent,
    message: emailResult.sent
      ? "Request confirmed. Agentech emailed your invoice."
      : "Request confirmed. Invoice was created, but email is not configured yet."
  });
}

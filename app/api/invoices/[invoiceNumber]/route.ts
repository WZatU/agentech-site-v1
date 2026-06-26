import { NextResponse } from "next/server";
import { getBillingInvoice, isBillingAdmin } from "@/lib/billing";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

type InvoiceRouteContext = {
  params: Promise<{
    invoiceNumber: string;
  }>;
};

export async function GET(request: Request, context: InvoiceRouteContext) {
  const { invoiceNumber } = await context.params;
  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get("email"));

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

  return NextResponse.json({ ok: true, invoice });
}

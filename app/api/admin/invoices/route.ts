import { NextResponse } from "next/server";
import { getAllBillingInvoices, isBillingAdmin } from "@/lib/billing";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = normalizeEmail(url.searchParams.get("email"));

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "A valid admin email is required." }, { status: 400 });
  }

  if (!(await isBillingAdmin(email))) {
    return NextResponse.json({ error: "Admin access required." }, { status: 403 });
  }

  const invoices = await getAllBillingInvoices();

  return NextResponse.json({ ok: true, invoices });
}

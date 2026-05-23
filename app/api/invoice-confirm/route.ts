import { NextResponse } from "next/server";
import { getUnpaidBalanceLines, sendUnpaidBalanceInvoice } from "@/lib/invoices";
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

  const balance = await getUnpaidBalanceLines(email);
  const confirmableLines = balance.lines.filter((line) => !line.invoiceEmailSentAt);

  if (!confirmableLines.length) {
    return NextResponse.json({ error: "There are no items to confirm." }, { status: 400 });
  }

  const invoiceNumber = `REQ-${Date.now().toString().slice(-8)}`;
  const result = await sendUnpaidBalanceInvoice(email, invoiceNumber);

  if (!result.sent) {
    return NextResponse.json({ error: "Unable to send invoice email." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: "Request confirmed. Agentech emailed your invoice."
  });
}

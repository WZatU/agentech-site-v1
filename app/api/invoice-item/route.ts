import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { getUnpaidBalanceLines, type InvoiceItem } from "@/lib/invoices";
import { formatInvoiceItemName } from "@/lib/name-format";
import { formatUsd } from "@/lib/pricing";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { supabaseRequest } from "@/lib/supabase-server";

type DeletePayload = {
  email?: string;
  itemId?: string;
};

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function toAmount(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

async function sendRemovalEmail(email: string, item: InvoiceItem) {
  const itemName = formatInvoiceItemName(item.item_name);
  const amount = toAmount(item.amount);
  const balance = await getUnpaidBalanceLines(email);

  return sendEmail({
    to: email,
    subject: `Agentech cart item removed: ${itemName}`,
    text: [
      "An item was removed from your Agentech request cart.",
      "",
      `Removed item: ${itemName}`,
      `Amount: ${formatUsd(amount)}`,
      `Remaining unpaid balance: ${formatUsd(balance.total)}`,
      "",
      "If you did not make this change, please reply to this email and Agentech will help you review your account."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h1 style="margin: 0 0 12px;">Cart item removed</h1>
        <p style="margin: 0 0 18px;">An item was removed from your Agentech request cart.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 18px 0;">
          <tbody>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">Removed item</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${escapeHtml(itemName)}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">Amount</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatUsd(amount)}</td>
            </tr>
            <tr>
              <td style="padding: 14px 0; font-weight: 700;">Remaining unpaid balance</td>
              <td style="padding: 14px 0; text-align: right; font-weight: 700;">${formatUsd(balance.total)}</td>
            </tr>
          </tbody>
        </table>
        <p>If you did not make this change, please reply to this email and Agentech will help you review your account.</p>
      </div>
    `
  });
}

export async function DELETE(request: Request) {
  const payload = (await request.json().catch(() => null)) as DeletePayload | null;
  const email = normalizeEmail(payload?.email);
  const itemId = payload?.itemId || "";
  const match = /^item-(\d+)$/.exec(itemId);

  if (!isValidEmail(email) || !match) {
    return NextResponse.json({ error: "Choose a valid unpaid item to remove." }, { status: 400 });
  }

  const itemRows = await supabaseRequest<InvoiceItem[]>("agentech_invoice_items", {
    query: `id=eq.${match[1]}&email=eq.${encodeURIComponent(email)}&paid=eq.false&select=*&limit=1`
  });
  const item = itemRows[0];

  if (!item) {
    return NextResponse.json({ error: "That unpaid item was not found." }, { status: 404 });
  }

  await supabaseRequest<null>("agentech_invoice_items", {
    method: "DELETE",
    query: `id=eq.${match[1]}&email=eq.${encodeURIComponent(email)}&paid=eq.false`,
    prefer: "return=minimal"
  });

  if (item.source_type === "robot" && item.source_id) {
    await supabaseRequest<null>("agentech_preorder_invoices", {
      method: "PATCH",
      query: `invoice_number=eq.${encodeURIComponent(item.source_id)}&email=eq.${encodeURIComponent(email)}`,
      prefer: "return=minimal",
      body: {
        status: "removed_from_cart"
      }
    }).catch(() => null);
  }

  const emailResult = await sendRemovalEmail(email, item);

  return NextResponse.json({
    ok: true,
    emailSent: emailResult.sent,
    message: emailResult.sent
      ? "Item removed. A confirmation email was sent."
      : "Item removed. Confirmation email is not configured yet."
  });
}

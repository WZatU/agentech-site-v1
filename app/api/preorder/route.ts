import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { createInvoiceItem, sendUnpaidBalanceInvoice } from "@/lib/invoices";
import { getProductPrice, formatUsd } from "@/lib/pricing";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { getProfile, upsertProfile } from "@/lib/account-records";
import { formatPersonName } from "@/lib/name-format";
import { supabaseRequest } from "@/lib/supabase-server";

type PreorderPayload = {
  product?: string;
  email?: string;
  name?: string;
  phone?: string;
  company?: string;
  notes?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as PreorderPayload | null;
  const email = normalizeEmail(payload?.email);
  const product = clean(payload?.product);
  const name = formatPersonName(payload?.name);
  const phone = clean(payload?.phone);
  const company = clean(payload?.company);
  const notes = clean(payload?.notes);

  if (!product) {
    return NextResponse.json({ error: "Choose a robot model." }, { status: 400 });
  }

  const productPrice = getProductPrice(product);
  if (!productPrice) {
    return NextResponse.json({ error: "Choose a valid robot model." }, { status: 400 });
  }

  if (!isValidEmail(email) || !name || !phone) {
    return NextResponse.json({ error: "Name, email, and phone number are required." }, { status: 400 });
  }

  const invoiceNumber = `AGT-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;
  const [firstName, ...lastParts] = name.split(/\s+/);
  const existingProfile = await getProfile(email);

  await upsertProfile({
    email,
    first_name: formatPersonName(firstName || name),
    last_name: formatPersonName(lastParts.join(" ")),
    phone,
    company: company || existingProfile?.company || null,
    address: existingProfile?.address || null,
    dob: existingProfile?.dob || null,
    account_type: existingProfile?.account_type || null
  });

  await supabaseRequest("agentech_preorder_invoices", {
    method: "POST",
    body: {
      invoice_number: invoiceNumber,
      product,
      email,
      name,
      phone,
      company,
      notes,
      status: "invoice_email_pending",
      online_payment_accepted: false,
      total_amount: productPrice.total
    }
  });

  await createInvoiceItem({
    email,
    sourceType: "robot",
    sourceId: invoiceNumber,
    itemName: productPrice.label,
    amount: productPrice.total
  });

  try {
    const balanceEmail = await sendUnpaidBalanceInvoice(email, invoiceNumber);

    await sendEmail({
      to: process.env.RESEND_REPLY_TO || "info@agent-tech.ai",
      subject: `New robot preorder invoice request: ${product}`,
      text: [
        `Invoice: ${invoiceNumber}`,
        `Product: ${product}`,
        `Robot amount: ${formatUsd(productPrice.total)}`,
        `Customer unpaid balance emailed: ${formatUsd(balanceEmail.total)}`,
        `Name: ${name}`,
        `Email: ${email}`,
        `Phone: ${phone}`,
        `Company: ${company || "-"}`,
        `Notes: ${notes || "-"}`
      ].join("\n")
    });

    await supabaseRequest("agentech_preorder_invoices", {
      method: "PATCH",
      query: `invoice_number=eq.${encodeURIComponent(invoiceNumber)}`,
      body: {
        status: "balance_invoice_email_sent"
      }
    });
  } catch {
    await supabaseRequest("agentech_preorder_invoices", {
      method: "PATCH",
      query: `invoice_number=eq.${encodeURIComponent(invoiceNumber)}`,
    body: {
        status: "balance_invoice_email_failed"
      }
    });

    return NextResponse.json({ error: "Invoice request saved, but the balance email could not be sent. Check Resend settings." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    invoiceNumber,
    message: "Invoice request created. Agentech emailed your current unpaid balance; no online payment is accepted."
  });
}

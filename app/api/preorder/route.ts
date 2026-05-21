import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
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
  const name = clean(payload?.name);
  const phone = clean(payload?.phone);
  const company = clean(payload?.company);
  const notes = clean(payload?.notes);

  if (!product) {
    return NextResponse.json({ error: "Choose a robot model." }, { status: 400 });
  }

  if (!isValidEmail(email) || !name || !phone) {
    return NextResponse.json({ error: "Name, email, and phone number are required." }, { status: 400 });
  }

  const invoiceNumber = `AGT-${new Date().getFullYear()}-${Date.now().toString().slice(-8)}`;

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
      online_payment_accepted: false
    }
  });

  try {
    await sendEmail({
      to: email,
      subject: `Agentech invoice request ${invoiceNumber}`,
      text: `We received your invoice request for ${product}. Invoice request number: ${invoiceNumber}. Agentech does not accept online payment right now; our team will follow up by email.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827;">
          <h1>Invoice request received</h1>
          <p>We received your request for <strong>${product}</strong>.</p>
          <p>Invoice request number: <strong>${invoiceNumber}</strong></p>
          <p>Agentech does not accept online payment right now. Our team will follow up by email.</p>
        </div>
      `
    });

    await sendEmail({
      to: process.env.RESEND_REPLY_TO || "info@agent-tech.ai",
      subject: `New robot preorder invoice request: ${product}`,
      text: [
        `Invoice: ${invoiceNumber}`,
        `Product: ${product}`,
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
        status: "invoice_email_sent"
      }
    });
  } catch {
    await supabaseRequest("agentech_preorder_invoices", {
      method: "PATCH",
      query: `invoice_number=eq.${encodeURIComponent(invoiceNumber)}`,
      body: {
        status: "invoice_email_failed"
      }
    });

    return NextResponse.json({ error: "Invoice request saved, but email could not be sent. Check Resend settings." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    invoiceNumber,
    message: "Invoice request created. Agentech will send the invoice to your email; no online payment is accepted."
  });
}

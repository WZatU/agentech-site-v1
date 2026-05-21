import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

type PreorderPayload = {
  product?: string;
  email?: string;
  name?: string;
  phone?: string;
  company?: string;
  notes?: string;
};

const preorderPath = path.join(process.cwd(), "data", "preorder-invoices.json");

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

async function readRequests() {
  try {
    const raw = await fs.readFile(preorderPath, "utf8");
    return JSON.parse(raw) as Array<Record<string, unknown>>;
  } catch {
    return [];
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as PreorderPayload | null;
  const email = normalizeEmail(payload?.email);
  const product = clean(payload?.product);
  const name = clean(payload?.name);
  const phone = clean(payload?.phone);

  if (!product) {
    return NextResponse.json({ error: "Choose a robot model." }, { status: 400 });
  }

  if (!isValidEmail(email) || !name || !phone) {
    return NextResponse.json({ error: "Name, email, and phone number are required." }, { status: 400 });
  }

  const requests = await readRequests();
  const invoiceNumber = `AGT-${new Date().getFullYear()}-${String(requests.length + 1).padStart(5, "0")}`;

  requests.push({
    invoiceNumber,
    product,
    email,
    name,
    phone,
    company: clean(payload?.company),
    notes: clean(payload?.notes),
    status: "invoice_email_pending",
    onlinePaymentAccepted: false,
    createdAt: new Date().toISOString()
  });

  await fs.mkdir(path.dirname(preorderPath), { recursive: true });
  await fs.writeFile(preorderPath, `${JSON.stringify(requests, null, 2)}\n`);

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
        `Company: ${clean(payload?.company) || "-"}`,
        `Notes: ${clean(payload?.notes) || "-"}`
      ].join("\n")
    });
  } catch {
    return NextResponse.json({ error: "Invoice request saved, but email could not be sent. Check Resend settings." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    invoiceNumber,
    message: "Invoice request created. Email sending will be connected next; no online payment is accepted."
  });
}

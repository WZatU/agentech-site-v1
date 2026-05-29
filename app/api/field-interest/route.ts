import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { isValidEmail, normalizeEmail } from "@/lib/prototype-auth";
import { siteUrl } from "@/lib/site-config";
import { supabaseRequest } from "@/lib/supabase-server";

const allowedInterests = new Set(["Workshop"]);

type InterestPayload = {
  email?: string;
  interest?: string;
  source?: string;
};

function clean(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function sendFieldInterestReceipt(email: string) {
  const logoUrl = new URL("/assets/logo/AGENTECH.png", siteUrl).toString();
  const websiteUrl = siteUrl;

  return sendEmail({
    to: email,
    subject: "Thank you for your interest in Agentech",
    text: [
      "Hi,",
      "",
      "Thank you for sharing your opinion with Agentech.",
      "",
      "We received your workshop interest. Our team may reach out to you with more information if there is a good fit.",
      "",
      "You can learn more about Agentech here:",
      websiteUrl,
      "",
      "Thank you,",
      "The Agentech Team"
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.6; max-width: 560px;">
        <div style="margin: 0 0 24px;">
          <img src="${escapeHtml(logoUrl)}" alt="Agentech" width="168" style="display: block; max-width: 168px; height: auto;" />
        </div>
        <p style="margin: 0 0 16px;">Hi,</p>
        <p style="margin: 0 0 16px;">Thank you for sharing your opinion with Agentech.</p>
        <p style="margin: 0 0 20px;">We received your workshop interest. Our team may reach out to you with more information if there is a good fit.</p>
        <p style="margin: 0 0 20px;">
          You can learn more about Agentech here:<br />
          <a href="${escapeHtml(websiteUrl)}" style="color: #2563eb; font-weight: 700;">${escapeHtml(websiteUrl)}</a>
        </p>
        <p style="margin: 0;">
          Thank you,<br />
          The Agentech Team
        </p>
      </div>
    `
  });
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as InterestPayload | null;
  const email = normalizeEmail(payload?.email);
  const interest = clean(payload?.interest, 80);
  const source = clean(payload?.source, 80) || "field_qr";

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  if (!allowedInterests.has(interest)) {
    return NextResponse.json({ error: "Choose an interest." }, { status: 400 });
  }

  await supabaseRequest("agentech_field_interest_leads", {
    method: "POST",
    body: {
      email,
      interest_area: interest,
      notes: null,
      source,
      status: "new"
    }
  });
  const emailResult = await sendFieldInterestReceipt(email).catch(() => ({ sent: false }));

  return NextResponse.json({
    ok: true,
    emailSent: emailResult.sent,
    message: emailResult.sent
      ? "Thanks. We saved your interest and sent a confirmation email."
      : "Thanks. We saved your interest."
  });
}

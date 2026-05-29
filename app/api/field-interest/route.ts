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
    subject: "Thank you for sharing your thoughts with Agentech",
    text: [
      "Thank you for sharing your thoughts with Agentech.",
      "",
      "We appreciate you taking a moment to tell us your opinion, idea, or area of interest.",
      "",
      "Selected interest: Workshop",
      "",
      "Our team may reach out if there is a good opportunity to continue the conversation.",
      "",
      `Website: ${websiteUrl}`,
      "",
      "Agentech"
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <div style="margin: 0 0 22px;">
          <img src="${escapeHtml(logoUrl)}" alt="Agentech" width="168" style="display: block; max-width: 168px; height: auto;" />
        </div>
        <h1 style="margin: 0 0 12px;">Thank you for sharing your thoughts with Agentech.</h1>
        <p style="margin: 0 0 14px;">We appreciate you taking a moment to tell us your opinion, idea, or area of interest.</p>
        <p style="margin: 0 0 14px;">Selected interest: <strong>Workshop</strong></p>
        <p style="margin: 0 0 18px;">Our team may reach out if there is a good opportunity to continue the conversation.</p>
        <p style="margin: 0;">
          Website:
          <a href="${escapeHtml(websiteUrl)}" style="color: #0f172a; font-weight: 700;">${escapeHtml(websiteUrl)}</a>
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

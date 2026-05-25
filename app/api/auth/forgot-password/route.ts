import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";
import { createVerificationCode, findAccount, isValidEmail, normalizeEmail } from "@/lib/prototype-auth";

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as { email?: string } | null;
  const email = normalizeEmail(payload?.email);

  if (!isValidEmail(email)) {
    return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const existing = await findAccount(email);
  if (!existing) {
    return NextResponse.json({ error: "No Agentech account exists for that email." }, { status: 404 });
  }

  const code = await createVerificationCode(email);
  let emailResult: { sent: boolean };

  try {
    emailResult = await sendEmail({
      to: email,
      subject: "Reset your Agentech password",
      text: `Your Agentech password reset code is ${code}. It expires in 10 minutes.`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111827;">
          <h1>Reset your Agentech password</h1>
          <p>Use this code to create a new password for your Agentech account:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px;">${code}</p>
          <p>This code expires in 10 minutes.</p>
        </div>
      `
    });
  } catch {
    return NextResponse.json({ error: "Unable to send reset email. Check Resend settings." }, { status: 502 });
  }

  return NextResponse.json({
    ok: true,
    message: emailResult.sent ? "Password reset code sent to your email." : "Password reset code created. Email delivery is not configured locally.",
    devCode: emailResult.sent ? undefined : code
  });
}

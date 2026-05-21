type EmailInput = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

export async function sendEmail({ to, subject, text, html }: EmailInput) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL || "noreply@agent-tech.ai";
  const replyTo = process.env.RESEND_REPLY_TO || "info@agent-tech.ai";

  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY is not configured." };
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: `Agentech <${from}>`,
      to,
      subject,
      text,
      html,
      reply_to: replyTo
    })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(error || "Unable to send email.");
  }

  return { sent: true };
}

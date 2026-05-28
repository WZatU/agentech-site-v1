import { sendEmail } from "@/lib/email";
import type { InternshipApplication } from "@/lib/internship";
import type { SummerSchoolApplication } from "@/lib/summer-school";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "https://www.agent-tech.ai";
const logoUrl = new URL("/assets/logo/AGENTECH.png", siteUrl).toString();

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function receiptHtml(title: string, body: string[], details: Array<[string, string]>) {
  const detailRows = details
    .map(
      ([label, value]) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; color: #6b7280;">${escapeHtml(label)}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700;">${escapeHtml(value)}</td>
        </tr>
      `
    )
    .join("");

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <div style="margin: 0 0 22px;">
        <img src="${escapeHtml(logoUrl)}" alt="Agentech" width="168" style="display: block; max-width: 168px; height: auto;" />
      </div>
      <h1 style="margin: 0 0 12px;">${escapeHtml(title)}</h1>
      ${body.map((paragraph) => `<p style="margin: 0 0 14px;">${escapeHtml(paragraph)}</p>`).join("")}
      <table style="width: 100%; border-collapse: collapse; margin: 18px 0;">
        <tbody>${detailRows}</tbody>
      </table>
      <p style="margin: 18px 0 0;">You can sign in to your Agentech account to view your application record.</p>
    </div>
  `;
}

export async function sendInternshipReceipt(application: InternshipApplication) {
  await sendEmail({
    to: application.email,
    subject: "Agentech Internship Application Received",
    text: [
      `Dear ${application.name},`,
      "",
      "Thank you for applying to the Agentech Internship Program. This email confirms that we have received your application materials.",
      "",
      "Application summary:",
      `Applicant: ${application.name}`,
      `Selected track(s): ${application.roleInterests.join(", ")}`,
      `Resume file: ${application.resumeFilename}`,
      "",
      "Our team will review your submission carefully. If your background and interests align with our current internship needs, we will contact you with next steps.",
      "",
      "You can sign in to your Agentech account at any time to view your application record.",
      "",
      "Thank you again for your interest in Agentech.",
      "",
      "Sincerely,",
      "Agentech Talent Team"
    ].join("\n"),
    html: receiptHtml(
      "Internship Application Received",
      [
        `Dear ${application.name},`,
        "Thank you for applying to the Agentech Internship Program. This email confirms that we have received your application materials.",
        "Our team will review your submission carefully. If your background and interests align with our current internship needs, we will contact you with next steps.",
        "Thank you again for your interest in Agentech."
      ],
      [
        ["Applicant", application.name],
        ["Selected track(s)", application.roleInterests.join(", ")],
        ["Resume file", application.resumeFilename]
      ]
    )
  });
}

export async function sendAiRoboticsClubReceipt(application: SummerSchoolApplication) {
  const recipients = Array.from(new Set([application.email, application.parentEmail].map((email) => email.trim().toLowerCase()).filter(Boolean)));

  await Promise.all(
    recipients.map((to) =>
      sendEmail({
        to,
        subject: "Agentech received your AI Robotics Club application",
        text: [
          "We received your Agentech AI Robotics Club application.",
          "",
          `Name: ${application.name}`,
          `Grade: ${application.grade}`,
          `Interest areas: ${application.interests.join(", ")}`,
          "",
          "Our team will review your application. You can sign in to your Agentech account to view your application record.",
          "",
          "Agentech"
        ].join("\n"),
        html: receiptHtml(
          "We received your AI Robotics Club application",
          [
            "Thank you for applying to Agentech AI Robotics Club. Our team received your application and will review it.",
            "This email is a confirmation that your submission was saved successfully."
          ],
          [
            ["Name", application.name],
            ["Grade", application.grade],
            ["Interest areas", application.interests.join(", ")]
          ]
        )
      })
    )
  );
}

import { sendEmail } from "@/lib/email";
import { formatUsd } from "@/lib/pricing";
import { supabaseRequest } from "@/lib/supabase-server";

export type InvoiceItem = {
  id: number;
  email: string;
  source_type: "robot" | "course" | "other";
  source_id: string | null;
  item_name: string;
  child_id: number | null;
  class_id: string | null;
  quantity: number;
  unit_price: number | string;
  amount: number | string;
  paid: boolean;
  invoice_email_sent_at: string | null;
  created_at: string;
};

type EnrollmentBalance = {
  id: number;
  parent_email: string;
  child_id: number;
  site_name: string | null;
  class_id: string | null;
  price: number | string | null;
  paid: boolean;
  invoice_email_sent_at: string | null;
  created_at: string;
  agentech_classes?: {
    class_name: string;
  } | null;
  agentech_children?: {
    first_name: string;
    last_name: string;
  } | null;
};

export type BalanceLine = {
  id: string;
  sourceType: "robot" | "course" | "other";
  itemName: string;
  amount: number;
  createdAt: string;
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

export async function createInvoiceItem(item: {
  email: string;
  sourceType: "robot" | "course" | "other";
  sourceId?: string | null;
  itemName: string;
  amount: number;
  childId?: number | null;
  classId?: string | null;
  quantity?: number;
}) {
  const quantity = item.quantity ?? 1;
  const rows = await supabaseRequest<InvoiceItem[]>("agentech_invoice_items", {
    method: "POST",
    body: {
      email: item.email,
      source_type: item.sourceType,
      source_id: item.sourceId || null,
      item_name: item.itemName,
      child_id: item.childId || null,
      class_id: item.classId || null,
      quantity,
      unit_price: item.amount / quantity,
      amount: item.amount,
      paid: false
    }
  });

  return rows[0] ?? null;
}

export async function getUnpaidBalanceLines(email: string) {
  const invoiceItems = await supabaseRequest<InvoiceItem[]>("agentech_invoice_items", {
    query: `email=eq.${encodeURIComponent(email)}&paid=eq.false&select=*&order=created_at.asc`
  }).catch(() => []);

  const enrollments = await supabaseRequest<EnrollmentBalance[]>("agentech_enrollments", {
    query: `parent_email=eq.${encodeURIComponent(email)}&paid=eq.false&select=id,parent_email,child_id,site_name,class_id,price,paid,invoice_email_sent_at,created_at,agentech_classes(class_name),agentech_children(first_name,last_name)&order=created_at.asc`
  }).catch(() => []);

  const itemLines: BalanceLine[] = invoiceItems.map((item) => ({
    id: `item-${item.id}`,
    sourceType: item.source_type,
    itemName: item.item_name,
    amount: toAmount(item.amount),
    createdAt: item.created_at
  }));

  const enrollmentLines: BalanceLine[] = enrollments
    .filter((enrollment) => toAmount(enrollment.price) > 0)
    .map((enrollment) => {
      const childName = enrollment.agentech_children
        ? `${enrollment.agentech_children.first_name} ${enrollment.agentech_children.last_name}`.trim()
        : "";
      const className = enrollment.agentech_classes?.class_name || enrollment.class_id || "Course enrollment";
      const itemName = childName ? `${className} for ${childName}` : className;

      return {
        id: `enrollment-${enrollment.id}`,
        sourceType: "course",
        itemName,
        amount: toAmount(enrollment.price),
        createdAt: enrollment.created_at
      };
    });

  const lines = [...itemLines, ...enrollmentLines].sort((left, right) =>
    left.createdAt.localeCompare(right.createdAt)
  );

  return {
    lines,
    total: lines.reduce((sum, line) => sum + line.amount, 0)
  };
}

export async function sendUnpaidBalanceInvoice(email: string, invoiceNumber: string) {
  const { lines, total } = await getUnpaidBalanceLines(email);

  if (!lines.length) {
    return { sent: false, total: 0, lineCount: 0 };
  }

  const textLines = lines.map((line) => `${line.itemName}: ${formatUsd(line.amount)}`);
  const htmlRows = lines
    .map(
      (line) => `
        <tr>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">${escapeHtml(line.itemName)}</td>
          <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatUsd(line.amount)}</td>
        </tr>
      `
    )
    .join("");

  await sendEmail({
    to: email,
    subject: `Agentech unpaid balance ${invoiceNumber}`,
    text: [
      "Your Agentech unpaid balance is below.",
      "",
      ...textLines,
      "",
      `Total unpaid balance: ${formatUsd(total)}`,
      "",
      "Agentech does not accept online payment right now. Our team will follow up with payment instructions."
    ].join("\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h1 style="margin: 0 0 12px;">Agentech unpaid balance</h1>
        <p style="margin: 0 0 18px;">Invoice reference: <strong>${escapeHtml(invoiceNumber)}</strong></p>
        <table style="width: 100%; border-collapse: collapse; margin: 18px 0;">
          <tbody>${htmlRows}</tbody>
          <tfoot>
            <tr>
              <td style="padding: 14px 0; font-weight: 700;">Total unpaid balance</td>
              <td style="padding: 14px 0; text-align: right; font-weight: 700;">${formatUsd(total)}</td>
            </tr>
          </tfoot>
        </table>
        <p>Agentech does not accept online payment right now. Our team will follow up with payment instructions.</p>
      </div>
    `
  });

  const now = new Date().toISOString();
  await supabaseRequest<null>("agentech_invoice_items", {
    method: "PATCH",
    query: `email=eq.${encodeURIComponent(email)}&paid=eq.false`,
    prefer: "return=minimal",
    body: {
      invoice_email_sent_at: now
    }
  }).catch(() => null);

  await supabaseRequest<null>("agentech_enrollments", {
    method: "PATCH",
    query: `parent_email=eq.${encodeURIComponent(email)}&paid=eq.false`,
    prefer: "return=minimal",
    body: {
      invoice_email_sent_at: now
    }
  }).catch(() => null);

  return { sent: true, total, lineCount: lines.length };
}

import { createHmac, timingSafeEqual } from "crypto";
import { sendEmail } from "@/lib/email";
import { type InvoiceItem } from "@/lib/invoices";
import { formatFullName, formatInvoiceItemName } from "@/lib/name-format";
import { formatUsd } from "@/lib/pricing";
import { siteUrl } from "@/lib/site-config";
import { supabaseRequest } from "@/lib/supabase-server";

export type BillingInvoiceStatus = "draft" | "sent" | "paid" | "payment_failed" | "void" | "refunded";

export type BillingInvoice = {
  id: number;
  invoice_number: string;
  email: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_company: string | null;
  customer_address: string | null;
  status: BillingInvoiceStatus;
  currency: string;
  subtotal: number | string;
  tax_rate: number | string;
  tax_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  amount_paid: number | string;
  notes: string | null;
  terms: string | null;
  stripe_checkout_session_id: string | null;
  stripe_payment_intent_id: string | null;
  due_date: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type BillingInvoiceLine = {
  id: number;
  invoice_number: string;
  source_item_id: number | null;
  source_type: "robot" | "course" | "session" | "other";
  source_id: string | null;
  description: string;
  quantity: number;
  unit_price: number | string;
  amount: number | string;
  child_id: number | null;
  class_id: string | null;
  created_at: string;
};

export type BillingInvoiceWithLines = BillingInvoice & {
  lines: BillingInvoiceLine[];
};

type BillingProfile = {
  first_name: string;
  last_name: string;
  phone: string;
  company: string | null;
  address: string | null;
};

type LegacyPreorderInvoice = {
  invoice_number: string;
  product: string;
  email: string;
  name: string;
  phone: string;
  company: string | null;
  notes: string | null;
  status: string;
  total_amount: number | string | null;
  created_at: string;
};

const defaultTerms = "Payment is due upon receipt unless otherwise agreed in writing. Online card payments are securely processed by Stripe when enabled.";
const defaultNotes = "Thank you for choosing Agentech.";

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

function cents(value: number) {
  return Math.round(value * 100);
}

function nowIso() {
  return new Date().toISOString();
}

export function isBillingAdminEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  const companyAdminDomain = process.env.AGENTECH_ADMIN_DOMAIN || "agent-tech.ai";
  const envAdmins = (process.env.AGENTECH_ADMIN_EMAILS || process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);

  return Boolean(
    normalized &&
      (normalized.endsWith(`@${companyAdminDomain.toLowerCase()}`) || envAdmins.includes(normalized))
  );
}

export async function isBillingAdmin(email: string) {
  if (isBillingAdminEmail(email)) {
    return true;
  }

  const rows = await supabaseRequest<Array<{ email: string; active: boolean }>>("agentech_admin_users", {
    query: `email=eq.${encodeURIComponent(email)}&active=eq.true&select=email,active&limit=1`
  }).catch(() => []);

  return rows.length > 0;
}

export function formatBillingStatus(status: string) {
  const normalized = status.replace(/_/g, " ").toLowerCase();

  if (statusLooksVoided(normalized)) {
    return "Voided";
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusLooksVoided(status: string) {
  const normalized = status.replace(/_/g, " ").toLowerCase();
  return (
    normalized.includes("void") ||
    normalized.includes("cancel") ||
    normalized.includes("removed") ||
    normalized.includes("deleted") ||
    normalized.includes("rejected")
  );
}

export function createInvoiceNumber(prefix = "INV") {
  const year = new Date().getFullYear();
  const suffix = Date.now().toString().slice(-8);
  return `AGT-${prefix}-${year}-${suffix}`;
}

function legacyStatusToBillingStatus(status: string): BillingInvoiceStatus {
  const normalized = status.replace(/_/g, " ").toLowerCase();

  if (normalized.includes("paid")) return "paid";
  if (statusLooksVoided(normalized)) return "void";
  return "sent";
}

function activeLegacyRequestWasRemoved(status: string, hasCartItem: boolean) {
  const normalized = status.replace(/_/g, " ").toLowerCase();

  if (hasCartItem || normalized.includes("paid") || statusLooksVoided(normalized)) {
    return false;
  }

  return (
    normalized.includes("pending") ||
    normalized.includes("sent") ||
    normalized.includes("created") ||
    normalized.includes("email")
  );
}

async function hasVoidedRobotSource(lines: Array<Pick<BillingInvoiceLine, "source_item_id" | "source_type" | "source_id">>) {
  const sourceIds = Array.from(
    new Set(
      lines
        .filter((line) => line.source_type === "robot" && line.source_id)
        .map((line) => line.source_id)
        .filter((value): value is string => Boolean(value))
    )
  );

  if (!sourceIds.length) {
    return false;
  }

  const requests = await Promise.all(
    sourceIds.map((sourceId) =>
      supabaseRequest<Array<{ status: string }>>("agentech_preorder_invoices", {
        query: `invoice_number=eq.${encodeURIComponent(sourceId)}&select=status&limit=1`
      }).catch(() => [])
    )
  );

  const requestRows = requests.flat();
  if (requestRows.some((request) => statusLooksVoided(request.status))) {
    return true;
  }

  const sourceItemIds = Array.from(
    new Set(
      lines
        .filter((line) => line.source_type === "robot" && line.source_item_id)
        .map((line) => line.source_item_id)
        .filter((value): value is number => typeof value === "number")
    )
  );

  if (!sourceItemIds.length) {
    return requestRows.some((request) => activeLegacyRequestWasRemoved(request.status, false));
  }

  const existingItems = await Promise.all(
    sourceItemIds.map((sourceItemId) =>
      supabaseRequest<Array<{ id: number }>>("agentech_invoice_items", {
        query: `id=eq.${sourceItemId}&select=id&limit=1`
      }).catch(() => [])
    )
  );
  const existingItemIds = new Set(existingItems.flat().map((item) => item.id));
  const allLinkedItemsWereRemoved = sourceItemIds.every((sourceItemId) => !existingItemIds.has(sourceItemId));

  return allLinkedItemsWereRemoved && requestRows.some((request) => activeLegacyRequestWasRemoved(request.status, false));
}

async function applyVoidedSourceStatus(invoice: BillingInvoice) {
  if (invoice.status === "paid" || invoice.status === "refunded" || invoice.status === "void") {
    return invoice;
  }

  const sourceLines = await supabaseRequest<Array<Pick<BillingInvoiceLine, "source_item_id" | "source_type" | "source_id">>>("agentech_billing_invoice_lines", {
    query: `invoice_number=eq.${encodeURIComponent(invoice.invoice_number)}&select=source_item_id,source_type,source_id`
  }).catch(() => []);

  if (!(await hasVoidedRobotSource(sourceLines))) {
    return invoice;
  }

  return {
    ...invoice,
    status: "void" as const
  };
}

async function getLegacyPreorderInvoice(invoiceNumber: string) {
  const rows = await supabaseRequest<LegacyPreorderInvoice[]>("agentech_preorder_invoices", {
    query: `invoice_number=eq.${encodeURIComponent(invoiceNumber)}&select=invoice_number,product,email,name,phone,company,notes,status,total_amount,created_at&limit=1`
  }).catch(() => []);
  const request = rows[0];

  if (!request) {
    return null;
  }

  const itemRows = await supabaseRequest<InvoiceItem[]>("agentech_invoice_items", {
    query: `source_type=eq.robot&source_id=eq.${encodeURIComponent(invoiceNumber)}&select=*&order=created_at.asc`
  }).catch(() => []);
  const fallbackAmount = toAmount(request.total_amount);
  const createdAt = request.created_at || nowIso();
  const lines: BillingInvoiceLine[] = itemRows.length
    ? itemRows.map((item) => ({
        id: item.id,
        invoice_number: invoiceNumber,
        source_item_id: item.id,
        source_type: "robot",
        source_id: item.source_id,
        description: formatInvoiceItemName(item.item_name),
        quantity: item.quantity,
        unit_price: toAmount(item.unit_price),
        amount: toAmount(item.amount),
        child_id: item.child_id,
        class_id: item.class_id,
        created_at: item.created_at
      }))
    : [
        {
          id: 0,
          invoice_number: invoiceNumber,
          source_item_id: null,
          source_type: "robot",
          source_id: invoiceNumber,
          description: request.product,
          quantity: 1,
          unit_price: fallbackAmount,
          amount: fallbackAmount,
          child_id: null,
          class_id: null,
          created_at: createdAt
        }
      ];
  const totals = invoiceTotals(lines);
  const status = activeLegacyRequestWasRemoved(request.status, itemRows.length > 0)
    ? "void"
    : legacyStatusToBillingStatus(request.status);

  return {
    id: 0,
    invoice_number: invoiceNumber,
    email: request.email,
    customer_name: request.name || request.email,
    customer_phone: request.phone || null,
    customer_company: request.company || null,
    customer_address: null,
    status,
    currency: "usd",
    subtotal: totals.subtotal,
    tax_rate: totals.taxRate,
    tax_amount: totals.taxAmount,
    discount_amount: totals.discountAmount,
    total_amount: totals.totalAmount,
    amount_paid: status === "paid" ? totals.totalAmount : 0,
    notes: request.notes || defaultNotes,
    terms: defaultTerms,
    stripe_checkout_session_id: null,
    stripe_payment_intent_id: null,
    due_date: null,
    sent_at: createdAt,
    paid_at: status === "paid" ? createdAt : null,
    created_at: createdAt,
    updated_at: createdAt,
    lines
  } satisfies BillingInvoiceWithLines;
}

export async function getBillingInvoice(invoiceNumber: string) {
  const invoices = await supabaseRequest<BillingInvoice[]>("agentech_billing_invoices", {
    query: `invoice_number=eq.${encodeURIComponent(invoiceNumber)}&select=*&limit=1`
  }).catch(() => []);
  const invoice = invoices[0];

  if (!invoice) {
    return getLegacyPreorderInvoice(invoiceNumber);
  }

  const lines = await supabaseRequest<BillingInvoiceLine[]>("agentech_billing_invoice_lines", {
    query: `invoice_number=eq.${encodeURIComponent(invoiceNumber)}&select=*&order=id.asc`
  }).catch(() => []);
  const sourceWasVoided = invoice.status !== "paid" && invoice.status !== "refunded"
    ? await hasVoidedRobotSource(lines)
    : false;

  return {
    ...invoice,
    status: sourceWasVoided ? "void" : invoice.status,
    lines
  } satisfies BillingInvoiceWithLines;
}

export async function getBillingInvoicesForEmail(email: string) {
  const invoices = await supabaseRequest<BillingInvoice[]>("agentech_billing_invoices", {
    query: `email=eq.${encodeURIComponent(email)}&select=*&order=created_at.desc`
  }).catch(() => []);

  return Promise.all(invoices.map(applyVoidedSourceStatus));
}

export async function getAllBillingInvoices() {
  const invoices = await supabaseRequest<BillingInvoice[]>("agentech_billing_invoices", {
    query: "select=*&order=created_at.desc"
  }).catch(() => []);

  return Promise.all(invoices.map(applyVoidedSourceStatus));
}

export async function getConfirmableInvoiceItems(email: string) {
  return supabaseRequest<InvoiceItem[]>("agentech_invoice_items", {
    query: `email=eq.${encodeURIComponent(email)}&paid=eq.false&invoice_email_sent_at=is.null&select=*&order=created_at.asc`
  }).catch(() => []);
}

export function invoiceTotals(lines: Array<{ amount: number | string }>, taxRate = 0, discountAmount = 0) {
  const subtotal = lines.reduce((sum, line) => sum + toAmount(line.amount), 0);
  const taxAmount = subtotal * (taxRate / 100);
  const totalAmount = Math.max(0, subtotal + taxAmount - discountAmount);

  return {
    subtotal,
    taxRate,
    taxAmount,
    discountAmount,
    totalAmount
  };
}

export async function createBillingInvoiceFromCart(email: string) {
  const lines = await getConfirmableInvoiceItems(email);

  if (!lines.length) {
    return null;
  }

  const profiles = await supabaseRequest<BillingProfile[]>("agentech_profiles", {
    query: `email=eq.${encodeURIComponent(email)}&select=first_name,last_name,phone,company,address&limit=1`
  }).catch(() => []);
  const profile = profiles[0] ?? null;
  const customerName = profile ? formatFullName(profile.first_name, profile.last_name) : "";
  const invoiceNumber = createInvoiceNumber();
  const totals = invoiceTotals(lines);
  const createdAt = nowIso();

  const invoices = await supabaseRequest<BillingInvoice[]>("agentech_billing_invoices", {
    method: "POST",
    body: {
      invoice_number: invoiceNumber,
      email,
      customer_name: customerName || email,
      customer_phone: profile?.phone || null,
      customer_company: profile?.company || null,
      customer_address: profile?.address || null,
      status: totals.totalAmount > 0 ? "sent" : "paid",
      currency: "usd",
      subtotal: totals.subtotal,
      tax_rate: totals.taxRate,
      tax_amount: totals.taxAmount,
      discount_amount: totals.discountAmount,
      total_amount: totals.totalAmount,
      amount_paid: totals.totalAmount > 0 ? 0 : 0,
      notes: defaultNotes,
      terms: defaultTerms,
      sent_at: createdAt,
      paid_at: totals.totalAmount > 0 ? null : createdAt,
      updated_at: createdAt
    }
  });
  const invoice = invoices[0];

  await supabaseRequest<null>("agentech_billing_invoice_lines", {
    method: "POST",
    prefer: "return=minimal",
    body: lines.map((line) => ({
      invoice_number: invoiceNumber,
      source_item_id: line.id,
      source_type: line.source_type,
      source_id: line.source_id,
      description: formatInvoiceItemName(line.item_name),
      quantity: line.quantity,
      unit_price: toAmount(line.unit_price),
      amount: toAmount(line.amount),
      child_id: line.child_id,
      class_id: line.class_id
    }))
  });

  await supabaseRequest<null>("agentech_invoice_items", {
    method: "PATCH",
    query: `email=eq.${encodeURIComponent(email)}&paid=eq.false&invoice_email_sent_at=is.null`,
    prefer: "return=minimal",
    body: {
      invoice_email_sent_at: createdAt
    }
  });

  return getBillingInvoice(invoice?.invoice_number || invoiceNumber);
}

export function invoiceUrl(invoiceNumber: string) {
  return new URL(`/invoice/${encodeURIComponent(invoiceNumber)}`, siteUrl).toString();
}

export function payInvoiceUrl(invoiceNumber: string) {
  return new URL(`/invoice/${encodeURIComponent(invoiceNumber)}?pay=1`, siteUrl).toString();
}

export function renderBillingInvoiceHtml(invoice: BillingInvoiceWithLines, options: { emailMode?: boolean } = {}) {
  const invoiceDate = new Date(invoice.created_at);
  const formattedDate = Number.isNaN(invoiceDate.getTime())
    ? invoice.created_at
    : invoiceDate.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const total = toAmount(invoice.total_amount);
  const subtotal = toAmount(invoice.subtotal);
  const taxAmount = toAmount(invoice.tax_amount);
  const discountAmount = toAmount(invoice.discount_amount);
  const amountPaid = toAmount(invoice.amount_paid);
  const balanceDue = Math.max(0, total - amountPaid);
  const hasAmountDue = total > 0 || invoice.lines.some((line) => toAmount(line.amount) > 0 || toAmount(line.unit_price) > 0);
  const invoiceLink = invoiceUrl(invoice.invoice_number);
  const payLink = payInvoiceUrl(invoice.invoice_number);
  const logoUrl = new URL("/assets/logo/AGENTECH.png", siteUrl).toString();

  const rows = invoice.lines
    .map(
      (line, index) => `
        <tr style="background: ${index % 2 === 0 ? "#ffffff" : "#d9edf8"};">
          <td style="padding: 10px 12px; border-right: 1px solid #ffffff; text-align: center;">${index + 1}</td>
          <td style="padding: 10px 12px; border-right: 1px solid #ffffff;">${escapeHtml(line.description)}</td>
          <td style="padding: 10px 12px; border-right: 1px solid #ffffff; text-align: center;">${line.quantity}</td>
          ${hasAmountDue ? `<td style="padding: 10px 12px; border-right: 1px solid #ffffff; text-align: right;">${formatUsd(toAmount(line.unit_price))}</td>` : ""}
          ${hasAmountDue ? `<td style="padding: 10px 12px; text-align: right;">${formatUsd(toAmount(line.amount))}</td>` : ""}
        </tr>
      `
    )
    .join("");

  const paymentButton = total > 0 && invoice.status !== "paid"
    ? `<a href="${escapeHtml(payLink)}" style="display: inline-block; margin-top: 14px; background: #2f70c8; color: #ffffff; padding: 12px 18px; text-decoration: none; font-weight: 700;">Pay Invoice</a>`
    : "";

  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.45; max-width: 820px; margin: 0 auto; background: #ffffff; padding: ${options.emailMode ? "28px" : "48px"};">
      <div style="display: flex; justify-content: space-between; gap: 24px; align-items: flex-start;">
        <div>
          <img src="${escapeHtml(logoUrl)}" alt="Agentech" width="180" style="display: block; max-width: 180px; height: auto;" />
          <p style="margin: 10px 0 0; color: #4b5563; letter-spacing: 0.08em; text-transform: uppercase; font-size: 12px;">Robotics & Education</p>
        </div>
        <div style="text-align: right;">
          <h1 style="margin: 0; color: #2f70c8; font-size: 44px; letter-spacing: 0.08em;">INVOICE</h1>
          <p style="margin: 12px 0 0; font-size: 13px; color: #4b5563;">agent-tech.ai</p>
        </div>
      </div>

      <div style="margin: 26px 0 36px; border-top: 3px solid #d1d5db;">
        <div style="width: 70px; border-top: 4px solid #39a7e5; margin-top: -4px;"></div>
      </div>

      <div style="display: flex; justify-content: space-between; gap: 32px; margin-bottom: 34px;">
        <div>
          <p style="margin: 0 0 8px; color: #374151;">Invoice to:</p>
          <p style="margin: 0 0 10px; font-size: 22px; font-weight: 800;">${escapeHtml(invoice.customer_name || invoice.email)}</p>
          <p style="margin: 0 0 6px; color: #6b7280;">${escapeHtml(invoice.email)}</p>
          ${invoice.customer_phone ? `<p style="margin: 0 0 6px; color: #6b7280;">${escapeHtml(invoice.customer_phone)}</p>` : ""}
          ${invoice.customer_address ? `<p style="margin: 0; color: #6b7280;">${escapeHtml(invoice.customer_address)}</p>` : ""}
        </div>
        <div style="text-align: right;">
          <p style="margin: 0 0 8px; font-weight: 800;">Invoice no: ${escapeHtml(invoice.invoice_number)}</p>
          <p style="margin: 0; color: #374151;">${escapeHtml(formattedDate)}</p>
          <p style="margin: 10px 0 0; color: #374151;">Status: <strong>${escapeHtml(formatBillingStatus(invoice.status))}</strong></p>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 14px;">
        <thead>
          <tr style="background: #2f70c8; color: #ffffff;">
            <th style="padding: 9px 10px; text-align: center;">NO</th>
            <th style="padding: 9px 10px; text-align: left;">DESCRIPTION</th>
            <th style="padding: 9px 10px; text-align: center;">QTY</th>
            ${hasAmountDue ? `<th style="padding: 9px 10px; text-align: right;">PRICE</th>` : ""}
            ${hasAmountDue ? `<th style="padding: 9px 10px; text-align: right;">TOTAL</th>` : ""}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>

      ${hasAmountDue ? `
      <div style="display: flex; justify-content: flex-end;">
        <table style="width: 320px; border-collapse: collapse; font-size: 15px;">
          <tr>
            <td style="padding: 7px 0; text-align: right;">Sub Total:</td>
            <td style="padding: 7px 0; text-align: right; width: 130px;">${formatUsd(subtotal)}</td>
          </tr>
          ${taxAmount > 0 ? `<tr><td style="padding: 7px 0; text-align: right;">Tax:</td><td style="padding: 7px 0; text-align: right;">${formatUsd(taxAmount)}</td></tr>` : ""}
          ${discountAmount > 0 ? `<tr><td style="padding: 7px 0; text-align: right;">Discount:</td><td style="padding: 7px 0; text-align: right;">-${formatUsd(discountAmount)}</td></tr>` : ""}
          <tr style="background: #2f70c8; color: #ffffff;">
            <td style="padding: 10px 12px; font-weight: 800;">GRAND TOTAL:</td>
            <td style="padding: 10px 12px; text-align: right; font-weight: 800;">${formatUsd(total)}</td>
          </tr>
          ${amountPaid > 0 ? `<tr><td style="padding: 9px 0; text-align: right;">Amount Paid:</td><td style="padding: 9px 0; text-align: right;">${formatUsd(amountPaid)}</td></tr>` : ""}
          ${balanceDue > 0 && amountPaid > 0 ? `<tr><td style="padding: 9px 0; text-align: right;">Balance Due:</td><td style="padding: 9px 0; text-align: right;">${formatUsd(balanceDue)}</td></tr>` : ""}
        </table>
      </div>
      ` : ""}

      <div style="margin-top: 34px; display: flex; justify-content: space-between; gap: 36px;">
        <div style="max-width: 360px;">
          <p style="display: inline-block; margin: 0 0 16px; background: #2f70c8; color: #ffffff; padding: 7px 12px; font-weight: 800;">${hasAmountDue ? "PAYMENT METHOD:" : "CONFIRMATION:"}</p>
          <p style="margin: 0 0 8px; color: #374151;">${hasAmountDue ? "Credit card payments are processed securely through Stripe when online payment is enabled." : "No payment is due for this registration at this time."}</p>
          ${paymentButton}
        </div>
        <div style="text-align: right;">
          <p style="margin: 34px 0 6px; font-size: 20px; font-weight: 800;">Agentech</p>
          <p style="margin: 0; font-weight: 700;">Administrator</p>
        </div>
      </div>

      <div style="margin-top: 38px; border-top: 2px solid #d1d5db; padding-top: 22px;">
        <p style="margin: 0 0 12px; font-weight: 800;">Thank you for your business.</p>
        <p style="margin: 0 0 8px; font-weight: 800;">Terms and Conditions:</p>
        <p style="margin: 0; color: #6b7280;">${escapeHtml(invoice.terms || defaultTerms)}</p>
      </div>

      ${options.emailMode ? `<p style="margin: 24px 0 0;"><a href="${escapeHtml(invoiceLink)}" style="color: #2f70c8; font-weight: 700;">View invoice online</a></p>` : ""}
    </div>
  `;
}

export async function sendBillingInvoiceEmail(invoice: BillingInvoiceWithLines) {
  const total = toAmount(invoice.total_amount);
  const payText = total > 0
    ? ["", `Pay or view this invoice: ${payInvoiceUrl(invoice.invoice_number)}`]
    : ["", `View this invoice: ${invoiceUrl(invoice.invoice_number)}`];
  const amountText = total > 0 ? [`Total: ${formatUsd(total)}`] : ["No payment is due at this time."];

  return sendEmail({
    to: invoice.email,
    subject: `Agentech invoice ${invoice.invoice_number}`,
    text: [
      `Invoice ${invoice.invoice_number}`,
      "",
      ...amountText,
      `Status: ${formatBillingStatus(invoice.status)}`,
      ...payText,
      "",
      "Thank you,",
      "Agentech"
    ].join("\n"),
    html: renderBillingInvoiceHtml(invoice, { emailMode: true })
  });
}

export async function markBillingInvoicePaid(invoiceNumber: string, options: { stripeSessionId?: string | null; paymentIntentId?: string | null } = {}) {
  const paidAt = nowIso();
  const invoice = await getBillingInvoice(invoiceNumber);
  const totalAmount = invoice ? toAmount(invoice.total_amount) : 0;

  await supabaseRequest<null>("agentech_billing_invoices", {
    method: "PATCH",
    query: `invoice_number=eq.${encodeURIComponent(invoiceNumber)}`,
    prefer: "return=minimal",
    body: {
      status: "paid",
      amount_paid: totalAmount,
      stripe_checkout_session_id: options.stripeSessionId || null,
      stripe_payment_intent_id: options.paymentIntentId || null,
      paid_at: paidAt,
      updated_at: paidAt
    }
  });

  const lines = await supabaseRequest<Array<{ source_item_id: number | null }>>("agentech_billing_invoice_lines", {
    query: `invoice_number=eq.${encodeURIComponent(invoiceNumber)}&source_item_id=not.is.null&select=source_item_id`
  }).catch(() => []);
  const itemIds = lines.map((line) => line.source_item_id).filter((id): id is number => typeof id === "number");

  if (itemIds.length) {
    await supabaseRequest<null>("agentech_invoice_items", {
      method: "PATCH",
      query: `id=in.(${itemIds.join(",")})`,
      prefer: "return=minimal",
      body: {
        paid: true
      }
    }).catch(() => null);
  }
}

export async function refreshInvoiceAmountPaid(invoiceNumber: string) {
  const invoice = await getBillingInvoice(invoiceNumber);
  if (!invoice) return null;

  const status = invoice.status === "paid" ? "paid" : invoice.status;
  const amountPaid = status === "paid" ? toAmount(invoice.total_amount) : toAmount(invoice.amount_paid);

  await supabaseRequest<null>("agentech_billing_invoices", {
    method: "PATCH",
    query: `invoice_number=eq.${encodeURIComponent(invoiceNumber)}`,
    prefer: "return=minimal",
    body: {
      amount_paid: amountPaid,
      updated_at: nowIso()
    }
  });

  return getBillingInvoice(invoiceNumber);
}

export async function createStripeCheckoutSession(invoice: BillingInvoiceWithLines) {
  const secretKey = process.env.STRIPE_SECRET_KEY;

  if (!secretKey) {
    return { error: "Stripe is not configured yet. Set STRIPE_SECRET_KEY to enable online card payments." };
  }

  const total = toAmount(invoice.total_amount);

  if (total <= 0) {
    return { error: "This invoice does not require an online payment." };
  }

  if (invoice.status === "paid") {
    return { error: "This invoice is already paid." };
  }

  const body = new URLSearchParams();
  body.set("mode", "payment");
  body.set("customer_email", invoice.email);
  body.set("client_reference_id", invoice.invoice_number);
  body.set("success_url", `${invoiceUrl(invoice.invoice_number)}?payment=success`);
  body.set("cancel_url", `${invoiceUrl(invoice.invoice_number)}?payment=cancelled`);
  body.set("metadata[invoice_number]", invoice.invoice_number);

  invoice.lines.forEach((line, index) => {
    body.set(`line_items[${index}][quantity]`, String(line.quantity || 1));
    body.set(`line_items[${index}][price_data][currency]`, invoice.currency || "usd");
    body.set(`line_items[${index}][price_data][unit_amount]`, String(cents(toAmount(line.unit_price))));
    body.set(`line_items[${index}][price_data][product_data][name]`, line.description.slice(0, 250));
  });

  const response = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body,
    cache: "no-store"
  });

  const result = (await response.json().catch(() => null)) as { id?: string; url?: string; error?: { message?: string } } | null;

  if (!response.ok || !result?.url) {
    return { error: result?.error?.message || "Unable to create Stripe Checkout session." };
  }

  await supabaseRequest<null>("agentech_billing_invoices", {
    method: "PATCH",
    query: `invoice_number=eq.${encodeURIComponent(invoice.invoice_number)}`,
    prefer: "return=minimal",
    body: {
      stripe_checkout_session_id: result.id || null,
      updated_at: nowIso()
    }
  }).catch(() => null);

  return {
    checkoutUrl: result.url,
    sessionId: result.id
  };
}

export function verifyStripeSignature(payload: string, signatureHeader: string | null, endpointSecret: string) {
  if (!signatureHeader) {
    return false;
  }

  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key, value];
    })
  );
  const timestamp = parts.t;
  const signature = parts.v1;

  if (!timestamp || !signature) {
    return false;
  }

  const expected = createHmac("sha256", endpointSecret).update(`${timestamp}.${payload}`).digest("hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(signature, "hex");

  if (expectedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, receivedBuffer);
}

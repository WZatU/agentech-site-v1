"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAccountSession } from "@/lib/account-session";
import { formatUsd } from "@/lib/pricing";

type InvoiceLine = {
  id: number;
  description: string;
  quantity: number;
  unit_price: number | string;
  amount: number | string;
};

type Invoice = {
  id: number;
  invoice_number: string;
  email: string;
  customer_name: string | null;
  customer_phone: string | null;
  customer_company: string | null;
  customer_address: string | null;
  status: string;
  subtotal: number | string;
  tax_amount: number | string;
  discount_amount: number | string;
  total_amount: number | string;
  amount_paid: number | string;
  terms: string | null;
  created_at: string;
  lines: InvoiceLine[];
};

type InvoiceDetailProps = {
  invoiceNumber: string;
};

function toAmount(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatStatus(status: string) {
  const normalized = status.replace(/_/g, " ").toLowerCase();

  if (
    normalized.includes("void") ||
    normalized.includes("cancel") ||
    normalized.includes("removed") ||
    normalized.includes("deleted") ||
    normalized.includes("rejected")
  ) {
    return "Voided";
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

export function InvoiceDetail({ invoiceNumber }: InvoiceDetailProps) {
  const [email, setEmail] = useState("");
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const session = getAccountSession();
    if (!session?.email) {
      setStatus("error");
      setMessage("Sign in to view this invoice.");
      return;
    }

    setEmail(session.email);
    fetch(`/api/invoices/${encodeURIComponent(invoiceNumber)}?email=${encodeURIComponent(session.email)}`)
      .then((response) => response.json().then((result) => ({ response, result })))
      .then(({ response, result }) => {
        if (!response.ok) {
          setStatus("error");
          setMessage(result.error || "Unable to load invoice.");
          return;
        }

        setInvoice(result.invoice);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Unable to load invoice.");
      });
  }, [invoiceNumber]);

  const totals = useMemo(() => {
    if (!invoice) {
      return {
        subtotal: 0,
        tax: 0,
        discount: 0,
        total: 0,
        paid: 0,
        due: 0
      };
    }

    const total = toAmount(invoice.total_amount);
    const paid = toAmount(invoice.amount_paid);

    return {
      subtotal: toAmount(invoice.subtotal),
      tax: toAmount(invoice.tax_amount),
      discount: toAmount(invoice.discount_amount),
      total,
      paid,
      due: Math.max(0, total - paid)
    };
  }, [invoice]);

  async function payInvoice() {
    if (!invoice || !email) return;

    setPaying(true);
    setMessage("");
    const response = await fetch(`/api/invoices/${encodeURIComponent(invoice.invoice_number)}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const result = (await response.json().catch(() => null)) as { checkoutUrl?: string; error?: string } | null;

    if (!response.ok || !result?.checkoutUrl) {
      setMessage(result?.error || "Unable to start payment.");
      setPaying(false);
      return;
    }

    window.location.href = result.checkoutUrl;
  }

  if (status === "loading") {
    return <p className="text-slate-600">Loading invoice...</p>;
  }

  if (!invoice) {
    return (
      <section className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">Invoice</h1>
        <p className="mt-4 text-slate-600">{message}</p>
        <Link href={`/login?next=${encodeURIComponent(`/invoice/${invoiceNumber}`)}`} className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
          Sign In
        </Link>
      </section>
    );
  }

  const canPay = invoice.id > 0 && invoice.status !== "paid" && totals.total > 0;
  const hasAmountDue = totals.total > 0 || invoice.lines.some((line) => toAmount(line.amount) > 0 || toAmount(line.unit_price) > 0);

  return (
    <section className="mx-auto max-w-5xl bg-white px-6 py-10 text-slate-950 print:px-0">
      <div className="rounded-[8px] border border-slate-200 bg-white p-8 shadow-[0_24px_80px_rgba(15,23,42,0.10)] print:border-0 print:shadow-none md:p-12">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div>
            <div className="text-2xl font-black tracking-[0.08em]">AGENTECH</div>
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Robotics & Education</p>
          </div>
          <div className="sm:text-right">
            <h1 className="text-5xl font-black uppercase tracking-[0.12em] text-[#2f70c8]">Invoice</h1>
            <p className="mt-3 text-sm text-slate-500">agent-tech.ai</p>
          </div>
        </div>

        <div className="mt-8 border-t-2 border-slate-300">
          <div className="-mt-0.5 h-1 w-20 bg-[#39a7e5]" />
        </div>

        <div className="mt-12 grid gap-8 md:grid-cols-2">
          <div>
            <p className="text-slate-600">Invoice to:</p>
            <p className="mt-2 text-2xl font-bold">{invoice.customer_name || invoice.email}</p>
            <div className="mt-3 space-y-1 text-sm text-slate-500">
              <p>{invoice.email}</p>
              {invoice.customer_phone ? <p>{invoice.customer_phone}</p> : null}
              {invoice.customer_company ? <p>{invoice.customer_company}</p> : null}
              {invoice.customer_address ? <p>{invoice.customer_address}</p> : null}
            </div>
          </div>
          <div className="md:text-right">
            <p className="font-bold">Invoice no: {invoice.invoice_number}</p>
            <p className="mt-2 text-slate-600">{formatDate(invoice.created_at)}</p>
            <p className="mt-2 text-slate-600">
              Status: <span className="font-bold text-slate-950">{formatStatus(invoice.status)}</span>
            </p>
          </div>
        </div>

        <div className="mt-10 overflow-x-auto">
          <table className="w-full min-w-[680px] border-collapse text-sm">
            <thead>
              <tr className="bg-[#2f70c8] text-white">
                <th className="px-3 py-2 text-center">NO</th>
                <th className="px-3 py-2 text-left">DESCRIPTION</th>
                <th className="px-3 py-2 text-center">QTY</th>
                {hasAmountDue ? <th className="px-3 py-2 text-right">PRICE</th> : null}
                {hasAmountDue ? <th className="px-3 py-2 text-right">TOTAL</th> : null}
              </tr>
            </thead>
            <tbody>
              {invoice.lines.map((line, index) => (
                <tr key={line.id} className={index % 2 === 0 ? "bg-white" : "bg-[#d9edf8]"}>
                  <td className="px-3 py-2 text-center">{index + 1}</td>
                  <td className="px-3 py-2">{line.description}</td>
                  <td className="px-3 py-2 text-center">{line.quantity}</td>
                  {hasAmountDue ? <td className="px-3 py-2 text-right">{formatUsd(toAmount(line.unit_price))}</td> : null}
                  {hasAmountDue ? <td className="px-3 py-2 text-right">{formatUsd(toAmount(line.amount))}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hasAmountDue ? (
          <div className="mt-6 flex justify-end">
            <div className="w-full max-w-sm space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Sub Total:</span>
                <span>{formatUsd(totals.subtotal)}</span>
              </div>
              {totals.tax > 0 ? (
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>{formatUsd(totals.tax)}</span>
                </div>
              ) : null}
              {totals.discount > 0 ? (
                <div className="flex justify-between">
                  <span>Discount:</span>
                  <span>-{formatUsd(totals.discount)}</span>
                </div>
              ) : null}
              <div className="flex justify-between bg-[#2f70c8] px-4 py-3 text-base font-black text-white">
                <span>GRAND TOTAL:</span>
                <span>{formatUsd(totals.total)}</span>
              </div>
            </div>
          </div>
        ) : null}

        <div className="mt-12 grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
          <div>
            <p className="inline-flex bg-[#2f70c8] px-3 py-2 text-sm font-black uppercase tracking-[0.08em] text-white">
              {hasAmountDue ? "Payment Method:" : "Confirmation:"}
            </p>
            <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
              {hasAmountDue
                ? "Credit card payments are securely processed through Stripe when online payment is enabled."
                : "No payment is due for this registration at this time."}
            </p>
            {canPay ? (
              <button
                type="button"
                onClick={payInvoice}
                disabled={paying}
                className="mt-5 rounded-full bg-[#2f70c8] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#245da7] disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {paying ? "Starting Payment..." : "Pay Invoice"}
              </button>
            ) : null}
            {message ? <p className="mt-4 text-sm font-semibold text-red-600">{message}</p> : null}
            {invoice.id === 0 && hasAmountDue ? (
              <p className="mt-4 max-w-md text-sm leading-6 text-slate-600">
                This invoice was generated from an existing request record. Online payment will be available after Agentech issues the official billing invoice.
              </p>
            ) : null}
          </div>
          <div className="text-left md:text-right">
            <p className="text-xl font-bold">Agentech</p>
            <p className="mt-1 text-sm font-semibold">Administrator</p>
          </div>
        </div>

        <div className="mt-10 border-t-2 border-slate-200 pt-6">
          <p className="font-bold">Thank you for your business.</p>
          <p className="mt-8 font-bold">Terms and Conditions:</p>
          <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">{invoice.terms}</p>
        </div>
      </div>
    </section>
  );
}

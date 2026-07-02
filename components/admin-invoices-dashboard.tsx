"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { getAccountSession } from "@/lib/account-session";
import { formatUsd } from "@/lib/pricing";

type AdminInvoice = {
  invoice_number: string;
  email: string;
  customer_name: string | null;
  status: string;
  total_amount: number | string;
  amount_paid: number | string;
  created_at: string;
  paid_at: string | null;
};

function toAmount(value: number | string | null | undefined) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
}

function formatDate(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function formatStatus(value: string) {
  const normalized = value.replace(/_/g, " ").toLowerCase();

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

export function AdminInvoicesDashboard() {
  const [email, setEmail] = useState("");
  const [invoices, setInvoices] = useState<AdminInvoice[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const session = getAccountSession();
    if (!session?.email) {
      setStatus("error");
      setMessage("Sign in with an admin account to view invoices.");
      return;
    }

    setEmail(session.email);
    fetch(`/api/admin/invoices?email=${encodeURIComponent(session.email)}`)
      .then((response) => response.json().then((result) => ({ response, result })))
      .then(({ response, result }) => {
        if (!response.ok) {
          setStatus("error");
          setMessage(result.error || "Unable to load admin invoices.");
          return;
        }

        setInvoices(result.invoices || []);
        setStatus("ready");
      })
      .catch(() => {
        setStatus("error");
        setMessage("Unable to load admin invoices.");
      });
  }, []);

  const filteredInvoices = useMemo(() => {
    if (filter === "all") {
      return invoices;
    }

    return invoices.filter((invoice) => invoice.status === filter);
  }, [filter, invoices]);

  const totals = useMemo(() => {
    return invoices.reduce(
      (summary, invoice) => {
        summary.total += toAmount(invoice.total_amount);
        summary.paid += invoice.status === "paid" ? toAmount(invoice.total_amount) : 0;
        summary.open += invoice.status !== "paid" && invoice.status !== "void" ? toAmount(invoice.total_amount) : 0;
        return summary;
      },
      { total: 0, paid: 0, open: 0 }
    );
  }, [invoices]);

  if (status === "loading") {
    return <p className="text-slate-600">Loading invoices...</p>;
  }

  if (status === "error") {
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-950">Admin Invoices</h1>
        <p className="mt-4 text-slate-600">{message}</p>
        {!email ? (
          <Link href="/login?next=/admin/invoices" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
            Sign In
          </Link>
        ) : null}
      </section>
    );
  }

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Admin</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">Invoices</h1>
            <p className="mt-3 text-sm text-slate-600">Viewing all Agentech billing invoices as {email}.</p>
          </div>
          <select
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-950"
          >
            <option value="all">All statuses</option>
            <option value="sent">Sent</option>
            <option value="paid">Paid</option>
            <option value="payment_failed">Payment failed</option>
            <option value="void">Voided</option>
          </select>
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-xl bg-slate-950 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-300">Total invoiced</p>
            <p className="mt-2 text-2xl font-semibold">{formatUsd(totals.total)}</p>
          </div>
          <div className="rounded-xl bg-emerald-700 p-5 text-white">
            <p className="text-xs uppercase tracking-[0.16em] text-emerald-100">Paid</p>
            <p className="mt-2 text-2xl font-semibold">{formatUsd(totals.paid)}</p>
          </div>
          <div className="rounded-xl bg-[#2f70c8] p-5 text-white">
            <p className="text-xs uppercase tracking-[0.16em] text-blue-100">Open</p>
            <p className="mt-2 text-2xl font-semibold">{formatUsd(totals.open)}</p>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-sm">
            <thead>
              <tr className="bg-slate-950 text-left text-white">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3">Paid</th>
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.length ? (
                filteredInvoices.map((invoice, index) => (
                  <tr key={invoice.invoice_number} className={index % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                    <td className="px-4 py-3 font-semibold">
                      <Link href={`/invoice/${invoice.invoice_number}`} className="text-[#2f70c8] hover:underline">
                        {invoice.invoice_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">{invoice.customer_name || "-"}</td>
                    <td className="px-4 py-3">{invoice.email}</td>
                    <td className="px-4 py-3">{formatStatus(invoice.status)}</td>
                    <td className="px-4 py-3 text-right font-semibold">{formatUsd(toAmount(invoice.total_amount))}</td>
                    <td className="px-4 py-3">{formatDate(invoice.created_at)}</td>
                    <td className="px-4 py-3">{formatDate(invoice.paid_at)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">
                    No invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

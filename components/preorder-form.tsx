"use client";

import { FormEvent, useEffect, useState } from "react";
import { getAccountSession } from "@/lib/account-session";

type PreorderFormProps = {
  product: string;
};

type ApiResult = {
  ok?: boolean;
  error?: string;
  invoiceNumber?: string;
  message?: string;
  profile?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    company?: string | null;
  } | null;
};

export function PreorderForm({ product }: PreorderFormProps) {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const session = getAccountSession();
    if (session?.email) {
      setEmail(session.email);
      fetch(`/api/account?email=${encodeURIComponent(session.email)}`)
        .then((response) => response.json())
        .then((result: ApiResult) => {
          if (result.profile) {
            const fullName = [result.profile.first_name, result.profile.last_name].filter(Boolean).join(" ");
            setName(fullName);
            setPhone(result.profile.phone || "");
            setCompany(result.profile.company || "");
          }
        })
        .catch(() => {});
    }
  }, []);

  async function submitPreorder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("saving");
    setMessage("");

    const response = await fetch("/api/preorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product, email, name, phone, company, notes })
    });
    const result = (await response.json()) as ApiResult;

    if (!response.ok) {
      setStatus("error");
      setMessage(result.error || "Unable to create invoice request.");
      return;
    }

    setStatus("success");
    setMessage(`${result.message} Invoice number: ${result.invoiceNumber}.`);
  }

  return (
    <form onSubmit={submitPreorder} className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-panel md:p-8">
      <div className="mb-7">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Invoice Request</p>
        <h1 className="font-display mt-3 text-3xl font-semibold text-white md:text-5xl">{product}</h1>
        <p className="mt-4 text-sm leading-6 text-slate">
          Submit this request and Agentech will send an invoice to your email. Card payment is available when online payment is enabled.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Name *</span>
          <input value={name} onChange={(event) => setName(event.target.value)} className="field" required />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Email *</span>
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="field" required />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Phone *</span>
          <input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} className="field" required />
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Company</span>
          <input value={company} onChange={(event) => setCompany(event.target.value)} className="field" />
        </label>
        <label className="space-y-2 md:col-span-2">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate">Notes</span>
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} className="field min-h-32 resize-y" />
        </label>
      </div>

      {message ? (
        <p className={`mt-5 text-sm ${status === "error" ? "text-red-300" : "text-emerald-300"}`}>{message}</p>
      ) : null}

      <button
        type="submit"
        disabled={status === "saving"}
        className="mt-7 rounded-full bg-white px-7 py-3 text-sm font-semibold text-[#0b1220] transition hover:bg-accent disabled:cursor-not-allowed disabled:bg-white/40"
      >
        {status === "saving" ? "Creating invoice..." : "Request Invoice"}
      </button>
    </form>
  );
}

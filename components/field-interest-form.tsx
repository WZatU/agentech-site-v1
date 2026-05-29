"use client";

import { useState } from "react";

const workshopInterest = "Workshop";

export function FieldInterestForm() {
  const [email, setEmail] = useState("");
  const [workshopChecked, setWorkshopChecked] = useState(false);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submitInterest() {
    setStatus("saving");
    setMessage("");

    const response = await fetch("/api/field-interest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        interest: workshopChecked ? workshopInterest : "",
        source: "field_qr"
      })
    });
    const result = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

    if (!response.ok) {
      setStatus("error");
      setMessage(result?.error || "Unable to save. Please try again.");
      return;
    }

    setStatus("success");
    setEmail("");
    setWorkshopChecked(false);
    setMessage(result?.message || "Thanks. We saved your interest.");
    window.location.href = "/";
  }

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.06] p-5 shadow-[0_30px_100px_rgba(0,0,0,0.35)] backdrop-blur md:p-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-cyan-200">Workshop Interest</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-4xl">Connect with Agentech.</h1>
        <p className="mt-3 text-sm leading-6 text-slate-300">
          Leave your email if you are interested in our workshop. No account needed.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <label className="block space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-300">Email</span>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            className="w-full rounded-2xl border border-white/10 bg-black/45 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200 focus:ring-4 focus:ring-cyan-200/10"
          />
        </label>

        <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-black/45 p-4">
          <input
            type="checkbox"
            checked={workshopChecked}
            onChange={(event) => setWorkshopChecked(event.target.checked)}
            className="mt-1 h-5 w-5 rounded border-white/20 bg-black text-cyan-200 accent-cyan-200"
          />
          <span>
            <span className="block text-sm font-semibold text-white">I am interested in the workshop.</span>
            <span className="mt-1 block text-sm leading-6 text-slate-400">Agentech may contact me with more information.</span>
          </span>
        </label>

        <button
          type="button"
          onClick={submitInterest}
          disabled={status === "saving"}
          className="w-full rounded-full border border-white bg-white px-5 py-3 text-sm font-semibold text-[#020617] transition hover:bg-cyan-100 disabled:cursor-not-allowed disabled:bg-white/40"
        >
          {status === "saving" ? "Saving..." : "Submit"}
        </button>

        {message ? (
          <p className={`text-sm font-semibold ${status === "error" ? "text-red-300" : "text-emerald-300"}`}>
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}

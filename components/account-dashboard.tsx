"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { accountSessionEvent, clearAccountSession, getAccountSession } from "@/lib/account-session";
import { formatUsd } from "@/lib/pricing";

type DashboardData = {
  profile?: {
    first_name: string;
    last_name: string;
    phone: string;
    company: string | null;
    account_type: string | null;
  } | null;
  children?: Array<{
    id: number;
    first_name: string;
    last_name: string;
    dob: string;
    grade: string;
    sex: string;
    school_info?: string | null;
    preferred_location?: string | null;
  }>;
  requests?: Array<{
    invoice_number: string;
    product: string;
    status: string;
    created_at: string;
  }>;
  enrollments?: Array<{
    id: number;
    site_name: string | null;
    class_id: string | null;
    price: number | null;
    paid: boolean;
    created_at: string;
    agentech_classes?: {
      class_name: string;
      class_time: string;
      starting_date: string;
      age_range: string;
    } | null;
  }>;
  unpaidBalance?: {
    total: number;
    lines: Array<{
      id: string;
      itemName: string;
      amount: number;
      sourceType: string;
    }>;
  };
  error?: string;
};

export function AccountDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function loadAccount() {
      const session = getAccountSession();
      if (!session?.email) {
        setEmail("");
        setData({});
        setLoading(false);
        return;
      }

      setEmail(session.email);
      setLoading(true);
      fetch(`/api/account?email=${encodeURIComponent(session.email)}`)
        .then((response) => response.json())
        .then((result: DashboardData) => {
          if (!cancelled) {
            setData(result);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setData({ error: "Unable to load account." });
          }
        })
        .finally(() => {
          if (!cancelled) {
            setLoading(false);
          }
        });
    }

    loadAccount();
    window.addEventListener(accountSessionEvent, loadAccount);
    window.addEventListener("storage", loadAccount);

    return () => {
      cancelled = true;
      window.removeEventListener(accountSessionEvent, loadAccount);
      window.removeEventListener("storage", loadAccount);
    };
  }, []);

  async function removeUnpaidItem(itemId: string) {
    if (!email) return;

    setActionMessage("");
    const response = await fetch("/api/invoice-item", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, itemId })
    });

    if (!response.ok) {
      setActionMessage("Unable to remove that item.");
      return;
    }

    setActionMessage("Item removed.");
    const accountResponse = await fetch(`/api/account?email=${encodeURIComponent(email)}`);
    const result = (await accountResponse.json()) as DashboardData;
    setData(result);
  }

  async function confirmRequest() {
    if (!email) return;

    setConfirming(true);
    setActionMessage("");
    const response = await fetch("/api/invoice-confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
    const result = (await response.json()) as { error?: string; message?: string };

    if (!response.ok) {
      setActionMessage(result.error || "Unable to confirm request.");
      setConfirming(false);
      return;
    }

    setActionMessage(result.message || "Request confirmed.");
    const accountResponse = await fetch(`/api/account?email=${encodeURIComponent(email)}`);
    const accountResult = (await accountResponse.json()) as DashboardData;
    setData(accountResult);
    setConfirming(false);
  }

  if (loading) {
    return <p className="text-slate">Loading account...</p>;
  }

  if (!email) {
    return (
      <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-8">
        <h1 className="text-3xl font-semibold text-white">Sign in required</h1>
        <p className="mt-3 text-slate">Sign in to view your profile, students, and invoice requests.</p>
        <Link href="/login?next=/account" className="mt-6 inline-flex rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#0b1220]">
          Sign In
        </Link>
      </div>
    );
  }

  const profileName = data.profile
    ? [data.profile.first_name, data.profile.last_name].filter(Boolean).join(" ")
    : "";

  return (
    <div className="space-y-8">
      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Account</p>
            <h1 className="mt-3 text-3xl font-semibold text-white md:text-5xl">{profileName || email}</h1>
            <p className="mt-3 text-slate">{email}</p>
            {data.profile?.phone ? <p className="mt-1 text-slate">{data.profile.phone}</p> : null}
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate">Unpaid Balance</p>
            <p className="mt-2 text-3xl font-semibold text-white">{formatUsd(data.unpaidBalance?.total ?? 0)}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              clearAccountSession();
              setEmail("");
              setData({});
              router.replace("/login?signedOut=1");
              router.refresh();
            }}
            className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Sign Out
          </button>
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-white">Request Cart</h2>
            <p className="mt-2 text-sm text-slate">Review these items before sending the invoice request.</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/agentech-education" className="rounded-full border border-white/15 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
              Add Course
            </Link>
            {data.unpaidBalance?.lines.length ? (
              <button
                type="button"
                onClick={confirmRequest}
                disabled={confirming}
                className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-[#0b1220] transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-white/40"
              >
                {confirming ? "Sending..." : "Confirm Request"}
              </button>
            ) : null}
          </div>
        </div>
        {actionMessage ? <p className="mt-3 text-sm font-semibold text-accent">{actionMessage}</p> : null}
        <div className="mt-5 space-y-3">
          {data.unpaidBalance?.lines.length ? (
            data.unpaidBalance.lines.map((line) => (
              <div key={line.id} className="flex items-center justify-between gap-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                <div>
                  <p className="font-semibold text-white">{line.itemName}</p>
                  <p className="mt-1 text-sm font-semibold text-accent">{formatUsd(line.amount)}</p>
                </div>
                {line.id.startsWith("item-") ? (
                  <button
                    type="button"
                    onClick={() => removeUnpaidItem(line.id)}
                    className="rounded-full border border-white/15 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            ))
          ) : (
            <p className="text-slate">No request items yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-white">Requests</h2>
          <Link href="/agentech-robotic" className="text-sm font-semibold text-accent">
            New Robot Request
          </Link>
        </div>
        <div className="mt-5 space-y-3">
          {data.requests?.length ? (
            data.requests.map((request) => (
              <div key={request.invoice_number} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">{request.product}</p>
                <p className="mt-1 text-sm text-slate">{request.invoice_number} - {request.status}</p>
              </div>
            ))
          ) : (
            <p className="text-slate">No invoice requests yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-white">Children</h2>
          <Link href="/account-setup" className="text-sm font-semibold text-accent">
            Edit Education Profile
          </Link>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.children?.length ? (
            data.children.map((child) => (
              <div key={child.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">{child.first_name} {child.last_name}</p>
                <p className="mt-1 text-sm text-slate">Grade: {child.grade.replace(/^Grade\s+/i, "")} - {child.sex}</p>
                {child.school_info ? <p className="mt-1 text-sm text-slate">School: {child.school_info}</p> : null}
                {child.preferred_location ? <p className="mt-1 text-sm text-slate">Preferred location: {child.preferred_location}</p> : null}
              </div>
            ))
          ) : (
            <p className="text-slate">No children saved yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 md:p-8">
        <h2 className="text-2xl font-semibold text-white">Enrollments</h2>
        <div className="mt-5 space-y-3">
          {data.enrollments?.length ? (
            data.enrollments.map((enrollment) => (
              <div key={enrollment.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <p className="font-semibold text-white">
                  {enrollment.agentech_classes?.class_name || enrollment.class_id || "Class enrollment"}
                </p>
                <p className="mt-1 text-sm text-slate">
                  {[enrollment.site_name, enrollment.agentech_classes?.class_time, enrollment.agentech_classes?.starting_date]
                    .filter(Boolean)
                    .join(" - ")}
                </p>
                <p className="mt-1 text-sm text-slate">{enrollment.paid ? "Paid" : "Payment pending"}</p>
              </div>
            ))
          ) : (
            <p className="text-slate">No class enrollments yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { accountSessionEvent, clearAccountSession, getAccountSession } from "@/lib/account-session";
import { formatFullName, formatInvoiceItemName } from "@/lib/name-format";
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
  applications?: {
    internships: Array<{
      id: number;
      name: string;
      email: string;
      role_interests: string[] | null;
      resume_filename: string | null;
      created_at: string;
    }>;
    aiRoboticsClub: Array<{
      id: number;
      name: string;
      email: string;
      grade: string | null;
      interests: string[] | null;
      resume_filename: string | null;
      created_at: string;
    }>;
  };
  unpaidBalance?: {
    total: number;
    lines: Array<{
      id: string;
      itemName: string;
      amount: number;
      sourceType: string;
      invoiceEmailSentAt: string | null;
    }>;
  };
  invoices?: Array<{
    invoice_number: string;
    customer_name: string | null;
    status: string;
    total_amount: number | string;
    amount_paid: number | string;
    created_at: string;
    paid_at: string | null;
  }>;
  error?: string;
};

function formatDate(value: string) {
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

function formatRequestStatus(status: string) {
  const normalized = status.replace(/_/g, " ").toLowerCase();

  if (["removed from cart", "voided", "deleted", "cancelled", "canceled"].includes(normalized)) {
    return "Voided";
  }

  if (normalized.includes("sent")) {
    return "Invoice email sent";
  }

  if (normalized.includes("pending")) {
    return "Invoice pending";
  }

  return normalized.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatInvoiceStatus(status: string) {
  return status.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function looksLikeAdminEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@agent-tech.ai");
}

export function AccountDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [childActionMessage, setChildActionMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pendingRemovalId, setPendingRemovalId] = useState("");
  const [pendingChildRemovalId, setPendingChildRemovalId] = useState<number | null>(null);

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
    setPendingRemovalId("");
    const response = await fetch("/api/invoice-item", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, itemId })
    });
    const removeResult = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

    if (!response.ok) {
      setActionMessage(removeResult?.error || "Unable to remove that item.");
      return;
    }

    setActionMessage(removeResult?.message || "Item removed.");
    const accountResponse = await fetch(`/api/account?email=${encodeURIComponent(email)}`);
    const result = (await accountResponse.json()) as DashboardData;
    setData(result);
  }

  async function refreshAccount() {
    if (!email) return;

    const accountResponse = await fetch(`/api/account?email=${encodeURIComponent(email)}`);
    const result = (await accountResponse.json()) as DashboardData;
    setData(result);
  }

  async function removeChild(childId: number) {
    if (!email) return;

    setChildActionMessage("");
    setPendingChildRemovalId(null);
    const response = await fetch("/api/account-child", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, childId })
    });
    const result = (await response.json().catch(() => null)) as { message?: string; error?: string } | null;

    if (!response.ok) {
      setChildActionMessage(result?.error || "Unable to delete that child.");
      return;
    }

    setChildActionMessage(result?.message || "Child deleted.");
    await refreshAccount();
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
    const result = (await response.json()) as { error?: string; message?: string; invoiceNumber?: string };

    if (!response.ok) {
      setActionMessage(result.error || "Unable to confirm request.");
      setConfirming(false);
      return;
    }

    setActionMessage(result.invoiceNumber ? `${result.message || "Request confirmed."} Invoice: ${result.invoiceNumber}.` : result.message || "Request confirmed.");
    const accountResponse = await fetch(`/api/account?email=${encodeURIComponent(email)}`);
    const accountResult = (await accountResponse.json()) as DashboardData;
    setData(accountResult);
    setConfirming(false);
  }

  if (loading) {
    return <p className="text-slate-600">Loading account...</p>;
  }

  if (!email) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <h1 className="text-3xl font-semibold text-slate-950">Sign in required</h1>
        <p className="mt-3 text-slate-600">Sign in to view your profile, requests, applications, and enrollments.</p>
        <Link href="/login?next=/account" className="mt-6 inline-flex rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white">
          Sign In
        </Link>
      </div>
    );
  }

  const profileName = data.profile
    ? formatFullName(data.profile.first_name, data.profile.last_name)
    : "";
  const hasRequestItems = Boolean(data.unpaidBalance?.lines.length);
  const hasConfirmableRequest = Boolean(data.unpaidBalance?.lines.some((line) => !line.invoiceEmailSentAt));
  const hasRobotRequests = Boolean(data.requests?.length);
  const hasApplications = Boolean(data.applications?.internships.length || data.applications?.aiRoboticsClub.length);
  const hasInvoices = Boolean(data.invoices?.length);

  return (
    <div className="space-y-8">
      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f70c8]">Account</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 md:text-5xl">{profileName || email}</h1>
            <p className="mt-3 text-slate-600">{email}</p>
            {data.profile?.phone ? <p className="mt-1 text-slate-600">{data.profile.phone}</p> : null}
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Open Cart Balance</p>
            <p className="mt-2 text-3xl font-semibold text-slate-950">
              {(data.unpaidBalance?.total ?? 0) > 0 ? formatUsd(data.unpaidBalance?.total ?? 0) : "No amount due"}
            </p>
            {looksLikeAdminEmail(email) ? (
              <Link href="/admin/invoices" className="mt-5 inline-flex rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-[#2f70c8] hover:text-[#2f70c8]">
                Admin Invoices
              </Link>
            ) : null}
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
            className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-[#2f70c8] hover:text-[#2f70c8]"
          >
            Sign Out
          </button>
        </div>
      </section>

      {hasRequestItems || actionMessage ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Request Cart</h2>
              <p className="mt-2 text-sm text-slate-600">Review these items before generating an official invoice.</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Link href="/agentech-education" className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:border-[#2f70c8] hover:text-[#2f70c8]">
                Add Course
              </Link>
              {hasConfirmableRequest ? (
                <button
                  type="button"
                  onClick={confirmRequest}
                  disabled={confirming}
                  className="rounded-full bg-[#2f70c8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#245da7] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {confirming ? "Generating..." : "Generate Invoice"}
                </button>
              ) : null}
            </div>
          </div>
          {actionMessage ? <p className="mt-3 text-sm font-semibold text-[#2f70c8]">{actionMessage}</p> : null}
          <div className="mt-5 space-y-3">
            {data.unpaidBalance?.lines.length ? (
              data.unpaidBalance.lines.map((line) => (
                <div key={line.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="font-semibold text-slate-950">{formatInvoiceItemName(line.itemName)}</p>
                    {line.amount > 0 ? <p className="mt-1 text-sm font-semibold text-[#2f70c8]">{formatUsd(line.amount)}</p> : null}
                  </div>
                  {line.id.startsWith("item-") ? (
                    pendingRemovalId === line.id ? (
                      <div className="flex flex-wrap justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => removeUnpaidItem(line.id)}
                          className="rounded-full border border-red-300 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-100"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setPendingRemovalId("")}
                          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setActionMessage("");
                          setPendingRemovalId(line.id);
                        }}
                        className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
                      >
                        Remove
                      </button>
                    )
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-slate-600">No request items yet.</p>
            )}
          </div>
        </section>
      ) : null}

      {hasInvoices ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-slate-950">Invoices</h2>
              <p className="mt-2 text-sm text-slate-600">View official invoice details and pay online when card payment is enabled.</p>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {data.invoices?.map((invoice) => {
              const total = Number(invoice.total_amount ?? 0);
              return (
                <div key={invoice.invoice_number} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-slate-950">{invoice.invoice_number}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {formatDate(invoice.created_at)} - {formatInvoiceStatus(invoice.status)}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-[#2f70c8]">
                      {Number.isFinite(total) && total > 0 ? formatUsd(total) : "No amount due"}
                    </p>
                  </div>
                  <Link
                    href={`/invoice/${invoice.invoice_number}`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-950 transition hover:border-[#2f70c8] hover:text-[#2f70c8]"
                  >
                    View Invoice
                  </Link>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-slate-950">Applications</h2>
            <p className="mt-2 text-sm text-slate-600">
              {hasApplications ? "Your submitted internship and club applications are listed here." : "Start or continue an internship or club application."}
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/ai-robotics-club" className="text-sm font-semibold text-[#2f70c8]">
              AI Robotics Club
            </Link>
            <Link href="/career-intern" className="text-sm font-semibold text-[#2f70c8]">
              Internship
            </Link>
          </div>
        </div>
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-semibold text-slate-950">Internship</h3>
            <div className="mt-4 space-y-3">
              {data.applications?.internships.length ? (
                data.applications.internships.map((application) => (
                  <div key={application.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-950">{application.role_interests?.join(", ") || "Internship application"}</p>
                    <p className="mt-1 text-sm text-slate-600">{application.name} - Submitted {formatDate(application.created_at)}</p>
                    {application.resume_filename ? <p className="mt-1 text-sm text-slate-600">Resume: {application.resume_filename}</p> : null}
                  </div>
                ))
              ) : (
                <Link href="/career-intern" className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-[#2f70c8] hover:text-[#2f70c8]">
                  View internship roles
                </Link>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-semibold text-slate-950">AI Robotics Club</h3>
            <div className="mt-4 space-y-3">
              {data.applications?.aiRoboticsClub.length ? (
                data.applications.aiRoboticsClub.map((application) => (
                  <div key={application.id} className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="font-semibold text-slate-950">{application.name}</p>
                    <p className="mt-1 text-sm text-slate-600">
                      {[application.grade, application.interests?.join(", ")].filter(Boolean).join(" - ")}
                    </p>
                    <p className="mt-1 text-sm text-slate-600">Submitted {formatDate(application.created_at)}</p>
                    {application.resume_filename ? <p className="mt-1 text-sm text-slate-600">Resume: {application.resume_filename}</p> : null}
                  </div>
                ))
              ) : (
                <Link href="/ai-robotics-club" className="inline-flex rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-[#2f70c8] hover:text-[#2f70c8]">
                  View club page
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {hasRobotRequests ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-semibold text-slate-950">Requests</h2>
            <Link href="/agentech-robotic" className="text-sm font-semibold text-[#2f70c8]">
              New Robot Request
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {data.requests?.length ? (
              data.requests.map((request) => (
                <div key={request.invoice_number} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="font-semibold text-slate-950">{request.product}</p>
                  <p className="mt-1 text-sm text-slate-600">{request.invoice_number} - {formatRequestStatus(request.status)}</p>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No invoice requests yet.</p>
            )}
          </div>
        </section>
      ) : null}

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-2xl font-semibold text-slate-950">Children</h2>
          <Link href="/account-setup" className="text-sm font-semibold text-[#2f70c8]">
            Edit Education Profile
          </Link>
        </div>
        {childActionMessage ? <p className="mt-3 text-sm font-semibold text-[#2f70c8]">{childActionMessage}</p> : null}
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          {data.children?.length ? (
            data.children.map((child) => (
              <div key={child.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-slate-950">{formatFullName(child.first_name, child.last_name)}</p>
                    <p className="mt-1 text-sm text-slate-600">Grade: {child.grade.replace(/^Grade\s+/i, "")} - {child.sex}</p>
                    {child.school_info ? <p className="mt-1 text-sm text-slate-600">School: {child.school_info}</p> : null}
                    {child.preferred_location ? <p className="mt-1 text-sm text-slate-600">Preferred location: {child.preferred_location}</p> : null}
                  </div>
                  {pendingChildRemovalId === child.id ? (
                    <div className="flex shrink-0 flex-wrap justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => removeChild(child.id)}
                        className="rounded-full border border-red-300 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100"
                      >
                        Confirm Delete
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingChildRemovalId(null)}
                        className="rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-100"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setChildActionMessage("");
                        setPendingChildRemovalId(child.id);
                      }}
                      className="shrink-0 rounded-full border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-slate-100"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-slate-600">No children saved yet.</p>
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
        <h2 className="text-2xl font-semibold text-slate-950">Enrollments</h2>
        <div className="mt-5 space-y-3">
          {data.enrollments?.length ? (
            data.enrollments.map((enrollment) => (
              <div key={enrollment.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="font-semibold text-slate-950">
                  {enrollment.agentech_classes?.class_name || enrollment.class_id || "Class enrollment"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {[enrollment.site_name, enrollment.agentech_classes?.class_time, enrollment.agentech_classes?.starting_date]
                    .filter(Boolean)
                    .join(" - ")}
                </p>
                <p className="mt-1 text-sm text-slate-600">{enrollment.paid ? "Paid" : "Payment pending"}</p>
              </div>
            ))
          ) : (
            <p className="text-slate-600">No class enrollments yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

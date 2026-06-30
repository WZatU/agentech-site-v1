"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { accountSessionEvent, clearAccountSession, getAccountSession } from "@/lib/account-session";
import { formatFullName, formatInvoiceItemName } from "@/lib/name-format";
import { formatUsd } from "@/lib/pricing";

type DashboardData = {
  account?: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    credit_balance: number;
    paid_credit_balance: number;
    bonus_credit_balance: number;
  } | null;
  accessProfiles?: Array<{
    id: number;
    profile_type: "developer" | "student" | "teacher" | "talent";
    username: string;
    display_name: string;
    first_name: string | null;
    last_name: string | null;
    dob: string | null;
    grade: string | null;
    sex: string | null;
    school_info: string | null;
    preferred_location: string | null;
    credit_limit: number;
    credits_used: number;
    monthly_credit_limit: number;
    monthly_credits_used: number;
    monthly_usage_period: string;
    created_at: string;
  }>;
  creditSummary?: {
    balance: number;
    paid: number;
    bonus: number;
    assigned: number;
    monthlyLimitTotal: number;
    used: number;
    monthlyUsed: number;
    unassigned: number;
    rechargeRequired: boolean;
  };
  featureAccess?: {
    hasProfiles: boolean;
    accountOnly: boolean;
    lockedFeatures: string[];
  };
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
  robotSessions?: Array<{
    id: number;
    profile_username: string | null;
    profile_type: "developer" | "student" | "teacher" | "talent" | null;
    session_title: string;
    robot_model: string | null;
    scheduled_start: string | null;
    scheduled_end: string | null;
    session_status: string;
    requested_run_type: string | null;
    approved_run_type: string | null;
    preset_demo: string | null;
    benchmark_status: string | null;
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

type AccessProfileType = "developer" | "student" | "teacher" | "talent";

const profileOptions: Array<{ type: AccessProfileType; label: string; description: string }> = [
  { type: "developer", label: "Developer", description: "Build, test, and manage developer tools." },
  { type: "student", label: "Student", description: "Access learning programs and student work." },
  { type: "teacher", label: "Teacher", description: "Manage education activity and classroom needs." },
  { type: "talent", label: "Talent", description: "Use talent, application, and portfolio features." }
];

const studentGradeOptions = [
  "Pre-K",
  "Kindergarten",
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Grade 7",
  "Grade 8",
  "Grade 9",
  "Grade 10",
  "Grade 11",
  "Grade 12"
];

const robotModelOptions = ["Aegis Ultra", "Aegis EDU", "Aegis Pro", "Navi"];

const robotPresetOptions = [
  {
    value: "starter_demo",
    label: "Starter demo",
    description: "Stand up, five forward steps, left/right, look up/down, and backflip."
  },
  { value: "stand_up", label: "Stand up", description: "Preset stand-up movement." },
  { value: "five_forward", label: "Five forward", description: "Preset five-step forward movement." },
  { value: "left_right", label: "Left/right", description: "Preset side movement." },
  { value: "look_up_down", label: "Look up/down", description: "Preset head movement." },
  { value: "backflip", label: "Backflip", description: "Preset backflip demo." }
];

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

function formatDateTime(value: string | null | undefined) {
  if (!value) {
    return "Time not set";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
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

function formatCredits(value: number | string | undefined | null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return "0 credits";
  }

  return `${Math.max(0, Math.floor(amount)).toLocaleString()} credits`;
}

function formatProfileType(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getCurrentUsagePeriod() {
  return new Date().toISOString().slice(0, 7);
}

function looksLikeAdminEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@agent-tech.ai");
}

function toDateTimeLocalValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60 * 1000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getDefaultRobotSlotValue() {
  const date = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const minutes = date.getMinutes();
  date.setMinutes(minutes <= 30 ? 30 : 60, 0, 0);

  if (date.getHours() < 9) {
    date.setHours(9, 0, 0, 0);
  }

  if (date.getHours() >= 17) {
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
  }

  return toDateTimeLocalValue(date);
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
  const [profileType, setProfileType] = useState<AccessProfileType>("student");
  const [profileUsername, setProfileUsername] = useState("");
  const [profileName, setProfileName] = useState("");
  const [profileMonthlyLimit, setProfileMonthlyLimit] = useState("0");
  const [studentFirstName, setStudentFirstName] = useState("");
  const [studentLastName, setStudentLastName] = useState("");
  const [studentDob, setStudentDob] = useState("");
  const [studentGrade, setStudentGrade] = useState("");
  const [studentSex, setStudentSex] = useState("");
  const [studentSchoolInfo, setStudentSchoolInfo] = useState("");
  const [studentPreferredLocation, setStudentPreferredLocation] = useState("");
  const [profileMessage, setProfileMessage] = useState("");
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [adminCreditTargetEmail, setAdminCreditTargetEmail] = useState("");
  const [adminCreditType, setAdminCreditType] = useState<"paid" | "bonus">("paid");
  const [adminCreditAmount, setAdminCreditAmount] = useState("");
  const [adminCreditMessage, setAdminCreditMessage] = useState("");
  const [addingCredits, setAddingCredits] = useState(false);
  const [robotSlotProfileId, setRobotSlotProfileId] = useState("");
  const [robotSlotStart, setRobotSlotStart] = useState(getDefaultRobotSlotValue);
  const [robotSlotModel, setRobotSlotModel] = useState("Aegis Ultra");
  const [robotSlotPreset, setRobotSlotPreset] = useState("starter_demo");
  const [robotSlotNotes, setRobotSlotNotes] = useState("");
  const [robotSlotMessage, setRobotSlotMessage] = useState("");
  const [requestingRobotSlot, setRequestingRobotSlot] = useState(false);

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

  useEffect(() => {
    if (email && looksLikeAdminEmail(email) && !adminCreditTargetEmail) {
      setAdminCreditTargetEmail(email);
    }
  }, [adminCreditTargetEmail, email]);

  useEffect(() => {
    if (!robotSlotProfileId && data.accessProfiles?.length) {
      setRobotSlotProfileId(String(data.accessProfiles[0].id));
    }
  }, [data.accessProfiles, robotSlotProfileId]);

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

  async function createProfile() {
    if (!email) return;

    setCreatingProfile(true);
    setProfileMessage("");

    const response = await fetch("/api/account-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        profileType,
        username: profileUsername,
        displayName: profileName,
        monthlyCreditLimit: profileMonthlyLimit,
        firstName: studentFirstName,
        lastName: studentLastName,
        dob: studentDob,
        grade: studentGrade,
        sex: studentSex,
        schoolInfo: studentSchoolInfo,
        preferredLocation: studentPreferredLocation
      })
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setProfileMessage(result?.error || "Unable to create profile.");
      setCreatingProfile(false);
      return;
    }

    setProfileUsername("");
    setProfileName("");
    setProfileMonthlyLimit("0");
    setStudentFirstName("");
    setStudentLastName("");
    setStudentDob("");
    setStudentGrade("");
    setStudentSex("");
    setStudentSchoolInfo("");
    setStudentPreferredLocation("");
    setProfileMessage("Profile created.");
    await refreshAccount();
    setCreatingProfile(false);
  }

  async function addAdminCredits() {
    if (!email) return;

    setAddingCredits(true);
    setAdminCreditMessage("");

    const response = await fetch("/api/admin/account-credits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        adminEmail: email,
        targetEmail: adminCreditTargetEmail,
        creditType: adminCreditType,
        credits: adminCreditAmount
      })
    });
    const result = (await response.json().catch(() => null)) as { error?: string; balance?: number } | null;

    if (!response.ok) {
      setAdminCreditMessage(result?.error || "Unable to add credits.");
      setAddingCredits(false);
      return;
    }

    setAdminCreditAmount("");
    setAdminCreditMessage(`Credits added. New total: ${formatCredits(result?.balance ?? 0)}.`);
    if (adminCreditTargetEmail.trim().toLowerCase() === email.trim().toLowerCase()) {
      await refreshAccount();
    }
    setAddingCredits(false);
  }

  async function requestRobotSlot() {
    if (!email) return;

    setRequestingRobotSlot(true);
    setRobotSlotMessage("");

    const scheduledDate = new Date(robotSlotStart);
    const response = await fetch("/api/robot-slot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        profileId: robotSlotProfileId,
        scheduledStart: Number.isNaN(scheduledDate.getTime()) ? robotSlotStart : scheduledDate.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        robotModel: robotSlotModel,
        presetDemo: robotSlotPreset,
        requestedRunType: "preset_demo",
        notes: robotSlotNotes
      })
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setRobotSlotMessage(result?.error || "Unable to request that robot slot.");
      setRequestingRobotSlot(false);
      return;
    }

    setRobotSlotNotes("");
    setRobotSlotStart(getDefaultRobotSlotValue());
    setRobotSlotMessage("Robot slot requested. This will stay as a preset demo until the benchmark gate is available and passed.");
    await refreshAccount();
    setRequestingRobotSlot(false);
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

  const accountName = data.account
    ? formatFullName(data.account.first_name, data.account.last_name)
    : "";
  const legacyProfileName = data.profile
    ? formatFullName(data.profile.first_name, data.profile.last_name)
    : "";
  const displayName = accountName || legacyProfileName || email;
  const phone = data.account?.phone || data.profile?.phone || "";
  const hasRequestItems = Boolean(data.unpaidBalance?.lines.length);
  const hasConfirmableRequest = Boolean(data.unpaidBalance?.lines.some((line) => !line.invoiceEmailSentAt));
  const hasRobotRequests = Boolean(data.requests?.length);
  const hasRobotSessions = Boolean(data.robotSessions?.length);
  const hasApplications = Boolean(data.applications?.internships.length || data.applications?.aiRoboticsClub.length);
  const hasInvoices = Boolean(data.invoices?.length);
  const hasAccessProfiles = Boolean(data.accessProfiles?.length);
  const creditBalance = data.creditSummary?.balance ?? data.account?.credit_balance ?? 0;
  const paidCredits = data.creditSummary?.paid ?? data.account?.paid_credit_balance ?? 0;
  const bonusCredits = data.creditSummary?.bonus ?? data.account?.bonus_credit_balance ?? 0;
  const monthlyLimitTotal = data.creditSummary?.monthlyLimitTotal ?? data.creditSummary?.assigned ?? 0;
  const monthlyUsed = data.creditSummary?.monthlyUsed ?? 0;
  const isAdminAccount = looksLikeAdminEmail(email);
  const lockedFeatures = data.featureAccess?.lockedFeatures ?? [];

  return (
    <div className="space-y-8">
      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#2f70c8]">Account</p>
            <h1 className="mt-3 text-3xl font-semibold text-slate-950 md:text-5xl">{displayName}</h1>
            <p className="mt-3 text-slate-600">{email}</p>
            {phone ? <p className="mt-1 text-slate-600">{phone}</p> : null}
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Credits Left</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">{formatCredits(creditBalance)}</p>
                <p className="mt-1 text-sm text-slate-600">1 credit = 1 US cent</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Open Cart Balance</p>
                <p className="mt-2 text-3xl font-semibold text-slate-950">
                  {(data.unpaidBalance?.total ?? 0) > 0 ? formatUsd(data.unpaidBalance?.total ?? 0) : "No amount due"}
                </p>
                <p className="mt-1 text-sm text-slate-600">Credits remaining: {formatCredits(creditBalance)}</p>
              </div>
            </div>
            {data.creditSummary?.rechargeRequired ? (
              <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900">
                No credits are available. Recharge this account before profiles can spend credits.
              </p>
            ) : null}
            {isAdminAccount ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-[#2f70c8]/25 bg-[#eff6ff] p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#245da7]">Paid Credits</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCredits(paidCredits)}</p>
                </div>
                <div className="rounded-2xl border border-emerald-300 bg-emerald-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">Bonus Credits</p>
                  <p className="mt-2 text-2xl font-semibold text-slate-950">{formatCredits(bonusCredits)}</p>
                </div>
              </div>
            ) : null}
            {isAdminAccount ? (
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

      {isAdminAccount ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f70c8]">Admin Credits</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Manual Credit Add</h2>
              <p className="mt-2 text-sm text-slate-600">Paid credits are used before bonus credits when a profile spends.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-950">Visible to @agent-tech.ai only</p>
              <p className="mt-1 text-slate-600">Total shown above: {formatCredits(creditBalance)}</p>
            </div>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_0.7fr_0.7fr_auto] lg:items-end">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Target Account Email</span>
              <input
                type="email"
                value={adminCreditTargetEmail}
                onChange={(event) => setAdminCreditTargetEmail(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Credit Type</span>
              <select
                value={adminCreditType}
                onChange={(event) => setAdminCreditType(event.target.value === "bonus" ? "bonus" : "paid")}
                className={`mt-2 w-full rounded-xl border px-4 py-3 text-sm font-semibold outline-none focus:ring-4 ${
                  adminCreditType === "bonus"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800 focus:border-emerald-500 focus:ring-emerald-100"
                    : "border-[#2f70c8]/25 bg-[#eff6ff] text-[#245da7] focus:border-[#2f70c8] focus:ring-[#dbeafe]"
                }`}
              >
                <option value="paid">Paid Credits</option>
                <option value="bonus">Bonus Credits</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Credits To Add</span>
              <input
                type="number"
                min="1"
                step="1"
                value={adminCreditAmount}
                onChange={(event) => setAdminCreditAmount(event.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
              />
            </label>
            <button
              type="button"
              onClick={addAdminCredits}
              disabled={addingCredits}
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {addingCredits ? "Adding..." : "Add Credits"}
            </button>
          </div>
          {adminCreditMessage ? <p className="mt-3 text-sm font-semibold text-[#2f70c8]">{adminCreditMessage}</p> : null}
        </section>
      ) : null}

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f70c8]">Profile Logins</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Account Profiles</h2>
            <p className="mt-2 text-sm text-slate-600">Create developer, student, teacher, or talent logins for feature apps while this account keeps the billing and credit controls.</p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <p>{data.accessProfiles?.length ?? 0} active profiles</p>
            <p className="mt-1 text-xs text-slate-500">
              Monthly caps: {formatCredits(monthlyLimitTotal)} - Used {formatCredits(monthlyUsed)}
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-3">
            {hasAccessProfiles ? (
              data.accessProfiles?.map((profile) => {
                const monthlyLimit = Number(profile.monthly_credit_limit ?? profile.credit_limit ?? 0);
                const monthlyUsedForPeriod = profile.monthly_usage_period === getCurrentUsagePeriod()
                  ? Number(profile.monthly_credits_used ?? 0)
                  : 0;
                const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsedForPeriod);
                return (
                  <div key={profile.id} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <p className="font-semibold text-slate-950">{profile.display_name || `${formatProfileType(profile.profile_type)} Profile`}</p>
                      <p className="mt-1 text-sm text-slate-600">@{profile.username} - {formatProfileType(profile.profile_type)}</p>
                      {profile.profile_type === "student" ? (
                        <p className="mt-1 text-sm text-slate-600">
                          {[profile.grade, profile.sex, profile.school_info].filter(Boolean).join(" - ")}
                        </p>
                      ) : null}
                      {profile.profile_type === "student" && profile.preferred_location ? (
                        <p className="mt-1 text-sm text-slate-600">Preferred location: {profile.preferred_location}</p>
                      ) : null}
                    </div>
                    <div className="text-sm md:text-right">
                      <p className="font-semibold text-[#2f70c8]">{formatCredits(monthlyRemaining)} left this month</p>
                      <p className="mt-1 text-slate-600">
                        Monthly limit {formatCredits(monthlyLimit)} - Used {formatCredits(monthlyUsedForPeriod)}
                      </p>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <p className="font-semibold text-slate-950">No profiles created yet.</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  This account can stay profile-free for robot purchases, invoices, and credit balance management.
                </p>
                {lockedFeatures.length ? (
                  <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-900">Create a profile to unlock:</p>
                    <ul className="mt-2 space-y-1 text-sm text-amber-900">
                      {lockedFeatures.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <h3 className="text-lg font-semibold text-slate-950">Create Profile</h3>
            <div className="mt-4 space-y-4">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Profile Type</span>
                <select
                  value={profileType}
                  onChange={(event) => setProfileType(event.target.value as AccessProfileType)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                >
                  {profileOptions.map((option) => (
                    <option key={option.type} value={option.type}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="mt-2 block text-sm text-slate-600">{profileOptions.find((option) => option.type === profileType)?.description}</span>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Username</span>
                <input
                  value={profileUsername}
                  onChange={(event) => setProfileUsername(event.target.value.toLowerCase())}
                  placeholder="example.username"
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                />
                <span className="mt-2 block text-sm text-slate-600">Used to sign in to feature apps that have their own profile experience.</span>
              </label>
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Display Name</span>
                <input
                  value={profileName}
                  onChange={(event) => setProfileName(event.target.value)}
                  placeholder={`${formatProfileType(profileType)} Profile`}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                />
              </label>
              {profileType === "student" ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Student Information</p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">First Name</span>
                      <input
                        value={studentFirstName}
                        onChange={(event) => setStudentFirstName(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Last Name</span>
                      <input
                        value={studentLastName}
                        onChange={(event) => setStudentLastName(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Date of Birth</span>
                      <input
                        type="date"
                        value={studentDob}
                        onChange={(event) => setStudentDob(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Grade</span>
                      <select
                        value={studentGrade}
                        onChange={(event) => setStudentGrade(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                      >
                        <option value="">Select grade</option>
                        {studentGradeOptions.map((grade) => (
                          <option key={grade} value={grade}>
                            {grade}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Sex</span>
                      <select
                        value={studentSex}
                        onChange={(event) => setStudentSex(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                      >
                        <option value="">Select</option>
                        <option value="female">Female</option>
                        <option value="male">Male</option>
                        <option value="other">Other</option>
                        <option value="prefer-not-to-say">Prefer not to say</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">School Info</span>
                      <input
                        value={studentSchoolInfo}
                        onChange={(event) => setStudentSchoolInfo(event.target.value)}
                        placeholder="School name or program"
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                      />
                    </label>
                    <label className="block sm:col-span-2">
                      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Preferred Location</span>
                      <input
                        value={studentPreferredLocation}
                        onChange={(event) => setStudentPreferredLocation(event.target.value)}
                        placeholder="Example: Irvine, Online"
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                      />
                    </label>
                  </div>
                </div>
              ) : null}
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Monthly Credit Limit</span>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={profileMonthlyLimit}
                  onChange={(event) => setProfileMonthlyLimit(event.target.value)}
                  className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                />
                <span className="mt-2 block text-sm text-slate-600">This caps monthly profile spending. It does not reserve account credits.</span>
              </label>
              {profileMessage ? <p className="text-sm font-semibold text-[#2f70c8]">{profileMessage}</p> : null}
              <button
                type="button"
                onClick={createProfile}
                disabled={creatingProfile}
                className="w-full rounded-full bg-[#2f70c8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#245da7] disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {creatingProfile ? "Creating..." : "Create Profile"}
              </button>
            </div>
          </div>
        </div>
      </section>

      {hasAccessProfiles ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f70c8]">Robot Slot</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Request Robot Viewing</h2>
              <p className="mt-2 text-sm text-slate-600">
                Slots require a profile login, at least 24 hours notice, and a start time between 9:00 AM and 5:00 PM.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              <p>Preset demo only</p>
              <p className="mt-1 text-xs text-slate-500">Custom code unlocks after benchmark approval.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-lg font-semibold text-slate-950">New Slot Request</h3>
              <div className="mt-4 space-y-4">
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Profile Login</span>
                  <select
                    value={robotSlotProfileId}
                    onChange={(event) => setRobotSlotProfileId(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                  >
                    {data.accessProfiles?.map((profile) => (
                      <option key={profile.id} value={profile.id}>
                        @{profile.username} - {formatProfileType(profile.profile_type)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Start Time</span>
                  <input
                    type="datetime-local"
                    min={toDateTimeLocalValue(new Date(Date.now() + 24 * 60 * 60 * 1000))}
                    step="1800"
                    value={robotSlotStart}
                    onChange={(event) => setRobotSlotStart(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                  />
                  <span className="mt-2 block text-sm text-slate-600">The server rejects times less than 24 hours out or outside robot hours.</span>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Robot Model</span>
                  <select
                    value={robotSlotModel}
                    onChange={(event) => setRobotSlotModel(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                  >
                    {robotModelOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Preset Demo</span>
                  <select
                    value={robotSlotPreset}
                    onChange={(event) => setRobotSlotPreset(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                  >
                    {robotPresetOptions.map((preset) => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-sm text-slate-600">
                    {robotPresetOptions.find((preset) => preset.value === robotSlotPreset)?.description}
                  </span>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Notes</span>
                  <textarea
                    value={robotSlotNotes}
                    onChange={(event) => setRobotSlotNotes(event.target.value)}
                    rows={3}
                    className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                    placeholder="Anything we should know before the demo"
                  />
                </label>
                {robotSlotMessage ? <p className="text-sm font-semibold text-[#2f70c8]">{robotSlotMessage}</p> : null}
                <button
                  type="button"
                  onClick={requestRobotSlot}
                  disabled={requestingRobotSlot}
                  className="w-full rounded-full bg-[#2f70c8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#245da7] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {requestingRobotSlot ? "Requesting..." : "Request Robot Slot"}
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-lg font-semibold text-slate-950">Requested Robot Slots</h3>
              <div className="mt-4 space-y-3">
                {hasRobotSessions ? (
                  data.robotSessions?.map((session) => (
                    <div key={session.id} className="rounded-xl border border-slate-200 bg-white p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{session.session_title}</p>
                          <p className="mt-1 text-sm text-slate-600">
                            {session.profile_username ? `@${session.profile_username}` : "Profile"} - {session.robot_model || "Robot"}
                          </p>
                          <p className="mt-1 text-sm text-slate-600">{formatDateTime(session.scheduled_start)}</p>
                          {session.preset_demo ? <p className="mt-1 text-sm text-slate-600">{session.preset_demo}</p> : null}
                        </div>
                        <div className="text-sm font-semibold text-[#2f70c8] md:text-right">
                          <p>{formatInvoiceStatus(session.session_status)}</p>
                          <p className="mt-1 text-xs text-slate-500">Benchmark: {formatInvoiceStatus(session.benchmark_status || "not_started")}</p>
                          <p className="mt-1 text-xs text-slate-500">Run: {formatInvoiceStatus(session.approved_run_type || "preset_demo")}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-slate-600">
                    No robot viewing slots requested yet. The first available request must be at least 24 hours from now.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

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

      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f70c8]">Billing</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Invoices</h2>
            <p className="mt-2 text-sm text-slate-600">Official invoices and payment status appear here.</p>
          </div>
          {isAdminAccount ? (
            <Link href="/admin/invoices" className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-[#2f70c8] hover:text-[#2f70c8]">
              Admin Dashboard
            </Link>
          ) : null}
        </div>
        <div className="mt-5 space-y-3">
          {hasInvoices ? (
            data.invoices?.map((invoice) => {
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
                    className="rounded-full bg-[#2f70c8] px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-[#245da7]"
                  >
                    View Invoice
                  </Link>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
              <p className="font-semibold text-slate-950">No official billing invoices yet.</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                New invoices generated from the request cart will appear here. Existing robot request numbers are listed in Requests below and can be opened as invoice records.
              </p>
            </div>
          )}
        </div>
      </section>

      {hasAccessProfiles ? (
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
      ) : null}

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
                <div key={request.invoice_number} className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <p className="font-semibold text-slate-950">{request.product}</p>
                    <p className="mt-1 text-sm text-slate-600">Request invoice: {request.invoice_number}</p>
                    <p className="mt-1 text-sm font-semibold text-[#2f70c8]">{formatRequestStatus(request.status)}</p>
                  </div>
                  <Link
                    href={`/invoice/${request.invoice_number}`}
                    className="rounded-full border border-slate-300 px-4 py-2 text-center text-sm font-semibold text-slate-950 transition hover:border-[#2f70c8] hover:text-[#2f70c8]"
                  >
                    View Invoice
                  </Link>
                </div>
              ))
            ) : (
              <p className="text-slate-600">No invoice requests yet.</p>
            )}
          </div>
        </section>
      ) : null}

      {hasAccessProfiles ? (
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
      ) : null}

      {hasAccessProfiles ? (
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
      ) : null}
    </div>
  );
}

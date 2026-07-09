"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { accountSessionEvent, clearAccountSession, getAccountSession } from "@/lib/account-session";
import { formatFullName, formatInvoiceItemName } from "@/lib/name-format";
import { formatUsd } from "@/lib/pricing";

type DashboardAccessProfile = {
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
};

type RobotSlotOption = {
  value: string;
  label: string;
  disabled: boolean;
};

type DashboardData = {
  account?: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    credit_balance: number;
    paid_credit_balance: number;
    bonus_credit_balance: number;
    developer_latest_code_submission_id?: string | null;
    developer_physical_safety_status?: string | null;
    developer_physical_safety_passed_at?: string | null;
    developer_ai_security_status?: string | null;
    developer_ai_security_passed_at?: string | null;
  } | null;
  accessProfiles?: DashboardAccessProfile[];
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
    address: string | null;
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

type AdminAiCap = {
  user_id: string;
  monthly_request_limit: number | string;
  monthly_token_limit: number | string;
  monthly_cost_limit: number | string;
  current_requests: number | string;
  current_tokens: number | string;
  current_cost: number | string;
  usage_period: string;
  updated_at: string;
};

type AdminAiUsage = {
  id: number;
  user_id: string;
  endpoint: string;
  model: string;
  prompt_tokens: number | string;
  completion_tokens: number | string;
  total_tokens: number | string;
  estimated_cost: number | string;
  status_code: number | null;
  latency_ms: number | null;
  created_at: string;
};

type AdminDeveloperProfile = {
  id: number;
  account_email: string;
  username: string;
  display_name: string;
  monthly_credit_limit: number | string;
  monthly_credits_used: number | string;
  monthly_usage_period: string;
  created_at: string;
};

type AdminDeveloperAccount = {
  email: string;
  developer_latest_code_submission_id: string | null;
  developer_physical_safety_status: string | null;
  developer_ai_security_status: string | null;
  developer_ai_security_passed_at: string | null;
};

type AdminAiUsageData = {
  caps: AdminAiCap[];
  usage: AdminAiUsage[];
  developerProfiles: AdminDeveloperProfile[];
  developerAccounts: AdminDeveloperAccount[];
};

type AccessProfileType = "developer" | "student" | "teacher" | "talent";
type DashboardTab = "profile" | "courses" | "balance" | "robot" | "invoices" | "billing" | "settings";

const profileOptions: Array<{ type: AccessProfileType; label: string; description: string }> = [
  { type: "developer", label: "Developer", description: "Test robots, submit code, and manage supervised runs." },
  { type: "student", label: "Student", description: "Play with Navi, join courses, and track learning progress." },
  { type: "teacher", label: "Educator", description: "Manage learners, course activity, and classroom access." },
  { type: "talent", label: "Talent", description: "Build applications, portfolios, and program pathways." }
];

const dashboardTabs: Array<{ id: DashboardTab; label: string; mark: string }> = [
  { id: "profile", label: "Account", mark: "A" },
  { id: "settings", label: "Profiles", mark: "P" },
  { id: "balance", label: "Billing", mark: "B" },
  { id: "billing", label: "Purchase History", mark: "H" },
  { id: "courses", label: "Courses", mark: "C" },
  { id: "robot", label: "Robot Requests", mark: "R" },
  { id: "invoices", label: "Invoices", mark: "I" }
];

function getDashboardTabs(profileType: AccessProfileType) {
  return dashboardTabs.filter((tab) => {
    if (tab.id === "robot") {
      return profileType === "developer";
    }

    if (tab.id === "courses") {
      return profileType === "student" || profileType === "teacher";
    }

    return true;
  });
}

const profileVisuals: Record<
  AccessProfileType,
  {
    eyebrow: string;
    tone: string;
    avatar: string;
    iconBg: string;
    iconText: string;
    panel: string;
    accent: string;
    focus: string;
  }
> = {
  developer: {
    eyebrow: "Build workspace",
    tone: "Code, robot sessions, and developer tools.",
    avatar: "from-indigo-100 to-violet-100 text-indigo-700",
    iconBg: "bg-indigo-50",
    iconText: "text-indigo-600",
    panel: "border-indigo-100 bg-indigo-50/55",
    accent: "text-indigo-600",
    focus: "Developer"
  },
  student: {
    eyebrow: "Learning profile",
    tone: "Classes, projects, and supervised robot practice.",
    avatar: "from-sky-100 to-cyan-100 text-sky-700",
    iconBg: "bg-sky-50",
    iconText: "text-sky-600",
    panel: "border-sky-100 bg-sky-50/55",
    accent: "text-sky-600",
    focus: "Student"
  },
  teacher: {
    eyebrow: "Classroom profile",
    tone: "Groups, student progress, and education operations.",
    avatar: "from-emerald-100 to-teal-100 text-emerald-700",
    iconBg: "bg-emerald-50",
    iconText: "text-emerald-600",
    panel: "border-emerald-100 bg-emerald-50/55",
    accent: "text-emerald-600",
    focus: "Teacher"
  },
  talent: {
    eyebrow: "Talent profile",
    tone: "Portfolio growth, program pathways, and talent records.",
    avatar: "from-amber-100 to-orange-100 text-amber-700",
    iconBg: "bg-amber-50",
    iconText: "text-amber-600",
    panel: "border-amber-100 bg-amber-50/55",
    accent: "text-amber-600",
    focus: "Talent"
  }
};

const profileUnlockDetails: Record<
  AccessProfileType,
  {
    headline: string;
    unlocks: string[];
  }
> = {
  developer: {
    headline: "Robot testing workspace",
    unlocks: ["Book Aegis robot viewing slots", "Submit profile-based robot sessions", "Track code demos and run history", "Use developer monthly credit caps"]
  },
  student: {
    headline: "Navi learning workspace",
    unlocks: ["Play with Navi learning experiences", "View courses and enrollments", "Track student learning activity", "Use student-safe feature access"]
  },
  teacher: {
    headline: "Classroom control workspace",
    unlocks: ["Manage student and group profiles", "Review course participation", "Coordinate classroom access", "Use educator-level credit controls"]
  },
  talent: {
    headline: "Portfolio and application workspace",
    unlocks: ["Track internship applications", "Manage AI Robotics Club records", "Connect resumes and portfolio work", "Follow program pathway status"]
  }
};

const robotSlotDurationOptions = [5, 10, 15, 30];
const robotSlotGridMinutes = 5;
const robotSlotPrepMinutes = 2;

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

const robotModelOptions = ["Aegies"];

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

const creditRechargeOptions = [1000, 2500, 5000, 10000];

function calculateCardChargeCents(creditValueCents: number) {
  return Math.ceil((creditValueCents + 30) / 0.971);
}

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

function formatCredits(value: number | string | undefined | null) {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) {
    return "0 credits";
  }

  return `${Math.max(0, Math.floor(amount)).toLocaleString()} credits`;
}

function formatTokenCount(value: number | string | undefined | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? Math.max(0, Math.floor(amount)).toLocaleString() : "0";
}

function formatGatewayCost(value: number | string | undefined | null) {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? `$${amount.toFixed(4)}` : "$0.0000";
}

function formatProfileType(value: string) {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function getProfileOptionLabel(profileType: AccessProfileType) {
  return profileOptions.find((option) => option.type === profileType)?.label ?? formatProfileType(profileType);
}

function getProfileMark(profileType: AccessProfileType) {
  if (profileType === "developer") {
    return "</>";
  }

  if (profileType === "teacher") {
    return "E";
  }

  return profileType[0].toUpperCase();
}

function isPreviewProfileType(value: string | null): value is AccessProfileType {
  return value === "developer" || value === "student" || value === "teacher" || value === "talent";
}

function buildPreviewDashboardData(profileType: AccessProfileType): DashboardData {
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const threeDaysAgo = new Date(now);
  threeDaysAgo.setDate(now.getDate() - 3);
  const displayByType: Record<AccessProfileType, string> = {
    developer: "Wesley Fan",
    student: "Navi Student",
    teacher: "Agentech Teacher",
    talent: "Future Founder"
  };
  const emailByType: Record<AccessProfileType, string> = {
    developer: "wesleyfan2015@gmail.com",
    student: "student.preview@agentech.local",
    teacher: "teacher.preview@agentech.local",
    talent: "talent.preview@agentech.local"
  };
  const [firstName, ...lastParts] = displayByType[profileType].split(" ");
  const lastName = lastParts.join(" ");
  const primaryProfile: DashboardAccessProfile = {
    id: 900,
    profile_type: profileType,
    username: `${profileType}.preview`,
    display_name: displayByType[profileType],
    first_name: profileType === "student" ? firstName : null,
    last_name: profileType === "student" ? lastName : null,
    dob: profileType === "student" ? "2012-05-18" : null,
    grade: profileType === "student" ? "Grade 8" : null,
    sex: profileType === "student" ? "prefer-not-to-say" : null,
    school_info: profileType === "student" ? "Agentech Robotics Studio" : null,
    preferred_location: profileType === "student" ? "Irvine" : null,
    credit_limit: 1250,
    credits_used: 140,
    monthly_credit_limit: 1250,
    monthly_credits_used: 140,
    monthly_usage_period: getCurrentUsagePeriod(),
    created_at: threeDaysAgo.toISOString()
  };

  return {
    account: {
      email: emailByType[profileType],
      first_name: firstName,
      last_name: lastName,
      phone: "(949) 555-0142",
      credit_balance: 1250,
      paid_credit_balance: 1000,
      bonus_credit_balance: 250
    },
    accessProfiles: [
      primaryProfile,
      {
        ...primaryProfile,
        id: 901,
        profile_type: profileType === "developer" ? "student" : "developer",
        username: profileType === "developer" ? "student.lab" : "developer.lab",
        display_name: profileType === "developer" ? "Student Lab" : "Developer Lab",
        monthly_credit_limit: 800,
        monthly_credits_used: 90,
        created_at: yesterday.toISOString()
      }
    ],
    creditSummary: {
      balance: 1250,
      paid: 1000,
      bonus: 250,
      assigned: 2050,
      monthlyLimitTotal: 2050,
      used: 230,
      monthlyUsed: 230,
      unassigned: 1250,
      rechargeRequired: false
    },
    featureAccess: {
      hasProfiles: true,
      accountOnly: false,
      lockedFeatures: []
    },
    profile: {
      first_name: firstName,
      last_name: lastName,
      phone: "(949) 555-0142",
      company: profileType === "teacher" ? "Agentech Education" : "Agentech",
      address: "123 Innovation Way\nIrvine, CA 92618",
      account_type: profileType === "teacher" ? "group" : "individual"
    },
    children: profileType === "student" || profileType === "teacher"
      ? [
          {
            id: 77,
            first_name: "Navi",
            last_name: "Student",
            dob: "2012-05-18",
            grade: "Grade 8",
            sex: "prefer-not-to-say",
            school_info: "Agentech Robotics Studio",
            preferred_location: "Irvine"
          }
        ]
      : [],
    requests: [
      {
        invoice_number: "INV-2026-001",
        product: "Aegis Robot Dog",
        status: "invoice_sent",
        created_at: threeDaysAgo.toISOString()
      }
    ],
    robotSessions: [
      {
        id: 880,
        profile_username: primaryProfile.username,
        profile_type: profileType,
        session_title: profileType === "developer" ? "Robot request submitted" : `${formatProfileType(profileType)} robot viewing`,
        robot_model: "Aegis Robot Dog",
        scheduled_start: yesterday.toISOString(),
        scheduled_end: now.toISOString(),
        session_status: "requested",
        requested_run_type: "preset_demo",
        approved_run_type: "preset_demo",
        preset_demo: "starter_demo",
        benchmark_status: "not_started",
        created_at: now.toISOString()
      }
    ],
    enrollments: profileType === "student" || profileType === "teacher"
      ? [
          {
            id: 501,
            site_name: "Irvine",
            class_id: "robotics-8",
            price: 330,
            paid: false,
            created_at: yesterday.toISOString(),
            agentech_classes: {
              class_name: "AI Robotics Studio",
              class_time: "Saturday 10:00 AM",
              starting_date: "July 18, 2026",
              age_range: "Grades 6-8"
            }
          }
        ]
      : [],
    applications: {
      internships: profileType === "talent" ? [{ id: 22, name: displayByType[profileType], email: emailByType[profileType], role_interests: ["AI Robotics"], resume_filename: "portfolio.pdf", created_at: yesterday.toISOString() }] : [],
      aiRoboticsClub: []
    },
    unpaidBalance: {
      total: 33,
      lines: [
        {
          id: "item-preview-robot",
          itemName: "Aegis robot viewing",
          amount: 33,
          sourceType: "robot",
          invoiceEmailSentAt: null
        }
      ]
    },
    invoices: [
      {
        invoice_number: "INV-2026-001",
        customer_name: displayByType[profileType],
        status: "sent",
        total_amount: 11,
        amount_paid: 11,
        created_at: threeDaysAgo.toISOString(),
        paid_at: yesterday.toISOString()
      }
    ]
  };
}

function buildEmptyPreviewDashboardData(): DashboardData {
  return {
    account: {
      email: "account.preview@agentech.local",
      first_name: "Account",
      last_name: "Owner",
      phone: "(949) 555-0199",
      credit_balance: 0,
      paid_credit_balance: 0,
      bonus_credit_balance: 0
    },
    accessProfiles: [],
    creditSummary: {
      balance: 0,
      paid: 0,
      bonus: 0,
      assigned: 0,
      monthlyLimitTotal: 0,
      used: 0,
      monthlyUsed: 0,
      unassigned: 0,
      rechargeRequired: true
    },
    featureAccess: {
      hasProfiles: false,
      accountOnly: true,
      lockedFeatures: []
    },
    profile: null,
    children: [],
    requests: [],
    robotSessions: [],
    enrollments: [],
    applications: {
      internships: [],
      aiRoboticsClub: []
    },
    unpaidBalance: {
      total: 0,
      lines: []
    },
    invoices: []
  };
}

function getCurrentUsagePeriod() {
  return new Date().toISOString().slice(0, 7);
}

function looksLikeAdminEmail(email: string) {
  return email.trim().toLowerCase().endsWith("@agent-tech.ai");
}

function looksLikeGatewayOwnerEmail(email: string) {
  return email.trim().toLowerCase() === "info@agent-tech.ai";
}

function toDateTimeLocalValue(date: Date) {
  return date.toISOString();
}

function splitAddressLines(address: string) {
  const lines = address
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length <= 1) {
    return {
      line1: lines[0] ?? "",
      line2: ""
    };
  }

  return {
    line1: lines[0],
    line2: lines.slice(1).join(", ")
  };
}

function roundUpToRobotSlot(date: Date) {
  const rounded = new Date(date);
  rounded.setSeconds(0, 0);
  const remainder = rounded.getMinutes() % robotSlotGridMinutes;
  if (remainder !== 0) {
    rounded.setMinutes(rounded.getMinutes() + robotSlotGridMinutes - remainder, 0, 0);
  }
  return rounded;
}

function getDefaultRobotSlotValue() {
  const date = roundUpToRobotSlot(new Date(Date.now() + robotSlotPrepMinutes * 60 * 1000));

  if (date.getHours() < 9) {
    date.setHours(9, 0, 0, 0);
  }

  if (date.getHours() >= 17) {
    date.setDate(date.getDate() + 1);
    date.setHours(9, 0, 0, 0);
  }

  return toDateTimeLocalValue(roundUpToRobotSlot(date));
}

function formatRobotSlotLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function generateRobotSlotCandidates(durationMinutes: number) {
  const slots: RobotSlotOption[] = [];
  const minimumStart = roundUpToRobotSlot(new Date(Date.now() + robotSlotPrepMinutes * 60 * 1000)).getTime();
  const today = new Date();
  const durationMs = durationMinutes * 60 * 1000;

  for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
    const day = new Date(today);
    day.setDate(today.getDate() + dayOffset);

    for (let hour = 9; hour < 17; hour += 1) {
      for (let minute = 0; minute < 60; minute += robotSlotGridMinutes) {
        const slot = new Date(day);
        slot.setHours(hour, minute, 0, 0);
        const slotEnd = slot.getTime() + durationMs;

        if (slot.getTime() < minimumStart) {
          continue;
        }

        if (slotEnd > new Date(slot).setHours(17, 0, 0, 0)) {
          continue;
        }

        slots.push({
          value: slot.toISOString(),
          label: formatRobotSlotLabel(slot.toISOString()),
          disabled: false
        });
      }
    }
  }

  return slots;
}

export function AccountDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [data, setData] = useState<DashboardData>({});
  const [loading, setLoading] = useState(true);
  const [actionMessage, setActionMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [pendingRemovalId, setPendingRemovalId] = useState("");
  const [editingAccount, setEditingAccount] = useState(false);
  const [editAccountFirstName, setEditAccountFirstName] = useState("");
  const [editAccountLastName, setEditAccountLastName] = useState("");
  const [editAccountPhone, setEditAccountPhone] = useState("");
  const [editAccountAddressLine1, setEditAccountAddressLine1] = useState("");
  const [editAccountAddressLine2, setEditAccountAddressLine2] = useState("");
  const [editAccountMessage, setEditAccountMessage] = useState("");
  const [savingAccount, setSavingAccount] = useState(false);
  const [editingProfileId, setEditingProfileId] = useState<number | null>(null);
  const [editProfileType, setEditProfileType] = useState<AccessProfileType>("student");
  const [editProfileUsername, setEditProfileUsername] = useState("");
  const [editProfileName, setEditProfileName] = useState("");
  const [editProfileMonthlyLimit, setEditProfileMonthlyLimit] = useState("0");
  const [editStudentFirstName, setEditStudentFirstName] = useState("");
  const [editStudentLastName, setEditStudentLastName] = useState("");
  const [editStudentDob, setEditStudentDob] = useState("");
  const [editStudentGrade, setEditStudentGrade] = useState("");
  const [editStudentSex, setEditStudentSex] = useState("");
  const [editStudentSchoolInfo, setEditStudentSchoolInfo] = useState("");
  const [editStudentPreferredLocation, setEditStudentPreferredLocation] = useState("");
  const [editProfileMessage, setEditProfileMessage] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [adminCreditTargetEmail, setAdminCreditTargetEmail] = useState("");
  const [adminCreditType, setAdminCreditType] = useState<"paid" | "bonus">("paid");
  const [adminCreditAmount, setAdminCreditAmount] = useState("");
  const [adminCreditMessage, setAdminCreditMessage] = useState("");
  const [addingCredits, setAddingCredits] = useState(false);
  const [adminAiUsage, setAdminAiUsage] = useState<AdminAiUsageData | null>(null);
  const [loadingAdminAiUsage, setLoadingAdminAiUsage] = useState(false);
  const [adminAiUsageMessage, setAdminAiUsageMessage] = useState("");
  const [rechargeCredits, setRechargeCredits] = useState("1000");
  const [rechargeMessage, setRechargeMessage] = useState("");
  const [startingRecharge, setStartingRecharge] = useState(false);
  const [robotSlotProfileId, setRobotSlotProfileId] = useState("");
  const [robotSlotStart, setRobotSlotStart] = useState(getDefaultRobotSlotValue);
  const [robotSlotDurationMinutes, setRobotSlotDurationMinutes] = useState("5");
  const [robotSlotModel, setRobotSlotModel] = useState("Aegies");
  const [robotSlotPreset, setRobotSlotPreset] = useState("starter_demo");
  const [robotSlotRunType, setRobotSlotRunType] = useState<"preset_demo" | "custom_code">("preset_demo");
  const [robotSlotNotes, setRobotSlotNotes] = useState("");
  const [robotSlotMessage, setRobotSlotMessage] = useState("");
  const [robotSlotOptions, setRobotSlotOptions] = useState<RobotSlotOption[]>([]);
  const [loadingRobotSlots, setLoadingRobotSlots] = useState(false);
  const [requestingRobotSlot, setRequestingRobotSlot] = useState(false);
  const [activeTab, setActiveTab] = useState<DashboardTab>("profile");
  const [selectedDashboardProfileId, setSelectedDashboardProfileId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    function loadAccount() {
      const session = getAccountSession();
      const previewProfileType =
        process.env.NODE_ENV !== "production"
          ? new URLSearchParams(window.location.search).get("previewProfile")
          : null;

      if (!session?.email && previewProfileType === "empty") {
        const previewData = buildEmptyPreviewDashboardData();
        setEmail(previewData.account?.email ?? "");
        setData(previewData);
        setLoading(false);
        return;
      }

      if (!session?.email && isPreviewProfileType(previewProfileType)) {
        const previewData = buildPreviewDashboardData(previewProfileType);
        setEmail(previewData.account?.email ?? "");
        setData(previewData);
        setLoading(false);
        return;
      }

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
    if (selectedDashboardProfileId === null || !data.accessProfiles) {
      return;
    }

    if (!data.accessProfiles.some((profile) => profile.id === selectedDashboardProfileId)) {
      setSelectedDashboardProfileId(null);
      setActiveTab("profile");
    }
  }, [data.accessProfiles, selectedDashboardProfileId]);

  useEffect(() => {
    if (email && looksLikeGatewayOwnerEmail(email)) {
      router.replace("/admin/ai-gateway");
    }
  }, [email, router]);

  useEffect(() => {
    if (!email || !looksLikeGatewayOwnerEmail(email)) {
      setAdminAiUsage(null);
      return;
    }

    let cancelled = false;
    setLoadingAdminAiUsage(true);
    setAdminAiUsageMessage("");

    fetch("/api/admin/ai-usage?limit=250")
      .then((response) => response.json().then((result) => ({ response, result: result as AdminAiUsageData & { error?: string } })))
      .then(({ response, result }) => {
        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setAdminAiUsageMessage(result?.error || "Unable to load AI gateway usage. Sign out and sign back in if this admin account was already logged in before deployment.");
          return;
        }

        setAdminAiUsage({
          caps: result.caps ?? [],
          usage: result.usage ?? [],
          developerProfiles: result.developerProfiles ?? [],
          developerAccounts: result.developerAccounts ?? []
        });
      })
      .catch(() => {
        if (!cancelled) {
          setAdminAiUsageMessage("Unable to load AI gateway usage. Sign out and sign back in if this admin account was already logged in before deployment.");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingAdminAiUsage(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [email]);

  useEffect(() => {
    if (!robotSlotProfileId && data.accessProfiles?.length) {
      setRobotSlotProfileId(String(data.accessProfiles[0].id));
    }
  }, [data.accessProfiles, robotSlotProfileId]);

  useEffect(() => {
    if (!email || !data.accessProfiles?.length) {
      setRobotSlotOptions([]);
      return;
    }

    let cancelled = false;
    const durationMinutes = Number(robotSlotDurationMinutes) || 5;
    const candidates = generateRobotSlotCandidates(durationMinutes);
    if (!candidates.length) {
      setRobotSlotOptions([]);
      return;
    }

    const firstStart = candidates[0].value;
    const lastStart = candidates[candidates.length - 1].value;
    const lastEnd = new Date(new Date(lastStart).getTime() + durationMinutes * 60 * 1000).toISOString();
    setLoadingRobotSlots(true);

    fetch(`/api/robot-slot?start=${encodeURIComponent(firstStart)}&end=${encodeURIComponent(lastEnd)}`)
      .then((response) => response.json())
      .then((result: { bookedSlots?: Array<{ scheduledStart: string | null; scheduledEnd: string | null }> }) => {
        if (cancelled) {
          return;
        }

        const bookedSlots = result.bookedSlots ?? [];
        const nextOptions = candidates.map((slot) => {
          const slotStart = new Date(slot.value).getTime();
          const slotEnd = slotStart + durationMinutes * 60 * 1000;
          const booked = bookedSlots.some((bookedSlot) => {
            const bookedStart = new Date(bookedSlot.scheduledStart || "").getTime();
            const bookedEnd = new Date(bookedSlot.scheduledEnd || bookedSlot.scheduledStart || "").getTime();
            return Number.isFinite(bookedStart) && Number.isFinite(bookedEnd) && slotStart < bookedEnd && slotEnd > bookedStart;
          });

          return {
            ...slot,
            label: booked ? `${slot.label} - unavailable` : slot.label,
            disabled: booked
          };
        });
        const selectedSlot = nextOptions.find((slot) => slot.value === robotSlotStart);
        const firstAvailable = nextOptions.find((slot) => !slot.disabled);

        setRobotSlotOptions(nextOptions);
        if ((!selectedSlot || selectedSlot.disabled) && firstAvailable) {
          setRobotSlotStart(firstAvailable.value);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRobotSlotOptions(candidates);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingRobotSlots(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [data.accessProfiles?.length, data.robotSessions?.length, email, robotSlotDurationMinutes, robotSlotStart]);

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

  function startEditingAccount() {
    const addressLines = splitAddressLines(accountAddress);
    setEditAccountFirstName(data.account?.first_name || "");
    setEditAccountLastName(data.account?.last_name || "");
    setEditAccountPhone(phone || "");
    setEditAccountAddressLine1(addressLines.line1);
    setEditAccountAddressLine2(addressLines.line2);
    setEditAccountMessage("");
    setEditingAccount(true);
  }

  function cancelEditingAccount() {
    setEditingAccount(false);
    setEditAccountMessage("");
    setSavingAccount(false);
  }

  async function saveAccount() {
    if (!email) return;

    setSavingAccount(true);
    setEditAccountMessage("");

    const response = await fetch("/api/account", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        firstName: editAccountFirstName,
        lastName: editAccountLastName,
        phone: editAccountPhone,
        addressLine1: editAccountAddressLine1,
        addressLine2: editAccountAddressLine2
      })
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setEditAccountMessage(result?.error || "Unable to update account.");
      setSavingAccount(false);
      return;
    }

    await refreshAccount();
    setEditingAccount(false);
    setEditAccountMessage("Account updated.");
    setSavingAccount(false);
  }

  function startEditingProfile(profile: DashboardAccessProfile) {
    setEditingProfileId(profile.id);
    setEditProfileType(profile.profile_type);
    setEditProfileUsername(profile.username);
    setEditProfileName(profile.display_name || "");
    setEditProfileMonthlyLimit(String(profile.monthly_credit_limit ?? profile.credit_limit ?? 0));
    setEditStudentFirstName(profile.first_name || "");
    setEditStudentLastName(profile.last_name || "");
    setEditStudentDob(profile.dob || "");
    setEditStudentGrade(profile.grade || "");
    setEditStudentSex(profile.sex || "");
    setEditStudentSchoolInfo(profile.school_info || "");
    setEditStudentPreferredLocation(profile.preferred_location || "");
    setEditProfileMessage("");
  }

  function cancelEditingProfile() {
    setEditingProfileId(null);
    setEditProfileMessage("");
    setSavingProfile(false);
  }

  async function saveProfile() {
    if (!email || !editingProfileId) return;

    setSavingProfile(true);
    setEditProfileMessage("");

    const response = await fetch("/api/account-profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: editingProfileId,
        email,
        profileType: editProfileType,
        username: editProfileUsername,
        displayName: editProfileName,
        monthlyCreditLimit: editProfileMonthlyLimit,
        firstName: editStudentFirstName,
        lastName: editStudentLastName,
        dob: editStudentDob,
        grade: editStudentGrade,
        sex: editStudentSex,
        schoolInfo: editStudentSchoolInfo,
        preferredLocation: editStudentPreferredLocation
      })
    });
    const result = (await response.json().catch(() => null)) as { error?: string } | null;

    if (!response.ok) {
      setEditProfileMessage(result?.error || "Unable to update profile.");
      setSavingProfile(false);
      return;
    }

    await refreshAccount();
    setEditingProfileId(null);
    setEditProfileMessage("Profile updated.");
    setSavingProfile(false);
  }

  async function refreshAdminAiUsage() {
    if (!email || !looksLikeGatewayOwnerEmail(email)) return;

    setLoadingAdminAiUsage(true);
    setAdminAiUsageMessage("");

    const response = await fetch("/api/admin/ai-usage?limit=250");
    const result = (await response.json().catch(() => null)) as (AdminAiUsageData & { error?: string }) | null;

    if (!response.ok || !result) {
      setAdminAiUsageMessage(result?.error || "Unable to load AI gateway usage. Sign out and sign back in if this admin account was already logged in before deployment.");
      setLoadingAdminAiUsage(false);
      return;
    }

    setAdminAiUsage({
      caps: result.caps ?? [],
      usage: result.usage ?? [],
      developerProfiles: result.developerProfiles ?? [],
      developerAccounts: result.developerAccounts ?? []
    });
    setLoadingAdminAiUsage(false);
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

  async function startCreditRecharge() {
    if (!email) return;

    setStartingRecharge(true);
    setRechargeMessage("");

    const response = await fetch("/api/account-credits/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        credits: rechargeCredits
      })
    });
    const result = (await response.json().catch(() => null)) as { checkoutUrl?: string; error?: string } | null;

    if (!response.ok || !result?.checkoutUrl) {
      setRechargeMessage(result?.error || "Unable to start card payment.");
      setStartingRecharge(false);
      return;
    }

    window.location.href = result.checkoutUrl;
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
        durationMinutes: robotSlotDurationMinutes,
        robotModel: robotSlotModel,
        presetDemo: robotSlotRunType === "custom_code" ? "approved_custom_code" : robotSlotPreset,
        requestedRunType: robotSlotRunType,
        notes: robotSlotNotes
      })
    });
    const result = (await response.json().catch(() => null)) as { error?: string; emailSent?: boolean } | null;

    if (!response.ok) {
      setRobotSlotMessage(result?.error || "Unable to request that robot slot.");
      setRequestingRobotSlot(false);
      return;
    }

    setRobotSlotNotes("");
    setRobotSlotStart(getDefaultRobotSlotValue());
    setRobotSlotMessage(
      result?.emailSent
        ? "Robot slot requested. Confirmation email sent."
        : "Robot slot requested. Confirmation email is not configured yet."
    );
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
  const accountAddress = data.profile?.address || "";
  const hasRequestItems = Boolean(data.unpaidBalance?.lines.length);
  const hasConfirmableRequest = Boolean(data.unpaidBalance?.lines.some((line) => !line.invoiceEmailSentAt));
  const hasRobotSessions = Boolean(data.robotSessions?.length);
  const hasInvoices = Boolean(data.invoices?.length);
  const hasAccessProfiles = Boolean(data.accessProfiles?.length);
  const hasChildren = Boolean(data.children?.length);
  const hasEnrollments = Boolean(data.enrollments?.length);
  const creditBalance = data.creditSummary?.balance ?? data.account?.credit_balance ?? 0;
  const paidCredits = data.creditSummary?.paid ?? data.account?.paid_credit_balance ?? 0;
  const bonusCredits = data.creditSummary?.bonus ?? data.account?.bonus_credit_balance ?? 0;
  const monthlyLimitTotal = data.creditSummary?.monthlyLimitTotal ?? data.creditSummary?.assigned ?? 0;
  const monthlyUsed = data.creditSummary?.monthlyUsed ?? 0;
  const selectedRechargeCredits = Math.max(0, Math.floor(Number(rechargeCredits || 0)));
  const selectedCardChargeCents = calculateCardChargeCents(selectedRechargeCredits);
  const selectedProcessingFeeCents = Math.max(0, selectedCardChargeCents - selectedRechargeCredits);
  const isAdminAccount = looksLikeAdminEmail(email);
  const isGatewayOwnerAccount = looksLikeGatewayOwnerEmail(email);
  const isInternalCompanyAccount = looksLikeAdminEmail(email);
  const selectedRobotSlot = robotSlotOptions.find((slot) => slot.value === robotSlotStart);
  const developerCodeReviewPassed = data.account?.developer_physical_safety_status === "passed" && data.account?.developer_ai_security_status === "passed";
  const internalTestingBypass = isInternalCompanyAccount;
  const customCodeLocked = robotSlotRunType === "custom_code" && !internalTestingBypass && !developerCodeReviewPassed;
  const robotSlotCreditLocked = !internalTestingBypass && creditBalance <= 0;
  const robotSlotUnavailable = loadingRobotSlots || !selectedRobotSlot || selectedRobotSlot.disabled || robotSlotCreditLocked || customCodeLocked;
  const selectedDashboardProfile = data.accessProfiles?.find((profile) => profile.id === selectedDashboardProfileId) ?? null;
  const selectedDashboardProfileType = selectedDashboardProfile?.profile_type ?? null;
  const visibleDashboardTabs = selectedDashboardProfileType
    ? getDashboardTabs(selectedDashboardProfileType)
    : dashboardTabs.filter((tab) => tab.id !== "courses" && tab.id !== "robot");
  const currentTab = visibleDashboardTabs.some((tab) => tab.id === activeTab) ? activeTab : "profile";
  const selectedVisual = selectedDashboardProfileType ? profileVisuals[selectedDashboardProfileType] : null;
  const accountAvatar = "from-slate-100 to-slate-200 text-slate-700";
  const profileInitial = (displayName.trim()[0] || email.trim()[0] || "A").toUpperCase();
  const openRobotCount = (data.robotSessions ?? []).filter((session) => {
    const status = session.session_status.replace(/_/g, " ").toLowerCase();
    return !["cancelled", "canceled", "voided", "rejected", "deleted"].includes(status);
  }).length;
  const invoiceTotal = data.invoices?.length ?? 0;
  const totalSpent = (data.invoices ?? []).reduce((total, invoice) => total + Number(invoice.amount_paid ?? 0), 0);
  const purchaseHistoryItems = [
    ...(data.invoices ?? []).map((invoice) => ({
      key: `invoice-${invoice.invoice_number}`,
      category: "Invoice",
      title: `Invoice ${invoice.invoice_number}`,
      meta: "Formal invoice record",
      amount: Number(invoice.total_amount ?? 0),
      status: formatInvoiceStatus(invoice.status),
      date: invoice.created_at,
      href: `/invoice/${invoice.invoice_number}`
    })),
    ...(data.requests ?? []).map((request) => ({
      key: `purchase-${request.invoice_number}`,
      category: "Robot Purchase",
      title: request.product,
      meta: `Purchase request ${request.invoice_number}`,
      amount: null as number | null,
      status: formatRequestStatus(request.status),
      date: request.created_at,
      href: `/invoice/${request.invoice_number}`
    })),
    ...(data.enrollments ?? []).map((enrollment) => ({
      key: `course-${enrollment.id}`,
      category: "Course",
      title: enrollment.agentech_classes?.class_name || "Course enrollment",
      meta: enrollment.site_name || enrollment.agentech_classes?.class_time || "Education program",
      amount: Number(enrollment.price ?? 0),
      status: enrollment.paid ? "Paid" : "Payment pending",
      date: enrollment.created_at,
      href: "/agentech-education"
    })),
    ...(data.robotSessions ?? []).map((session) => ({
      key: `live-viewing-${session.id}`,
      category: "Live Viewing",
      title: session.session_title || "Robot live viewing",
      meta: session.robot_model || "Robot session",
      amount: null as number | null,
      status: formatInvoiceStatus(session.session_status),
      date: session.created_at,
      href: null as string | null
    })),
    ...(data.unpaidBalance?.lines ?? []).map((line) => ({
      key: `cart-${line.id}`,
      category: "Cart",
      title: formatInvoiceItemName(line.itemName),
      meta: line.sourceType ? `${line.sourceType.replace(/_/g, " ")} item` : "Pending cart item",
      amount: Number(line.amount ?? 0),
      status: line.invoiceEmailSentAt ? "Invoice generated" : "In cart",
      date: new Date().toISOString(),
      href: null as string | null
    }))
  ].sort((first, second) => new Date(second.date).getTime() - new Date(first.date).getTime());
  const roleMetric = selectedDashboardProfileType === "developer"
    ? { icon: "R", label: "Live Viewing", value: openRobotCount.toLocaleString(), helper: hasRobotSessions ? "Viewing slots requested" : "Ready for booking", visual: profileVisuals.developer }
    : selectedDashboardProfileType === "student"
      ? { icon: "E", label: "Enrollments", value: (data.enrollments?.length ?? 0).toLocaleString(), helper: hasEnrollments ? "Learning activity" : "No classes yet", visual: profileVisuals.student }
      : selectedDashboardProfileType === "teacher"
        ? { icon: "S", label: "Students", value: (data.children?.length ?? 0).toLocaleString(), helper: hasChildren ? "Managed learners" : "No students yet", visual: profileVisuals.teacher }
        : selectedDashboardProfileType === "talent"
          ? { icon: "T", label: "Talent Profile", value: "1", helper: selectedDashboardProfile ? `@${selectedDashboardProfile.username}` : "Portfolio tools", visual: profileVisuals.talent }
          : { icon: "P", label: "Profiles", value: (data.accessProfiles?.length ?? 0).toLocaleString(), helper: hasAccessProfiles ? "Choose a profile below" : "No profiles yet", visual: profileVisuals.developer };
  const recentActivity = [
    ...(selectedDashboardProfileType === "developer" ? (data.robotSessions ?? []).slice(0, 2).map((session) => ({
      key: `session-${session.id}`,
      icon: "R",
      title: session.session_title || "Robot session requested",
      meta: `${session.robot_model || "Robot"} - ${formatInvoiceStatus(session.session_status)}`,
      date: session.created_at,
      visual: profileVisuals[session.profile_type ?? selectedDashboardProfileType]
    })) : []),
    ...((selectedDashboardProfileType === "student" || selectedDashboardProfileType === "teacher") ? (data.enrollments ?? []).slice(0, 2).map((enrollment) => ({
      key: `enrollment-${enrollment.id}`,
      icon: "E",
      title: enrollment.agentech_classes?.class_name || "Class enrollment",
      meta: enrollment.paid ? "Paid" : "Payment pending",
      date: enrollment.created_at,
      visual: profileVisuals.student
    })) : []),
    ...(data.invoices ?? []).slice(0, 2).map((invoice) => ({
      key: `invoice-${invoice.invoice_number}`,
      icon: "I",
      title: `Invoice ${invoice.invoice_number}`,
      meta: `${formatInvoiceStatus(invoice.status)} - ${formatUsd(Number(invoice.total_amount ?? 0))}`,
      date: invoice.created_at,
      visual: profileVisuals.talent
    })),
    ...(data.accessProfiles ?? []).slice(0, 2).map((profile) => ({
      key: `profile-${profile.id}`,
      icon: getProfileMark(profile.profile_type),
      title: `${getProfileOptionLabel(profile.profile_type)} profile active`,
      meta: `@${profile.username}`,
      date: profile.created_at,
      visual: profileVisuals[profile.profile_type]
    }))
  ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);
  const tabCounts: Partial<Record<DashboardTab, number>> = {
    courses: selectedDashboardProfileType === "student" || selectedDashboardProfileType === "teacher" ? data.enrollments?.length ?? 0 : 0,
    robot: selectedDashboardProfileType === "developer" ? openRobotCount : 0,
    invoices: invoiceTotal,
    settings: data.accessProfiles?.length ?? 0
  };

  if (isGatewayOwnerAccount) {
    return (
      <div className="rounded-[24px] border border-slate-200 bg-white p-8 shadow-[0_18px_55px_rgba(15,23,42,0.08)]">
        <h1 className="text-3xl font-bold text-slate-950">Opening AI Gateway Admin</h1>
        <p className="mt-3 text-slate-600">Redirecting info@agent-tech.ai to the protected AI Gateway console.</p>
      </div>
    );
  }

  if (isGatewayOwnerAccount) {
    const caps = adminAiUsage?.caps ?? [];
    const usage = adminAiUsage?.usage ?? [];
    const developerProfiles = adminAiUsage?.developerProfiles ?? [];
    const developerAccounts = adminAiUsage?.developerAccounts ?? [];
    const capByEmail = new Map(caps.map((cap) => [cap.user_id, cap]));
    const accountByEmail = new Map(developerAccounts.map((account) => [account.email, account]));
    const totalRequests = caps.reduce((total, cap) => total + Number(cap.current_requests ?? 0), 0);
    const totalTokens = caps.reduce((total, cap) => total + Number(cap.current_tokens ?? 0), 0);
    const totalCost = caps.reduce((total, cap) => total + Number(cap.current_cost ?? 0), 0);
    const activeGatewayUsers = caps.filter((cap) => Number(cap.current_requests ?? 0) > 0).length;

    return (
      <div className="relative z-[1] overflow-hidden rounded-[18px] border border-slate-200 bg-[#f8fbff] shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
        <div className="flex flex-col gap-5 border-b border-slate-200 bg-white px-5 pb-5 pt-5 sm:px-7 md:flex-row md:items-start md:justify-between md:px-8 md:pt-7">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f70c8]">Admin Console</p>
            <h1 className="mt-2 text-[28px] font-bold leading-tight text-slate-950 sm:text-4xl">AI Gateway Usage</h1>
            <p className="mt-2 max-w-3xl text-sm font-medium leading-6 text-slate-600">
              Monitor every developer profile, AI request count, token usage, estimated cost, and gateway cap from one owner account.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void refreshAdminAiUsage()}
              disabled={loadingAdminAiUsage}
              className="rounded-full border border-[#2f70c8] bg-white px-4 py-2 text-sm font-bold text-[#245da7] transition hover:bg-[#eff6ff] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loadingAdminAiUsage ? "Refreshing..." : "Refresh Usage"}
            </button>
            <button
              type="button"
              onClick={() => {
                clearAccountSession();
                setEmail("");
                setData({});
                router.replace("/login?signedOut=1");
                router.refresh();
              }}
              className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#2f70c8] hover:text-[#2f70c8]"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="space-y-6 p-5 sm:p-7 md:p-8">
          {adminAiUsageMessage ? (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">{adminAiUsageMessage}</p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-4">
            {[
              { label: "Developer Profiles", value: developerProfiles.length.toLocaleString(), helper: "Profiles with developer access" },
              { label: "Gateway Users", value: activeGatewayUsers.toLocaleString(), helper: "Used AI this month" },
              { label: "Monthly Requests", value: totalRequests.toLocaleString(), helper: "Across all users" },
              { label: "Estimated Cost", value: formatGatewayCost(totalCost), helper: "Current month" }
            ].map((card) => (
              <div key={card.label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{card.label}</p>
                <p className="mt-3 text-3xl font-black text-slate-950">{card.value}</p>
                <p className="mt-2 text-sm text-slate-500">{card.helper}</p>
              </div>
            ))}
          </div>

          <section className="rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2f70c8]">Developer Profiles</p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">AI Usage By Developer Account</h2>
              </div>
              <p className="rounded-full bg-[#eff6ff] px-3 py-1 text-xs font-bold text-[#245da7]">
                {formatTokenCount(totalTokens)} tokens this month
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-[980px] w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-[0.12em] text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Developer</th>
                    <th className="px-5 py-3">Account</th>
                    <th className="px-5 py-3">Requests</th>
                    <th className="px-5 py-3">Tokens</th>
                    <th className="px-5 py-3">Cost</th>
                    <th className="px-5 py-3">Software Gate</th>
                    <th className="px-5 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {developerProfiles.length ? developerProfiles.map((profile) => {
                    const cap = capByEmail.get(profile.account_email);
                    const account = accountByEmail.get(profile.account_email);
                    const requests = Number(cap?.current_requests ?? 0);
                    const requestLimit = Number(cap?.monthly_request_limit ?? 20);
                    const tokens = Number(cap?.current_tokens ?? 0);
                    const cost = Number(cap?.current_cost ?? 0);
                    const costLimit = Number(cap?.monthly_cost_limit ?? 5);
                    const gateStatus = account?.developer_ai_security_status || "not started";
                    return (
                      <tr key={profile.id} className="align-top">
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-950">{profile.display_name || profile.username}</p>
                          <p className="mt-1 font-mono text-xs text-slate-500">@{profile.username}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="break-all font-semibold text-slate-700">{profile.account_email}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-950">{requests.toLocaleString()} / {requestLimit.toLocaleString()}</p>
                          <p className="mt-1 text-xs text-slate-500">monthly calls</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-950">{formatTokenCount(tokens)}</p>
                          <p className="mt-1 text-xs text-slate-500">prompt + completion</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-bold text-slate-950">{formatGatewayCost(cost)}</p>
                          <p className="mt-1 text-xs text-slate-500">limit {formatGatewayCost(costLimit)}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${
                            gateStatus === "passed"
                              ? "bg-emerald-50 text-emerald-700"
                              : gateStatus === "failed" || gateStatus === "error"
                                ? "bg-red-50 text-red-700"
                                : "bg-slate-100 text-slate-600"
                          }`}>
                            {formatInvoiceStatus(gateStatus)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-slate-600">
                          {cap?.updated_at ? formatDateTime(cap.updated_at) : "No AI usage yet"}
                        </td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td className="px-5 py-8 text-center text-sm font-semibold text-slate-500" colSpan={7}>
                        No developer profiles found yet. Create developer profiles on user accounts and they will appear here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="rounded-[18px] border border-slate-200 bg-white shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
            <div className="border-b border-slate-200 px-5 py-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#2f70c8]">Recent Calls</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">AI Gateway Log</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {usage.length ? usage.slice(0, 12).map((row) => (
                <div key={row.id} className="grid gap-3 px-5 py-4 text-sm md:grid-cols-[minmax(220px,1fr)_150px_120px_120px_150px] md:items-center">
                  <div>
                    <p className="break-all font-bold text-slate-950">{row.user_id}</p>
                    <p className="mt-1 text-xs text-slate-500">{row.endpoint} - {row.model}</p>
                  </div>
                  <p className="font-semibold text-slate-700">{formatTokenCount(row.total_tokens)} tokens</p>
                  <p className="font-semibold text-slate-700">{formatGatewayCost(row.estimated_cost)}</p>
                  <p className="font-semibold text-slate-700">HTTP {row.status_code ?? "n/a"}</p>
                  <p className="text-slate-500">{formatDateTime(row.created_at)}</p>
                </div>
              )) : (
                <p className="px-5 py-8 text-center text-sm font-semibold text-slate-500">No AI gateway calls logged yet.</p>
              )}
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <>
      {selectedDashboardProfileType === "student" ? (
        <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,rgba(5,8,25,0.08),rgba(5,8,25,0.18)),url('/assets/backgrounds/account-dashboard-background.png')] bg-cover bg-[right_center]" />
      ) : null}
    <div className="relative z-[1] overflow-hidden rounded-[18px] border border-slate-200 bg-white shadow-[0_18px_60px_rgba(15,23,42,0.08)]">
      <div className="relative z-[1] flex flex-col gap-5 px-5 pb-4 pt-5 sm:px-7 md:flex-row md:items-start md:justify-between md:px-8 md:pt-7">
        <div>
          <h1 className="text-[28px] font-bold leading-tight text-slate-950 sm:text-4xl">Account</h1>
          <p className="mt-2 text-sm font-medium text-slate-500">Manage account information, profiles, credits, invoices, and access.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br text-base font-bold ${selectedVisual?.avatar ?? accountAvatar}`}>
            {profileInitial}
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
            className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-[#2f70c8] hover:text-[#2f70c8]"
          >
            Sign Out
          </button>
        </div>
      </div>

      <div className="relative z-[1] overflow-x-auto border-b border-slate-200 px-5 sm:px-7 md:px-8">
        <div className="flex min-w-max items-center gap-5">
          {visibleDashboardTabs.map((tab) => {
            const selected = currentTab === tab.id;
            const count = tabCounts[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === "profile") {
                    setSelectedDashboardProfileId(null);
                  }
                  setActiveTab(tab.id);
                }}
                className={`relative flex items-center gap-2 px-1 py-4 text-sm font-bold transition ${
                  selected ? "text-[#2f70c8]" : "text-slate-500 hover:text-slate-900"
                }`}
              >
                <span className={`grid h-5 w-5 place-items-center rounded-full border text-[11px] ${selected ? "border-[#2f70c8] bg-[#eff6ff]" : "border-slate-300 bg-white"}`}>
                  {tab.mark}
                </span>
                {tab.label}
                {typeof count === "number" && count > 0 ? (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-600">{count}</span>
                ) : null}
                {selected ? <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-[#2f70c8]" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      <div className="relative z-[1] space-y-6 p-5 sm:p-7 md:p-8">
        {currentTab === "profile" ? (
          <section className="grid gap-5 lg:grid-cols-[0.82fr_1.35fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-bold text-slate-950">Account Information</h2>
                  <p className={`mt-2 text-xs font-bold uppercase ${selectedVisual?.accent ?? "text-slate-500"}`}>
                    {selectedDashboardProfile ? `${getProfileOptionLabel(selectedDashboardProfile.profile_type)} selected` : "Account owner"}
                  </p>
                </div>
                <div className={`grid h-16 w-16 shrink-0 place-items-center rounded-full bg-gradient-to-br text-xl font-bold ${selectedVisual?.avatar ?? accountAvatar}`}>
                  {profileInitial}
                </div>
              </div>
              {editingAccount ? (
                <div className="mt-6 space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">First Name</span>
                      <input
                        value={editAccountFirstName}
                        onChange={(event) => setEditAccountFirstName(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                      />
                    </label>
                    <label className="block">
                      <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Last Name</span>
                      <input
                        value={editAccountLastName}
                        onChange={(event) => setEditAccountLastName(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                      />
                    </label>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Sign-in Email</p>
                    <p className="mt-2 break-all text-sm font-bold text-slate-950">{email}</p>
                    <p className="mt-1 text-xs font-semibold text-slate-500">Email cannot be changed from account editing.</p>
                  </div>
                  <label className="block">
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Phone Number</span>
                    <input
                      value={editAccountPhone}
                      onChange={(event) => setEditAccountPhone(event.target.value)}
                      required
                      className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                    />
                    <span className="mt-2 block text-xs font-semibold text-slate-500">Phone number is required for this account.</span>
                  </label>
                  <div className="space-y-3">
                    <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Billing Address</p>
                    <input
                      value={editAccountAddressLine1}
                      onChange={(event) => setEditAccountAddressLine1(event.target.value)}
                      placeholder="Street address, suite, or unit"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                    />
                    <input
                      value={editAccountAddressLine2}
                      onChange={(event) => setEditAccountAddressLine2(event.target.value)}
                      placeholder="City, state, ZIP, country"
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                    />
                    <span className="block text-xs font-semibold text-slate-500">Optional. Used for billing and invoice contact details.</span>
                  </div>
                  {editAccountMessage ? <p className="text-sm font-semibold text-[#2f70c8]">{editAccountMessage}</p> : null}
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={saveAccount}
                      disabled={savingAccount}
                      className="flex-1 rounded-lg bg-[#2563eb] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-slate-300"
                    >
                      {savingAccount ? "Saving..." : "Save Account"}
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditingAccount}
                      className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:border-[#2f70c8] hover:text-[#2f70c8]"
                    >
                      Cancel
                    </button>
                  </div>
                  {hasAccessProfiles ? (
                    <button
                      type="button"
                      onClick={() => setActiveTab("settings")}
                      className="text-sm font-bold text-[#2563eb]"
                    >
                      Edit profile usernames in Profiles
                    </button>
                  ) : null}
                </div>
              ) : (
                <>
                  <dl className="mt-6 space-y-6">
                    <div>
                      <dt className="text-xs font-bold text-slate-500">Full Name</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-900">{displayName}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-slate-500">Email</dt>
                      <dd className="mt-1 break-all text-sm font-bold text-slate-900">{email}</dd>
                      <dd className="mt-1 text-xs font-semibold text-slate-500">Sign-in email cannot be changed here.</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-bold text-slate-500">Phone</dt>
                      <dd className="mt-1 text-sm font-bold text-slate-900">{phone || "Required"}</dd>
                    </div>
                    {accountAddress ? (
                      <div>
                        <dt className="text-xs font-bold text-slate-500">Address</dt>
                        <dd className="mt-1 whitespace-pre-line text-sm font-bold text-slate-900">{accountAddress}</dd>
                      </div>
                    ) : null}
                  </dl>
                  {editAccountMessage ? <p className="mt-4 text-sm font-semibold text-[#2f70c8]">{editAccountMessage}</p> : null}
                  <button
                    type="button"
                    onClick={startEditingAccount}
                    className="mt-7 w-full rounded-lg bg-[#2563eb] px-5 py-3 text-sm font-bold text-white shadow-[0_10px_22px_rgba(37,99,235,0.22)] transition hover:bg-[#1d4ed8]"
                  >
                    Edit Account
                  </button>
                </>
              )}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <h2 className="text-base font-bold text-slate-950">Account Overview</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  { icon: "$", label: "credits", value: Math.max(0, Math.floor(creditBalance)).toLocaleString(), helper: `${formatUsd(creditBalance / 100)} USD`, visual: profileVisuals.teacher },
                  roleMetric,
                  { icon: "I", label: "Invoices", value: invoiceTotal.toLocaleString(), helper: hasInvoices ? "Official records" : "No invoices yet", visual: profileVisuals.talent },
                  { icon: "B", label: "Total Spent", value: formatUsd(totalSpent), helper: (data.unpaidBalance?.total ?? 0) > 0 ? `${formatUsd(data.unpaidBalance?.total ?? 0)} in cart` : "No amount due", visual: profileVisuals.student }
                ].map((card) => (
                  <div key={card.label} className="flex min-h-24 items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)]">
                    <div className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-bold ${card.visual.iconBg} ${card.visual.iconText}`}>
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-2xl font-bold leading-none text-slate-950">{card.value}</p>
                      <p className="mt-1 text-sm font-bold text-slate-600">{card.label}</p>
                      <p className="mt-1 text-xs font-medium text-slate-500">{card.helper}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <h3 className="text-sm font-bold text-slate-950">Recent Activity</h3>
                <div className="mt-3 divide-y divide-slate-100">
                  {recentActivity.length ? (
                    recentActivity.map((activity) => (
                      <div key={activity.key} className="flex items-center justify-between gap-4 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl text-xs font-bold ${activity.visual.iconBg} ${activity.visual.iconText}`}>
                            {activity.icon}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-bold text-slate-900">{activity.title}</p>
                            <p className="truncate text-xs font-medium text-slate-500">{activity.meta}</p>
                          </div>
                        </div>
                        <span className="shrink-0 text-xs font-semibold text-slate-500">{formatDate(activity.date)}</span>
                      </div>
                    ))
                  ) : (
                    <p className="py-4 text-sm text-slate-500">No recent account activity yet.</p>
                  )}
                </div>
                <button type="button" onClick={() => setActiveTab(selectedDashboardProfileType === "developer" ? "robot" : "settings")} className="mt-2 text-sm font-bold text-[#2563eb]">
                  {selectedDashboardProfileType === "developer" ? "View Activity" : "Manage Profiles"}
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {currentTab === "balance" ? (
          <section className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-bold uppercase text-[#2f70c8]">Billing</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-950">{formatCredits(creditBalance)}</h2>
              <p className="mt-2 text-sm font-medium text-slate-500">Credit balance, recharge controls, cart items, and account billing status live here.</p>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-bold text-slate-500">Paid Credits</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">{formatCredits(paidCredits)}</p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-bold text-emerald-700">Bonus Credits</p>
                  <p className="mt-2 text-xl font-bold text-slate-950">{formatCredits(bonusCredits)}</p>
                </div>
              </div>
              {data.creditSummary?.rechargeRequired ? (
                <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold text-amber-900">
                  No credits are available. Recharge this account before profiles can spend credits.
                </p>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-[#2f70c8]">Recharge Credits</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">Pay by card</h2>
                  <p className="mt-2 text-sm text-slate-500">The account receives the full credit value. Card processing is added on top.</p>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
                  <p className="text-xs font-bold text-slate-500">Card Charge</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{formatUsd(selectedCardChargeCents / 100)}</p>
                </div>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                <label className="block">
                  <span className="text-xs font-bold uppercase text-slate-500">Credits To Buy</span>
                  <select
                    value={rechargeCredits}
                    onChange={(event) => setRechargeCredits(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                  >
                    {creditRechargeOptions.map((credits) => (
                      <option key={credits} value={credits}>
                        {credits.toLocaleString()} credits - card charge {formatUsd(calculateCardChargeCents(credits) / 100)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  onClick={startCreditRecharge}
                  disabled={startingRecharge}
                  className="rounded-lg bg-[#2563eb] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#1d4ed8] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {startingRecharge ? "Starting..." : "Pay By Card"}
                </button>
              </div>
              <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
                <p>Credits added: {formatUsd(selectedRechargeCredits / 100)}</p>
                <p>Card processing: {formatUsd(selectedProcessingFeeCents / 100)}</p>
                <p className="font-bold text-slate-950">Total charge: {formatUsd(selectedCardChargeCents / 100)}</p>
              </div>
              {rechargeMessage ? <p className="mt-3 text-sm font-bold text-red-600">{rechargeMessage}</p> : null}
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase text-[#2f70c8]">Cart</p>
                  <h2 className="mt-2 text-xl font-bold text-slate-950">Open Billing Cart</h2>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Courses, live viewing, robot purchases, credits, and other pending charges can collect here before an official invoice is generated.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 text-right">
                  <p className="text-xs font-bold text-slate-500">Open Cart Balance</p>
                  <p className="mt-1 text-lg font-bold text-slate-950">{(data.unpaidBalance?.total ?? 0) > 0 ? formatUsd(data.unpaidBalance?.total ?? 0) : "No amount due"}</p>
                </div>
              </div>
              {actionMessage ? <p className="mt-3 text-sm font-semibold text-[#2f70c8]">{actionMessage}</p> : null}
              <div className="mt-5 space-y-3">
                {data.unpaidBalance?.lines.length ? (
                  data.unpaidBalance.lines.map((line) => (
                    <div key={line.id} className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div>
                        <p className="font-semibold text-slate-950">{formatInvoiceItemName(line.itemName)}</p>
                        <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">{line.sourceType.replace(/_/g, " ")}</p>
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
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                    <p className="font-semibold text-slate-950">No open cart items.</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">When an account has pending purchases or monthly charges, they will appear here.</p>
                  </div>
                )}
              </div>
              {hasConfirmableRequest ? (
                <button
                  type="button"
                  onClick={confirmRequest}
                  disabled={confirming}
                  className="mt-5 rounded-full bg-[#2f70c8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#245da7] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {confirming ? "Generating..." : "Generate Invoice"}
                </button>
              ) : null}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-[0_10px_30px_rgba(15,23,42,0.05)]">
              <p className="text-xs font-bold uppercase text-[#2f70c8]">Subscriptions</p>
              <h2 className="mt-2 text-xl font-bold text-slate-950">Monthly Billing</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Monthly subscriptions, recurring services, and plan charges will appear here when enabled for this account.
              </p>
              <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <p className="font-semibold text-slate-950">No active subscription.</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">This account is currently pay-as-you-go for credits and purchases.</p>
              </div>
            </div>
          </div>
          </section>
        ) : null}

        {currentTab === "courses" ? (
          <section className="rounded-[24px] border border-slate-200 bg-white/95 p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-600">Courses</p>
                <h2 className="mt-2 text-2xl font-bold text-slate-950">Learning Path</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Course enrollments, class schedule, and payment status for this student profile.
                </p>
              </div>
              <Link href="/agentech-education" className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-950 transition hover:border-sky-400 hover:text-sky-700">
                Browse Courses
              </Link>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="space-y-4">
                {data.enrollments?.length ? (
                  data.enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="rounded-2xl border border-sky-100 bg-sky-50/70 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div>
                          <p className="text-lg font-bold text-slate-950">
                            {enrollment.agentech_classes?.class_name || enrollment.class_id || "Class enrollment"}
                          </p>
                          <p className="mt-2 text-sm text-slate-600">
                            {[enrollment.site_name, enrollment.agentech_classes?.class_time, enrollment.agentech_classes?.starting_date]
                              .filter(Boolean)
                              .join(" - ")}
                          </p>
                          {enrollment.agentech_classes?.age_range ? (
                            <p className="mt-1 text-sm text-slate-500">{enrollment.agentech_classes.age_range}</p>
                          ) : null}
                        </div>
                        <span className={`rounded-full px-3 py-1 text-xs font-bold ${enrollment.paid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                          {enrollment.paid ? "Paid" : "Payment pending"}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-5">
                    <p className="font-bold text-slate-950">No courses yet.</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">When this student enrolls in Agentech Education courses, they will appear here.</p>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">Student Summary</p>
                <div className="mt-4 space-y-4">
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">Active courses</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">{data.enrollments?.length ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">Saved students</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">{data.children?.length ?? 0}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-4">
                    <p className="text-sm font-bold text-slate-950">Monthly credits used</p>
                    <p className="mt-1 text-3xl font-bold text-slate-950">{Math.max(0, Math.floor(monthlyUsed)).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        ) : null}

      {currentTab === "settings" && isAdminAccount ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f70c8]">Admin Credits</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Manual Credit Add</h2>
              <p className="mt-2 text-sm text-slate-600">Paid credits are used before bonus credits when a profile spends.</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-950">Visible to internal admins only</p>
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

      {currentTab === "settings" ? (
      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f70c8]">Profile Management</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">Edit Profiles</h2>
            <p className="mt-2 text-sm text-slate-600">Update existing profile access, student details, usernames, and monthly credit limits.</p>
          </div>
          <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
            <p>{data.accessProfiles?.length ?? 0} active profiles</p>
            <p className="mt-1 text-xs text-slate-500">
              Monthly caps: {formatCredits(monthlyLimitTotal)} - Used {formatCredits(monthlyUsed)}
            </p>
          </div>
        </div>

        <div className="mt-6">
          <div className="space-y-3">
            {hasAccessProfiles ? (
              data.accessProfiles?.map((profile) => {
                const monthlyLimit = Number(profile.monthly_credit_limit ?? profile.credit_limit ?? 0);
                const monthlyUsedForPeriod = profile.monthly_usage_period === getCurrentUsagePeriod()
                  ? Number(profile.monthly_credits_used ?? 0)
                  : 0;
                const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsedForPeriod);
                const visual = profileVisuals[profile.profile_type];
                if (editingProfileId === profile.id) {
                  return (
                    <div key={profile.id} className="rounded-2xl border border-[#2f70c8]/30 bg-[#eff6ff] p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">Edit Profile</p>
                          <p className="mt-1 text-sm text-slate-600">@{profile.username} - {getProfileOptionLabel(profile.profile_type)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={cancelEditingProfile}
                          className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-[#2f70c8] hover:text-[#2f70c8]"
                        >
                          Cancel
                        </button>
                      </div>
                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Profile Type</span>
                          <select
                            value={editProfileType}
                            onChange={(event) => setEditProfileType(event.target.value as AccessProfileType)}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                          >
                            {profileOptions.map((option) => (
                              <option key={option.type} value={option.type}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Username</span>
                          <input
                            value={editProfileUsername}
                            onChange={(event) => setEditProfileUsername(event.target.value.toLowerCase())}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Display Name</span>
                          <input
                            value={editProfileName}
                            onChange={(event) => setEditProfileName(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                          />
                        </label>
                        <label className="block">
                          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Monthly Credit Limit</span>
                          <input
                            type="number"
                            min="0"
                            step="1"
                            value={editProfileMonthlyLimit}
                            onChange={(event) => setEditProfileMonthlyLimit(event.target.value)}
                            className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                          />
                        </label>
                      </div>
                      {editProfileType === "student" ? (
                        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Student Information</p>
                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">First Name</span>
                              <input
                                value={editStudentFirstName}
                                onChange={(event) => setEditStudentFirstName(event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Last Name</span>
                              <input
                                value={editStudentLastName}
                                onChange={(event) => setEditStudentLastName(event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Date of Birth</span>
                              <input
                                type="date"
                                value={editStudentDob}
                                onChange={(event) => setEditStudentDob(event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Grade</span>
                              <select
                                value={editStudentGrade}
                                onChange={(event) => setEditStudentGrade(event.target.value)}
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
                                value={editStudentSex}
                                onChange={(event) => setEditStudentSex(event.target.value)}
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
                                value={editStudentSchoolInfo}
                                onChange={(event) => setEditStudentSchoolInfo(event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                              />
                            </label>
                            <label className="block sm:col-span-2">
                              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Preferred Location</span>
                              <input
                                value={editStudentPreferredLocation}
                                onChange={(event) => setEditStudentPreferredLocation(event.target.value)}
                                className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                              />
                            </label>
                          </div>
                        </div>
                      ) : null}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        {editProfileMessage ? <p className="text-sm font-semibold text-[#2f70c8]">{editProfileMessage}</p> : <span />}
                        <button
                          type="button"
                          onClick={saveProfile}
                          disabled={savingProfile}
                          className="rounded-full bg-[#2f70c8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#245da7] disabled:cursor-not-allowed disabled:bg-slate-300"
                        >
                          {savingProfile ? "Saving..." : "Save Profile"}
                        </button>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={profile.id} className={`grid gap-4 rounded-2xl border p-4 md:grid-cols-[1fr_auto] md:items-center ${visual.panel}`}>
                    <div className="flex gap-3">
                      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl text-sm font-bold ${visual.iconBg} ${visual.iconText}`}>
                        {getProfileMark(profile.profile_type)}
                      </span>
                      <div>
                      <p className="font-semibold text-slate-950">{profile.display_name || `${getProfileOptionLabel(profile.profile_type)} Profile`}</p>
                      <p className="mt-1 text-sm text-slate-600">@{profile.username} - {getProfileOptionLabel(profile.profile_type)}</p>
                      <p className="mt-1 text-sm font-medium text-slate-500">{visual.tone}</p>
                      {profile.profile_type === "student" ? (
                        <p className="mt-1 text-sm text-slate-600">
                          {[profile.grade, profile.sex, profile.school_info].filter(Boolean).join(" - ")}
                        </p>
                      ) : null}
                      {profile.profile_type === "student" && profile.preferred_location ? (
                        <p className="mt-1 text-sm text-slate-600">Preferred location: {profile.preferred_location}</p>
                      ) : null}
                      </div>
                    </div>
                    <div className="text-sm md:text-right">
                      <p className="font-semibold text-[#2f70c8]">{formatCredits(monthlyRemaining)} left this month</p>
                      <p className="mt-1 text-slate-600">
                        Monthly limit {formatCredits(monthlyLimit)} - Used {formatCredits(monthlyUsedForPeriod)}
                      </p>
                      <button
                        type="button"
                        onClick={() => startEditingProfile(profile)}
                        className="mt-3 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-[#2f70c8] hover:text-[#2f70c8]"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6">
                <p className="font-semibold text-slate-950">No profiles to edit yet.</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Create profiles from the Account tab first. They will appear here for editing after they are created.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab("profile");
                  }}
                  className="mt-5 rounded-full bg-[#2f70c8] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#245da7]"
                >
                  Go to Account Profiles
                </button>
              </div>
            )}
          </div>

        </div>
      </section>
      ) : null}

      {currentTab === "robot" && hasAccessProfiles ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f70c8]">Robot Slot</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Request Robot Viewing</h2>
              <p className="mt-2 text-sm text-slate-600">
                Slots require sign-in, a profile, available credits, and a start time on a 5-minute boundary. Custom-code sessions also require both review gates to pass.
              </p>
            </div>
            <div className={`rounded-2xl px-4 py-3 text-sm font-semibold ${developerCodeReviewPassed || internalTestingBypass ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
              <p>{developerCodeReviewPassed ? "Live code approved" : internalTestingBypass ? "Internal testing unlocked" : "Live code locked"}</p>
              <p className="mt-1 text-xs opacity-80">
                {developerCodeReviewPassed
                  ? "Latest code package passed both gates."
                  : internalTestingBypass
                    ? "This testing account can schedule supervised test slots after choosing a time and duration."
                    : "Run Step 3 Physical Hardware Check and Step 4 Software Check first."}
              </p>
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
                        @{profile.username} - {getProfileOptionLabel(profile.profile_type)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Run Type</span>
                  <select
                    value={robotSlotRunType}
                    onChange={(event) => setRobotSlotRunType(event.target.value === "custom_code" ? "custom_code" : "preset_demo")}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                  >
                    <option value="preset_demo">Preset viewing demo</option>
                    <option value="custom_code">Approved custom code live test</option>
                  </select>
                  <span className="mt-2 block text-sm text-slate-600">
                    {developerCodeReviewPassed
                      ? "Custom code can be scheduled from the latest approved submission."
                    : internalTestingBypass
                        ? "This testing account can schedule custom code without the two review gates."
                        : "Custom code requires a passed physical safety gate and AI security scan."}
                  </span>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Start Time</span>
                  <select
                    value={robotSlotStart}
                    onChange={(event) => setRobotSlotStart(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                  >
                    {loadingRobotSlots ? <option value={robotSlotStart}>Checking available slots...</option> : null}
                    {!loadingRobotSlots && !robotSlotOptions.length ? <option value="">No slots available</option> : null}
                    {robotSlotOptions.map((slot) => (
                      <option key={slot.value} value={slot.value} disabled={slot.disabled}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-sm text-slate-600">Unavailable times are disabled. The server also rejects already requested slots.</span>
                </label>
                <label className="block">
                  <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">Viewing Duration</span>
                  <select
                    value={robotSlotDurationMinutes}
                    onChange={(event) => setRobotSlotDurationMinutes(event.target.value)}
                    className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none focus:border-[#2f70c8] focus:ring-4 focus:ring-[#dbeafe]"
                  >
                    {robotSlotDurationOptions.map((minutes) => (
                      <option key={minutes} value={minutes}>
                        {minutes} minutes
                      </option>
                    ))}
                  </select>
                  <span className="mt-2 block text-sm text-slate-600">Use 5 minutes for quick demos, or 10+ minutes when the session needs more observation time.</span>
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
                {robotSlotRunType === "preset_demo" ? (
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
                ) : (
                  <p className={`rounded-xl border px-4 py-3 text-sm font-semibold ${developerCodeReviewPassed || internalTestingBypass ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                    {developerCodeReviewPassed
                      ? "This slot will use the latest Supabase-approved custom code package."
                      : internalTestingBypass
                        ? "Testing slot: code review gates are waived for this account."
                        : "Custom live-code testing is locked until the AI security scan passes."}
                  </p>
                )}
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
                {robotSlotCreditLocked ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    Robot viewing requires credits.
                  </p>
                ) : null}
                {customCodeLocked ? (
                  <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
                    Approved custom code requires a passed physical safety gate and AI security scan in Supabase.
                  </p>
                ) : null}
                {robotSlotMessage ? <p className="text-sm font-semibold text-[#2f70c8]">{robotSlotMessage}</p> : null}
                <button
                  type="button"
                  onClick={requestRobotSlot}
                  disabled={requestingRobotSlot || robotSlotUnavailable}
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
                          <p className="mt-1 text-xs text-slate-500">Run: {formatInvoiceStatus(session.approved_run_type || "preset_demo")}</p>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm leading-6 text-slate-600">
                    No robot viewing slots requested yet. The first available request is the next 5-minute slot after a 2-minute prep buffer.
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {currentTab === "robot" && !hasAccessProfiles ? (
        <section className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6">
          <h2 className="text-xl font-bold text-slate-950">Create a profile to request robot time</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Robot viewing is tied to a developer, student, teacher, or talent profile so each session has its own credit limit and activity history.</p>
          <button type="button" onClick={() => setActiveTab("settings")} className="mt-5 rounded-lg bg-[#2563eb] px-5 py-3 text-sm font-bold text-white">
            Create Profile
          </button>
        </section>
      ) : null}

      {currentTab === "billing" ? (
        <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#2f70c8]">Ledger</p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">Purchase History</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                Everything purchased or requested by this account appears here: robots, courses, live viewing, credits, carts, and invoice-linked records.
              </p>
            </div>
            <div className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700">
              <p>{purchaseHistoryItems.length} records</p>
              <p className="mt-1 text-xs text-slate-500">Paid total: {formatUsd(totalSpent)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3">
            {purchaseHistoryItems.length ? (
              purchaseHistoryItems.map((item) => {
                const amount = item.amount;
                const content = (
                  <div className="grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-slate-300 md:grid-cols-[1fr_auto] md:items-center">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#2f70c8]">{item.category}</span>
                        <span className="text-xs font-semibold text-slate-500">{formatDate(item.date)}</span>
                      </div>
                      <p className="mt-3 font-semibold text-slate-950">{item.title}</p>
                      <p className="mt-1 text-sm text-slate-600">{item.meta}</p>
                    </div>
                    <div className="text-left md:text-right">
                      <p className="text-sm font-bold text-slate-950">{amount !== null && Number.isFinite(amount) && amount > 0 ? formatUsd(amount) : "No charge shown"}</p>
                      <p className="mt-1 text-sm font-semibold text-[#2f70c8]">{item.status}</p>
                    </div>
                  </div>
                );

                return item.href ? (
                  <Link key={item.key} href={item.href} className="block">
                    {content}
                  </Link>
                ) : (
                  <div key={item.key}>{content}</div>
                );
              })
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                <p className="font-semibold text-slate-950">No purchase history yet.</p>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Purchases, cart activity, credit recharges, live viewing requests, and course records will appear here after account activity begins.
                </p>
              </div>
            )}
          </div>
        </section>
      ) : null}

      {currentTab === "invoices" ? (
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
                New formal invoices generated from billing activity will appear here.
              </p>
            </div>
          )}
        </div>
      </section>
      ) : null}

      {currentTab === "profile" ? (
      <section className="rounded-[24px] border border-slate-200 bg-white p-6 shadow-[0_18px_55px_rgba(15,23,42,0.08)] md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#2f70c8]">Profile Switcher</p>
            <h2 className="mt-2 text-2xl font-semibold text-slate-950">{hasAccessProfiles ? "Choose a profile" : "Create a profile"}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Account controls stay above. Use profiles for developer tools, student learning, educator access, or talent pathways.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:border-[#2f70c8] hover:text-[#2f70c8]"
          >
            Manage Profiles
          </button>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.accessProfiles?.map((profile) => {
            const visual = profileVisuals[profile.profile_type];
            const selected = selectedDashboardProfileId === profile.id;
            const remainingCredits = Math.max(0, Number(profile.monthly_credit_limit ?? profile.credit_limit ?? 0) - Number(profile.monthly_credits_used ?? profile.credits_used ?? 0));
            return (
              <button
                key={profile.id}
                type="button"
                onClick={() => {
                  setSelectedDashboardProfileId(profile.id);
                  setActiveTab("profile");
                }}
                className={`group min-h-52 rounded-2xl border p-5 text-left transition ${
                  selected
                    ? "border-[#2563eb] bg-[#f8fbff] ring-2 ring-[#bfdbfe]"
                    : "border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_18px_34px_rgba(15,23,42,0.08)]"
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className={`grid h-14 w-14 place-items-center rounded-2xl text-sm font-black ${visual.iconBg} ${visual.iconText}`}>
                    {getProfileMark(profile.profile_type)}
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${visual.iconBg} ${visual.iconText}`}>
                    {getProfileOptionLabel(profile.profile_type)}
                  </span>
                </div>
                <h3 className="mt-5 text-xl font-black text-slate-950">{profile.display_name}</h3>
                <p className="mt-1 text-sm font-semibold text-slate-500">@{profile.username}</p>
                <p className="mt-3 text-sm leading-6 text-slate-600">{visual.tone}</p>
                <div className="mt-4 flex items-center justify-between gap-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                  <span>{formatCredits(remainingCredits)} left</span>
                  <span className={selected ? "text-[#2563eb]" : "text-slate-400"}>{selected ? "Selected" : "Open"}</span>
                </div>
              </button>
            );
          })}
          <Link
            href="/account/create-profile"
            className="group flex min-h-52 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center transition hover:-translate-y-0.5 hover:border-[#2f70c8] hover:bg-[#f8fbff]"
          >
            <span className="grid h-16 w-16 place-items-center rounded-2xl border border-slate-200 bg-white text-3xl font-black text-[#2563eb] shadow-sm transition group-hover:border-[#bfdbfe] group-hover:shadow-[0_14px_30px_rgba(37,99,235,0.14)]">
              +
            </span>
            <h3 className="mt-5 text-xl font-black text-slate-950">Add Profile</h3>
            <p className="mt-2 max-w-xs text-sm leading-6 text-slate-600">Create another developer, student, educator, or talent profile under this account.</p>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-[#2563eb]">Create Profile</p>
          </Link>
        </div>
      </section>
      ) : null}
      </div>
    </div>
    </>
  );
}

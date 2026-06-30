import { supabaseRequest } from "@/lib/supabase-server";
import { getUnpaidBalanceLines } from "@/lib/invoices";
import { getBillingInvoicesForEmail, type BillingInvoice } from "@/lib/billing";

export type AccountRecord = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  credit_balance: number;
  paid_credit_balance: number;
  bonus_credit_balance: number;
  created_at: string;
  verified_at: string;
};

export type AccessProfileType = "developer" | "student" | "teacher" | "talent";

export type AccessProfile = {
  id: number;
  account_email: string;
  profile_type: AccessProfileType;
  username: string;
  display_name: string;
  credit_limit: number;
  credits_used: number;
  monthly_credit_limit: number;
  monthly_credits_used: number;
  monthly_usage_period: string;
  created_at: string;
  updated_at: string;
};

export type AccountProfile = {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  company: string | null;
  address: string | null;
  dob: string | null;
  account_type: "individual" | "group" | null;
  department?: string | null;
  discount_percent?: number | null;
  updated_at?: string;
};

export type AccountChild = {
  id?: number;
  parent_email: string;
  first_name: string;
  last_name: string;
  dob: string;
  grade: string;
  sex: string;
  school_info?: string | null;
  preferred_location?: string | null;
  selected_course_code?: string | null;
  selected_course_title?: string | null;
  created_at?: string;
};

export type PreorderRequest = {
  invoice_number: string;
  product: string;
  email: string;
  name: string;
  phone: string;
  company: string | null;
  notes: string | null;
  status: string;
  created_at: string;
};

type RobotInvoiceReference = {
  source_id: string | null;
};

export type EnrollmentRecord = {
  id: number;
  parent_email: string;
  child_id: number;
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
};

export type InternshipApplicationRecord = {
  id: number;
  name: string;
  email: string;
  role_interests: string[] | null;
  resume_filename: string | null;
  created_at: string;
};

export type AiRoboticsClubApplicationRecord = {
  id: number;
  name: string;
  email: string;
  grade: string | null;
  interests: string[] | null;
  resume_filename: string | null;
  created_at: string;
};

export async function getAccountRecord(email: string) {
  const rows = await supabaseRequest<AccountRecord[]>("agentech_accounts", {
    query: `email=eq.${encodeURIComponent(email)}&select=email,first_name,last_name,phone,credit_balance,paid_credit_balance,bonus_credit_balance,created_at,verified_at&limit=1`
  });

  return rows[0] ?? null;
}

export async function getAccessProfiles(email: string) {
  return supabaseRequest<AccessProfile[]>("agentech_account_profiles", {
    query: `account_email=eq.${encodeURIComponent(email)}&select=id,account_email,profile_type,username,display_name,credit_limit,credits_used,monthly_credit_limit,monthly_credits_used,monthly_usage_period,created_at,updated_at&order=created_at.desc`
  }).catch(() => []);
}

export async function getAccessProfileByUsername(username: string) {
  const normalizedUsername = normalizeProfileUsername(username);
  if (!normalizedUsername) {
    return null;
  }

  const rows = await supabaseRequest<AccessProfile[]>("agentech_account_profiles", {
    query: `username=eq.${encodeURIComponent(normalizedUsername)}&select=id,account_email,profile_type,username,display_name,credit_limit,credits_used,monthly_credit_limit,monthly_credits_used,monthly_usage_period,created_at,updated_at&limit=1`
  });

  return rows[0] ?? null;
}

export function isAccessProfileType(value: unknown): value is AccessProfileType {
  return value === "developer" || value === "student" || value === "teacher" || value === "talent";
}

export function normalizeProfileUsername(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isValidProfileUsername(username: string) {
  return /^[a-z0-9][a-z0-9._-]{2,31}$/.test(username);
}

function getCurrentUsagePeriod() {
  return new Date().toISOString().slice(0, 7);
}

function getProfileMonthlyCreditsUsed(profile: Pick<AccessProfile, "monthly_credits_used" | "monthly_usage_period">) {
  return profile.monthly_usage_period === getCurrentUsagePeriod() ? Number(profile.monthly_credits_used ?? 0) : 0;
}

export function buildCreditSummary(account: AccountRecord | null, accessProfiles: AccessProfile[]) {
  const legacyPaidCredits = Number(account?.credit_balance ?? 0);
  const storedPaidCredits = Number(account?.paid_credit_balance ?? 0);
  const bonus = Number(account?.bonus_credit_balance ?? 0);
  const paid = storedPaidCredits > 0 || bonus > 0 ? storedPaidCredits : legacyPaidCredits;
  const balance = paid + bonus;
  const monthlyLimitTotal = accessProfiles.reduce((total, profile) => total + Number(profile.monthly_credit_limit ?? profile.credit_limit ?? 0), 0);
  const used = accessProfiles.reduce((total, profile) => total + Number(profile.credits_used ?? 0), 0);
  const monthlyUsed = accessProfiles.reduce((total, profile) => total + getProfileMonthlyCreditsUsed(profile), 0);

  return {
    balance,
    paid,
    bonus,
    assigned: monthlyLimitTotal,
    monthlyLimitTotal,
    used,
    monthlyUsed,
    unassigned: balance,
    rechargeRequired: balance <= 0
  };
}

export function allocateCreditSpend(account: Pick<AccountRecord, "credit_balance" | "paid_credit_balance" | "bonus_credit_balance">, requestedCredits: number) {
  const requested = Math.max(0, Math.floor(requestedCredits));
  const credits = buildCreditSummary(account as AccountRecord, []);
  const paidCreditsUsed = Math.min(credits.paid, requested);
  const remainingAfterPaid = requested - paidCreditsUsed;
  const bonusCreditsUsed = Math.min(credits.bonus, remainingAfterPaid);
  const shortfall = remainingAfterPaid - bonusCreditsUsed;

  return {
    requested,
    paidCreditsUsed,
    bonusCreditsUsed,
    shortfall,
    paidCreditBalanceAfter: credits.paid - paidCreditsUsed,
    bonusCreditBalanceAfter: credits.bonus - bonusCreditsUsed,
    rechargeRequired: shortfall > 0
  };
}

export async function addAccountCredits(email: string, creditType: "paid" | "bonus", creditsToAdd: number) {
  const account = await getAccountRecord(email);
  if (!account) {
    return null;
  }

  const amount = Math.max(0, Math.floor(creditsToAdd));
  const current = buildCreditSummary(account, []);
  const paidCreditBalance = creditType === "paid" ? current.paid + amount : current.paid;
  const bonusCreditBalance = creditType === "bonus" ? current.bonus + amount : current.bonus;

  await supabaseRequest<null>("agentech_accounts", {
    method: "PATCH",
    query: `email=eq.${encodeURIComponent(email)}`,
    prefer: "return=minimal",
    body: {
      credit_balance: paidCreditBalance,
      paid_credit_balance: paidCreditBalance,
      bonus_credit_balance: bonusCreditBalance
    }
  });

  return {
    email,
    paid: paidCreditBalance,
    bonus: bonusCreditBalance,
    balance: paidCreditBalance + bonusCreditBalance
  };
}

export async function spendAccountCredits(email: string, requestedCredits: number) {
  const account = await getAccountRecord(email);
  if (!account) {
    return null;
  }

  const spend = allocateCreditSpend(account, requestedCredits);
  if (spend.rechargeRequired) {
    return spend;
  }

  await supabaseRequest<null>("agentech_accounts", {
    method: "PATCH",
    query: `email=eq.${encodeURIComponent(email)}`,
    prefer: "return=minimal",
    body: {
      credit_balance: spend.paidCreditBalanceAfter,
      paid_credit_balance: spend.paidCreditBalanceAfter,
      bonus_credit_balance: spend.bonusCreditBalanceAfter
    }
  });

  return spend;
}

export async function spendProfileCredits(username: string, requestedCredits: number) {
  const profile = await getAccessProfileByUsername(username);
  if (!profile) {
    return null;
  }

  const requested = Math.max(0, Math.floor(requestedCredits));
  const monthlyCreditsUsed = getProfileMonthlyCreditsUsed(profile);
  const monthlyCreditLimit = Number(profile.monthly_credit_limit ?? profile.credit_limit ?? 0);
  const monthlyCreditsRemaining = Math.max(0, monthlyCreditLimit - monthlyCreditsUsed);

  if (requested > monthlyCreditsRemaining) {
    return {
      requested,
      profile,
      monthlyCreditLimit,
      monthlyCreditsUsed,
      monthlyCreditsRemaining,
      monthlyLimitExceeded: true,
      rechargeRequired: false,
      shortfall: requested - monthlyCreditsRemaining
    };
  }

  const spend = await spendAccountCredits(profile.account_email, requested);
  if (!spend || spend.rechargeRequired) {
    return {
      requested,
      profile,
      monthlyCreditLimit,
      monthlyCreditsUsed,
      monthlyCreditsRemaining,
      monthlyLimitExceeded: false,
      rechargeRequired: true,
      shortfall: spend?.shortfall ?? requested
    };
  }

  const nextMonthlyCreditsUsed = monthlyCreditsUsed + requested;
  const nextCreditsUsed = Number(profile.credits_used ?? 0) + requested;

  await supabaseRequest<null>("agentech_account_profiles", {
    method: "PATCH",
    query: `id=eq.${profile.id}`,
    prefer: "return=minimal",
    body: {
      credits_used: nextCreditsUsed,
      monthly_credits_used: nextMonthlyCreditsUsed,
      monthly_usage_period: getCurrentUsagePeriod(),
      updated_at: new Date().toISOString()
    }
  });

  return {
    ...spend,
    profile,
    monthlyCreditLimit,
    monthlyCreditsUsed: nextMonthlyCreditsUsed,
    monthlyCreditsRemaining: Math.max(0, monthlyCreditLimit - nextMonthlyCreditsUsed),
    monthlyLimitExceeded: false
  };
}

export async function createAccessProfile(input: {
  accountEmail: string;
  profileType: AccessProfileType;
  username: string;
  displayName: string;
  monthlyCreditLimit: number;
}) {
  const monthlyCreditLimit = Math.max(0, Math.floor(input.monthlyCreditLimit));
  const rows = await supabaseRequest<AccessProfile[]>("agentech_account_profiles", {
    method: "POST",
    body: {
      account_email: input.accountEmail,
      profile_type: input.profileType,
      username: input.username,
      display_name: input.displayName,
      credit_limit: monthlyCreditLimit,
      credits_used: 0,
      monthly_credit_limit: monthlyCreditLimit,
      monthly_credits_used: 0,
      monthly_usage_period: getCurrentUsagePeriod(),
      updated_at: new Date().toISOString()
    }
  });

  return rows[0] ?? null;
}

export async function getProfile(email: string) {
  const rows = await supabaseRequest<AccountProfile[]>("agentech_profiles", {
    query: `email=eq.${encodeURIComponent(email)}&select=*&limit=1`
  });

  return rows[0] ?? null;
}

export async function upsertProfile(profile: AccountProfile) {
  const rows = await supabaseRequest<AccountProfile[]>("agentech_profiles", {
    method: "POST",
    query: "on_conflict=email",
    prefer: "resolution=merge-duplicates,return=representation",
    body: {
      ...profile,
      updated_at: new Date().toISOString()
    }
  });

  return rows[0] ?? null;
}

export async function replaceChildren(parentEmail: string, children: Omit<AccountChild, "parent_email">[]) {
  await supabaseRequest<null>("agentech_children", {
    method: "DELETE",
    query: `parent_email=eq.${encodeURIComponent(parentEmail)}`,
    prefer: "return=minimal"
  });

  if (!children.length) {
    return [];
  }

  const childrenBody = children.map((child) => ({
      parent_email: parentEmail,
      first_name: child.first_name,
      last_name: child.last_name,
      dob: child.dob,
      grade: child.grade,
      sex: child.sex,
      school_info: child.school_info || null,
      preferred_location: child.preferred_location || null,
      selected_course_code: child.selected_course_code || null,
      selected_course_title: child.selected_course_title || null
    }));

  try {
    return await supabaseRequest<AccountChild[]>("agentech_children", {
      method: "POST",
      body: childrenBody
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";

    if (!message.includes("selected_course_code") && !message.includes("selected_course_title")) {
      throw error;
    }

    return supabaseRequest<AccountChild[]>("agentech_children", {
      method: "POST",
      body: childrenBody.map(({ selected_course_code, selected_course_title, ...child }) => child)
    });
  }
}

export async function getChildren(parentEmail: string) {
  return supabaseRequest<AccountChild[]>("agentech_children", {
    query: `parent_email=eq.${encodeURIComponent(parentEmail)}&select=*&order=created_at.asc`
  });
}

export async function getPreorderRequests(email: string) {
  return supabaseRequest<PreorderRequest[]>("agentech_preorder_invoices", {
    query: `email=eq.${encodeURIComponent(email)}&select=invoice_number,product,email,name,phone,company,notes,status,created_at&order=created_at.desc`
  });
}

async function getRobotInvoiceReferences(email: string) {
  return supabaseRequest<RobotInvoiceReference[]>("agentech_invoice_items", {
    query: `email=eq.${encodeURIComponent(email)}&source_type=eq.robot&select=source_id`
  }).catch(() => []);
}

export async function getEnrollments(parentEmail: string) {
  try {
    return await supabaseRequest<EnrollmentRecord[]>("agentech_enrollments", {
      query: `parent_email=eq.${encodeURIComponent(parentEmail)}&select=id,parent_email,child_id,site_name,class_id,price,paid,created_at,agentech_classes(class_name,class_time,starting_date,age_range)&order=created_at.desc`
    });
  } catch {
    return [];
  }
}

export async function getInternshipApplications(accountEmail: string) {
  try {
    return await supabaseRequest<InternshipApplicationRecord[]>("agentech_internship_applications", {
      query: `account_email=eq.${encodeURIComponent(accountEmail)}&select=id,name,email,role_interests,resume_filename,created_at&order=created_at.desc`
    });
  } catch {
    return [];
  }
}

export async function getAiRoboticsClubApplications(accountEmail: string) {
  try {
    return await supabaseRequest<AiRoboticsClubApplicationRecord[]>("agentech_ai_robotics_club_applications", {
      query: `account_email=eq.${encodeURIComponent(accountEmail)}&select=id,name,email,grade,interests,resume_filename,created_at&order=created_at.desc`
    });
  } catch {
    return [];
  }
}

function requestLooksActive(status: string) {
  const normalized = status.replace(/_/g, " ").toLowerCase();

  return normalized.includes("pending") || normalized.includes("sent");
}

export async function getAccountSummary(email: string) {
  const [account, accessProfiles, profile, children, requests, robotInvoiceReferences, enrollments, internshipApplications, aiRoboticsClubApplications, unpaidBalance, invoices] = await Promise.all([
    getAccountRecord(email),
    getAccessProfiles(email),
    getProfile(email),
    getChildren(email),
    getPreorderRequests(email),
    getRobotInvoiceReferences(email),
    getEnrollments(email),
    getInternshipApplications(email),
    getAiRoboticsClubApplications(email),
    getUnpaidBalanceLines(email),
    getBillingInvoicesForEmail(email)
  ]);
  const robotInvoiceIds = new Set(robotInvoiceReferences.map((reference) => reference.source_id).filter(Boolean));
  const normalizedRequests = requests.map((request) => ({
    ...request,
    status: requestLooksActive(request.status) && !robotInvoiceIds.has(request.invoice_number)
      ? "removed_from_cart"
      : request.status
  }));

  return {
    account,
    accessProfiles,
    creditSummary: buildCreditSummary(account, accessProfiles),
    profile,
    children,
    requests: normalizedRequests,
    enrollments,
    applications: {
      internships: internshipApplications,
      aiRoboticsClub: aiRoboticsClubApplications
    },
    unpaidBalance,
    invoices: invoices satisfies BillingInvoice[]
  };
}

import { supabaseRequest } from "@/lib/supabase-server";
import { getUnpaidBalanceLines } from "@/lib/invoices";
import { getBillingInvoicesForEmail, type BillingInvoice } from "@/lib/billing";

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
  const [profile, children, requests, robotInvoiceReferences, enrollments, internshipApplications, aiRoboticsClubApplications, unpaidBalance, invoices] = await Promise.all([
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

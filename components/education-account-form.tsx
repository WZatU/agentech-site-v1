"use client";

import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { getAccountSession } from "@/lib/account-session";
import { getEducationCourseByCode } from "@/lib/education-courses";

type AccountType = "individual" | "group";

type ChildForm = {
  firstName: string;
  lastName: string;
  dob: string;
  grade: string;
  sex: string;
  schoolInfo: string;
  preferredLocation: string;
};

type OwnerForm = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  dob: string;
};

type AccountLookup = {
  profile?: {
    email: string;
    first_name: string;
    last_name: string;
    phone: string;
    address: string | null;
    dob: string | null;
    account_type: AccountType | null;
  } | null;
  children?: Array<{
    first_name: string;
    last_name: string;
    dob: string;
    grade: string;
    sex: string;
    school_info?: string | null;
    preferred_location?: string | null;
  }>;
};

const blankChild: ChildForm = {
  firstName: "",
  lastName: "",
  dob: "",
  grade: "",
  sex: "",
  schoolInfo: "",
  preferredLocation: ""
};

const accountOptions = [
  {
    type: "individual" as const,
    title: "Individual",
    description: "For families and parents managing a small household.",
    limit: 6
  },
  {
    type: "group" as const,
    title: "Group",
    description: "For schools, clubs, teams, and organizations.",
    limit: 100
  }
];

const rosterTemplate = [
  "Child First Name,Child Last Name,Date of Birth,Grade,Sex,School Info,Preferred Location",
  "Emily,Chen,2016-04-12,4,Female,Lincoln Elementary,Irvine",
  "Jordan,Lee,2015-09-20,5,Male,Roosevelt Middle,Online"
].join("\n");

const rosterHeaders: Record<string, keyof ChildForm> = {
  "child first name": "firstName",
  "first name": "firstName",
  firstname: "firstName",
  "child last name": "lastName",
  "last name": "lastName",
  lastname: "lastName",
  "date of birth": "dob",
  dob: "dob",
  grade: "grade",
  sex: "sex",
  school: "schoolInfo",
  "school info": "schoolInfo",
  "school information": "schoolInfo",
  "preferred location": "preferredLocation",
  "preferred site": "preferredLocation",
  location: "preferredLocation"
};

function parseCsvRows(csv: string) {
  const rows: string[][] = [];
  let cell = "";
  let row: string[] = [];
  let insideQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index];
    const nextCharacter = csv[index + 1];

    if (character === '"' && insideQuotes && nextCharacter === '"') {
      cell += '"';
      index += 1;
      continue;
    }

    if (character === '"') {
      insideQuotes = !insideQuotes;
      continue;
    }

    if (character === "," && !insideQuotes) {
      row.push(cell.trim());
      cell = "";
      continue;
    }

    if ((character === "\n" || character === "\r") && !insideQuotes) {
      if (character === "\r" && nextCharacter === "\n") {
        index += 1;
      }
      row.push(cell.trim());
      if (row.some(Boolean)) {
        rows.push(row);
      }
      row = [];
      cell = "";
      continue;
    }

    cell += character;
  }

  row.push(cell.trim());
  if (row.some(Boolean)) {
    rows.push(row);
  }

  return rows;
}

function childrenFromCsv(csv: string, limit: number) {
  const rows = parseCsvRows(csv);
  const errors: string[] = [];

  if (rows.length < 2) {
    return { children: [] as ChildForm[], errors: ["Upload a CSV with a header row and at least one student."] };
  }

  const headerMap = rows[0].map((header) => rosterHeaders[header.toLowerCase().replace(/\s+/g, " ").trim()] ?? null);
  const requiredFields: (keyof ChildForm)[] = ["firstName", "lastName", "dob", "grade", "sex"];

  for (const field of requiredFields) {
    if (!headerMap.includes(field)) {
      errors.push(`Missing required column: ${field === "dob" ? "Date of Birth" : field}.`);
    }
  }

  if (errors.length) {
    return { children: [] as ChildForm[], errors };
  }

  const parsedChildren = rows.slice(1).map((row, rowIndex) => {
    const child = { ...blankChild };
    row.forEach((cell, cellIndex) => {
      const field = headerMap[cellIndex];
      if (field) {
        child[field] = cell.trim();
      }
    });

    for (const field of requiredFields) {
      if (!child[field]) {
        const label = field === "dob" ? "Date of Birth" : field;
        errors.push(`Row ${rowIndex + 2} is missing ${label}.`);
      }
    }

    return child;
  });

  if (parsedChildren.length > limit) {
    errors.push(`Group accounts can include at most ${limit} children. This file has ${parsedChildren.length}.`);
  }

  return { children: parsedChildren.slice(0, limit), errors };
}

function downloadRosterTemplate() {
  const blob = new Blob([rosterTemplate], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "agentech-group-roster-template.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function FieldLabel({ children, required = false }: { children: string; required?: boolean }) {
  return (
    <label className="text-xs font-semibold uppercase tracking-[0.14em] text-[#1f2937]">
      {children} {required ? <span className="text-red-500">*</span> : null}
    </label>
  );
}

function InputField({
  label,
  required,
  value,
  onChange,
  type = "text",
  placeholder
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <FieldLabel required={required}>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none transition placeholder:text-[#64748b] focus:border-[#0b1220] focus:ring-4 focus:ring-[#dbe4ef]"
      />
    </div>
  );
}

export function EducationAccountForm() {
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [owner, setOwner] = useState<OwnerForm>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    dob: ""
  });
  const [children, setChildren] = useState<ChildForm[]>([{ ...blankChild }]);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [rosterStatus, setRosterStatus] = useState("");
  const [rosterErrors, setRosterErrors] = useState<string[]>([]);
  const [selectedCourseCode, setSelectedCourseCode] = useState("");

  const childLimit = accountType === "group" ? 100 : 6;
  const canAddChild = children.length < childLimit;
  const selectedCourse = selectedCourseCode ? getEducationCourseByCode(selectedCourseCode) : null;

  const completedRequired = useMemo(() => {
    const ownerComplete = Boolean(owner.email.trim() && owner.firstName.trim() && owner.lastName.trim() && owner.phone.trim());
    const childrenComplete = children.every((child) =>
      Boolean(child.firstName.trim() && child.lastName.trim() && child.dob && child.grade.trim() && child.sex)
    );
    return ownerComplete && children.length > 0 && childrenComplete;
  }, [children, owner]);

  useEffect(() => {
    const session = getAccountSession();
    const params = new URLSearchParams(window.location.search);
    const preferredCampus = params.get("campus")?.toLowerCase() === "walnut" ? "Walnut" : "";
    const courseCode = params.get("course")?.toUpperCase() || "";
    if (courseCode) {
      setSelectedCourseCode(courseCode);
    }

    function applyPreferredCampus(currentChildren: ChildForm[]) {
      if (!preferredCampus) {
        return currentChildren;
      }

      const childrenToUpdate = currentChildren.length ? currentChildren : [{ ...blankChild }];
      return childrenToUpdate.map((child, index) =>
        index === 0 && !child.preferredLocation ? { ...child, preferredLocation: preferredCampus } : child
      );
    }

    if (preferredCampus) {
      setChildren((current) => applyPreferredCampus(current));
    }

    if (session?.email) {
      setOwner((current) => ({ ...current, email: session.email }));
      fetch(`/api/account?email=${encodeURIComponent(session.email)}`)
        .then((response) => response.json())
        .then((result: AccountLookup) => {
          if (result.profile) {
            setOwner({
              email: result.profile.email,
              firstName: result.profile.first_name || "",
              lastName: result.profile.last_name || "",
              phone: result.profile.phone || "",
              address: result.profile.address || "",
              dob: result.profile.dob || ""
            });
            if (result.profile.account_type) {
              setAccountType(result.profile.account_type);
            }
          }

          if (result.children?.length) {
            setChildren(
              applyPreferredCampus(
                result.children.map((child) => ({
                  firstName: child.first_name,
                  lastName: child.last_name,
                  dob: child.dob,
                  grade: child.grade,
                  sex: child.sex,
                  schoolInfo: child.school_info || "",
                  preferredLocation: child.preferred_location || ""
                }))
              )
            );
          }
        })
        .catch(() => {});
    }
  }, []);

  function updateOwner(field: keyof OwnerForm, value: string) {
    setOwner((current) => ({ ...current, [field]: value }));
  }

  function updateChild(index: number, field: keyof ChildForm, value: string) {
    setChildren((current) =>
      current.map((child, childIndex) => (childIndex === index ? { ...child, [field]: value } : child))
    );
  }

  function addChild() {
    if (!canAddChild) return;
    setChildren((current) => [...current, { ...blankChild }]);
  }

  function removeChild(index: number) {
    setChildren((current) => current.filter((_, childIndex) => childIndex !== index));
  }

  async function uploadRoster(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setRosterStatus("");
    setRosterErrors([]);

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setRosterErrors(["Please upload a CSV file. Google Sheets and Excel can both export to CSV."]);
      event.target.value = "";
      return;
    }

    try {
      const text = await file.text();
      const result = childrenFromCsv(text, childLimit);
      setRosterErrors(result.errors);

      if (result.children.length) {
        setChildren(result.children);
        setRosterStatus(`${result.children.length} students loaded from ${file.name}. Review them below before creating the account.`);
      }
    } catch {
      setRosterErrors(["Unable to read this file. Please download the template and try again."]);
    } finally {
      event.target.value = "";
    }
  }

  async function submitAccount() {
    setStatus("saving");
    setMessage("");

    try {
      const response = await fetch("/api/education-account", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          accountType,
          selectedCourseCode,
          ...owner,
          children
        })
      });

      const result = (await response.json()) as { error?: string; childrenEnrolled?: number };
      if (!response.ok) {
        throw new Error(result.error || "Unable to create account.");
      }

      if (selectedCourseCode && owner.email) {
        setStatus("success");
        setMessage("Profile saved. Choose which student to enroll next.");
        window.location.href = `/enroll?course=${encodeURIComponent(selectedCourseCode)}`;
        return;
      }

      setStatus("success");
      setMessage(`Profile saved. Total children enrolled: ${result.childrenEnrolled}.`);
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Unable to create account.");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 text-[#0b1220] lg:px-8 lg:py-16">
      <div className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[#334155]">Agentech Education</p>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight text-[#0b1220] md:text-6xl">Set up your account.</h1>
      </div>

      <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
        <aside className="space-y-4">
          {accountOptions.map((option) => {
            const selected = accountType === option.type;
            return (
              <button
                key={option.type}
                type="button"
                onClick={() => {
                  setAccountType(option.type);
                  setRosterErrors([]);
                  setRosterStatus("");
                  setChildren((current) => {
                    if (option.type === "group") {
                      return current.length > 1 || current[0]?.firstName ? current.slice(0, option.limit) : [];
                    }
                    const next = current.slice(0, option.limit);
                    return next.length ? next : [{ ...blankChild }];
                  });
                }}
                className={`w-full rounded-2xl border p-6 text-left transition ${
                  selected
                    ? "border-[#0b1220] bg-[#0b1220] text-white shadow-xl"
                    : "border-[#cbd5e1] bg-white text-[#0b1220] hover:border-[#475569]"
                }`}
              >
                <div className="flex items-center justify-between gap-4">
                  <h2 className="text-2xl font-semibold">{option.title}</h2>
                  <span className={`rounded-full px-3 py-1 text-xs ${selected ? "bg-white/15 text-white" : "bg-[#f1f5f9] text-[#334155]"}`}>
                    Max {option.limit}
                  </span>
                </div>
                <p className={`mt-3 text-sm leading-6 ${selected ? "text-white/90" : "text-[#334155]"}`}>
                  {option.description}
                </p>
              </button>
            );
          })}
        </aside>

        <div className="space-y-8">
          <section className="rounded-2xl border border-[#cbd5e1] bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#334155]">Step 1</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0b1220]">Your information</h2>
              </div>
              <span className="text-xs text-[#334155]">* Required</span>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="md:col-span-2">
                <InputField label="Account Email" required value={owner.email} onChange={(value) => updateOwner("email", value)} type="email" />
              </div>
              <InputField label="First Name" required value={owner.firstName} onChange={(value) => updateOwner("firstName", value)} />
              <InputField label="Last Name" required value={owner.lastName} onChange={(value) => updateOwner("lastName", value)} />
              <InputField label="Phone Number" required value={owner.phone} onChange={(value) => updateOwner("phone", value)} type="tel" />
              <InputField label="Date of Birth" value={owner.dob} onChange={(value) => updateOwner("dob", value)} type="date" />
              <div className="md:col-span-2">
                <InputField label="Address" value={owner.address} onChange={(value) => updateOwner("address", value)} placeholder="Street, city, state, ZIP" />
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[#cbd5e1] bg-white p-6 shadow-sm">
            <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#334155]">Step 2</p>
                <h2 className="mt-2 text-2xl font-semibold text-[#0b1220]">Children</h2>
                <p className="mt-2 text-sm text-[#334155]">
                  {children.length} of {childLimit} children added
                </p>
                {selectedCourse ? (
                  <p className="mt-2 text-sm font-semibold text-[#0b1220]">
                    Course to enroll: {selectedCourse.title} ({selectedCourse.courseCode})
                  </p>
                ) : null}
              </div>
              {accountType === "group" ? (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={downloadRosterTemplate}
                    className="rounded-full border border-[#0b1220] px-5 py-3 text-sm font-semibold text-[#0b1220] transition hover:bg-[#f1f5f9]"
                  >
                    Download Template
                  </button>
                  <label className="cursor-pointer rounded-full bg-[#0b1220] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f2937]">
                    Upload CSV Roster
                    <input type="file" accept=".csv,text/csv" onChange={uploadRoster} className="sr-only" />
                  </label>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={addChild}
                  disabled={!canAddChild}
                  className="rounded-full bg-[#0b1220] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
                >
                  + Add Child
                </button>
              )}
            </div>

            {accountType === "group" ? (
              <div className="mb-6 rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] p-5">
                <h3 className="text-lg font-semibold text-[#0b1220]">Group roster upload</h3>
                <p className="mt-2 text-sm leading-6 text-[#334155]">
                  Use the template in Excel or Google Sheets, then export or download it as CSV. Required columns are
                  child first name, child last name, date of birth, grade, and sex. School info and preferred location are optional.
                </p>
                {rosterStatus ? <p className="mt-3 text-sm font-semibold text-emerald-700">{rosterStatus}</p> : null}
                {rosterErrors.length ? (
                  <div className="mt-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    {rosterErrors.map((error) => (
                      <p key={error}>{error}</p>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            {accountType === "group" ? (
              <div className="overflow-hidden rounded-2xl border border-[#cbd5e1]">
                {children.length ? (
                  <>
                    <div className="flex items-center justify-between gap-4 border-b border-[#cbd5e1] bg-white px-4 py-3">
                      <p className="text-sm font-semibold text-[#0b1220]">{children.length} students ready to submit</p>
                      <button
                        type="button"
                        onClick={() => {
                          setChildren([]);
                          setRosterStatus("");
                          setRosterErrors([]);
                        }}
                        className="text-sm font-semibold text-red-600"
                      >
                        Clear roster
                      </button>
                    </div>
                    <div className="max-h-[420px] overflow-auto">
                      <table className="w-full min-w-[960px] border-collapse text-left text-sm">
                        <thead className="sticky top-0 bg-[#f1f5f9] text-xs uppercase tracking-[0.12em] text-[#334155]">
                          <tr>
                            <th className="border-b border-[#cbd5e1] px-4 py-3">First Name</th>
                            <th className="border-b border-[#cbd5e1] px-4 py-3">Last Name</th>
                            <th className="border-b border-[#cbd5e1] px-4 py-3">Date of Birth</th>
                            <th className="border-b border-[#cbd5e1] px-4 py-3">Grade</th>
                            <th className="border-b border-[#cbd5e1] px-4 py-3">Sex</th>
                            <th className="border-b border-[#cbd5e1] px-4 py-3">School Info</th>
                            <th className="border-b border-[#cbd5e1] px-4 py-3">Preferred Location</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e2e8f0] bg-white text-[#0b1220]">
                          {children.map((child, index) => (
                            <tr key={`${child.firstName}-${child.lastName}-${index}`}>
                              <td className="px-4 py-3">{child.firstName}</td>
                              <td className="px-4 py-3">{child.lastName}</td>
                              <td className="px-4 py-3">{child.dob}</td>
                              <td className="px-4 py-3">{child.grade}</td>
                              <td className="px-4 py-3">{child.sex}</td>
                              <td className="px-4 py-3">{child.schoolInfo || "-"}</td>
                              <td className="px-4 py-3">{child.preferredLocation || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <div className="bg-white p-8 text-center">
                    <h3 className="text-lg font-semibold text-[#0b1220]">No roster uploaded yet.</h3>
                    <p className="mt-2 text-sm text-[#334155]">Download the CSV template, fill it out, then upload it here.</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-5">
                {children.map((child, index) => (
                  <article key={index} className="rounded-2xl border border-[#cbd5e1] bg-[#f8fafc] p-5">
                    <div className="mb-5 flex items-center justify-between gap-4">
                      <h3 className="text-lg font-semibold text-[#0b1220]">Child {index + 1}</h3>
                      {children.length > 1 ? (
                        <button type="button" onClick={() => removeChild(index)} className="text-sm font-semibold text-red-500">
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <div className="grid gap-5 md:grid-cols-2">
                      <InputField label="First Name" required value={child.firstName} onChange={(value) => updateChild(index, "firstName", value)} />
                      <InputField label="Last Name" required value={child.lastName} onChange={(value) => updateChild(index, "lastName", value)} />
                      <InputField label="Date of Birth" required value={child.dob} onChange={(value) => updateChild(index, "dob", value)} type="date" />
                      <InputField label="Grade" required value={child.grade} onChange={(value) => updateChild(index, "grade", value)} placeholder="Example: Grade 7" />
                      <div className="space-y-2">
                        <FieldLabel required>Sex</FieldLabel>
                        <select
                          value={child.sex}
                          onChange={(event) => updateChild(index, "sex", event.target.value)}
                          className="w-full rounded-xl border border-[#cbd5e1] bg-white px-4 py-3 text-sm text-[#0b1220] outline-none transition focus:border-[#0b1220] focus:ring-4 focus:ring-[#dbe4ef]"
                        >
                          <option value="">Select</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="other">Other</option>
                          <option value="prefer-not-to-say">Prefer not to say</option>
                        </select>
                      </div>
                      <InputField
                        label="School Info"
                        value={child.schoolInfo}
                        onChange={(value) => updateChild(index, "schoolInfo", value)}
                        placeholder="School name or program"
                      />
                      <InputField
                        label="Preferred Location"
                        value={child.preferredLocation}
                        onChange={(value) => updateChild(index, "preferredLocation", value)}
                        placeholder="Example: Irvine, Online"
                      />
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          <div className="flex flex-col gap-4 rounded-2xl border border-[#cbd5e1] bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#0b1220]">
                {selectedCourseCode ? "Ready to continue enrollment?" : "Ready to create this account?"}
              </h2>
              <p className="mt-2 text-sm text-[#334155]">
                {selectedCourseCode
                  ? "Save the student information first, then choose the student for this course."
                  : "This profile will be connected to your verified Agentech account email."}
              </p>
              {message ? <p className={`mt-3 text-sm ${status === "error" ? "text-red-500" : "text-emerald-600"}`}>{message}</p> : null}
            </div>
            <button
              type="button"
              onClick={submitAccount}
              disabled={!completedRequired || status === "saving"}
              className="rounded-full bg-[#0b1220] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
            >
              {status === "saving" ? "Saving..." : selectedCourseCode ? "Save Student and Continue to Enroll" : "Create Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

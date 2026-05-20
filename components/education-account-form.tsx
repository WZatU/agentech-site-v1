"use client";

import { useMemo, useState } from "react";

type AccountType = "individual" | "group";

type ChildForm = {
  firstName: string;
  lastName: string;
  dob: string;
  grade: string;
  sex: string;
};

type OwnerForm = {
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  dob: string;
};

const blankChild: ChildForm = {
  firstName: "",
  lastName: "",
  dob: "",
  grade: "",
  sex: ""
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
    firstName: "",
    lastName: "",
    phone: "",
    address: "",
    dob: ""
  });
  const [children, setChildren] = useState<ChildForm[]>([{ ...blankChild }]);
  const [status, setStatus] = useState<"idle" | "saving" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const childLimit = accountType === "group" ? 100 : 6;
  const canAddChild = children.length < childLimit;

  const completedRequired = useMemo(() => {
    const ownerComplete = Boolean(owner.firstName.trim() && owner.lastName.trim() && owner.phone.trim());
    const childrenComplete = children.every((child) =>
      Boolean(child.firstName.trim() && child.lastName.trim() && child.dob && child.grade.trim() && child.sex)
    );
    return ownerComplete && children.length > 0 && childrenComplete;
  }, [children, owner]);

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
          ...owner,
          children
        })
      });

      const result = (await response.json()) as { error?: string; accountsCreated?: number };
      if (!response.ok) {
        throw new Error(result.error || "Unable to create account.");
      }

      setStatus("success");
      setMessage(`Account setup complete. Total created accounts: ${result.accountsCreated}.`);
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
                  setChildren((current) => current.slice(0, option.limit));
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
              </div>
              <button
                type="button"
                onClick={addChild}
                disabled={!canAddChild}
                className="rounded-full bg-[#0b1220] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
              >
                + Add Child
              </button>
            </div>

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
                  </div>
                </article>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-4 rounded-2xl border border-[#cbd5e1] bg-white p-6 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold text-[#0b1220]">Ready to create this account?</h2>
              <p className="mt-2 text-sm text-[#334155]">Google login will be connected before launch; this setup form is ready for that account data.</p>
              {message ? <p className={`mt-3 text-sm ${status === "error" ? "text-red-500" : "text-emerald-600"}`}>{message}</p> : null}
            </div>
            <button
              type="button"
              onClick={submitAccount}
              disabled={!completedRequired || status === "saving"}
              className="rounded-full bg-[#0b1220] px-7 py-3 text-sm font-semibold text-white transition hover:bg-[#1f2937] disabled:cursor-not-allowed disabled:bg-[#cbd5e1]"
            >
              {status === "saving" ? "Creating..." : "Create Account"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

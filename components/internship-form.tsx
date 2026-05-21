"use client";

import { useState } from "react";
import { INTERNSHIP_ROLE_INTERESTS, type InternshipRoleInterest } from "@/lib/internship";

type FormState = {
  name: string;
  email: string;
  organization: string;
  major: string;
  graduationYear: string;
  location: string;
  roleInterests: InternshipRoleInterest[];
  profileLink: string;
  built: string;
  whyAgentech: string;
  notes: string;
  resume: File | null;
  website: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  organization: "",
  major: "",
  graduationYear: "",
  location: "",
  roleInterests: [],
  profileLink: "",
  built: "",
  whyAgentech: "",
  notes: "",
  resume: null,
  website: ""
};

const fieldClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-slate-950";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-slate-950">{children}</p>;
}

function ChoiceButton({
  active,
  onClick,
  children
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "border-slate-950 bg-slate-950 text-white"
          : "border-slate-200 bg-white text-slate-600 hover:border-slate-950 hover:text-slate-950"
      }`}
    >
      {children}
    </button>
  );
}

export function InternshipForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startedAt] = useState(() => Date.now());

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleRoleInterest(value: InternshipRoleInterest) {
    setForm((current) => {
      if (current.roleInterests.includes(value)) {
        return {
          ...current,
          roleInterests: current.roleInterests.filter((item) => item !== value)
        };
      }

      if (current.roleInterests.length >= 2) {
        setError("Choose up to two role interests / æœ€å¤šé€‰æ‹©ä¸¤ä¸ªæ–¹å‘");
        return current;
      }

      return {
        ...current,
        roleInterests: [...current.roleInterests, value]
      };
    });
  }

  function validate() {
    if (
      !form.name ||
      !form.email ||
      !form.organization ||
      !form.major ||
      !form.graduationYear ||
      !form.location ||
      !form.built ||
      !form.whyAgentech
    ) {
      return "Please complete all required fields / è¯·å¡«å†™æ‰€æœ‰å¿…å¡«é¡¹";
    }

    if (form.roleInterests.length === 0) {
      return "Choose at least one role interest / è¯·è‡³å°‘é€‰æ‹©ä¸€ä¸ªæ–¹å‘";
    }

    if (!form.resume) {
      return "Please upload your resume / è¯·ä¸Šä¼ ç®€åŽ†";
    }

    if (form.resume.size > 5 * 1024 * 1024) {
      return "Please upload a PDF under 5MB / è¯·ä¸Šä¼  5MB ä»¥å†…çš„ PDF";
    }

    const lowerName = form.resume.name.toLowerCase();
    const isPdf = form.resume.type === "application/pdf" || lowerName.endsWith(".pdf");

    if (!isPdf) {
      return "Resume must be a PDF / ç®€åŽ†å¿…é¡»ä¸º PDF";
    }

    return "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const body = new FormData();
      body.set("name", form.name);
      body.set("email", form.email);
      body.set("organization", form.organization);
      body.set("major", form.major);
      body.set("graduationYear", form.graduationYear);
      body.set("location", form.location);
      body.set("profileLink", form.profileLink);
      body.set("built", form.built);
      body.set("whyAgentech", form.whyAgentech);
      body.set("notes", form.notes);
      body.set("website", form.website);
      body.set("startedAt", String(startedAt));
      form.roleInterests.forEach((interest) => body.append("roleInterests", interest));

      if (form.resume) {
        body.set("resume", form.resume);
      }

      const response = await fetch("/api/internship", {
        method: "POST",
        body
      });

      const result = (await response.json()) as {
        ok: boolean;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        setError(result.message || "Something went wrong / æäº¤å¤±è´¥");
        return;
      }

      setSuccess("Application sent successfully / ç”³è¯·å·²å‘é€");
      setForm(initialState);
    } catch {
      setError("Something went wrong / æäº¤å¤±è´¥");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-12 space-y-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <FieldLabel>Name / å§“å</FieldLabel>
          <input className={fieldClass} value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>Email / é‚®ç®±</FieldLabel>
          <input className={fieldClass} type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>University / Company / å­¦æ ¡æˆ–æœºæž„</FieldLabel>
          <input className={fieldClass} value={form.organization} onChange={(event) => updateField("organization", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>Major / Field / ä¸“ä¸šæˆ–æ–¹å‘</FieldLabel>
          <input className={fieldClass} value={form.major} onChange={(event) => updateField("major", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>Graduation Year / æ¯•ä¸šå¹´ä»½</FieldLabel>
          <input className={fieldClass} value={form.graduationYear} onChange={(event) => updateField("graduationYear", event.target.value)} placeholder="e.g. 2027" />
        </label>

        <label className="space-y-2">
          <FieldLabel>Location / åŸŽå¸‚å›½å®¶</FieldLabel>
          <input className={fieldClass} value={form.location} onChange={(event) => updateField("location", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>LinkedIn / Portfolio / GitHub (optional) / é“¾æŽ¥ï¼ˆå¯é€‰ï¼‰</FieldLabel>
          <input className={fieldClass} value={form.profileLink} onChange={(event) => updateField("profileLink", event.target.value)} />
        </label>

        <label className="hidden">
          Website
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => updateField("website", event.target.value)} />
        </label>

        <div className="space-y-3 md:col-span-2">
          <FieldLabel>Role Interest / æ„Ÿå…´è¶£æ–¹å‘</FieldLabel>
          <p className="text-sm text-slate-500">Choose up to two / æœ€å¤šé€‰æ‹©ä¸¤ä¸ª</p>
          <div className="flex flex-wrap gap-3">
            {INTERNSHIP_ROLE_INTERESTS.map((interest) => (
              <ChoiceButton
                key={interest}
                active={form.roleInterests.includes(interest)}
                onClick={() => toggleRoleInterest(interest)}
              >
                {interest}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>What have you built? / ä½ åšè¿‡ä»€ä¹ˆï¼Ÿ</FieldLabel>
          <textarea className={`${fieldClass} min-h-32 resize-y`} value={form.built} onChange={(event) => updateField("built", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Why Agentech? / ä¸ºä»€ä¹ˆæƒ³æ¥ Agentechï¼Ÿ</FieldLabel>
          <textarea className={`${fieldClass} min-h-32 resize-y`} value={form.whyAgentech} onChange={(event) => updateField("whyAgentech", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Resume Upload (PDF) / ä¸Šä¼ ç®€åŽ†ï¼ˆPDFï¼‰</FieldLabel>
          <input
            className={`${fieldClass} file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white`}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => updateField("resume", event.target.files?.[0] ?? null)}
          />
          <p className="text-sm text-slate-500">PDF only, up to 5MB / ä»…æ”¯æŒ PDFï¼Œæœ€å¤§ 5MB</p>
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Notes (optional) / å¤‡æ³¨ï¼ˆå¯é€‰ï¼‰</FieldLabel>
          <textarea className={`${fieldClass} min-h-28 resize-y`} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Sending..." : "Send Application / æäº¤ç”³è¯·"}
      </button>
    </form>
  );
}


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

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-white">{children}</p>;
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
          ? "border-white bg-white text-black"
          : "border-white/10 bg-white/[0.03] text-slate hover:border-white/20 hover:text-white"
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
        setError("Choose up to two role interests / 最多选择两个方向");
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
      return "Please complete all required fields / 请填写所有必填项";
    }

    if (form.roleInterests.length === 0) {
      return "Choose at least one role interest / 请至少选择一个方向";
    }

    if (!form.resume) {
      return "Please upload your resume / 请上传简历";
    }

    if (form.resume.size > 5 * 1024 * 1024) {
      return "Please upload a PDF under 5MB / 请上传 5MB 以内的 PDF";
    }

    const lowerName = form.resume.name.toLowerCase();
    const isPdf = form.resume.type === "application/pdf" || lowerName.endsWith(".pdf");

    if (!isPdf) {
      return "Resume must be a PDF / 简历必须为 PDF";
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
        setError(result.message || "Something went wrong / 提交失败");
        return;
      }

      setSuccess("Application sent successfully / 申请已发送");
      setForm(initialState);
    } catch {
      setError("Something went wrong / 提交失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-12 space-y-8 rounded-[32px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <FieldLabel>Name / 姓名</FieldLabel>
          <input className="field" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>Email / 邮箱</FieldLabel>
          <input className="field" type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>University / Company / 学校或机构</FieldLabel>
          <input className="field" value={form.organization} onChange={(event) => updateField("organization", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>Major / Field / 专业或方向</FieldLabel>
          <input className="field" value={form.major} onChange={(event) => updateField("major", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>Graduation Year / 毕业年份</FieldLabel>
          <input className="field" value={form.graduationYear} onChange={(event) => updateField("graduationYear", event.target.value)} placeholder="e.g. 2027" />
        </label>

        <label className="space-y-2">
          <FieldLabel>Location / 城市国家</FieldLabel>
          <input className="field" value={form.location} onChange={(event) => updateField("location", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>LinkedIn / Portfolio / GitHub (optional) / 链接（可选）</FieldLabel>
          <input className="field" value={form.profileLink} onChange={(event) => updateField("profileLink", event.target.value)} />
        </label>

        <label className="hidden">
          Website
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => updateField("website", event.target.value)} />
        </label>

        <div className="space-y-3 md:col-span-2">
          <FieldLabel>Role Interest / 感兴趣方向</FieldLabel>
          <p className="text-sm text-slate">Choose up to two / 最多选择两个</p>
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
          <FieldLabel>What have you built? / 你做过什么？</FieldLabel>
          <textarea className="field min-h-32 resize-y" value={form.built} onChange={(event) => updateField("built", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Why Agentech? / 为什么想来 Agentech？</FieldLabel>
          <textarea className="field min-h-32 resize-y" value={form.whyAgentech} onChange={(event) => updateField("whyAgentech", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Resume Upload (PDF) / 上传简历（PDF）</FieldLabel>
          <input
            className="field file:mr-4 file:rounded-full file:border-0 file:bg-white file:px-4 file:py-2 file:text-sm file:font-medium file:text-black"
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => updateField("resume", event.target.files?.[0] ?? null)}
          />
          <p className="text-sm text-slate">PDF only, up to 5MB / 仅支持 PDF，最大 5MB</p>
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Notes (optional) / 备注（可选）</FieldLabel>
          <textarea className="field min-h-28 resize-y" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
        </label>
      </div>

      {error ? <p className="text-sm text-[#f2b6b6]">{error}</p> : null}
      {success ? <p className="text-sm text-[#a9d6b6]">{success}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-white px-6 py-3 text-sm font-medium text-ink transition hover:bg-mist disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Sending..." : "Send Application / 提交申请"}
      </button>
    </form>
  );
}

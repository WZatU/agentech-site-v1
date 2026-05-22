"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { INTERNSHIP_ROLE_INTERESTS, type InternshipRoleInterest } from "@/lib/internship";
import { getAccountSession } from "@/lib/account-session";

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
  "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm !text-black outline-none transition placeholder:!text-black focus:border-slate-950 focus:ring-4 focus:ring-slate-200";

function FieldLabel({ children, required = true }: { children: React.ReactNode; required?: boolean }) {
  return (
    <p className="text-sm font-semibold !text-black">
      {children} {required ? <span className="text-red-600">*</span> : null}
    </p>
  );
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
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
        active
          ? "talent-active-choice border-slate-950 bg-slate-950 text-white"
          : "talent-muted-choice border-red-500 bg-red-50 text-red-600 hover:bg-red-100"
      }`}
    >
      {children}
    </button>
  );
}

export function InternshipForm() {
  const router = useRouter();
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

    const session = getAccountSession();

    if (!session?.email) {
      router.push("/login?next=/talents");
      return;
    }

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
      body.set("accountEmail", session.email);
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
    <form onSubmit={handleSubmit} className="talent-application-form mt-12 w-full space-y-8 rounded-[32px] border border-slate-200 bg-white p-6 !text-black shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-8">
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <FieldLabel>Name / 姓名</FieldLabel>
          <input className={fieldClass} value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>Email / 邮箱</FieldLabel>
          <input className={fieldClass} type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>University / Company / 学校或机构</FieldLabel>
          <input className={fieldClass} value={form.organization} onChange={(event) => updateField("organization", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>Major / Field / 专业或方向</FieldLabel>
          <input className={fieldClass} value={form.major} onChange={(event) => updateField("major", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>Graduation Year / 毕业年份</FieldLabel>
          <input className={fieldClass} value={form.graduationYear} onChange={(event) => updateField("graduationYear", event.target.value)} placeholder="e.g. 2027" />
        </label>

        <label className="space-y-2">
          <FieldLabel>Location / 城市国家</FieldLabel>
          <input className={fieldClass} value={form.location} onChange={(event) => updateField("location", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>LinkedIn / Portfolio / GitHub / 链接</FieldLabel>
          <input className={fieldClass} value={form.profileLink} onChange={(event) => updateField("profileLink", event.target.value)} />
        </label>

        <label className="hidden">
          Website
          <input tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => updateField("website", event.target.value)} />
        </label>

        <div className="space-y-3 md:col-span-2">
          <FieldLabel>Role Interest / 感兴趣方向</FieldLabel>
          <p className="text-sm !text-black">Choose up to two / 最多选择两个</p>
          <div className="flex flex-wrap gap-3">
            {INTERNSHIP_ROLE_INTERESTS.map((interest) => (
              <ChoiceButton key={interest} active={form.roleInterests.includes(interest)} onClick={() => toggleRoleInterest(interest)}>
                {interest}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>What have you built? / 你做过什么？</FieldLabel>
          <textarea className={`${fieldClass} min-h-32 resize-y`} value={form.built} onChange={(event) => updateField("built", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Why Agentech? / 为什么想来 Agentech？</FieldLabel>
          <textarea className={`${fieldClass} min-h-32 resize-y`} value={form.whyAgentech} onChange={(event) => updateField("whyAgentech", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Resume Upload (PDF) / 上传简历（PDF）</FieldLabel>
          <input
            className={`${fieldClass} file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white`}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => updateField("resume", event.target.files?.[0] ?? null)}
          />
          <p className="text-sm !text-black">PDF only, up to 5MB / 仅支持 PDF，最大 5MB</p>
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel required={false}>Notes (optional) / 备注（可选）</FieldLabel>
          <textarea className={`${fieldClass} min-h-28 resize-y`} value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
        </label>
      </div>

      {error ? <p className="text-sm font-semibold text-red-600">{error}</p> : null}
      {success ? <p className="text-sm font-semibold text-emerald-700">{success}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="talent-submit inline-flex w-full justify-center rounded-full bg-slate-950 px-7 py-4 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isSubmitting ? "Sending..." : "Submit Application / 提交申请"}
      </button>
    </form>
  );
}

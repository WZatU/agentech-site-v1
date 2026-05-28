"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getAccountSession } from "@/lib/account-session";
import {
  SUMMER_SCHOOL_EXPERIENCE,
  SUMMER_SCHOOL_GRADES,
  SUMMER_SCHOOL_INTERESTS,
  type SummerSchoolExperience,
  type SummerSchoolGrade,
  type SummerSchoolInterest
} from "@/lib/summer-school";

type FormState = {
  name: string;
  email: string;
  school: string;
  grade: SummerSchoolGrade | "";
  gpa: string;
  interests: SummerSchoolInterest[];
  experience: SummerSchoolExperience | "";
  parentEmail: string;
  projects: string;
  uniqueness: string;
  resume: File | null;
  notes: string;
  website: string;
};

const initialState: FormState = {
  name: "",
  email: "",
  school: "",
  grade: "",
  gpa: "",
  interests: [],
  experience: "",
  parentEmail: "",
  projects: "",
  uniqueness: "",
  resume: null,
  notes: "",
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

export function SummerSchoolForm() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startedAt] = useState(() => Date.now());

  function requireAccount(event?: React.SyntheticEvent) {
    if (getAccountSession()?.email) {
      return true;
    }

    event?.preventDefault();
    event?.stopPropagation();
    router.push("/login?next=/ai-robotics-club/apply");
    return false;
  }

  function gateInteraction(event: React.SyntheticEvent<HTMLFormElement>) {
    const target = event.target as HTMLElement;

    if (target.closest("input, textarea, select, button")) {
      requireAccount(event);
    }
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleInterest(value: SummerSchoolInterest) {
    setForm((current) => {
      if (current.interests.includes(value)) {
        return { ...current, interests: current.interests.filter((item) => item !== value) };
      }

      if (current.interests.length >= 3) {
        setError("Choose up to three interests / 最多选择三个方向");
        return current;
      }

      return { ...current, interests: [...current.interests, value] };
    });
  }

  function validate() {
    if (
      !form.name ||
      !form.email ||
      !form.school ||
      !form.grade ||
      !form.gpa ||
      !form.experience ||
      !form.parentEmail ||
      !form.projects ||
      !form.uniqueness
    ) {
      return "Please complete all required fields / 请填写所有必填项";
    }

    if (form.interests.length === 0) {
      return "Choose at least one interest / 请至少选择一个兴趣方向";
    }

    return "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!requireAccount(event)) {
      return;
    }

    const session = getAccountSession();
    if (!session?.email) {
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
      body.set("school", form.school);
      body.set("grade", form.grade);
      body.set("gpa", form.gpa);
      body.set("experience", form.experience);
      body.set("parentEmail", form.parentEmail);
      body.set("projects", form.projects);
      body.set("uniqueness", form.uniqueness);
      body.set("notes", form.notes);
      body.set("website", form.website);
      body.set("accountEmail", session.email);
      body.set("startedAt", String(startedAt));
      form.interests.forEach((interest) => body.append("interests", interest));
      if (form.resume) {
        body.set("resume", form.resume);
      }

      const response = await fetch("/api/summer-school", {
        method: "POST",
        body
      });

      const result = (await response.json()) as {
        ok: boolean;
        mode?: "sent" | "mailto";
        mailtoUrl?: string;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        setError(result.message || "Something went wrong / 提交失败");
        return;
      }

      if (result.mode === "mailto" && result.mailtoUrl) {
        window.location.href = result.mailtoUrl;
        setSuccess("Email draft opened / 已打开邮件草稿");
        return;
      }

      setSuccess("Application sent / 申请已发送");
      router.push("/account");
      router.refresh();
    } catch {
      setError("Something went wrong / 提交失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      onFocusCapture={gateInteraction}
      onPointerDownCapture={gateInteraction}
      className="talent-application-form mt-12 w-full space-y-8 rounded-[32px] border border-slate-200 bg-white p-6 !text-black shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-8"
    >
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <FieldLabel>Name / 姓名</FieldLabel>
          <input className={fieldClass} name="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>Email / 邮箱</FieldLabel>
          <input className={fieldClass} type="email" name="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>School / 学校</FieldLabel>
          <input className={fieldClass} name="school" value={form.school} onChange={(event) => updateField("school", event.target.value)} />
        </label>

        <label className="hidden">
          Website
          <input tabIndex={-1} autoComplete="off" name="website" value={form.website} onChange={(event) => updateField("website", event.target.value)} />
        </label>

        <div className="space-y-3 md:col-span-2">
          <FieldLabel>Grade / 年级</FieldLabel>
          <div className="flex flex-wrap gap-3">
            {SUMMER_SCHOOL_GRADES.map((grade) => (
              <ChoiceButton key={grade} active={form.grade === grade} onClick={() => updateField("grade", grade)}>
                {grade}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <label className="space-y-2">
          <FieldLabel>GPA</FieldLabel>
          <input className={fieldClass} name="gpa" value={form.gpa} onChange={(event) => updateField("gpa", event.target.value)} placeholder="e.g. 3.8 / 4.0" />
        </label>

        <label className="space-y-2">
          <FieldLabel>Parent Email / 家长邮箱</FieldLabel>
          <input className={fieldClass} type="email" name="parentEmail" value={form.parentEmail} onChange={(event) => updateField("parentEmail", event.target.value)} />
        </label>

        <div className="space-y-3 md:col-span-2">
          <FieldLabel>Interest / 兴趣方向</FieldLabel>
          <p className="text-sm !text-black">Choose up to three / 最多选择三个</p>
          <div className="flex flex-wrap gap-3">
            {SUMMER_SCHOOL_INTERESTS.map((interest) => (
              <ChoiceButton key={interest} active={form.interests.includes(interest)} onClick={() => toggleInterest(interest)}>
                {interest}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <div className="space-y-3 md:col-span-2">
          <FieldLabel>Experience / 经验基础</FieldLabel>
          <div className="flex flex-wrap gap-3">
            {SUMMER_SCHOOL_EXPERIENCE.map((experience) => (
              <ChoiceButton key={experience} active={form.experience === experience} onClick={() => updateField("experience", experience)}>
                {experience}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Have you done any projects? / 你做过什么项目？</FieldLabel>
          <textarea className={`${fieldClass} min-h-32 resize-y`} name="projects" value={form.projects} onChange={(event) => updateField("projects", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Tell us the uniqueness about you / 你觉得你特别的地方是什么？</FieldLabel>
          <textarea className={`${fieldClass} min-h-32 resize-y`} name="uniqueness" value={form.uniqueness} onChange={(event) => updateField("uniqueness", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel required={false}>Resume Upload (PDF, optional)</FieldLabel>
          <input
            className={`${fieldClass} file:mr-4 file:rounded-full file:border-0 file:bg-slate-950 file:px-4 file:py-2 file:text-sm file:font-medium file:text-white`}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => updateField("resume", event.target.files?.[0] ?? null)}
          />
          <p className="text-sm !text-black">Optional PDF, up to 5MB</p>
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel required={false}>Notes (optional) / 备注（可选）</FieldLabel>
          <textarea className={`${fieldClass} min-h-28 resize-y`} name="notes" value={form.notes} onChange={(event) => updateField("notes", event.target.value)} />
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

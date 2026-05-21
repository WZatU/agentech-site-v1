"use client";

import { useState } from "react";
import {
  TECH_EDUCATION_EXPERIENCE,
  TECH_EDUCATION_GRADES,
  TECH_EDUCATION_INTERESTS,
  type TechEducationExperience,
  type TechEducationGrade,
  type TechEducationInterest
} from "@/lib/tech-education";

type FormState = {
  name: string;
  email: string;
  school: string;
  grade: TechEducationGrade | "";
  gpa: string;
  interests: TechEducationInterest[];
  experience: TechEducationExperience | "";
  parentEmail: string;
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
  notes: "",
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

export function TechEducationForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startedAt] = useState(() => Date.now());

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function toggleInterest(value: TechEducationInterest) {
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
    if (!form.name || !form.email || !form.school || !form.grade || !form.gpa || !form.experience || !form.parentEmail) {
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

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/tech-education", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ...form,
          startedAt
        })
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
      setForm(initialState);
    } catch {
      setError("Something went wrong / 提交失败");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-12 space-y-8 rounded-[32px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <FieldLabel>Name / 姓名</FieldLabel>
          <input
            className={fieldClass}
            name="name"
            value={form.name}
            onChange={(event) => updateField("name", event.target.value)}
          />
        </label>

        <label className="space-y-2">
          <FieldLabel>Email / 邮箱</FieldLabel>
          <input
            className={fieldClass}
            type="email"
            name="email"
            value={form.email}
            onChange={(event) => updateField("email", event.target.value)}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>School / 学校</FieldLabel>
          <input
            className={fieldClass}
            name="school"
            value={form.school}
            onChange={(event) => updateField("school", event.target.value)}
          />
        </label>

        <label className="hidden">
          Website
          <input
            tabIndex={-1}
            autoComplete="off"
            name="website"
            value={form.website}
            onChange={(event) => updateField("website", event.target.value)}
          />
        </label>

        <div className="space-y-3 md:col-span-2">
          <FieldLabel>Grade / 年级</FieldLabel>
          <div className="flex flex-wrap gap-3">
            {TECH_EDUCATION_GRADES.map((grade) => (
              <ChoiceButton
                key={grade}
                active={form.grade === grade}
                onClick={() => updateField("grade", grade)}
              >
                {grade}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <label className="space-y-2">
          <FieldLabel>GPA</FieldLabel>
          <input
            className={fieldClass}
            name="gpa"
            value={form.gpa}
            onChange={(event) => updateField("gpa", event.target.value)}
            placeholder="e.g. 3.8 / 4.0"
          />
        </label>

        <label className="space-y-2">
          <FieldLabel>Parent Email / 家长邮箱</FieldLabel>
          <input
            className={fieldClass}
            type="email"
            name="parentEmail"
            value={form.parentEmail}
            onChange={(event) => updateField("parentEmail", event.target.value)}
          />
        </label>

        <div className="space-y-3 md:col-span-2">
          <FieldLabel>Interest / 兴趣方向</FieldLabel>
          <p className="text-sm text-slate-500">Choose up to three / 最多选择三个</p>
          <div className="flex flex-wrap gap-3">
            {TECH_EDUCATION_INTERESTS.map((interest) => (
              <ChoiceButton
                key={interest}
                active={form.interests.includes(interest)}
                onClick={() => toggleInterest(interest)}
              >
                {interest}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <div className="space-y-3 md:col-span-2">
          <FieldLabel>Experience / 经验基础</FieldLabel>
          <div className="flex flex-wrap gap-3">
            {TECH_EDUCATION_EXPERIENCE.map((experience) => (
              <ChoiceButton
                key={experience}
                active={form.experience === experience}
                onClick={() => updateField("experience", experience)}
              >
                {experience}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Notes (optional) / 备注（可选）</FieldLabel>
          <textarea
            className={`${fieldClass} min-h-32 resize-y`}
            name="notes"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
        </label>
      </div>

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {success ? <p className="text-sm text-emerald-700">{success}</p> : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-full bg-slate-950 px-6 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Sending..." : "Send Application / 提交申请"}
      </button>
    </form>
  );
}

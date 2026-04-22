"use client";

import { useState } from "react";
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
  notes: "",
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

export function SummerSchoolForm() {
  const [form, setForm] = useState<FormState>(initialState);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startedAt] = useState(() => Date.now());

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

    const validationError = validate();

    if (validationError) {
      setError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/summer-school", {
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
    <form onSubmit={handleSubmit} className="mt-12 space-y-8 rounded-[32px] border border-white/10 bg-white/[0.03] p-6 md:p-8">
      <div className="grid gap-6 md:grid-cols-2">
        <label className="space-y-2">
          <FieldLabel>Name / 姓名</FieldLabel>
          <input className="field" name="name" value={form.name} onChange={(event) => updateField("name", event.target.value)} />
        </label>

        <label className="space-y-2">
          <FieldLabel>Email / 邮箱</FieldLabel>
          <input className="field" type="email" name="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>School / 学校</FieldLabel>
          <input className="field" name="school" value={form.school} onChange={(event) => updateField("school", event.target.value)} />
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
            {SUMMER_SCHOOL_GRADES.map((grade) => (
              <ChoiceButton key={grade} active={form.grade === grade} onClick={() => updateField("grade", grade)}>
                {grade}
              </ChoiceButton>
            ))}
          </div>
        </div>

        <label className="space-y-2">
          <FieldLabel>GPA</FieldLabel>
          <input
            className="field"
            name="gpa"
            value={form.gpa}
            onChange={(event) => updateField("gpa", event.target.value)}
            placeholder="e.g. 3.8 / 4.0"
          />
        </label>

        <label className="space-y-2">
          <FieldLabel>Parent Email / 家长邮箱</FieldLabel>
          <input
            className="field"
            type="email"
            name="parentEmail"
            value={form.parentEmail}
            onChange={(event) => updateField("parentEmail", event.target.value)}
          />
        </label>

        <div className="space-y-3 md:col-span-2">
          <FieldLabel>Interest / 兴趣方向</FieldLabel>
          <p className="text-sm text-slate">Choose up to three / 最多选择三个</p>
          <div className="flex flex-wrap gap-3">
            {SUMMER_SCHOOL_INTERESTS.map((interest) => (
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
            {SUMMER_SCHOOL_EXPERIENCE.map((experience) => (
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
          <FieldLabel>Have you done any projects? / 你做过什么项目？</FieldLabel>
          <textarea
            className="field min-h-32 resize-y"
            name="projects"
            value={form.projects}
            onChange={(event) => updateField("projects", event.target.value)}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Tell us the uniqueness about you / 你觉得你特别的地方是什么？</FieldLabel>
          <textarea
            className="field min-h-32 resize-y"
            name="uniqueness"
            value={form.uniqueness}
            onChange={(event) => updateField("uniqueness", event.target.value)}
          />
        </label>

        <label className="space-y-2 md:col-span-2">
          <FieldLabel>Notes (optional) / 备注（可选）</FieldLabel>
          <textarea
            className="field min-h-28 resize-y"
            name="notes"
            value={form.notes}
            onChange={(event) => updateField("notes", event.target.value)}
          />
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

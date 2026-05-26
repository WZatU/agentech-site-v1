"use client";

import Link from "next/link";
import { useState } from "react";
import type { InternshipLanguage, InternshipRole } from "@/lib/internship-roles";

const languageLabels: Record<InternshipLanguage, string> = {
  en: "English",
  zh: "中文"
};

function DetailSection({ title, items, columns = false }: { title: string; items: string[]; columns?: boolean }) {
  return (
    <section className="border-t border-slate-200 pt-7">
      <h2 className="text-xl font-semibold">{title}</h2>
      <ul className={`mt-4 text-base leading-7 ${columns ? "grid gap-3 md:grid-cols-2" : "space-y-3"}`}>
        {items.map((item) => (
          <li key={item} className="flex gap-3">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-950" />
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function InternshipRoleDetail({ role }: { role: InternshipRole }) {
  const [language, setLanguage] = useState<InternshipLanguage>("en");
  const content = role.content[language];
  const sectionTitles =
    language === "en"
      ? {
          overview: "Overview",
          responsibilities: "Responsibilities",
          requirements: "Requirements",
          preferred: "Preferred",
          helpfulCourses: "Helpful Courses",
          exampleProjects: "Example Projects",
          applicationMaterials: "Application Materials"
        }
      : {
          overview: "岗位概览",
          responsibilities: "工作内容",
          requirements: "任职要求",
          preferred: "优先相关经验",
          helpfulCourses: "优先相关课程",
          exampleProjects: "可能参与的项目",
          applicationMaterials: "申请材料"
        };

  return (
    <div className="internship-role-content rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_45px_rgba(15,23,42,0.08)] md:p-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="inline-flex shrink-0 rounded-full border border-[#d9e1ea] bg-white p-1 text-sm font-bold shadow-[0_10px_28px_rgba(15,23,42,0.06)]">
          {(["en", "zh"] as InternshipLanguage[]).map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLanguage(value)}
              className={`rounded-full px-4 py-2 transition ${
                language === value
                  ? "internship-language-active bg-[#0b1220]"
                  : "!text-[#0b1220] hover:bg-[#f1f5f9]"
              }`}
            >
              {languageLabels[value]}
            </button>
          ))}
        </div>

        <Link
          href={`/career-intern/apply?role=${role.slug}`}
          className="internship-dark-button inline-flex shrink-0 rounded-full bg-slate-950 px-7 py-3 text-sm font-semibold shadow-[0_12px_28px_rgba(15,23,42,0.18)] transition hover:bg-slate-800"
        >
          Apply Now
        </Link>
      </div>

      <div className="mt-8 space-y-6 text-base leading-8">
        <h2 className="text-xl font-semibold">{sectionTitles.overview}</h2>
        {content.overview.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      <div className="mt-8 space-y-8">
        <DetailSection title={sectionTitles.responsibilities} items={content.responsibilities} />
        <DetailSection title={sectionTitles.requirements} items={content.requirements} />
        <DetailSection title={sectionTitles.preferred} items={content.preferred} />
        {content.helpfulCourses?.length ? <DetailSection title={sectionTitles.helpfulCourses} items={content.helpfulCourses} columns /> : null}
        {content.exampleProjects?.length ? <DetailSection title={sectionTitles.exampleProjects} items={content.exampleProjects} /> : null}
        {content.applicationMaterials?.length ? <DetailSection title={sectionTitles.applicationMaterials} items={content.applicationMaterials} /> : null}
      </div>
    </div>
  );
}

import { ApplicationSystem } from "@/components/application-system";
import { PageHero } from "@/components/page-hero";

export default function CareerPage() {
  return (
    <>
      <PageHero
        eyebrow="Career"
        title="Apply to Build."
        description="A unified application system for full-time, internship, partnerships, and high-signal talents."
      />

      <ApplicationSystem mode="full" />
    </>
  );
}

import Image from "next/image";
import { EmailCaptureForm } from "@/components/forms";

export default function TalentsPage() {
  return (
    <>
      <section className="border-b border-[#363d45]/70">
        <div className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
          <h1 className="text-4xl font-semibold tracking-tight text-white md:text-6xl">Talents</h1>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-20">
        <div className="relative overflow-hidden rounded-[24px]">
          <Image
            src="/assets/agents/talents-page.png"
            alt="Agentech team"
            width={2400}
            height={1400}
            className="h-auto w-full"
            priority
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/20 to-transparent" />
        </div>

        <div className="mx-auto mt-14 max-w-2xl">
          <EmailCaptureForm helperText="Placeholder wiring: connect this email field to your recruiting inbox or talent database later." />
        </div>
      </section>
    </>
  );
}

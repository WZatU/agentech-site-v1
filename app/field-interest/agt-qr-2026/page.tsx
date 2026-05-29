import type { Metadata } from "next";
import Image from "next/image";
import { FieldInterestForm } from "@/components/field-interest-form";

export const metadata: Metadata = {
  title: "Agentech Field Interest",
  robots: {
    index: false,
    follow: false
  }
};

export default function FieldInterestQrPage() {
  return (
    <main className="min-h-screen bg-[#02050a] px-5 py-8 text-white md:px-8 md:py-12">
      <div className="mx-auto flex min-h-[calc(100vh-6rem)] max-w-xl flex-col justify-center gap-8">
        <div className="mx-auto w-48">
          <Image
            src="/assets/logo/AGENTECH.png"
            alt="Agentech"
            width={1000}
            height={101}
            className="h-auto w-full"
            priority
          />
        </div>
        <FieldInterestForm />
      </div>
    </main>
  );
}

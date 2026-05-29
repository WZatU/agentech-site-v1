import type { Metadata } from "next";
import Image from "next/image";
import { FieldInterestForm } from "@/components/field-interest-form";

const hiddenPath = "/field-interest/agt-qr-2026";
const hiddenUrl = `https://www.agent-tech.ai${hiddenPath}`;
const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=520x520&margin=18&data=${encodeURIComponent(hiddenUrl)}`;

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
      <div className="mx-auto grid min-h-[calc(100vh-6rem)] max-w-6xl items-center gap-8 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 text-center shadow-[0_30px_120px_rgba(0,0,0,0.45)] backdrop-blur">
          <div className="mx-auto mb-6 w-44">
            <Image
              src="/assets/logo/AGENTECH.png"
              alt="Agentech"
              width={1000}
              height={101}
              className="h-auto w-full"
              priority
            />
          </div>

          <div className="mx-auto max-w-[360px] rounded-[28px] border border-white/10 bg-white p-4">
            <div className="relative overflow-hidden rounded-[20px] bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrUrl} alt="Agentech interest QR code" className="h-auto w-full" />
              <div className="absolute left-1/2 top-1/2 grid h-[26%] w-[38%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-2xl bg-white px-3 shadow-[0_10px_30px_rgba(0,0,0,0.18)]">
                <Image
                  src="/assets/logo/AGENTECH.png"
                  alt="Agentech"
                  width={1000}
                  height={101}
                  className="h-auto w-full"
                  priority
                />
              </div>
            </div>
          </div>

          <p className="mx-auto mt-5 max-w-sm text-sm leading-6 text-slate-300">
            Scan to leave your email, product interest, or idea.
          </p>
        </section>

        <FieldInterestForm />
      </div>
    </main>
  );
}

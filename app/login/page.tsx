import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { UniversalAuthForm } from "@/components/universal-auth-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f4f6f8] px-6 py-10 text-[#0b1220] lg:px-8">
      <section className="mx-auto grid min-h-[82vh] max-w-6xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <Link href="/" className="inline-flex">
            <Image
              src="/assets/logo/AGENTECH.png"
              alt="Agentech"
              width={1000}
              height={247}
              className="h-auto w-80 max-w-full"
              priority
            />
          </Link>
          <h1 className="mt-10 max-w-xl text-4xl font-semibold tracking-tight text-[#0b1220] md:text-6xl">
            Your gateway to Agentech intelligence systems.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#334155]">
            Sign in to manage profiles, credits, education programs, invoices, and supervised robot live viewing from one secure workspace.
          </p>
        </div>

        <Suspense fallback={<div className="rounded-[28px] bg-white p-7 text-[#0b1220]">Loading...</div>}>
          <UniversalAuthForm />
        </Suspense>
      </section>
    </main>
  );
}

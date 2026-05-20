import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-[#f4f6f8] px-6 py-10 text-[#0b1220] lg:px-8">
      <section className="mx-auto grid min-h-[82vh] max-w-6xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <Link href="/agentech-education" className="inline-flex">
            <Image
              src="/assets/logo/AGENTECH-education.png"
              alt="Agentech Education"
              width={1000}
              height={247}
              className="h-auto w-80 max-w-full"
              priority
            />
          </Link>
          <h1 className="mt-10 max-w-xl text-4xl font-semibold tracking-tight text-[#0b1220] md:text-6xl">
            Parent access for classes, students, and programs.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-7 text-[#334155]">
            Sign in with Google, then create an individual or group profile. You can add students after your account is verified.
          </p>
        </div>

        <div className="rounded-[28px] border border-[#cbd5e1] bg-white p-7 shadow-xl shadow-slate-300/70 md:p-9">
          <div className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#334155]">Secure Sign In</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-[#0b1220]">Continue to Agentech Education</h2>
            <p className="mt-3 text-sm leading-6 text-[#334155]">
              Google sign-in keeps parent accounts simple and reduces password friction.
            </p>
          </div>

          <Link
            href="/account-setup"
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-[#94a3b8] bg-white px-5 py-4 text-base font-semibold text-[#0b1220] transition hover:border-[#0b1220] hover:shadow-lg"
          >
            <span className="grid h-7 w-7 place-items-center rounded-full bg-white text-lg font-bold text-blue-700 shadow-sm ring-1 ring-[#cbd5e1]">
              G
            </span>
            Continue with Google
          </Link>

          <div className="mt-6 rounded-2xl bg-[#f1f5f9] p-5 text-sm leading-6 text-[#334155]">
            <p className="font-semibold text-[#0b1220]">After sign in, you will choose:</p>
            <p className="mt-2">Individual account, up to 6 children, or group account, up to 100 children.</p>
          </div>

          <div className="mt-6 flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
            <Link href="/account-setup" className="font-semibold text-[#0b1220] underline-offset-4 hover:underline">
              Preview setup form
            </Link>
            <Link href="/agentech-education" className="font-semibold text-[#475569] transition hover:text-[#0b1220]">
              Back to Education
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}

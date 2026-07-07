"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useMemo, useState } from "react";
import { getAccountSession } from "@/lib/account-session";

type AccessStatus = "checking" | "allowed" | "signed-out" | "locked" | "error";

type AccountSummary = {
  accessProfiles?: Array<{
    profile_type?: string | null;
  }>;
  error?: string;
};

function LibraryGateShell({
  children,
  eyebrow,
  title
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <div className="agentech-library-page min-h-screen bg-[#fbfdff] px-5 py-8 text-[#07142e] sm:px-8 lg:py-10">
      <style>{`
        body:has(.agentech-library-page) {
          background: #fbfdff !important;
          color: #07142e;
        }

        body:has(.agentech-library-page)::before,
        body:has(.agentech-library-page)::after {
          display: none;
        }

        body:has(.agentech-library-page) main.flex-1 {
          background: #fbfdff;
        }
      `}</style>
      <main className="mx-auto flex min-h-[78vh] w-full max-w-4xl items-center">
        <section className="w-full rounded-[8px] border border-[#dce7f2] bg-white p-8 shadow-[0_22px_70px_rgba(12,31,58,0.08)] sm:p-10">
          <p className="font-mono text-xs font-bold uppercase tracking-[0.18em] text-[#008a7a]">{eyebrow}</p>
          <h1 className="mt-4 text-4xl font-extrabold tracking-normal text-[#07142e] sm:text-5xl">{title}</h1>
          <div className="mt-5 text-base font-semibold leading-7 text-[#23304a]">{children}</div>
        </section>
      </main>
    </div>
  );
}

export function AgentechLibraryAccessGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [status, setStatus] = useState<AccessStatus>("checking");
  const [email, setEmail] = useState("");

  const loginHref = useMemo(() => `/login?next=${encodeURIComponent(pathname || "/agentech-products/agentech-library")}`, [pathname]);

  useEffect(() => {
    let cancelled = false;

    async function checkAccess() {
      const previewProfileType =
        process.env.NODE_ENV !== "production"
          ? new URLSearchParams(window.location.search).get("previewProfile")
          : null;

      if (previewProfileType === "signed-out") {
        setStatus("signed-out");
        router.replace(loginHref);
        return;
      }

      if (previewProfileType === "developer") {
        setEmail("developer.preview@agentech.local");
        setStatus("allowed");
        return;
      }

      const session = getAccountSession();
      const accountEmail = session?.email ?? "";

      if (!accountEmail) {
        setStatus("signed-out");
        router.replace(loginHref);
        return;
      }

      setEmail(accountEmail);
      setStatus("checking");

      try {
        const response = await fetch(`/api/account?email=${encodeURIComponent(accountEmail)}`);
        const result = (await response.json()) as AccountSummary;

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          setStatus("error");
          return;
        }

        const hasDeveloperProfile = result.accessProfiles?.some((profile) => profile.profile_type === "developer") ?? false;
        setStatus(hasDeveloperProfile ? "allowed" : "locked");
      } catch {
        if (!cancelled) {
          setStatus("error");
        }
      }
    }

    checkAccess();

    return () => {
      cancelled = true;
    };
  }, [loginHref, router]);

  if (status === "allowed") {
    return children;
  }

  if (status === "signed-out") {
    return (
      <LibraryGateShell eyebrow="Developer access required" title="Sign in to open EAI Cloud.">
        <p>You need an Agentech account with a developer profile before this workspace opens.</p>
        <Link href={loginHref} className="mt-6 inline-flex rounded-[8px] bg-[#07142e] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white">
          Sign In
        </Link>
      </LibraryGateShell>
    );
  }

  if (status === "locked") {
    return (
      <LibraryGateShell eyebrow="Developer profile required" title="EAI Cloud is only available to developers.">
        <p>
          {email} is signed in, but this account does not have a developer profile yet. Create or switch to a developer profile to access robot testing tools.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/account" className="rounded-[8px] bg-[#07142e] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white">
            Create Developer Profile
          </Link>
          <Link href={loginHref} className="rounded-[8px] border border-[#9cd9df] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-[#008a7a]">
            Sign In
          </Link>
        </div>
      </LibraryGateShell>
    );
  }

  if (status === "error") {
    return (
      <LibraryGateShell eyebrow="Access check failed" title="We could not verify developer access.">
        <p>Refresh the page or open your account dashboard to confirm this account has a developer profile.</p>
        <Link href="/account" className="mt-6 inline-flex rounded-[8px] bg-[#07142e] px-5 py-3 text-sm font-bold uppercase tracking-[0.12em] text-white">
          Open Account
        </Link>
      </LibraryGateShell>
    );
  }

  return (
    <LibraryGateShell eyebrow="Checking access" title="Opening EAI Cloud.">
      <p>Verifying that this account has a developer profile.</p>
    </LibraryGateShell>
  );
}

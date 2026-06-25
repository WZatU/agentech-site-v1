"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function SiteFooter() {
  const pathname = usePathname();

  if (pathname.startsWith("/field-interest") || pathname.startsWith("/agentech-products/agentech-library")) {
    return null;
  }

  return (
    <footer className="border-t border-[#363d45]/70 bg-black">
      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-6 py-8 text-sm font-medium uppercase tracking-[0.22em] text-slate lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <p>Agentech, Inc.</p>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:gap-8">
          <Link href="/about" className="transition hover:text-white">
            About
          </Link>
          <Link href="/news" className="transition hover:text-white">
            News
          </Link>
        </div>
      </div>
    </footer>
  );
}

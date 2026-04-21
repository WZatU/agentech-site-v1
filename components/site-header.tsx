"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand-mark";
import { navigation } from "@/lib/site-data";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[#363d45]/70 bg-black/75 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-4 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <BrandMark />
        </Link>

        <nav className="flex flex-wrap items-center justify-end gap-1 text-sm text-slate">
          {navigation.map((item) => {
            const childPaths = item.children?.map((child) => child.href.split("#")[0]) ?? [];
            const isActive =
              pathname === item.href ||
              childPaths.includes(pathname) ||
              (item.href === "/talents" && pathname.startsWith("/talents"));
            const linkClassName = `rounded-full px-3 py-2 transition ${
              isActive
                ? "bg-white/8 text-white"
                : "text-slate hover:bg-white/5 hover:text-white"
            }`;

            if (item.children?.length) {
              return (
                <div key={item.href} className="group relative flex items-center">
                  <Link href={item.href} className={`${linkClassName} flex items-center gap-2`}>
                    <span>{item.label}</span>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 12 12"
                      className="h-3 w-3 transition duration-150 group-hover:rotate-180 group-focus-within:rotate-180"
                    >
                      <path
                        d="M2.25 4.5 6 8.25 9.75 4.5"
                        fill="none"
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="1.4"
                      />
                    </svg>
                  </Link>

                  <div className="pointer-events-none absolute left-1/2 top-[calc(100%+1px)] z-[70] w-max -translate-x-1/2 opacity-0 transition duration-150 group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100">
                    <div className="min-w-[260px] overflow-hidden rounded-[28px] border border-[#363d45]/70 bg-[#090b0f] p-2 shadow-[0_28px_80px_rgba(0,0,0,0.72)]">
                      {item.children.map((child) => (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={`block rounded-xl px-4 py-3 text-sm transition ${
                            pathname === child.href
                              ? "bg-white/8 text-white"
                              : "text-slate hover:bg-white/6 hover:text-white"
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <Link
                key={item.href}
                href={item.href}
                className={linkClassName}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}

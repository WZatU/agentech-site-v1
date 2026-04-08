import Link from "next/link";
import { company, navigation } from "@/lib/site-data";

export function SiteFooter() {
  return (
    <footer className="border-t border-[#363d45]/70 bg-black">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 lg:grid-cols-[1.2fr,1fr] lg:px-8">
        <div>
          <p className="font-[var(--font-display)] text-xl tracking-[0.16em] text-white">AGENTECH</p>
          <p className="mt-4 max-w-sm text-sm leading-7 text-slate">{company.tagline}</p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-[0.22em] text-slate">Pages</p>
          <div className="mt-4 flex flex-col gap-3 text-sm text-slate">
            {navigation.map((item) => (
              <Link key={item.href} href={item.href} className="hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="border-t border-[#363d45]/70">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-6 py-6 text-sm text-slate lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <p>Agentech, Inc.</p>
          <p>{company.location}</p>
        </div>
      </div>
    </footer>
  );
}

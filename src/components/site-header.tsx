import Image from "next/image";
import Link from "next/link";
import { SessionNav } from "@/components/auth/session-nav";
import type { SessionContext } from "@/lib/types";

export function SiteHeader({ session }: { session: SessionContext }) {
  return (
    <header className="border-b border-white/10 bg-cpgis-ink text-white">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="flex items-center gap-3 text-lg font-semibold tracking-tight"
        >
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
            <Image
              src="/cpgis-logo.png"
              alt="CPGIS logo"
              width={40}
              height={40}
              priority
              className="h-10 w-10"
            />
          </span>
          CPGIS Jobs Portal
        </Link>

        <nav className="flex flex-wrap items-center gap-3 text-sm font-medium text-slate-300">
          <Link href="/" className="transition hover:text-cpgis-globe">
            Public map
          </Link>
          <Link href="/plan-ahead" className="transition hover:text-cpgis-globe">
            Plan ahead
          </Link>
          <Link href="/submit" className="transition hover:text-cpgis-globe">
            Submit
          </Link>
          <Link href="/admin" className="transition hover:text-cpgis-globe">
            Admin
          </Link>
          <SessionNav session={session} />
        </nav>
      </div>
    </header>
  );
}

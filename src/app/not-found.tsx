import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[linear-gradient(180deg,_#f7fbff_0%,_#eef6f8_100%)] px-4">
      <div className="max-w-xl rounded-[28px] border border-slate-200 bg-white p-8 text-center shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <div className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Not found
        </div>
        <h1 className="mt-3 text-3xl font-semibold text-slate-950">
          This opportunity page could not be found.
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          The record may have been removed, unpublished, or the share link could
          be outdated.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700"
        >
          Return to the public map
        </Link>
      </div>
    </main>
  );
}

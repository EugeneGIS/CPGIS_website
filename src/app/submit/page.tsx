import Link from "next/link";
import { ExtractWorkflow } from "@/components/submit/extract-workflow";
import { SiteHeader } from "@/components/site-header";
import { getSessionContext } from "@/lib/auth";

export default async function SubmitPage() {
  const session = await getSessionContext();

  return (
    <>
      <SiteHeader session={session} />
      <main className="min-h-screen bg-[linear-gradient(180deg,_#f7fbff_0%,_#eef6f8_100%)] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-[1400px]">
          <div className="mb-6 rounded-[28px] border border-slate-200 bg-slate-950 px-6 py-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <div className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Staff workflow
            </div>
            <h1 className="mt-3 text-4xl font-semibold">
              Submit a job posting for review
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">
              Paste the announcement or upload the CPGIS document. The system
              extracts titles, institutions, deadlines, and tags, matches
              reviewed campus coordinates, drafts the social posts, and files
              everything into the review queue — you only check what it is
              unsure about.
            </p>
            {session.mode === "supabase" && !session.user ? (
              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
                Sign in first if you want this submission stored in Supabase.{" "}
                <Link href="/sign-in" className="font-semibold text-cyan-300">
                  Open sign-in
                </Link>
              </div>
            ) : null}
          </div>

          <ExtractWorkflow session={session} />
        </div>
      </main>
    </>
  );
}

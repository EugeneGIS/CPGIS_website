import { PlanAhead } from "@/components/plan-ahead";
import { SiteHeader } from "@/components/site-header";
import { getSessionContext } from "@/lib/auth";
import { buildPlanAheadData } from "@/lib/job-filters";
import { getPublishedJobs } from "@/lib/jobs";
import { toDateKey } from "@/lib/utils";

// Expiry is derived from "today" and the demo queue changes at runtime, so
// the page must never be frozen at build time.
export const dynamic = "force-dynamic";

export default async function PlanAheadPage() {
  const [jobs, session] = await Promise.all([
    getPublishedJobs(),
    getSessionContext(),
  ]);

  // Computed once on the server so hydration sees the same buckets.
  const today = toDateKey(new Date());
  const data = buildPlanAheadData(jobs, today);

  return (
    <>
      <SiteHeader session={session} />
      <PlanAhead data={data} today={today} />
    </>
  );
}

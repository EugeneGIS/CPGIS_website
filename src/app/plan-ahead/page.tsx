import { PlanAhead } from "@/components/plan-ahead";
import { SiteHeader } from "@/components/site-header";
import { getSessionContext } from "@/lib/auth";
import { getPublishedJobs } from "@/lib/jobs";

export default async function PlanAheadPage() {
  const [jobs, session] = await Promise.all([
    getPublishedJobs(),
    getSessionContext(),
  ]);

  return (
    <>
      <SiteHeader session={session} />
      <PlanAhead jobs={jobs} />
    </>
  );
}

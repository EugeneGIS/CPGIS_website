import { NextResponse } from "next/server";
import { buildPlanAheadData } from "@/lib/job-filters";
import { getPublishedJobs } from "@/lib/jobs";
import { toDateKey } from "@/lib/utils";

export async function GET() {
  try {
    const today = toDateKey(new Date());
    const data = buildPlanAheadData(await getPublishedJobs(), today);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Could not load historical deadline months.", error);
    return NextResponse.json({ error: "Could not load historical deadline months." }, { status: 503 });
  }
}

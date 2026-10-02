import { NextResponse } from "next/server";
import { isJobExpired } from "@/lib/job-filters";
import { getPublishedJobs } from "@/lib/jobs";
import { toDateKey } from "@/lib/utils";

export async function GET() {
  try {
    const today = toDateKey(new Date());
    const jobs = (await getPublishedJobs()).filter((job) => isJobExpired(job, today));
    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("Could not load expired jobs.", error);
    return NextResponse.json({ error: "Could not load expired jobs." }, { status: 503 });
  }
}

import { NextResponse } from "next/server";
import { canAccessAdmin, getSessionContext } from "@/lib/auth";
import { getAdminJobPage, type AdminJobFilter } from "@/lib/jobs";
import { toDateKey } from "@/lib/utils";

const statuses = new Set<AdminJobFilter>([
  "all", "expired", "draft", "pending", "needs_changes", "approved", "published", "archived",
]);

export async function GET(request: Request) {
  const session = await getSessionContext();
  if (!canAccessAdmin(session)) {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const rawStatus = params.get("status") ?? "all";
  const rawPage = params.get("page") ?? "0";
  if (!statuses.has(rawStatus as AdminJobFilter) || !/^\d{1,5}$/.test(rawPage)) {
    return NextResponse.json({ error: "Invalid moderation filter." }, { status: 400 });
  }
  try {
    return NextResponse.json(await getAdminJobPage({
      status: rawStatus as AdminJobFilter,
      query: params.get("query") ?? "",
      page: Number(rawPage),
      today: toDateKey(new Date()),
    }));
  } catch (error) {
    console.error("Could not load moderation page.", error);
    return NextResponse.json({ error: "Could not load moderation page." }, { status: 503 });
  }
}

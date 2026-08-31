import { NextResponse } from "next/server";
import { extractJobFromText } from "@/lib/extract";
import { bestAddress } from "@/lib/geocode";
import { isSupabaseConfigured } from "@/lib/env";
import {
  matchInstitutionOverride,
  institutionMatchToLocation,
  type InstitutionMatch,
} from "@/lib/institution-match";
import { normalizeLocationDisplay } from "@/lib/location-policy";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const maxDuration = 30;

export type LocationResolution =
  | { source: "reviewed-table"; confidence: "ok"; location: ReturnType<typeof institutionMatchToLocation>; matched: InstitutionMatch }
  | {
      source: "geocoder";
      confidence: "uncertain";
      location: ReturnType<typeof normalizeLocationDisplay>;
      label: string;
    }
  | { source: "none"; confidence: "missing" };

export interface ExtractResponse {
  draft: ReturnType<typeof extractJobFromText>;
  location: LocationResolution;
  duplicates: Array<{ id: string; slug: string; title: string; status: string }>;
}

export async function POST(request: Request) {
  let payload: { text?: unknown; sourceUrl?: unknown };

  try {
    payload = await request.json();
  } catch {
    return NextResponse.json(
      { error: "The request body must contain valid JSON." },
      { status: 400 },
    );
  }

  const text = typeof payload.text === "string" ? payload.text.trim() : "";
  const sourceUrl =
    typeof payload.sourceUrl === "string" ? payload.sourceUrl.trim() : "";

  if (text.length < 15) {
    return NextResponse.json(
      { error: "Paste the full job announcement text (at least 15 characters)." },
      { status: 400 },
    );
  }

  const draft = extractJobFromText(text);
  const primaryUrl = draft.applicationUrl.value || sourceUrl;

  let location: LocationResolution = { source: "none", confidence: "missing" };

  const institution = draft.organization.value
    ? matchInstitutionOverride(draft.organization.value, primaryUrl || undefined)
    : null;

  if (institution) {
    location = {
      source: "reviewed-table",
      confidence: "ok",
      location: institutionMatchToLocation(institution),
      matched: institution,
    };
  } else if (draft.organization.value) {
    try {
      const candidate = await bestAddress(draft.organization.value);

      if (candidate && Number.isFinite(candidate.latitude)) {
        location = {
          source: "geocoder",
          confidence: "uncertain",
          label: candidate.label,
          location: normalizeLocationDisplay({
            label: candidate.label,
            city: candidate.city ?? candidate.label.split(",")[0] ?? "",
            country: candidate.country ?? "",
            latitude: candidate.latitude,
            longitude: candidate.longitude,
          }),
        };
      }
    } catch {
      // Geocoder unavailable: leave the location for staff to fill in.
    }
  }

  let duplicates: ExtractResponse["duplicates"] = [];

  if (primaryUrl && isSupabaseConfigured()) {
    try {
      const supabase = await createServerSupabaseClient();
      const { data } = await supabase
        .from("job_posts")
        .select("id, slug, title, status")
        .eq("application_url", primaryUrl)
        .neq("status", "archived")
        .limit(5);

      duplicates = (data ?? []).map((row) => ({
        id: String(row.id),
        slug: String(row.slug),
        title: String(row.title),
        status: String(row.status),
      }));
    } catch {
      // Duplicate detection is best-effort; never block extraction on it.
    }
  }

  return NextResponse.json({ draft, location, duplicates });
}

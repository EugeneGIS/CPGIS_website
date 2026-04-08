import { NextResponse } from "next/server";
import { env, hasPremiumGeocoder } from "@/lib/env";
import type { AddressCandidate } from "@/lib/types";

function normalizeResults(raw: Array<Record<string, unknown>>) {
  const results: AddressCandidate[] = raw.map((item) => ({
    label:
      String(item.formatted ?? item.display_name ?? item.name ?? "Unknown place"),
    latitude: Number(item.lat ?? item.latitude),
    longitude: Number(item.lon ?? item.longitude),
    city: item.city ? String(item.city) : undefined,
    country: item.country ? String(item.country) : undefined,
  }));

  return results.filter(
    (result) =>
      Number.isFinite(result.latitude) && Number.isFinite(result.longitude),
  );
}

async function queryGeoapify(q: string) {
  const url = new URL("https://api.geoapify.com/v1/geocode/search");
  url.searchParams.set("text", q);
  url.searchParams.set("limit", "5");
  url.searchParams.set("apiKey", env.geocoderApiKey);

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
    },
    next: {
      revalidate: 3600,
    },
  });
  const payload = (await response.json()) as {
    features?: Array<{
      properties?: Record<string, unknown>;
    }>;
  };

  const flattened = (payload.features ?? []).map((feature) => ({
    ...feature.properties,
  }));

  return normalizeResults(flattened);
}

async function queryNominatim(q: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("q", q);
  url.searchParams.set("format", "jsonv2");
  url.searchParams.set("limit", "5");

  if (env.nominatimEmail) {
    url.searchParams.set("email", env.nominatimEmail);
  }

  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "cpgis-job-portal/0.1",
    },
    next: {
      revalidate: 3600,
    },
  });
  const payload = (await response.json()) as Array<Record<string, unknown>>;
  return normalizeResults(payload);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();

  if (!q) {
    return NextResponse.json(
      { error: "Missing q query parameter." },
      { status: 400 },
    );
  }

  try {
    const results =
      env.geocoderProvider === "geoapify" && hasPremiumGeocoder()
        ? await queryGeoapify(q)
        : await queryNominatim(q);

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json(
      { error: "Address lookup failed. Check your geocoder settings." },
      { status: 500 },
    );
  }
}

import { env, hasPremiumGeocoder } from "@/lib/env";
import type { AddressCandidate } from "@/lib/types";

function parsePlaceParts(label: string) {
  return label
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

export function normalizeResults(raw: Array<Record<string, unknown>>) {
  const results: AddressCandidate[] = raw.map((item) => {
    const label = String(
      item.formatted ?? item.display_name ?? item.name ?? "Unknown place",
    );
    let city = item.city ? String(item.city) : undefined;
    let country = item.country ? String(item.country) : undefined;

    // Nominatim's plain search only returns a display_name; recover city and
    // country from it so submissions always carry a complete location.
    if ((!city || !country) && label !== "Unknown place") {
      const parts = parsePlaceParts(label);

      if (!country && parts.length >= 2) {
        country = parts[parts.length - 1];
      }

      if (!city && parts.length >= 4) {
        city = parts[2];
      } else if (!city && parts.length >= 1) {
        city = parts[0];
      }
    }

    return {
      label,
      latitude: Number(item.lat ?? item.latitude),
      longitude: Number(item.lon ?? item.longitude),
      city,
      country,
    };
  });

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
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });
  const payload = (await response.json()) as {
    features?: Array<{ properties?: Record<string, unknown> }>;
  };

  return normalizeResults((payload.features ?? []).map((feature) => feature.properties ?? {}));
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
    next: { revalidate: 3600 },
  });
  const payload = (await response.json()) as Array<Record<string, unknown>>;

  return normalizeResults(payload);
}

export async function searchAddresses(q: string): Promise<AddressCandidate[]> {
  if (env.geocoderProvider === "geoapify" && hasPremiumGeocoder()) {
    return queryGeoapify(q);
  }

  return queryNominatim(q);
}

export async function bestAddress(q: string): Promise<AddressCandidate | null> {
  const [first] = await searchAddresses(q);
  return first ?? null;
}

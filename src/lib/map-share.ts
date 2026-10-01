import { z } from "zod";
import { filterJobs, isJobExpired } from "@/lib/job-filters";
import type { JobRecord, MapBounds } from "@/lib/types";

const boundsSchema = z.object({
  north: z.number().finite().min(-85).max(85),
  south: z.number().finite().min(-85).max(85),
  east: z.number().finite(),
  west: z.number().finite(),
}).refine((bounds) => bounds.north > bounds.south, "Invalid latitude range")
  .refine((bounds) => Math.abs(bounds.east - bounds.west) <= 360, "Invalid longitude range");

export const mapShareInputSchema = z.object({
  bounds: boundsSchema,
  query: z.string().trim().max(100).default(""),
  includeExpired: z.boolean().default(false),
  theme: z.enum(["light", "dark"]).default("light"),
});

export type MapShareInput = z.infer<typeof mapShareInputSchema>;

export function selectMapShareJobs(jobs: JobRecord[], input: MapShareInput, today: string) {
  const eligible = input.includeExpired
    ? jobs
    : jobs.filter((job) => !isJobExpired(job, today));

  return filterJobs(eligible.filter((job) => !job.id.startsWith("demo-")), {
    query: input.query,
    limitToViewport: true,
    bounds: input.bounds,
  });
}

export function mapShareSearch(input: MapShareInput, createdAt: string) {
  const bounds = input.bounds;
  const params = new URLSearchParams({
    b: [bounds.south, bounds.west, bounds.north, bounds.east]
      .map((value) => Number(value.toFixed(5)))
      .join(","),
    t: createdAt,
  });
  if (input.query) params.set("q", input.query);
  if (input.includeExpired) params.set("e", "1");
  if (input.theme === "dark") params.set("theme", "dark");
  return params.toString();
}

export function parseMapShareSearch(search: URLSearchParams) {
  const raw = search.get("b")?.split(",").map(Number) ?? [];
  if (raw.length !== 4 || raw.some((value) => !Number.isFinite(value))) return null;
  const [south, west, north, east] = raw;
  const parsed = mapShareInputSchema.safeParse({
    bounds: { north, south, east, west } satisfies MapBounds,
    query: search.get("q") ?? "",
    includeExpired: search.get("e") === "1",
    theme: search.get("theme") === "dark" ? "dark" : "light",
  });
  if (!parsed.success) return null;
  const time = search.get("t") ?? "";
  if (!time || !Number.isFinite(Date.parse(time))) return null;
  return { input: parsed.data, createdAt: new Date(time).toISOString() };
}

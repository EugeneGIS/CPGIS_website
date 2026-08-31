import { describe, expect, it } from "vitest";
import { parseDocxTextToImports } from "@/lib/parser";

describe("parseDocxTextToImports", () => {
  it("parses source dates, HTTP links, and explicit deadlines", () => {
    const [job] = parseDocxTextToImports(`
      20260824
      Research Fellow available at Example University https://example.org/job/42 Apply by 30 September 2026
    `);

    expect(job).toMatchObject({
      title: "Research Fellow",
      organization: "Example University",
      applicationUrl: "https://example.org/job/42",
      sourceDate: "2026-08-24",
      applyBy: "2026-09-30",
    });
  });

  it("parses deadlines written as 'apply <date>' without 'by'", () => {
    const [job] = parseDocxTextToImports(
      "Research Fellow available at Example University https://example.org/job/7 apply 6 May 2024",
    );

    expect(job).toMatchObject({
      applyBy: "2024-05-06",
      deadlineText: "apply 6 May 2024",
    });
  });

  it("keeps distinct source URLs and removes exact duplicate lines", () => {
    const jobs = parseDocxTextToImports(`
      Research Fellow available at Example University https://example.org/job/one
      Research Fellow available at Example University https://example.org/job/two
      Research Fellow available at Example University https://example.org/job/two
    `);

    expect(jobs).toHaveLength(2);
    expect(new Set(jobs.map((job) => job.slug)).size).toBe(2);
  });

  it("ignores unsupported URL schemes and unrelated lines", () => {
    const jobs = parseDocxTextToImports(`
      This is a heading, not a job.
      Research Fellow available at Example University javascript:alert(1)
      Research Fellow available at Example University ftp://example.org/job/42
    `);

    expect(jobs).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { parseCpgisCsv } from "@/lib/cpgis-csv";

describe("CPGIS weekly CSV", () => {
  it("extracts jobs, ignores non-jobs and duplicate post IDs", () => {
    const csv = [
      "推文编号,发布时间,内容,评论次数",
      '"2103565077467005434","2026-09-25 19:19:31","Postdoctoral researcher position in urban analytics available at University of Zurich https://t.co/abc123 apply by 30 September 2026",0',
      '"2103565077467005434","2026-09-25 19:19:31","duplicate",0',
      '"2103565077467005435","2026-09-25 19:19:32","Welcome to CPGIS",0',
    ].join("\n");
    const result = parseCpgisCsv(csv);
    expect(result.total).toBe(3);
    expect(result.candidates).toHaveLength(1);
    expect(result.skipped).toBe(2);
    expect(result.candidates[0].sourceId).toBe("2103565077467005434");
    expect(result.candidates[0].requiresReview).toBe(true);
  });

  it("handles quoted commas and rejects wrong headers", () => {
    const csv = '推文编号,发布时间,内容\n2103565077467005434,2026-09-25 19:19:31,"Postdoctoral position in climate, water and cities available at University of Zurich https://t.co/abc"';
    expect(parseCpgisCsv(csv).candidates).toHaveLength(1);
    expect(() => parseCpgisCsv("foo,bar\na,b")).toThrow(/Expected CPGIS columns/);
  });
});

const samplePath = process.env.CPGIS_SAMPLE_CSV;
if (samplePath) {
  it("parses the supplied weekly export", () => {
    const report = parseCpgisCsv(readFileSync(samplePath, "utf8"));
    expect(report.total).toBeGreaterThan(0);
    expect(report.candidates.length).toBeGreaterThan(0);
    expect(report.candidates.length + report.skipped).toBe(report.total);
  });
}

import { describe, expect, it } from "vitest";
import {
  isValidOptionalIsoCalendarDate,
  submitJobSchema,
} from "@/lib/schemas";

const validSubmission = {
  title: "Postdoctoral Research Fellow",
  organization: "Example University",
  summary: "A sufficiently detailed summary of this research opportunity.",
  applicationUrl: "https://example.org/jobs/42",
  city: "Zurich",
  country: "Switzerland",
  latitude: 47.3769,
  longitude: 8.5417,
  tags: ["GIS"],
};

describe("submitJobSchema application URLs", () => {
  it.each(["https://example.org/jobs/42", "http://example.org/jobs/42"])(
    "accepts %s",
    (applicationUrl) => {
      expect(
        submitJobSchema.safeParse({ ...validSubmission, applicationUrl }).success,
      ).toBe(true);
    },
  );

  it.each([
    "javascript:alert(1)",
    "data:text/html,hello",
    "ftp://example.org/jobs/42",
    "not-a-url",
  ])("rejects %s", (applicationUrl) => {
    expect(
      submitJobSchema.safeParse({ ...validSubmission, applicationUrl }).success,
    ).toBe(false);
  });
});

describe("submitJobSchema apply-by dates", () => {
  it.each(["", "2024-02-29", "2026-08-24", "2000-02-29"])(
    "accepts %s",
    (applyBy) => {
      expect(isValidOptionalIsoCalendarDate(applyBy)).toBe(true);
      expect(submitJobSchema.safeParse({ ...validSubmission, applyBy }).success).toBe(
        true,
      );
    },
  );

  it.each([
    "2023-02-29",
    "1900-02-29",
    "2026-02-30",
    "2026-04-31",
    "2026-13-01",
    "2026-00-10",
    "2026-01-00",
    "2026-1-01",
    "24-08-2026",
    "2026-08-24T00:00:00Z",
    "not-a-date",
  ])("rejects %s", (applyBy) => {
    expect(isValidOptionalIsoCalendarDate(applyBy)).toBe(false);
    expect(submitJobSchema.safeParse({ ...validSubmission, applyBy }).success).toBe(
      false,
    );
  });
});

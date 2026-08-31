import type { ImportedJobDraft } from "@/lib/types";
import { createJobSlug } from "@/lib/job-identity";

const DATE_LINE = /^20\d{6}$/;
const MONTHS: Record<string, number> = {
  jan: 1,
  january: 1,
  feb: 2,
  february: 2,
  mar: 3,
  march: 3,
  apr: 4,
  april: 4,
  may: 5,
  jun: 6,
  june: 6,
  jul: 7,
  july: 7,
  aug: 8,
  august: 8,
  sep: 9,
  sept: 9,
  september: 9,
  oct: 10,
  october: 10,
  nov: 11,
  november: 11,
  dec: 12,
  december: 12,
};

function normalizeDate(raw: string) {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
}

function isLeapYear(year: number) {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number) {
  if (month === 2) {
    return isLeapYear(year) ? 29 : 28;
  }

  return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseCalendarDate(raw: string) {
  const match = raw.match(/^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/);

  if (!match) {
    return undefined;
  }

  const day = Number(match[1]);
  const month = MONTHS[match[2].toLowerCase()];
  const year = Number(match[3]);

  if (!month || day < 1 || day > daysInMonth(year, month)) {
    return undefined;
  }

  return [year, month, day]
    .map((value, index) => String(value).padStart(index === 0 ? 4 : 2, "0"))
    .join("-");
}

function parseDeadline(raw?: string) {
  const text = raw?.trim();

  if (!text) {
    return {
      deadlineText: "Deadline not specified",
      applyBy: undefined,
    };
  }

  const lowered = text.toLowerCase();

  if (lowered.includes("until filled") || lowered.includes("open until filled")) {
    return {
      deadlineText: "Position open until filled",
      applyBy: undefined,
    };
  }

  const match = text.match(
    /\b(?:apply by|due|apply)\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i,
  );

  if (!match) {
    return {
      deadlineText: text,
      applyBy: undefined,
    };
  }

  const parsed = parseCalendarDate(match[1]);

  if (!parsed) {
    return {
      deadlineText: text,
      applyBy: undefined,
    };
  }

  return {
    deadlineText: text,
    applyBy: parsed,
  };
}

export function parseDocxTextToImports(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  let currentSourceDate: string | undefined;
  const seen = new Set<string>();
  const jobs: ImportedJobDraft[] = [];

  for (const line of lines) {
    if (DATE_LINE.test(line)) {
      currentSourceDate = normalizeDate(line);
      continue;
    }

    const match = line.match(
      /^(.*?)\s+available at\s+(.*?)\s+(https?:\/\/\S+)(?:\s+(.*))?$/i,
    );

    if (!match) {
      continue;
    }

    const title = match[1].replace(/\s+/g, " ").trim();
    const organization = match[2].replace(/\s+/g, " ").trim();
    const applicationUrl = match[3].trim();
    const deadline = parseDeadline(match[4]);
    const slug = createJobSlug({ organization, title, applicationUrl });

    if (seen.has(slug)) {
      continue;
    }

    seen.add(slug);

    jobs.push({
      id: `import-${slug}`,
      slug,
      title,
      organization,
      applicationUrl,
      deadlineText: deadline.deadlineText,
      applyBy: deadline.applyBy,
      sourceDate: currentSourceDate,
      rawText: line,
    });
  }

  return jobs;
}

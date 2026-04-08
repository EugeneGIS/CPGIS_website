import type { ImportedJobDraft } from "@/lib/types";
import { slugify } from "@/lib/utils";

const DATE_LINE = /^20\d{6}$/;

function normalizeDate(raw: string) {
  return `${raw.slice(0, 4)}-${raw.slice(4, 6)}-${raw.slice(6, 8)}`;
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
    /\b(?:apply by|due)\s+(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i,
  );

  if (!match) {
    return {
      deadlineText: text,
      applyBy: undefined,
    };
  }

  const parsed = new Date(match[1]);

  if (Number.isNaN(parsed.valueOf())) {
    return {
      deadlineText: text,
      applyBy: undefined,
    };
  }

  return {
    deadlineText: text,
    applyBy: parsed.toISOString().slice(0, 10),
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
    const slug = slugify(`${organization}-${title}`);

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

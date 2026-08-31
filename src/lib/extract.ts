/**
 * Rule-based extraction for the submit workflow. No LLM: CPGIS posts follow a
 * small set of stable formats (DOCX lines, tweet text, pasted announcements),
 * so regular expressions plus the institution table cover the pipeline and
 * flag whatever they cannot trust for staff review.
 */

export type FieldConfidence = "ok" | "uncertain" | "missing";

export interface ExtractedField<T> {
  value: T;
  confidence: FieldConfidence;
  note?: string;
}

export interface ExtractedDraft {
  title: ExtractedField<string>;
  organization: ExtractedField<string>;
  department: ExtractedField<string>;
  applicationUrl: ExtractedField<string>;
  applyBy: ExtractedField<string>;
  deadlineText: string;
  contactEmail: ExtractedField<string>;
  summary: string;
  tags: string[];
  rawText: string;
}

const CPGIS_LINE =
  /^(.*?)\s+available at\s+(.*?)\s+(https?:\/\/\S+)(?:\s+(.*))?$/i;

const URL_PATTERN = /(https?:\/\/[^\s)\]>'"]+)/i;
const EMAIL_PATTERN = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/;

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4,
  april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8,
  sep: 9, sept: 9, september: 9, oct: 10, october: 10, nov: 11, november: 11,
  dec: 12, december: 12,
};

const DATE_SHAPES = [
  // 30 September 2026 / 30 Sept 2026
  /^(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})$/,
  // September 30, 2026 / September 30 2026
  /^([A-Za-z]{3,9})\s+(\d{1,2}),?\s+(\d{4})$/,
  // 2026-09-30
  /^(\d{4})-(\d{2})-(\d{2})$/,
  // 30/09/2026 (day-first, the convention CPGIS sources use)
  /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/,
];

const DEADLINE_HINT =
  /\b(?:apply\s+by|applications?\s+(?:are\s+)?due|due|apply|deadline|clos(?:e|es|ing))\b\s*[:\-]?\s*/i;

const INSTITUTION_SUFFIX =
  /((?:[A-Z][\w'’-]*\s+){0,5}(?:University|Universität|Institute|Institut|College|School|Polytechnic|Academy|Laboratory|Laboratories|Centre|Center|CNRS|NASA|NOAA|USDA|USGS|Smithsonian|Conservancy))/;

const DEPARTMENT_PREFIX =
  /^(?:the\s+)?((?:Department|School|Faculty|Institute|Centre|Center|College|Laboratory|Lab|Research\s+Unit|Unit|Division|Group|Chair)\s+(?:of|for)\s+[^,]+),\s*(.+)$/i;

const TAG_RULES: Array<[string, string]> = [
  ["postdoctoral", "postdoc"],
  ["postdoctoral", "research"],
  ["assistant professor", "assistant professor"],
  ["associate professor", "associate professor"],
  ["professor", "faculty"],
  ["lecturer", "lecturer"],
  ["research fellow", "research fellow"],
  ["remote sensing", "remote sensing"],
  ["gis", "gis"],
  ["geospatial", "geospatial"],
  ["spatial", "spatial analysis"],
  ["urban", "urban"],
  ["climate", "climate"],
  ["ecology", "ecology"],
  ["hydrology", "hydrology"],
];

function cleanWhitespace(value: string) {
  return value.replace(/\u00a0/g, " ").normalize("NFKC").replace(/\s+/g, " ").trim();
}

function pad(value: number) {
  return String(value).padStart(2, "0");
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

function buildIsoDate(year: number, month: number, day: number) {
  if (
    year < 2000 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > daysInMonth(year, month)
  ) {
    return undefined;
  }

  return `${year}-${pad(month)}-${pad(day)}`;
}

function parseDateCandidate(raw: string): string | undefined {
  const text = cleanWhitespace(raw);

  for (const shape of DATE_SHAPES) {
    const match = text.match(shape);

    if (!match) {
      continue;
    }

    if (shape === DATE_SHAPES[0]) {
      return buildIsoDate(Number(match[3]), MONTHS[match[2].toLowerCase()] ?? 0, Number(match[1]));
    }

    if (shape === DATE_SHAPES[1]) {
      return buildIsoDate(Number(match[3]), MONTHS[match[1].toLowerCase()] ?? 0, Number(match[2]));
    }

    if (shape === DATE_SHAPES[2]) {
      return buildIsoDate(Number(match[1]), Number(match[2]), Number(match[3]));
    }

    return buildIsoDate(Number(match[3]), Number(match[2]), Number(match[1]));
  }

  return undefined;
}

function findDeadline(text: string): {
  applyBy: string;
  deadlineText: string;
  confidence: FieldConfidence;
  note?: string;
} {
  const lowered = text.toLowerCase();

  if (lowered.includes("until filled")) {
    return {
      applyBy: "",
      deadlineText: "Position open until filled",
      confidence: "ok",
    };
  }

  const hint = text.match(DEADLINE_HINT);

  if (!hint) {
    return {
      applyBy: "",
      deadlineText: "",
      confidence: "missing",
      note: "No deadline phrase found; choose a date or mark it open until filled.",
    };
  }

  const after = cleanWhitespace(text.slice((hint.index ?? 0) + hint[0].length));
  const candidateMatch = after.match(
    /^(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4}|[A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/,
  );

  if (!candidateMatch) {
    return {
      applyBy: "",
      deadlineText: cleanWhitespace(hint[0]),
      confidence: "uncertain",
      note: "A deadline is mentioned but the date format was not recognised.",
    };
  }

  const parsed = parseDateCandidate(candidateMatch[0]);

  if (!parsed) {
    return {
      applyBy: "",
      deadlineText: candidateMatch[0],
      confidence: "uncertain",
      note: "The deadline date looks invalid (for example 31 February).",
    };
  }

  return {
    applyBy: parsed,
    deadlineText: candidateMatch[0],
    confidence: "ok",
  };
}

function guessOrganization(text: string): string | null {
  const atThe = text.match(/\bat\s+the\s+([A-Z][^,.!?]{3,90})/);
  if (atThe) {
    return cleanWhitespace(atThe[1]);
  }

  const suffixed = text.match(INSTITUTION_SUFFIX);
  if (suffixed) {
    return cleanWhitespace(suffixed[1]);
  }

  return null;
}

function guessTitle(text: string): string {
  const firstLine = text.split(/\r?\n/).map(cleanWhitespace).find(Boolean) ?? "";
  const firstSentence = firstLine.split(/(?<=[.!?])\s/)[0] ?? firstLine;

  return cleanWhitespace(firstSentence.replace(/^[-–•*\s]+/, "")).slice(0, 180);
}

export function splitDepartment(organization: string): {
  department: string;
  organization: string;
} {
  const match = cleanWhitespace(organization).match(DEPARTMENT_PREFIX);

  if (!match) {
    return { department: "", organization: cleanWhitespace(organization) };
  }

  return {
    department: cleanWhitespace(match[1]),
    organization: cleanWhitespace(match[2]),
  };
}

export function inferTags(title: string): string[] {
  const lowered = title.toLowerCase();
  const tags: string[] = [];

  for (const [needle, tag] of TAG_RULES) {
    if (lowered.includes(needle) && !tags.includes(tag)) {
      tags.push(tag);
    }
  }

  return tags.slice(0, 4);
}

export function buildSummary(title: string, organization: string) {
  const cleanTitle = cleanWhitespace(title);
  const cleanOrganization = cleanWhitespace(organization);
  const summary = `${cleanTitle} available at ${cleanOrganization}.`;

  return summary.length >= 24
    ? summary
    : `${summary} See the application link for details.`.slice(0, 1200);
}

export function extractJobFromText(rawText: string): ExtractedDraft {
  const text = cleanWhitespace(rawText);
  const lineMatch = text.match(CPGIS_LINE);

  let title = "";
  let organization = "";
  let applicationUrl = "";
  let titleConfidence: FieldConfidence = "missing";
  let organizationConfidence: FieldConfidence = "missing";

  if (lineMatch) {
    title = cleanWhitespace(lineMatch[1]);
    organization = cleanWhitespace(lineMatch[2]);
    applicationUrl = cleanWhitespace(lineMatch[3]);
    titleConfidence = "ok";
    organizationConfidence = "ok";
  } else {
    title = guessTitle(text);
    titleConfidence = title.length >= 8 ? "uncertain" : "missing";
    if (titleConfidence === "missing") {
      title = "";
    }

    const guessedOrganization = guessOrganization(text);
    if (guessedOrganization) {
      organization = guessedOrganization;
      organizationConfidence = "uncertain";
    }

    const urlMatch = text.match(URL_PATTERN);
    if (urlMatch) {
      applicationUrl = cleanWhitespace(urlMatch[0]);
    }
  }

  const emailMatch = text.match(EMAIL_PATTERN);
  const deadline = findDeadline(text);
  const { department, organization: organizationWithoutDepartment } =
    splitDepartment(organization);

  return {
    title: {
      value: title,
      confidence: titleConfidence,
      note:
        titleConfidence === "ok"
          ? undefined
          : "Taken from the first line of the pasted text; double-check the wording.",
    },
    organization: {
      value: organizationWithoutDepartment,
      confidence: organizationConfidence,
      note:
        organizationConfidence === "ok"
          ? undefined
          : "Guessed from institution-like wording; confirm school and department.",
    },
    department: {
      value: department,
      confidence: department ? "ok" : "missing",
    },
    applicationUrl: {
      value: applicationUrl,
      confidence: applicationUrl ? "ok" : "missing",
      note: applicationUrl
        ? undefined
        : "No application link found; paste the URL before submitting.",
    },
    applyBy: {
      value: deadline.applyBy,
      confidence: deadline.confidence,
      note: deadline.note,
    },
    deadlineText: deadline.deadlineText,
    contactEmail: {
      value: emailMatch ? emailMatch[0] : "",
      confidence: emailMatch ? "ok" : "missing",
    },
    summary: buildSummary(title, organizationWithoutDepartment),
    tags: inferTags(title),
    rawText: text,
  };
}

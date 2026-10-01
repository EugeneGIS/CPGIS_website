import { extractJobFromText } from "@/lib/extract";

export interface CpgisCsvCandidate {
  sourceId: string;
  postedAt: string;
  rawText: string;
  title: string;
  organization: string;
  department: string;
  applicationUrl: string;
  applyBy: string;
  requiresReview: boolean;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') {
      if (field) throw new Error("Malformed CSV quoting.");
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") field += char;
  }
  if (quoted) throw new Error("Unclosed CSV quote.");
  if (field || row.length) rows.push([...row, field]);
  return rows;
}

export function parseCpgisCsv(text: string) {
  const rows = parseCsv(text.replace(/^\uFEFF/, ""));
  const header = rows.shift()?.map((value) => value.trim()) ?? [];
  const idIndex = header.indexOf("推文编号");
  const dateIndex = header.indexOf("发布时间");
  const contentIndex = header.indexOf("内容");
  if ([idIndex, dateIndex, contentIndex].some((index) => index < 0)) {
    throw new Error("Expected CPGIS columns: 推文编号, 发布时间, 内容.");
  }
  const seen = new Set<string>();
  const candidates: CpgisCsvCandidate[] = [];
  let skipped = 0;
  for (const row of rows) {
    if (row.length !== header.length) throw new Error("A CSV row has the wrong number of columns.");
    const sourceId = row[idIndex].trim();
    const postedAt = row[dateIndex].trim();
    const rawText = row[contentIndex].trim();
    if (!/^\d{8,25}$/.test(sourceId) || !/^\d{4}-\d{2}-\d{2} /.test(postedAt)) {
      throw new Error("Invalid post ID or publication date in CSV.");
    }
    if (seen.has(sourceId)) { skipped += 1; continue; }
    seen.add(sourceId);
    const draft = extractJobFromText(rawText);
    if (!/\bavailable at\b/i.test(rawText) || !draft.title.value || !draft.organization.value || !draft.applicationUrl.value) {
      skipped += 1;
      continue;
    }
    candidates.push({
      sourceId,
      postedAt,
      rawText,
      title: draft.title.value,
      organization: draft.organization.value,
      department: draft.department.value,
      applicationUrl: draft.applicationUrl.value,
      applyBy: draft.applyBy.value,
      requiresReview: /https?:\/\/t\.co\//i.test(draft.applicationUrl.value) || draft.title.confidence !== "ok" || draft.organization.confidence !== "ok",
    });
  }
  return { candidates, skipped, total: rows.length };
}

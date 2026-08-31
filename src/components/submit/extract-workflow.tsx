"use client";

import { useMemo, useState, useTransition } from "react";
import { SingleJobMap } from "@/components/map/single-job-map";
import type { ExtractedField } from "@/lib/extract";
import type { AddressCandidate, JobLocation, SessionContext } from "@/lib/types";
import { buildSocialDrafts } from "@/lib/social-drafts";
import { cn, formatDateLabel } from "@/lib/utils";

interface ExtractApiResponse {
  draft: {
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
  };
  location:
    | {
        source: "reviewed-table" | "geocoder" | "none";
        confidence: "ok" | "uncertain" | "missing";
        location?: JobLocation;
        label?: string;
        matched?: { city: string; country: string; address: string };
      };
  duplicates: Array<{ id: string; slug: string; title: string; status: string }>;
}

interface DocxRow {
  id: string;
  title: string;
  organization: string;
  rawText: string;
}

interface WorkflowFields {
  title: string;
  organization: string;
  department: string;
  applicationUrl: string;
  applyBy: string;
  deadlineText: string;
  contactEmail: string;
  summary: string;
  tags: string;
}

const EMPTY_FIELDS: WorkflowFields = {
  title: "",
  organization: "",
  department: "",
  applicationUrl: "",
  applyBy: "",
  deadlineText: "",
  contactEmail: "",
  summary: "",
  tags: "",
};

const SAMPLE_TEXT =
  "Postdoctoral researcher position in urban climate resilience available at the Department of Geography, University of Zurich https://example.org/jobs/42 Apply by 30 October 2026. Contact jobs@geo.uzh.ch";

export function ExtractWorkflow({ session }: { session: SessionContext }) {
  const [mode, setMode] = useState<"input" | "verify">("input");
  const [text, setText] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [docxRows, setDocxRows] = useState<DocxRow[]>([]);
  const [confidence, setConfidence] = useState<Record<string, ExtractedField<string>["confidence"]>>({});
  const [fieldNotes, setFieldNotes] = useState<Record<string, string>>({});
  const [fields, setFields] = useState<WorkflowFields>(EMPTY_FIELDS);
  const [location, setLocation] = useState<JobLocation | null>(null);
  const [locationSource, setLocationSource] = useState<"reviewed-table" | "geocoder" | "manual" | "none">("none");
  const [duplicates, setDuplicates] = useState<ExtractApiResponse["duplicates"]>([]);
  const [candidates, setCandidates] = useState<AddressCandidate[]>([]);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState<{
    status: "draft" | "pending";
    slug?: string;
  } | null>(null);
  const [isWorking, startWork] = useTransition();

  const socialDrafts = useMemo(
    () =>
      fields.title && fields.applicationUrl
        ? buildSocialDrafts({
            title: fields.title,
            organization: fields.organization,
            applicationUrl: fields.applicationUrl,
            applyBy: fields.applyBy || undefined,
            city: location?.city,
            country: location?.country,
          })
        : null,
    [fields, location],
  );

  const requiredMissing =
    !fields.title ||
    !fields.organization ||
    !fields.applicationUrl ||
    !location ||
    !location.city ||
    !location.country;

  function applyExtraction(result: ExtractApiResponse) {
    setFields({
      title: result.draft.title.value,
      organization: result.draft.organization.value,
      department: result.draft.department.value,
      applicationUrl: result.draft.applicationUrl.value,
      applyBy: result.draft.applyBy.value,
      deadlineText: result.draft.deadlineText,
      contactEmail: result.draft.contactEmail.value,
      summary: result.draft.summary,
      tags: result.draft.tags.join(", "),
    });

    const notes: Record<string, string> = {};
    for (const key of ["title", "organization", "applicationUrl", "applyBy", "contactEmail"] as const) {
      const entry = result.draft[key] as ExtractedField<string>;
      if (entry.note) {
        notes[key] = entry.note;
      }
    }
    setFieldNotes(notes);
    setConfidence({
      title: result.draft.title.confidence,
      organization: result.draft.organization.confidence,
      applicationUrl: result.draft.applicationUrl.confidence,
      applyBy: result.draft.applyBy.confidence,
      contactEmail: result.draft.contactEmail.confidence,
    });

    if (result.location.location) {
      setLocation(result.location.location);
    } else {
      setLocation(null);
    }
    setLocationSource(result.location.source === "none" ? "none" : result.location.source);
    setDuplicates(result.duplicates);
    setCandidates([]);
    setMessage("");
    setMode("verify");
  }

  function handleExtract() {
    setMessage("");

    startWork(async () => {
      try {
        const response = await fetch("/api/extract", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text, sourceUrl }),
        });
        const payload = (await response.json()) as ExtractApiResponse & { error?: string };

        if (!response.ok) {
          setMessage(payload.error ?? "Could not extract the job details.");
          return;
        }

        applyExtraction(payload);
      } catch {
        setMessage("Extraction failed because the server was unavailable.");
      }
    });
  }

  function handleDocxUpload(file: File) {
    setMessage("");
    setDocxRows([]);

    startWork(async () => {
      try {
        const formData = new FormData();
        formData.append("file", file);

        const response = await fetch("/api/import/docx", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json()) as {
          imports?: DocxRow[];
          error?: string;
        };

        if (!response.ok) {
          setMessage(payload.error ?? "DOCX import failed.");
          return;
        }

        setDocxRows(payload.imports ?? []);
      } catch {
        setMessage("DOCX import failed because the server was unavailable.");
      }
    });
  }

  function loadDocxRow(row: DocxRow) {
    setText(row.rawText);
    setDocxRows([]);
  }

  function updateField<K extends keyof WorkflowFields>(key: K, value: string) {
    setFields((current) => ({ ...current, [key]: value }));

    // Staff edits clear the uncertainty flag for that field.
    setConfidence((current) => ({ ...current, [key]: "ok" }));
  }

  function handleManualLookup() {
    const query = fields.organization || fields.title;

    if (!query) {
      setMessage("Enter an organization or title before looking up coordinates.");
      return;
    }

    startWork(async () => {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const payload = (await response.json()) as {
        results?: AddressCandidate[];
        error?: string;
      };

      if (!response.ok) {
        setMessage(payload.error ?? "Address lookup failed.");
        return;
      }

      setCandidates(payload.results ?? []);
    });
  }

  function applyCandidate(candidate: AddressCandidate) {
    setLocation({
      label: [candidate.city, candidate.country].filter(Boolean).join(", "),
      city: candidate.city ?? "",
      country: candidate.country ?? "",
      latitude: candidate.latitude,
      longitude: candidate.longitude,
    });
    setLocationSource("manual");
    setCandidates([]);
  }

  function handleSave(status: "draft" | "pending") {
    if (!location) {
      setMessage("Resolve the location before saving.");
      return;
    }

    setMessage("");

    startWork(async () => {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fields.title,
          organization: fields.organization,
          department: fields.department,
          summary: fields.summary,
          description: text,
          applicationUrl: fields.applicationUrl,
          contactEmail: fields.contactEmail,
          city: location.city,
          country: location.country,
          address: location.address ?? "",
          latitude: location.latitude,
          longitude: location.longitude,
          applyBy: fields.applyBy,
          deadlineText:
            fields.deadlineText ||
            (fields.applyBy
              ? `Apply by ${formatDateLabel(fields.applyBy)}`
              : "Open until filled"),
          tags: fields.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
          importSource: "paste-extract",
          status,
        }),
      });

      const payload = (await response.json()) as {
        message?: string;
        error?: string;
        job?: { slug?: string };
      };

      if (!response.ok) {
        setMessage(payload.error ?? "Could not save the job.");
        return;
      }

      setSaved({ status, slug: payload.job?.slug });

      if (session.mode !== "demo") {
        setText("");
        setSourceUrl("");
        setFields(EMPTY_FIELDS);
        setLocation(null);
        setLocationSource("none");
        setDuplicates([]);
      }
    });
  }

  function resetAll() {
    setSaved(null);
    setMessage("");
    setMode("input");
    setText("");
    setSourceUrl("");
    setFields(EMPTY_FIELDS);
    setLocation(null);
    setLocationSource("none");
    setDuplicates([]);
  }

  if (mode === "input") {
    return (
      <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Step 1 · Paste the announcement
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Paste a job link or text — we extract the rest
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          Paste the job announcement exactly as posted (a CPGIS-style line, a
          tweet, or the ad text). Titles, institutions, deadlines, contacts,
          and tags are extracted automatically; campus coordinates come from
          the reviewed institution table. You only check the fields the system
          is unsure about.
        </p>

        <textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          rows={6}
          placeholder={SAMPLE_TEXT}
          className="mt-5 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900 outline-none transition focus:border-cyan-500"
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">
              Optional source link
            </span>
            <input
              value={sourceUrl}
              onChange={(event) => setSourceUrl(event.target.value)}
              placeholder="https://twitter.com/... or the job page"
              className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
            />
          </label>

          <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700">
            Upload DOCX
            <input
              type="file"
              accept=".docx"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  handleDocxUpload(file);
                }
              }}
            />
          </label>

          <button
            type="button"
            onClick={handleExtract}
            disabled={isWorking || text.trim().length < 15}
            className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-wait disabled:bg-slate-700"
          >
            {isWorking ? "Extracting…" : "Extract details"}
          </button>
        </div>

        {docxRows.length > 0 ? (
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">
              {docxRows.length} postings parsed from the document — pick one
            </p>
            <div className="mt-3 grid max-h-72 gap-2 overflow-auto pr-1">
              {docxRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => loadDocxRow(row)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-cyan-400"
                >
                  <div className="text-sm font-semibold text-slate-900 line-clamp-1">
                    {row.title}
                  </div>
                  <div className="mt-1 text-xs text-slate-500 line-clamp-1">
                    {row.organization}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {message ? (
          <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
            {message}
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {saved ? (
        <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
          <div className="flex items-start gap-4">
            <span
              aria-hidden
              className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-lg font-bold text-white"
            >
              ✓
            </span>
            <div className="min-w-0">
              <h2 className="text-2xl font-semibold text-emerald-900">
                {saved.status === "pending"
                  ? "Submitted for review"
                  : "Draft saved"}
              </h2>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-emerald-800">
                {session.mode === "demo" ? (
                  <>
                    Demo mode: the payload validated successfully — this is
                    exactly what would be stored. Once Supabase is connected,
                    this record enters the admin review queue as{" "}
                    <strong>Pending review</strong> with the fields you just
                    verified.
                  </>
                ) : saved.status === "pending" ? (
                  "The record is now in the admin review queue as Pending review. Admins will check it, prepare the social posts, and publish it."
                ) : (
                  "The draft is saved and stays private. Submit it for review from your drafts whenever it is ready."
                )}
              </p>

              <div className="mt-4 flex flex-wrap gap-2 text-xs text-emerald-900">
                <span className="rounded-full bg-white px-3 py-1">
                  {fields.title}
                </span>
                <span className="rounded-full bg-white px-3 py-1">
                  {location?.label ?? ""}
                </span>
                {saved.slug ? (
                  <span className="rounded-full bg-white px-3 py-1 font-mono">
                    {saved.slug}
                  </span>
                ) : null}
              </div>

              <button
                type="button"
                onClick={resetAll}
                className="mt-5 rounded-full bg-emerald-700 px-6 py-3 text-sm font-semibold text-white transition hover:bg-emerald-800"
              >
                Submit another posting
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!saved && duplicates.length > 0 ? (
        <div className="rounded-[28px] border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900 shadow-[0_24px_70px_rgba(15,23,42,0.06)]">
          <p className="font-semibold">Possible duplicate posting</p>
          <p className="mt-1 leading-6">
            The same application link already exists{" "}
            {duplicates.map((duplicate, index) => (
              <span key={duplicate.id}>
                {index > 0 ? ", " : ""}
                “{duplicate.title}” ({duplicate.status})
              </span>
            ))}
            . Continue only if this is genuinely a new opening.
          </p>
        </div>
      ) : null}

      {!saved ? (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
                Step 2 · Check uncertain fields
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-slate-950">
                Verify and correct
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setMode("input")}
              className="rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:border-cyan-400 hover:text-cyan-700"
            >
              Start over
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <WorkflowField
              label="Job title"
              required
              confidence={confidence.title}
              note={fieldNotes.title}
              value={fields.title}
              onChange={(value) => updateField("title", value)}
            />
            <WorkflowField
              label="Organization"
              required
              confidence={confidence.organization}
              note={fieldNotes.organization}
              value={fields.organization}
              onChange={(value) => updateField("organization", value)}
            />
            <WorkflowField
              label="Department"
              value={fields.department}
              onChange={(value) => updateField("department", value)}
            />
            <WorkflowField
              label="Application URL"
              required
              confidence={confidence.applicationUrl}
              note={fieldNotes.applicationUrl}
              value={fields.applicationUrl}
              onChange={(value) => updateField("applicationUrl", value)}
            />
            <WorkflowField
              label="Application deadline"
              type="date"
              confidence={confidence.applyBy}
              note={fieldNotes.applyBy}
              value={fields.applyBy}
              onChange={(value) => updateField("applyBy", value)}
            />
            <WorkflowField
              label="Contact email"
              confidence={confidence.contactEmail}
              value={fields.contactEmail}
              onChange={(value) => updateField("contactEmail", value)}
            />
            <div className="md:col-span-2">
              <WorkflowField
                label="Tags (comma separated)"
                value={fields.tags}
                onChange={(value) => updateField("tags", value)}
              />
            </div>
            <div className="md:col-span-2">
              <WorkflowField
                label="Public summary"
                required
                multiline
                value={fields.summary}
                onChange={(value) => updateField("summary", value)}
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">Location</p>
                <p className="mt-1 text-xs text-slate-500">
                  {location
                    ? `${location.label} · ${
                        location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`
                    : "No coordinates yet"}
                </p>
              </div>
              <LocationSourceBadge source={locationSource} />
            </div>

            {location ? (
              <p className="mt-2 text-xs text-slate-500">
                {locationSource === "reviewed-table"
                  ? "Matched from the reviewed institution table — trusted campus coordinates."
                  : locationSource === "geocoder"
                    ? "Geocoder suggestion — verify the city and country before submitting."
                    : "Manually selected candidate."}
              </p>
            ) : (
              <div className="mt-3 flex flex-wrap items-end gap-3">
                <button
                  type="button"
                  onClick={handleManualLookup}
                  disabled={isWorking}
                  className="rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700 disabled:cursor-wait disabled:opacity-60"
                >
                  {isWorking ? "Searching…" : "Look up coordinates"}
                </button>
                <p className="text-xs text-slate-500">
                  No trusted match — search by organization name and pick the right place.
                </p>
              </div>
            )}

            {candidates.length > 0 ? (
              <div className="mt-3 grid gap-2">
                {candidates.map((candidate) => (
                  <button
                    key={`${candidate.label}-${candidate.latitude}`}
                    type="button"
                    onClick={() => applyCandidate(candidate)}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-cyan-400"
                  >
                    <div className="text-sm font-semibold text-slate-900">
                      {candidate.label}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      {candidate.latitude.toFixed(4)}, {candidate.longitude.toFixed(4)}
                    </div>
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          {message ? (
            <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
              {message}
            </div>
          ) : null}

          {requiredMissing ? (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-900">
              <strong>Cannot submit yet:</strong> title, organization,
              application URL, and a resolved location are required. If the
              location above is missing, use “Look up coordinates” and pick
              the right place — the buttons unlock as soon as it is set.
            </div>
          ) : null}

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => handleSave("pending")}
              disabled={isWorking || requiredMissing}
              className="rounded-full bg-slate-950 px-6 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500"
            >
              {isWorking ? "Saving…" : "Submit for review"}
            </button>
            <button
              type="button"
              onClick={() => handleSave("draft")}
              disabled={isWorking || requiredMissing}
              className="rounded-full border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-400"
            >
              Save as draft
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
              Page preview
            </p>
            <h3 className="mt-2 text-balance text-lg font-semibold leading-7 text-slate-950">
              {fields.title || "Job title"}
            </h3>
            <p className="mt-1 text-sm text-slate-600">
              {fields.organization || "Organization"}
              {fields.department ? ` · ${fields.department}` : ""}
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1">
                {location?.label ?? "Location pending"}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1">
                Deadline: {fields.applyBy ? formatDateLabel(fields.applyBy) : "Open until filled"}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-700">
              {fields.summary || "Summary appears here as you type."}
            </p>
          </div>

          {location ? (
            <SingleJobMap location={location} organization={fields.organization} />
          ) : null}

          {socialDrafts ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cpgis-deep">
                Social drafts
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Generated for Facebook and X — copy when the job is ready to announce.
              </p>

              <CopyBlock label="X post" value={socialDrafts.x} />
              <CopyBlock label="Facebook post" value={socialDrafts.facebook} />
            </div>
          ) : null}
        </div>
      </div>
      ) : null}
    </div>
  );
}

function WorkflowField({
  label,
  value,
  onChange,
  confidence,
  note,
  required,
  multiline,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  confidence?: ExtractedField<string>["confidence"];
  note?: string;
  required?: boolean;
  multiline?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="flex flex-wrap items-center gap-2 text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="text-rose-500">*</span> : null}
        {confidence ? <ConfidenceBadge confidence={confidence} optional={!required && label.includes("email")} /> : null}
      </span>
      {multiline ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          rows={4}
          className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm leading-6 text-slate-900 outline-none transition focus:border-cyan-500"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={cn(
            "mt-2 w-full rounded-xl border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500",
            confidence === "missing" && required
              ? "border-rose-300 bg-rose-50/40"
              : "border-slate-300",
          )}
        />
      )}
      {note ? <span className="mt-1 block text-xs text-slate-500">{note}</span> : null}
    </label>
  );
}

function ConfidenceBadge({
  confidence,
  optional,
}: {
  confidence: ExtractedField<string>["confidence"];
  optional?: boolean;
}) {
  if (confidence === "ok") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
        Auto-filled
      </span>
    );
  }

  if (confidence === "uncertain") {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700">
        Check this
      </span>
    );
  }

  return (
    <span
      className={cn(
        "rounded-full border px-2 py-0.5 text-[11px] font-semibold",
        optional
          ? "border-slate-200 bg-slate-50 text-slate-500"
          : "border-rose-200 bg-rose-50 text-rose-600",
      )}
    >
      {optional ? "Optional" : "Needed"}
    </span>
  );
}

function LocationSourceBadge({ source }: { source: string }) {
  if (source === "reviewed-table") {
    return (
      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
        Reviewed campus table
      </span>
    );
  }

  if (source === "geocoder") {
    return (
      <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-semibold text-amber-700">
        Geocoder — verify
      </span>
    );
  }

  if (source === "manual") {
    return (
      <span className="rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-[11px] font-semibold text-cyan-700">
        Manual pick
      </span>
    );
  }

  return (
    <span className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-semibold text-rose-600">
      Missing
    </span>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
          {label}
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-slate-700">
        {value}
      </p>
    </div>
  );
}

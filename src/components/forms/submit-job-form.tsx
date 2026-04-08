"use client";

import { useState, useTransition } from "react";
import type { AddressCandidate, SessionContext } from "@/lib/types";

const emptyState = {
  title: "",
  organization: "",
  department: "",
  summary: "",
  description: "",
  applicationUrl: "",
  contactEmail: "",
  city: "",
  country: "",
  address: "",
  latitude: "",
  longitude: "",
  applyBy: "",
  deadlineText: "",
  tags: "",
};

export function SubmitJobForm({ session }: { session: SessionContext }) {
  const [draft, setDraft] = useState(emptyState);
  const [candidates, setCandidates] = useState<AddressCandidate[]>([]);
  const [status, setStatus] = useState("");
  const [isSubmitting, startSubmit] = useTransition();
  const [isSearching, startSearch] = useTransition();

  function updateField(field: keyof typeof emptyState, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function handleGeocode() {
    const query = [draft.address, draft.city, draft.country]
      .map((value) => value.trim())
      .filter(Boolean)
      .join(", ");

    if (!query) {
      setStatus("Enter an address, city, or country first.");
      return;
    }

    setStatus("");

    startSearch(async () => {
      const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`);
      const payload = (await response.json()) as {
        results?: AddressCandidate[];
        error?: string;
      };

      if (!response.ok) {
        setStatus(payload.error ?? "Address lookup failed.");
        return;
      }

      setCandidates(payload.results ?? []);
    });
  }

  function applyCandidate(candidate: AddressCandidate) {
    setDraft((current) => ({
      ...current,
      city: candidate.city ?? current.city,
      country: candidate.country ?? current.country,
      latitude: String(candidate.latitude),
      longitude: String(candidate.longitude),
    }));
    setCandidates([]);
  }

  function handleSubmit() {
    setStatus("");

    startSubmit(async () => {
      const response = await fetch("/api/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...draft,
          tags: draft.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      const payload = (await response.json()) as { message?: string; error?: string };

      if (!response.ok) {
        setStatus(payload.error ?? "Could not submit the job.");
        return;
      }

      setStatus(payload.message ?? "Job submitted.");

      if (session.mode === "demo") {
        return;
      }

      setDraft(emptyState);
      setCandidates([]);
    });
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Submission form
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Upload a new opportunity
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          In demo mode this validates and previews the payload without persistent
          storage. Once Supabase is connected, signed-in members can submit jobs
          as pending records and admins can review or publish them.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Field
          label="Job title"
          value={draft.title}
          onChange={(value) => updateField("title", value)}
          placeholder="Assistant professor in GIScience"
        />
        <Field
          label="Organization"
          value={draft.organization}
          onChange={(value) => updateField("organization", value)}
          placeholder="Department / university / institute"
        />
        <Field
          label="Department"
          value={draft.department}
          onChange={(value) => updateField("department", value)}
          placeholder="Optional"
        />
        <Field
          label="Application URL"
          value={draft.applicationUrl}
          onChange={(value) => updateField("applicationUrl", value)}
          placeholder="https://..."
        />
        <Field
          label="Contact email"
          value={draft.contactEmail}
          onChange={(value) => updateField("contactEmail", value)}
          placeholder="Optional"
        />
        <Field
          label="Deadline"
          type="date"
          value={draft.applyBy}
          onChange={(value) => updateField("applyBy", value)}
          placeholder=""
        />
        <div className="md:col-span-2">
          <TextArea
            label="Summary"
            value={draft.summary}
            onChange={(value) => updateField("summary", value)}
            placeholder="Short public summary that appears in the list and detail card."
          />
        </div>
        <div className="md:col-span-2">
          <TextArea
            label="Extended description"
            value={draft.description}
            onChange={(value) => updateField("description", value)}
            placeholder="Optional longer description."
          />
        </div>
        <Field
          label="Address"
          value={draft.address}
          onChange={(value) => updateField("address", value)}
          placeholder="Street / campus / building"
        />
        <Field
          label="City"
          value={draft.city}
          onChange={(value) => updateField("city", value)}
          placeholder="Zurich"
        />
        <Field
          label="Country"
          value={draft.country}
          onChange={(value) => updateField("country", value)}
          placeholder="Switzerland"
        />
        <Field
          label="Tags"
          value={draft.tags}
          onChange={(value) => updateField("tags", value)}
          placeholder="postdoc, gis, remote sensing"
        />
      </div>

      <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2">
            <Field
              label="Latitude"
              value={draft.latitude}
              onChange={(value) => updateField("latitude", value)}
              placeholder="47.3769"
            />
            <Field
              label="Longitude"
              value={draft.longitude}
              onChange={(value) => updateField("longitude", value)}
              placeholder="8.5417"
            />
          </div>
          <button
            type="button"
            onClick={handleGeocode}
            disabled={isSearching}
            className="rounded-full border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-cyan-400 hover:text-cyan-700 disabled:cursor-wait disabled:opacity-60"
          >
            {isSearching ? "Finding coordinates" : "Lookup coordinates"}
          </button>
        </div>

        {candidates.length > 0 ? (
          <div className="mt-3 grid gap-2">
            {candidates.map((candidate) => (
              <button
                key={`${candidate.label}-${candidate.latitude}-${candidate.longitude}`}
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

      {status ? (
        <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          {status}
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-wait disabled:bg-slate-700"
        >
          {isSubmitting ? "Submitting…" : "Submit opportunity"}
        </button>
        {session.user ? (
          <div className="self-center text-sm text-slate-500">
            Signed in as {session.user.email}
          </div>
        ) : (
          <div className="self-center text-sm text-slate-500">
            Public demo mode. Sign in after Supabase setup to persist submissions.
          </div>
        )}
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
      />
    </label>
  );
}

function TextArea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        rows={5}
        className="mt-2 w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-cyan-500"
      />
    </label>
  );
}

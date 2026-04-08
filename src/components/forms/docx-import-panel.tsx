"use client";

import { useState, useTransition } from "react";
import type { ImportedJobDraft } from "@/lib/types";

export function DocxImportPanel() {
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<ImportedJobDraft[]>([]);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleUpload() {
    if (!file) {
      setMessage("Choose a .docx file first.");
      return;
    }

    setMessage("");

    startTransition(async () => {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/import/docx", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as {
        imports?: ImportedJobDraft[];
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        setMessage(payload.error ?? "Import failed.");
        return;
      }

      setResults(payload.imports ?? []);
      setMessage(payload.message ?? "Parsed the document.");
    });
  }

  return (
    <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Bulk import
        </p>
        <h2 className="mt-2 text-2xl font-semibold text-slate-950">
          Parse CPGIS-style DOCX job lists
        </h2>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-600">
          This importer reads the text-heavy `.docx` format you shared, extracts
          rows that follow the “available at … URL … deadline” pattern, and
          prepares them for admin review.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".doc,.docx"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          className="max-w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700"
        />
        <button
          type="button"
          onClick={handleUpload}
          disabled={isPending}
          className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-wait disabled:bg-slate-700"
        >
          {isPending ? "Parsing…" : "Parse DOCX"}
        </button>
      </div>

      {message ? (
        <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-900">
          {message}
        </div>
      ) : null}

      {results.length > 0 ? (
        <div className="mt-6 space-y-3">
          {results.map((result) => (
            <div
              key={result.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="text-base font-semibold text-slate-950">
                {result.title}
              </div>
              <div className="mt-1 text-sm text-slate-600">{result.organization}</div>
              <div className="mt-2 flex flex-wrap gap-3 text-xs uppercase tracking-[0.18em] text-slate-500">
                <span>{result.sourceDate ?? "Unknown date"}</span>
                <span>{result.deadlineText}</span>
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

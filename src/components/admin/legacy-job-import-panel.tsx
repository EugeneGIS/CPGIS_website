"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface BatchResult {
  total: number;
  processed: number;
  inserted: number;
  existing: number;
  nextOffset: number;
  error?: string;
}

export function LegacyJobImportPanel({ total }: { total: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [processed, setProcessed] = useState(0);
  const [inserted, setInserted] = useState(0);
  const [existing, setExisting] = useState(0);
  const [message, setMessage] = useState("");

  async function importJobs() {
    if (!window.confirm(`Import ${total.toLocaleString()} historical jobs? Existing slugs will be left unchanged. Expired jobs will be hidden from the jobs map by default.`)) {
      return;
    }

    setBusy(true);
    setProcessed(0);
    setInserted(0);
    setExisting(0);
    setMessage("");

    let nextOffset = 0;
    let insertedCount = 0;
    let existingCount = 0;

    try {
      while (nextOffset < total) {
        const response = await fetch("/api/admin/import-legacy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ offset: nextOffset }),
        });
        const result = (await response.json()) as BatchResult;

        if (!response.ok) {
          throw new Error(result.error ?? "Import stopped unexpectedly.");
        }
        if (
          result.total !== total ||
          result.nextOffset <= nextOffset ||
          result.processed !== result.inserted + result.existing
        ) {
          throw new Error("The import response was incomplete. Please retry.");
        }

        nextOffset = result.nextOffset;
        insertedCount += result.inserted;
        existingCount += result.existing;
        setProcessed(nextOffset);
        setInserted(insertedCount);
        setExisting(existingCount);
      }

      setMessage(`Import complete: ${insertedCount.toLocaleString()} new jobs, ${existingCount.toLocaleString()} already present. Historical records remain in the database; expired jobs are hidden from the current jobs map by default.`);
      router.refresh();
    } catch (error) {
      setMessage(`${error instanceof Error ? error.message : "Import stopped."} Already imported batches are safe; use the button again to resume without duplicates.`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cpgis-deep">One-time data migration</p>
      <h2 className="mt-2 text-2xl font-semibold text-slate-950">Import historical CPGIS jobs</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Move all {total.toLocaleString()} records from the bundled DOCX dataset into Supabase.
        This imports in small batches and never overwrites jobs with the same slug.
        Original publication dates are preserved, so expired jobs are hidden by default.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={importJobs}
          className="rounded-full bg-cpgis-deep px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Importing..." : "Import historical jobs"}
        </button>
        {processed > 0 && (
          <span className="text-sm text-slate-600" role="status">
            {processed.toLocaleString()} / {total.toLocaleString()} checked; {inserted.toLocaleString()} new, {existing.toLocaleString()} existing
          </span>
        )}
      </div>
      {busy && (
        <progress className="mt-4 block w-full max-w-lg accent-cpgis-deep" value={processed} max={total} aria-label="Historical job import progress" />
      )}
      {message && <p role="status" className="mt-4 rounded-xl bg-cpgis-ice p-3 text-sm text-cpgis-ink">{message}</p>}
    </section>
  );
}

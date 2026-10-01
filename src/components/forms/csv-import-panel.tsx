"use client";

import Link from "next/link";
import { useState } from "react";
import type { CpgisCsvCandidate } from "@/lib/cpgis-csv";

export function CsvImportPanel({ initialRows }: { initialRows: CpgisCsvCandidate[] }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState(initialRows);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) { setMessage("Choose a CSV file first."); return; }
    setBusy(true);
    setMessage("");
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/import/csv", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "CSV upload failed.");
      setMessage(`${data.imported} new posts queued; ${data.existing} already present; ${data.skipped} non-job or duplicate rows skipped. Refresh to see the latest queue.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "CSV upload failed.");
    } finally { setBusy(false); }
  }

  async function mark(sourceId: string, status: "reviewed" | "ignored") {
    const response = await fetch("/api/import/csv", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ sourceId, status }) });
    if (!response.ok) { setMessage("Could not update this queue item."); return; }
    setRows((current) => current.filter((row) => row.sourceId !== sourceId));
  }

  return <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-cpgis-deep">Weekly CSV intake</p>
    <h2 className="mt-2 text-2xl font-semibold text-slate-950">Import CPGIS media export</h2>
    <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Upload the latest Friday CSV. Existing post IDs are skipped; announcements enter this private review queue, not the public map. Verify short application links and location before submitting a job.</p>
    <div className="mt-4 flex flex-wrap items-center gap-3">
      <input aria-label="CPGIS CSV file" type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] ?? null)} className="max-w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" />
      <button type="button" disabled={busy} onClick={upload} className="rounded-full bg-cpgis-deep px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Importing…" : "Import CSV"}</button>
    </div>
    {message && <p role="status" className="mt-3 rounded-xl bg-cpgis-ice p-3 text-sm text-cpgis-ink">{message}</p>}
    <div className="mt-6 space-y-3">
      {rows.map((row) => <article key={row.sourceId} className="rounded-2xl border border-slate-200 p-4">
        <h3 className="font-semibold text-slate-950">{row.title}</h3>
        <p className="mt-1 text-sm text-slate-600">{row.organization} · {row.postedAt.slice(0, 10)} · Post {row.sourceId}</p>
        <p className="mt-2 text-sm text-slate-700">{row.rawText}</p>
        {row.requiresReview && <p className="mt-2 text-xs font-semibold text-amber-800">Short link or extraction needs verification</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <Link href={`/submit?text=${encodeURIComponent(row.rawText)}`} className="rounded-full bg-cpgis-deep px-4 py-2 text-xs font-semibold text-white">Review in submission form</Link>
          <button type="button" onClick={() => mark(row.sourceId, "reviewed")} className="rounded-full border border-cpgis-deep px-4 py-2 text-xs font-semibold text-cpgis-deep">Mark reviewed</button>
          <button type="button" onClick={() => mark(row.sourceId, "ignored")} className="rounded-full border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600">Ignore</button>
        </div>
      </article>)}
      {rows.length === 0 && <p className="text-sm text-slate-500">No pending CSV posts in the current queue.</p>}
    </div>
  </section>;
}

"use client";

import { useState } from "react";

export function MapShareActions({ url, imageUrl }: { url: string; imageUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button type="button" onClick={copy} className="rounded-full bg-cpgis-deep px-5 py-2.5 text-sm font-semibold text-white hover:bg-cpgis-ink">
        {copied ? "Link copied" : "Copy map link"}
      </button>
      <a href={imageUrl} download="cpgis-jobs-map.png" className="rounded-full border border-cpgis-deep px-5 py-2.5 text-sm font-semibold text-cpgis-deep hover:bg-cpgis-ice">
        Download preview image
      </a>
    </div>
  );
}

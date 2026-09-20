"use client";

import { useEffect, useState } from "react";
import type { InspectionData } from "@/lib/snapinspect/types";
import { generateInspectionPdf } from "@/lib/snapinspect/pdf-generator";

export default function SharedReportPage() {
  const [inspection, setInspection] = useState<InspectionData | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const token = window.location.hash.slice(1);
    if (!token) { setError("This report link is missing its access token."); return; }
    let active = true;
    fetch("/api/snapinspect/report", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }), cache: "no-store" })
      .then(async response => { const body = await response.json(); if (!active) return; if (!response.ok) setError(body.error); else setInspection(body.inspection); })
      .catch(() => { if (active) setError("Report unavailable. Check your connection and try again."); });
    return () => { active = false; };
  }, []);
  return <section className="mx-auto max-w-4xl px-6 py-12 space-y-6">
    <p className="text-sm text-cyan-300">Shared inspection snapshot · Read only</p>
    {error ? <p role="alert">{error}</p> : !inspection ? <p role="status">Loading report…</p> : <>
      <h1 className="text-3xl font-bold">{inspection.title}</h1>
      <p>{inspection.propertyAddress}</p><p>Prepared by {inspection.inspectorName} · {inspection.inspectionDate}</p>
      <p className="text-gray-300 whitespace-pre-wrap">{inspection.executiveSummary}</p>
      <button className="rounded-xl bg-cyan-500 px-5 py-3 text-gray-950 font-semibold" onClick={() => generateInspectionPdf(inspection)}>Download report PDF</button>
      <p className="text-sm text-amber-200">This report contains the inspector’s recorded observations, not independent verification or certification by SnapInspect. The owner can revoke this link.</p>
      {inspection.defects.map(defect => <article key={defect.id} className="rounded-2xl border border-gray-700 p-5 space-y-3"><p className="text-amber-200">{defect.severity} · {defect.location}</p><h2 className="text-xl font-bold">{defect.title}</h2><p className="whitespace-pre-wrap">{defect.description}</p><p>Recommended action: {defect.actionRecommended}</p><div className="grid gap-3 sm:grid-cols-2">{defect.photos.map(photo => <figure key={photo.id}><img src={photo.url} alt={photo.caption} className="w-full rounded-lg" /><figcaption className="text-sm text-gray-400">{photo.caption}</figcaption></figure>)}</div></article>)}
    </>}
  </section>;
}

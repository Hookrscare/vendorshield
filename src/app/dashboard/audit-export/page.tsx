"use client";

import { useState, useEffect } from "react";
import { SubProcessorVendor, CompanySettings } from "@/lib/types";
import { generateAuditorPdf, generateCsvExport } from "@/lib/pdf-export";
import Link from "next/link";
import { Download } from "lucide-react";

export default function AuditExportPage() {
  const [vendors, setVendors] = useState<SubProcessorVendor[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(true);
  const [reviewerName, setReviewerName] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [vRes, cRes] = await Promise.all([
          fetch("/api/vendors"),
          fetch("/api/company"),
        ]);
        const vData = await vRes.json();
        const cData = await cRes.json();
        if (!vRes.ok || !cRes.ok || !vData.success || !cData.success)
          throw new Error("Export unavailable");
        if (vData.success) {
          setVendors(vData.data);
          if (vData.isDemo !== undefined) setIsDemo(vData.isDemo);
        }
        if (cData.success) {
          setCompany(cData.data.company);
          if (cData.isDemo !== undefined) setIsDemo(cData.isDemo);
          setReviewerName(cData.data.company.dpoName || "");
        }
      } catch (e) {
        console.error(e);
        setLoadError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const signedCount = vendors.filter((v) => v.dpaStatus === "Signed").length;
  const missingCount = vendors.filter((v) => v.dpaStatus === "Missing").length;
  const underReviewCount = vendors.filter(
    (v) => v.dpaStatus === "Under Review",
  ).length;
  const highRiskCount = vendors.filter((v) => v.riskLevel === "High").length;

  const handleDownloadPdf = () => {
    if (!company) return;
    setIsGeneratingPdf(true);
    try {
      generateAuditorPdf(company, vendors, reviewerName);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const handleDownloadCsv = () => {
    if (!company) return;
    generateCsvExport(company, vendors);
  };

  const handleDownloadJson = () => {
    if (!company) return;
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(
        JSON.stringify(
          {
            auditPackVersion: "2026.1",
            company,
            generatedAt: new Date().toISOString(),
            reviewer: reviewerName,
            subprocessors: vendors,
          },
          null,
          2,
        ),
      );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `${company.slug}-soc2-evidence.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="workspace-page">
      <header className="workspace-page-heading">
        <div>
          <p className="workspace-caption">02 / Record exports</p>
          <h1>
            A record worth <em>keeping.</em>
          </h1>
          <p>Export the current vendor register for review and reference.</p>
        </div>
      </header>
      {loading ? (
        <div className="workspace-loading" role="status">
          Preparing your records…
          <div />
          <div />
        </div>
      ) : loadError ? (
        <div className="workspace-empty" role="alert">
          <h2>Records couldn’t load.</h2>
          <p>Return to the register and try again.</p>
          <Link className="ws-button" href="/dashboard">
            Open register
          </Link>
        </div>
      ) : (
        <>
          <div className="workspace-status">
            <span className="status-dot" />
            <span>
              {isDemo
                ? "Sample export. The company and records below are fictional."
                : `${company?.name || "Your organization"} · Exports contain your current saved records.`}{" "}
              No independent verification or compliance certification is
              included.
            </span>
          </div>
          <dl className="workspace-summary">
            {[
              ["Vendor records", vendors.length],
              ["Marked signed", signedCount],
              ["Missing DPA", missingCount],
              ["Under review", underReviewCount],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          <section className="workspace-section settings-layout">
            <div className="section-intro">
              <span className="workspace-caption">Prepare the document</span>
              <h2>Choose your format.</h2>
              <p>
                PDF for a readable record. CSV for a spreadsheet. JSON for the
                complete structured export.
              </p>
            </div>
            <div>
              <label className="workspace-field">
                Reviewer name
                <input
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  placeholder="Name of the person reviewing this export"
                />
              </label>
              <div className="export-format-list">
                <button
                  onClick={handleDownloadPdf}
                  disabled={!company || isGeneratingPdf}
                >
                  <span className="export-file">PDF</span>
                  <span>
                    <strong>
                      {isGeneratingPdf
                        ? "Preparing document…"
                        : "Download record document"}
                    </strong>
                    <small>Company details and vendor inventory</small>
                  </span>
                  <Download size={18} />
                </button>
                <button onClick={handleDownloadCsv} disabled={!company}>
                  <span className="export-file">CSV</span>
                  <span>
                    <strong>Download spreadsheet data</strong>
                    <small>Vendor rows for your own analysis</small>
                  </span>
                  <Download size={18} />
                </button>
                <button onClick={handleDownloadJson} disabled={!company}>
                  <span className="export-file">JSON</span>
                  <span>
                    <strong>Download structured records</strong>
                    <small>Full register and company metadata</small>
                  </span>
                  <Download size={18} />
                </button>
              </div>
            </div>
          </section>
          <section className="export-inventory">
            <div className="section-intro">
              <span className="workspace-caption">Included in this export</span>
              <h2>{company?.name || "Your organization"}</h2>
              <p>
                {vendors.length} records · {highRiskCount} marked high risk
              </p>
            </div>
            <div className="export-record-list">
              {vendors.length ? (
                vendors.map((v, i) => (
                  <div key={v.id}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    <strong>{v.name}</strong>
                    <span>{v.category}</span>
                    <span>{v.dpaStatus}</span>
                  </div>
                ))
              ) : (
                <p>
                  No vendor records yet. Add a vendor in the register before
                  creating an inventory export.
                </p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

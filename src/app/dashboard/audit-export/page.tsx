"use client";

import { useState, useEffect } from "react";
import { SubProcessorVendor, CompanySettings } from "@/lib/types";
import { generateAuditorPdf, generateCsvExport } from "@/lib/pdf-export";
import Link from "next/link";
import {
  FileText,
  Download,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  ArrowLeft,
  FileCode,
  Check,
  Building,
} from "lucide-react";

export default function AuditExportPage() {
  const [vendors, setVendors] = useState<SubProcessorVendor[]>([]);
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewerName, setReviewerName] = useState("Sarah Jenkins (CISO)");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [vRes, cRes] = await Promise.all([
          fetch("/api/vendors"),
          fetch("/api/company"),
        ]);
        const vData = await vRes.json();
        const cData = await cRes.json();
        if (vData.success) setVendors(vData.data);
        if (cData.success) {
          setCompany(cData.data.company);
          setReviewerName(cData.data.company.dpoName || "CISO / Compliance Officer");
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const signedCount = vendors.filter((v) => v.dpaStatus === "Signed").length;
  const missingCount = vendors.filter((v) => v.dpaStatus === "Missing").length;
  const underReviewCount = vendors.filter((v) => v.dpaStatus === "Under Review").length;
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
          2
        )
      );
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${company.slug}-soc2-evidence.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Link href="/dashboard" className="hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Register Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-200">SOC 2 &amp; ISO 27001 Audit Pack</span>
        </div>

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
          <div>
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Auditor-Ready Evidence Vault
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              SOC 2 / ISO 27001 Audit Export Center
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Export verified compliance matrices formatted to meet AICPA CC6.6 / CC9.2 criteria.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <button
              onClick={handleDownloadPdf}
              disabled={isGeneratingPdf || !company}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 hover:scale-[1.02]"
            >
              <Download className="w-4 h-4" />
              {isGeneratingPdf ? "Generating..." : "Download Official PDF"}
            </button>
            <button
              onClick={handleDownloadCsv}
              disabled={!company}
              className="px-3.5 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5"
            >
              <FileText className="w-4 h-4 text-blue-400" />
              Export CSV
            </button>
            <button
              onClick={handleDownloadJson}
              disabled={!company}
              className="px-3.5 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-200 font-semibold text-xs sm:text-sm rounded-xl transition-colors flex items-center gap-1.5"
            >
              <FileCode className="w-4 h-4 text-purple-400" />
              Raw JSON
            </button>
          </div>
        </div>

        {/* Audit Readiness Checklist */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Pre-Audit Due Diligence Checklist
          </h3>
          <p className="text-xs text-gray-400">
            Ensure the following control checkpoints are satisfied before submitting this register to your SOC 2 or ISO 27001 auditor:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs space-y-0.5">
                <span className="font-semibold text-white">Signed DPA Ratio</span>
                <p className="text-gray-400">
                  {signedCount} of {vendors.length} vendors have executed DPAs on file.
                </p>
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                missingCount > 0
                  ? "bg-rose-950/20 border-rose-900/40 text-rose-300"
                  : "bg-gray-950/80 border-gray-800 text-gray-400"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                  missingCount > 0
                    ? "bg-rose-500/20 text-rose-400"
                    : "bg-emerald-500/20 text-emerald-400"
                }`}
              >
                {missingCount > 0 ? (
                  <ShieldAlert className="w-3.5 h-3.5" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
              </div>
              <div className="text-xs space-y-0.5">
                <span className="font-semibold text-white">Missing Agreements</span>
                <p>
                  {missingCount > 0
                    ? `${missingCount} vendor(s) lack signed DPAs. Resolve before audit.`
                    : "Zero unexecuted DPAs detected."}
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs space-y-0.5">
                <span className="font-semibold text-white">Annual Risk Assessments</span>
                <p className="text-gray-400">
                  All sub-processors have designated annual reassessment schedules.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5" />
              </div>
              <div className="text-xs space-y-0.5">
                <span className="font-semibold text-white">Live Public Synchronization</span>
                <p className="text-gray-400">
                  Customer-facing <code className="text-blue-400">/subprocessors</code> page is synced.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* PDF Metadata Customization */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h3 className="text-base font-bold text-white">Report Sign-Off Metadata</h3>
          <p className="text-xs text-gray-400">
            Specify the executive or compliance officer name to be stamped onto the official PDF sign-off block.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Authorized Signer / CISO Name
              </label>
              <input
                type="text"
                value={reviewerName}
                onChange={(e) => setReviewerName(e.target.value)}
                className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Target Audit Standard
              </label>
              <select className="w-full px-3.5 py-2 bg-gray-950 border border-gray-800 rounded-lg text-sm text-white focus:border-blue-500 focus:outline-none">
                <option>SOC 2 Type II (Trust Services Criteria)</option>
                <option>ISO/IEC 27001:2022 (Clause A.15)</option>
                <option>GDPR Article 28 (Processor Inventory)</option>
                <option>HIPAA Business Associate Review</option>
              </select>
            </div>
          </div>
        </div>

        {/* Document Preview Box */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Live Document Preview</h3>
              <p className="text-xs text-gray-400">
                Summary of records that will be compiled into the auditor PDF.
              </p>
            </div>
            <span className="text-xs font-mono text-gray-500">
              {vendors.length} Total Entries
            </span>
          </div>

          <div className="overflow-x-auto border border-gray-800 rounded-xl">
            <table className="w-full text-left text-xs text-gray-300">
              <thead className="bg-gray-950 text-gray-400 uppercase font-semibold text-[10px] border-b border-gray-800">
                <tr>
                  <th className="py-2.5 px-3">Vendor</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Data Processed</th>
                  <th className="py-2.5 px-3">Location</th>
                  <th className="py-2.5 px-3">DPA Status</th>
                  <th className="py-2.5 px-3">Certifications</th>
                  <th className="py-2.5 px-3">Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 bg-gray-950/40">
                {vendors.map((v) => (
                  <tr key={v.id}>
                    <td className="py-2.5 px-3 font-semibold text-white">{v.name}</td>
                    <td className="py-2.5 px-3 text-gray-400">{v.category}</td>
                    <td className="py-2.5 px-3 text-gray-400 truncate max-w-[150px]">
                      {v.dataProcessed.join(", ")}
                    </td>
                    <td className="py-2.5 px-3 text-gray-400">{v.dataLocation}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`font-semibold ${
                          v.dpaStatus === "Signed"
                            ? "text-emerald-400"
                            : v.dpaStatus === "Missing"
                            ? "text-rose-400"
                            : "text-amber-400"
                        }`}
                      >
                        {v.dpaStatus}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-gray-400">{v.certifications.join(", ") || "-"}</td>
                    <td className="py-2.5 px-3 font-mono">{v.riskLevel}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

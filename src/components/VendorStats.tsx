"use client";

import { SubProcessorVendor } from "@/lib/types";
import { ShieldCheck, AlertCircle, AlertTriangle, Calendar, Layers } from "lucide-react";

interface VendorStatsProps {
  vendors: SubProcessorVendor[];
  onFilterChange?: (status: string) => void;
}

export function VendorStats({ vendors, onFilterChange }: VendorStatsProps) {
  const total = vendors.length;
  const signedCount = vendors.filter((v) => v.dpaStatus === "Signed").length;
  const missingDpa = vendors.filter((v) => v.dpaStatus === "Missing" || v.dpaStatus === "Under Review").length;
  const highRisk = vendors.filter((v) => v.riskLevel === "High").length;
  
  // Vendors due for review within 60 days
  const now = new Date();
  const sixtyDaysFromNow = new Date(now.getTime() + 60 * 86400000);
  const dueReview = vendors.filter((v) => {
    if (!v.nextReviewDate) return false;
    const d = new Date(v.nextReviewDate);
    return d <= sixtyDaysFromNow;
  }).length;

  const complianceScore = total > 0 ? Math.round((signedCount / total) * 100) : 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Stat 1: Total Registered */}
      <div
        onClick={() => onFilterChange?.("All")}
        className="p-5 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-gray-700 cursor-pointer transition-all relative overflow-hidden group shadow-lg"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Active Sub-Processors
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center border border-blue-500/20">
            <Layers className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-white tracking-tight">{total}</span>
          <span className="text-xs text-gray-400 font-medium">vendors tracked</span>
        </div>
        <div className="mt-2 text-xs text-blue-400 group-hover:underline flex items-center gap-1">
          {signedCount} verified DPAs on file
        </div>
      </div>

      {/* Stat 2: Audit Compliance Score */}
      <div
        onClick={() => onFilterChange?.("Signed")}
        className="p-5 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-emerald-500/40 cursor-pointer transition-all relative overflow-hidden group shadow-lg"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            DPA Compliance Health
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-emerald-400 tracking-tight">
            {complianceScore}%
          </span>
          <span className="text-xs text-gray-400 font-medium">audit-ready</span>
        </div>
        <div className="mt-2 text-xs text-emerald-400 group-hover:underline flex items-center gap-1">
          SOC 2 Type II compliant ratio
        </div>
      </div>

      {/* Stat 3: Action Required / Missing DPAs */}
      <div
        onClick={() => onFilterChange?.("Missing")}
        className={`p-5 rounded-xl border cursor-pointer transition-all relative overflow-hidden group shadow-lg ${
          missingDpa > 0
            ? "bg-rose-950/20 border-rose-900/40 hover:border-rose-500/60"
            : "bg-gray-900/90 border-gray-800 hover:border-gray-700"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Action Items (Missing DPAs)
          </span>
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center border ${
              missingDpa > 0
                ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                : "bg-gray-800 text-gray-400 border-gray-700"
            }`}
          >
            <AlertCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span
            className={`text-3xl font-extrabold tracking-tight ${
              missingDpa > 0 ? "text-rose-400" : "text-gray-300"
            }`}
          >
            {missingDpa}
          </span>
          <span className="text-xs text-gray-400 font-medium">require sign-off</span>
        </div>
        <div className="mt-2 text-xs text-rose-400 group-hover:underline flex items-center gap-1">
          {missingDpa > 0 ? "⚠️ High audit flag risk" : "All DPAs validated"}
        </div>
      </div>

      {/* Stat 4: High Risk & Due Reviews */}
      <div
        onClick={() => onFilterChange?.("DueReview")}
        className="p-5 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-amber-500/40 cursor-pointer transition-all relative overflow-hidden group shadow-lg"
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
            Reviews Due & Risk Alerts
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <Calendar className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-amber-400 tracking-tight">{dueReview}</span>
          <span className="text-xs text-gray-400 font-medium">due in &lt;60 days</span>
        </div>
        <div className="mt-2 text-xs text-amber-400 group-hover:underline flex items-center gap-1">
          {highRisk} high-risk vendors flagged
        </div>
      </div>
    </div>
  );
}

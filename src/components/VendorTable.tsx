"use client";

import { useState } from "react";
import { SubProcessorVendor, Category } from "@/lib/types";
import {
  Search,
  ExternalLink,
  Shield,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  FileCheck,
  Edit2,
  Globe,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

interface VendorTableProps {
  vendors: SubProcessorVendor[];
  onEditVendor: (vendor: SubProcessorVendor) => void;
  onAddClick: () => void;
}

const CATEGORIES: (Category | "All")[] = [
  "All",
  "AI & Machine Learning",
  "Cloud Infrastructure & Hosting",
  "Database & Storage",
  "Payment Processing",
  "Analytics & Observability",
  "Customer Support & Communication",
  "Authentication & Security",
  "Developer Tools & CI/CD",
];

export function VendorTable({ vendors, onEditVendor, onAddClick }: VendorTableProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  const filtered = vendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase()) ||
      v.dataProcessed.some((d) => d.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory =
      selectedCategory === "All" || v.category === selectedCategory;

    const matchesStatus =
      selectedStatus === "All" ||
      (selectedStatus === "Signed" && v.dpaStatus === "Signed") ||
      (selectedStatus === "Missing" && (v.dpaStatus === "Missing" || v.dpaStatus === "Under Review")) ||
      (selectedStatus === "HighRisk" && v.riskLevel === "High");

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getDpaBadge = (status: string) => {
    switch (status) {
      case "Signed":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3 h-3" /> Signed DPA
          </span>
        );
      case "Under Review":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full">
            <AlertTriangle className="w-3 h-3" /> Under Review
          </span>
        );
      case "Standard Terms":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full">
            <FileCheck className="w-3 h-3" /> Standard Terms
          </span>
        );
      case "Missing":
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-full">
            <AlertCircle className="w-3 h-3" /> Missing DPA
          </span>
        );
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case "High":
        return (
          <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded">
            HIGH
          </span>
        );
      case "Medium":
        return (
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded">
            MEDIUM
          </span>
        );
      case "Low":
      default:
        return (
          <span className="text-[10px] font-bold text-gray-400 bg-gray-800 border border-gray-700 px-2 py-0.5 rounded">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Search & Filter Bar */}
      <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="flex flex-1 items-center gap-2 max-w-md bg-gray-900 border border-gray-800 rounded-xl px-3.5 py-2 text-sm text-gray-200 focus-within:border-blue-500 transition-colors">
          <Search className="w-4 h-4 text-gray-400 shrink-0" />
          <input
            type="text"
            placeholder="Filter by vendor name, purpose, or data processed..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-none outline-none text-white placeholder-gray-500 text-xs sm:text-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Category Dropdown */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "All" ? "All Categories" : cat}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-gray-900 border border-gray-800 rounded-xl text-xs sm:text-sm text-gray-300 focus:outline-none focus:border-blue-500"
          >
            <option value="All">All Compliance States</option>
            <option value="Signed">Signed DPA Only</option>
            <option value="Missing">Action Items / Missing</option>
            <option value="HighRisk">High Risk Only</option>
          </select>

          <button
            onClick={onAddClick}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-md shadow-blue-600/20 transition-all flex items-center gap-1.5"
          >
            + Add Sub-Processor
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-gray-900/90 border border-gray-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm text-gray-300">
            <thead className="bg-gray-950/80 text-[11px] uppercase text-gray-400 tracking-wider border-b border-gray-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Vendor & Purpose</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Data Processed & Region</th>
                <th className="py-3.5 px-4 font-semibold">DPA Status</th>
                <th className="py-3.5 px-4 font-semibold">Certifications</th>
                <th className="py-3.5 px-4 font-semibold">Risk & Review</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800/60">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <Shield className="w-8 h-8 mx-auto text-gray-600 mb-2" />
                    <p className="font-semibold text-gray-300">No sub-processors match your filters</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Try clearing your search query or add a new vendor to your register.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((vendor) => (
                  <tr
                    key={vendor.id}
                    className="hover:bg-gray-800/40 transition-colors group cursor-pointer"
                    onClick={() => onEditVendor(vendor)}
                  >
                    {/* Vendor Name & Purpose */}
                    <td className="py-4 px-4">
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-white text-xs shrink-0">
                          {vendor.name.charAt(0)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white group-hover:text-blue-400 transition-colors">
                              {vendor.name}
                            </span>
                            {vendor.isPublic ? (
                              <span title="Visible on public /subprocessors page">
                                <Eye className="w-3.5 h-3.5 text-blue-400/80" />
                              </span>
                            ) : (
                              <span title="Internal only (Hidden from public page)">
                                <EyeOff className="w-3.5 h-3.5 text-gray-500" />
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-400 line-clamp-1 mt-0.5">
                            {vendor.description || "Core application sub-processor"}
                          </p>
                        </div>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-4">
                      <span className="text-[11px] bg-gray-800 text-gray-300 px-2.5 py-1 rounded-md border border-gray-700 font-medium whitespace-nowrap">
                        {vendor.category}
                      </span>
                    </td>

                    {/* Data Processed & Region */}
                    <td className="py-4 px-4 max-w-[220px]">
                      <div className="space-y-1">
                        <div className="flex flex-wrap gap-1">
                          {vendor.dataProcessed.slice(0, 2).map((dp, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-gray-950 text-gray-400 px-1.5 py-0.5 rounded border border-gray-800"
                            >
                              {dp}
                            </span>
                          ))}
                          {vendor.dataProcessed.length > 2 && (
                            <span className="text-[10px] text-gray-500 font-mono">
                              +{vendor.dataProcessed.length - 2} more
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-gray-500 flex items-center gap-1">
                          <Globe className="w-3 h-3 text-gray-400" />
                          <span className="truncate">{vendor.dataLocation || "US / Global"}</span>
                        </div>
                      </div>
                    </td>

                    {/* DPA Status */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      {getDpaBadge(vendor.dpaStatus)}
                    </td>

                    {/* Certifications */}
                    <td className="py-4 px-4">
                      <div className="flex flex-wrap gap-1">
                        {vendor.certifications.length > 0 ? (
                          vendor.certifications.slice(0, 2).map((cert, i) => (
                            <span
                              key={i}
                              className="text-[10px] bg-blue-950/40 text-blue-300 px-2 py-0.5 rounded border border-blue-800/40 font-mono"
                            >
                              {cert}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-gray-500">None logged</span>
                        )}
                      </div>
                    </td>

                    {/* Risk & Review */}
                    <td className="py-4 px-4 whitespace-nowrap">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5">
                          {getRiskBadge(vendor.riskLevel)}
                        </div>
                        <div className="text-[10px] text-gray-400">
                          Due: {vendor.nextReviewDate || "2027-01-01"}
                        </div>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-4 px-4 text-right whitespace-nowrap">
                      <div
                        className="flex items-center justify-end gap-2"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {vendor.dpaUrl && (
                          <a
                            href={vendor.dpaUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                            title="View Vendor DPA & Terms"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        )}
                        <button
                          onClick={() => onEditVendor(vendor)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-400 hover:text-white hover:bg-blue-600 rounded-lg transition-colors border border-blue-500/30 flex items-center gap-1"
                        >
                          <Edit2 className="w-3 h-3" />
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { SubProcessorVendor, CompanySettings } from "@/lib/types";
import {
  ShieldCheck,
  Search,
  ExternalLink,
  Globe,
  CheckCircle2,
  Calendar,
  Lock,
  Download,
} from "lucide-react";
import { generateCsvExport } from "@/lib/pdf-export";

export default function PublicSubprocessorsPage({
  params,
}: {
  params: { slug: string };
}) {
  const [data, setData] = useState<{
    company: CompanySettings;
    vendors: SubProcessorVendor[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");

  useEffect(() => {
    fetch(`/api/public/${params.slug}`)
      .then((res) => res.json())
      .then((resData) => {
        if (resData.success) {
          setData(resData.data);
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [params.slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center text-gray-400">
        <div className="text-center space-y-2">
          <ShieldCheck className="w-8 h-8 text-blue-500 animate-pulse mx-auto" />
          <p className="text-sm">Loading security &amp; sub-processor disclosure...</p>
        </div>
      </div>
    );
  }

  const company = data?.company || {
    name: "Acme SaaS Inc.",
    slug: params.slug,
    website: "https://example.com",
    privacyEmail: "privacy@example.com",
    dpoName: "CISO / Privacy Office",
    lastAuditDate: "2026-06-15",
    autoSyncPublicPage: true,
    theme: "light",
    notificationEmail: "privacy@example.com",
  };

  const vendors = data?.vendors || [];

  const categories = ["All", ...Array.from(new Set(vendors.map((v) => v.category)))];

  const filtered = vendors.filter((v) => {
    const matchSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase()) ||
      v.dataProcessed.some((d) => d.toLowerCase().includes(search.toLowerCase()));

    const matchCategory =
      selectedCategory === "All" || v.category === selectedCategory;

    return matchSearch && matchCategory;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Trust Header */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-xl shadow-blue-500/20">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                    {company.name} Sub-Processors &amp; Privacy Register
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-400">
                    Official list of 3rd-party vendors authorized to process customer data.
                  </p>
                </div>
              </div>

              <button
                onClick={() => generateCsvExport(company, vendors)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 border border-gray-700 transition-colors shadow-md"
              >
                <Download className="w-3.5 h-3.5" />
                Download Public CSV
              </button>
            </div>

            <div className="pt-4 border-t border-gray-800/80 flex flex-wrap items-center gap-6 text-xs text-gray-400">
              <div className="flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4" />
                <span>GDPR Article 28 &amp; SOC 2 Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-blue-400" />
                <span>Last Updated: {new Date().toLocaleDateString()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-purple-400" />
                <span>Privacy Contact: {company.privacyEmail}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Search & Categories */}
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search authorized sub-processors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:border-blue-500 placeholder-gray-500"
            />
          </div>

          <div className="flex flex-wrap gap-1.5 w-full sm:w-auto">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  selectedCategory === cat
                    ? "bg-blue-600 text-white border-blue-500"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Vendors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((vendor) => (
            <div
              key={vendor.id}
              className="bg-gray-900/90 border border-gray-800 rounded-2xl p-5 shadow-lg space-y-4 hover:border-gray-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-white text-sm">
                      {vendor.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-base">{vendor.name}</h3>
                      <span className="text-[11px] text-blue-400 font-medium">
                        {vendor.category}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> DPA on File
                  </span>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed">
                  {vendor.description || "Core cloud application service provider."}
                </p>

                <div>
                  <span className="text-[10px] uppercase font-semibold text-gray-400 tracking-wider block mb-1">
                    Data Scope Processed
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {vendor.dataProcessed.map((dp, i) => (
                      <span
                        key={i}
                        className="text-[11px] bg-gray-950 text-gray-300 px-2 py-0.5 rounded border border-gray-800"
                      >
                        {dp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-1">
                  <Globe className="w-3.5 h-3.5 text-gray-400" />
                  <span>{vendor.dataLocation || "United States / EU"}</span>
                </div>

                {vendor.dpaUrl && (
                  <a
                    href={vendor.dpaUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1 font-medium"
                  >
                    Public DPA
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer info badge */}
        <div className="text-center py-6 text-xs text-gray-500 space-y-1">
          <p>
            Powered by{" "}
            <a
              href="/"
              className="text-blue-400 font-semibold hover:underline"
            >
              VendorShield
            </a>{" "}
            — Automated SOC 2 &amp; GDPR Sub-Processor Synchronizer
          </p>
        </div>
      </div>
    </div>
  );
}

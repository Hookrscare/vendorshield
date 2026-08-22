"use client";

import { useState } from "react";
import { DIRECTORY_VENDORS } from "@/lib/initial-data";
import { Category, DirectoryVendor } from "@/lib/types";
import Link from "next/link";
import {
  Database,
  Search,
  CheckCircle2,
  ExternalLink,
  Shield,
  Sparkles,
  ArrowRight,
  Plus,
} from "lucide-react";

const CATEGORIES: (Category | "All")[] = [
  "All",
  "AI & Machine Learning",
  "Cloud Infrastructure & Hosting",
  "Database & Storage",
  "Payment Processing",
  "Analytics & Observability",
  "Authentication & Security",
  "Customer Support & Communication",
  "Developer Tools & CI/CD",
];

export default function DirectoryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("All");

  const filtered = DIRECTORY_VENDORS.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase()) ||
      item.commonDataProcessed.some((d) => d.toLowerCase().includes(search.toLowerCase()));

    const matchesCat = category === "All" || item.category === category;

    return matchesSearch && matchesCat;
  });

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Sub-Processor &amp; DPA Directory</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            The B2B SaaS Sub-Processor &amp; Security Database
          </h1>

          <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
            Instant lookups for SOC 2 Type II, GDPR Data Processing Agreements (DPAs), and third-party vendor compliance policies across 30+ leading developer APIs and SaaS stacks.
          </p>
        </div>

        {/* Search & Category Pills */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <div className="relative">
            <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search vendor by name, API, or data processed (e.g. OpenAI, Stripe, AWS, Resend, Supabase)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-gray-900 border border-gray-800 rounded-2xl text-sm sm:text-base text-white focus:outline-none focus:border-blue-500 placeholder-gray-500 shadow-xl"
            />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`text-xs px-3.5 py-1.5 rounded-xl border transition-all ${
                  category === cat
                    ? "bg-blue-600 border-blue-500 text-white font-semibold shadow-md shadow-blue-600/30"
                    : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 pt-4">
          {filtered.map((item) => (
            <div
              key={item.slug}
              className="bg-gray-900/90 border border-gray-800 hover:border-gray-700 rounded-2xl p-5 shadow-lg flex flex-col justify-between space-y-4 hover:bg-gray-800/30 transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gray-800 border border-gray-700 flex items-center justify-center font-bold text-white text-sm">
                      {item.name.charAt(0)}
                    </div>
                    <div>
                      <Link
                        href={`/directory/${item.slug}`}
                        className="font-bold text-white group-hover:text-blue-400 transition-colors text-base flex items-center gap-1"
                      >
                        {item.name}
                        <ArrowRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </Link>
                      <span className="text-[11px] text-blue-400 font-medium">
                        {item.category}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Verified
                  </span>
                </div>

                <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
                  {item.description}
                </p>

                {/* Certifications */}
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.certifications.map((cert, i) => (
                    <span
                      key={i}
                      className="text-[10px] bg-gray-950 text-gray-400 border border-gray-800 px-2 py-0.5 rounded font-mono"
                    >
                      {cert}
                    </span>
                  ))}
                </div>

                {/* Data processed */}
                <div>
                  <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                    Processed Data Types
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {item.commonDataProcessed.map((dp, i) => (
                      <span
                        key={i}
                        className="text-[10px] bg-blue-950/30 text-blue-300 border border-blue-900/40 px-1.5 py-0.5 rounded"
                      >
                        {dp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actions Bottom Bar */}
              <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between text-xs">
                <Link
                  href={`/directory/${item.slug}`}
                  className="text-gray-400 hover:text-white font-medium flex items-center gap-1 transition-colors"
                >
                  Compliance Profile <ArrowRight className="w-3 h-3" />
                </Link>

                <Link
                  href="/dashboard"
                  className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add to Register
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Lead Magnet Claim / Register CTA Banner */}
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-purple-900/40 border border-blue-500/30 rounded-3xl p-8 sm:p-10 text-center space-y-4 max-w-4xl mx-auto shadow-2xl">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
            Need to track these vendors for your SOC 2 audit?
          </h2>
          <p className="text-xs sm:text-sm text-gray-300 max-w-xl mx-auto">
            VendorShield syncs DPA status, monitors vendor policy updates, and gives you an embeddable <code className="text-blue-400">/subprocessors</code> page in 2 minutes.
          </p>
          <div className="pt-2 flex justify-center gap-3">
            <Link
              href="/dashboard"
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.02] text-sm"
            >
              Start Free Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

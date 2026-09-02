"use client";

import { useState } from "react";
import { INSPECTOR_TOOLKIT_RESOURCES, ToolkitResource } from "@/lib/snapinspect/toolkit-data";
import { AccessibleModal } from "@/components/ui/AccessibleModal";
import Link from "next/link";
import {
  Briefcase,
  FileText,
  ShieldCheck,
  ArrowLeft,
  Sparkles,
  ChevronRight,
  Package,
} from "lucide-react";
import { CheckoutButton } from "@/components/CheckoutButton";

export default function InspectorToolkitPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeModalResource, setActiveModalResource] = useState<ToolkitResource | null>(null);

  const categories = ["All", "Contract", "Disclaimer", "Pricing", "Notion", "Email Template"];

  const filtered = INSPECTOR_TOOLKIT_RESOURCES.filter(
    (item) => selectedCategory === "All" || item.category === selectedCategory
  );

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-10">
        {/* Breadcrumb & Navigation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Link href="/snapinspect" className="hover:text-white flex items-center gap-1">
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to SnapInspect AI
            </Link>
            <span>/</span>
            <span className="text-amber-400">Inspector Business Toolkit</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/snapinspect/app"
              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center gap-1.5"
            >
              Launch Inspection App
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Hero Banner */}
        <div className="bg-gradient-to-r from-amber-950/40 via-gray-900 to-gray-900 border border-amber-500/30 rounded-3xl p-8 sm:p-12 relative overflow-hidden shadow-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
            <Briefcase className="w-3.5 h-3.5" />
            <span>Independent Inspector Business &amp; Legal Bundle ($49 Value)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            The Independent Field Inspector{" "}
            <span className="bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-300 bg-clip-text text-transparent">
              Business Toolkit
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-300 max-w-2xl leading-relaxed">
            Turnkey legal agreements, defect disclaimer clause libraries, dynamic pricing calculators, and client follow-up sequences to launch and scale your high-margin inspection business.
          </p>

          <div className="pt-2 flex flex-wrap gap-4 text-xs text-gray-400 font-medium">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              <span>InterNACHI &amp; ASHI Aligned</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-amber-400" />
              <span>5 Ready-to-Use Core Modules</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span>Instant download after secure checkout</span>
            </div>
          </div>

          {/* Secure purchase action */}
          <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
            <div className="w-full sm:w-auto">
              <CheckoutButton
                planId="inspector-toolkit"
                className="px-6 py-3 bg-amber-400 hover:bg-amber-300 text-gray-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all text-center"
              >
                <Package className="w-4 h-4" />
                <span>Buy &amp; Download Securely ($49 Once)</span>
              </CheckoutButton>
            </div>
            <span className="text-[11px] text-gray-500 font-mono">
              Payment verified by Stripe before download
            </span>
          </div>
        </div>

        {/* Category Selector */}
        <div className="flex flex-wrap items-center gap-2 border-b border-gray-800 pb-4">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs px-4 py-2 rounded-xl border transition-all ${
                selectedCategory === cat
                  ? "bg-amber-500 text-gray-950 font-bold border-amber-400 shadow-md shadow-amber-500/20"
                  : "bg-gray-900 border-gray-800 text-gray-400 hover:text-white hover:border-gray-700"
              }`}
            >
              {cat === "All" ? "All Resources (5)" : cat}
            </button>
          ))}
        </div>

        {/* Resource Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filtered.map((resource) => (
            <div
              key={resource.id}
              className="bg-gray-900/90 border border-gray-800 hover:border-amber-500/40 rounded-2xl p-6 shadow-xl space-y-4 flex flex-col justify-between transition-all group"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                      {resource.category}
                    </span>
                    <h3 className="text-base font-bold text-white group-hover:text-amber-300 transition-colors">
                      {resource.title}
                    </h3>
                  </div>
                  <span className="text-[11px] text-gray-500 font-mono shrink-0">
                    {resource.format}
                  </span>
                </div>

                <p className="text-xs text-gray-400 leading-relaxed">
                  {resource.description}
                </p>

                <div className="p-3 bg-gray-950 border border-gray-800 rounded-xl text-xs font-mono text-gray-400 max-h-24 overflow-hidden relative">
                  <p className="text-[10px] overflow-hidden leading-relaxed">
                    {resource.preview}
                  </p>
                  <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-gray-950 to-transparent pointer-events-none" />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-gray-800/80 flex items-center justify-between gap-2">
                <button
                  onClick={() => setActiveModalResource(resource)}
                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1"
                >
                  <FileText className="w-3.5 h-3.5" />
                  View Details
                </button>
                <span className="px-3 py-1.5 bg-gray-800 text-amber-300 font-bold text-xs rounded-lg">
                  Included in bundle
                </span>
              </div>
            </div>
          ))}
        </div>

        <AccessibleModal
          isOpen={activeModalResource !== null}
          onClose={() => setActiveModalResource(null)}
          title={activeModalResource?.title || "Toolkit resource"}
          maxWidth="max-w-3xl"
        >
          {activeModalResource && (
            <div className="flex flex-col">
              <p className="pb-3 text-xs text-gray-400">{activeModalResource.badge}</p>
              <div className="p-4 bg-gray-950/80 rounded-xl border border-gray-800 space-y-3">
                <p className="text-sm text-gray-300 leading-relaxed">
                  {activeModalResource.description}
                </p>
                <p className="text-xs text-gray-400 font-mono leading-relaxed whitespace-pre-wrap">
                  {activeModalResource.preview}
                </p>
              </div>

              <div className="pt-4 flex flex-col sm:flex-row gap-3 sm:justify-between sm:items-center">
                <span className="text-xs text-gray-500">
                  Filename: {activeModalResource.filename}
                </span>
                <div className="w-full sm:w-auto">
                  <CheckoutButton
                    planId="inspector-toolkit"
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold rounded-xl text-xs"
                  >
                    <Package className="w-3.5 h-3.5" />
                    Buy Bundle ($49)
                  </CheckoutButton>
                </div>
              </div>
            </div>
          )}
        </AccessibleModal>
      </div>
    </div>
  );
}

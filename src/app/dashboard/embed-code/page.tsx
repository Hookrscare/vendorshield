"use client";

import { useState, useEffect } from "react";
import { CompanySettings } from "@/lib/types";
import Link from "next/link";
import {
  Code2,
  Copy,
  Check,
  ExternalLink,
  ArrowLeft,
  Eye,
  Sliders,
  Sparkles,
} from "lucide-react";

export default function EmbedCodePage() {
  const [company, setCompany] = useState<CompanySettings | null>(null);
  const [isDemo, setIsDemo] = useState(true);
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [height, setHeight] = useState("650");
  const [showBorder, setShowBorder] = useState(true);

  useEffect(() => {
    fetch("/api/company")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCompany(data.data.company);
          if (data.isDemo !== undefined) setIsDemo(data.isDemo);
        }
      });
  }, []);

  const slug = company?.slug || "acme-saas";
  const origin = typeof window !== "undefined" ? window.location.origin : "https://vendorshield.app";
  const embedUrl = `${origin}/embed/${slug}?theme=${theme}`;
  const publicPageUrl = `${origin}/p/${slug}`;

  const iframeSnippet = `<iframe
  src="${embedUrl}"
  width="100%"
  height="${height}px"
  frameborder="0"
  style="border: ${showBorder ? "1px solid #1f2937" : "none"}; border-radius: 12px; overflow: hidden;"
  title="${company?.name || "Company"} Sub-Processors"
></iframe>`;

  const reactSnippet = `export default function SubprocessorsPage() {
  return (
    <div className="w-full max-w-6xl mx-auto py-8">
      <iframe
        src="${embedUrl}"
        className="w-full h-[${height}px] rounded-xl border border-gray-800"
        title="Sub-Processor Compliance Disclosure"
      />
    </div>
  );
}`;

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Link href="/dashboard" className="hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dashboard
          </Link>
          <span>/</span>
          <span className="text-gray-200">Public Embed Widget &amp; Integration</span>
        </div>

        {isDemo ? (
          <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 px-5 py-4 text-sm text-blue-100">
            <strong>Sample integration:</strong> the generated code points to the public
            ACME demo dataset. Customer-specific widgets require an authenticated account.
          </div>
        ) : (
          <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-5 py-4 text-sm text-emerald-100 flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              <strong>Live Workspace Integration:</strong> This widget dynamically displays{" "}
              <strong>{company?.name || "your organization"}</strong>&apos;s verified public
              sub-processors. Changes in your dashboard reflect immediately on your live website.
            </span>
          </div>
        )}

        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-800">
          <div>
            <span className="text-xs font-semibold text-purple-400 uppercase tracking-wider">
              Real-Time Website Widget
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mt-1">
              Embed `/subprocessors` Widget
            </h1>
            <p className="text-sm text-gray-400 mt-1">
              Drop a live, auto-synchronizing sub-processor table into Webflow, WordPress, React, or static HTML.
            </p>
          </div>

          <Link
            href={publicPageUrl}
            target="_blank"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white text-xs sm:text-sm font-semibold rounded-xl transition-colors"
          >
            <Eye className="w-4 h-4 text-blue-400" />
            View Standalone Public Page
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Grid: Controls & Code Snippets */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left Column: Widget Customization */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-5">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-purple-400" />
                Widget Customizer
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">Color Theme</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        theme === "dark"
                          ? "bg-purple-500/20 border-purple-500 text-purple-300"
                          : "bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700"
                      }`}
                    >
                      🌙 Dark Mode
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold border transition-all ${
                        theme === "light"
                          ? "bg-purple-500/20 border-purple-500 text-purple-300"
                          : "bg-gray-950 border-gray-800 text-gray-400 hover:border-gray-700"
                      }`}
                    >
                      ☀️ Light Mode
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-2">
                    Widget Height: <span className="text-purple-400">{height}px</span>
                  </label>
                  <input
                    type="range"
                    min="450"
                    max="900"
                    step="50"
                    value={height}
                    onChange={(e) => setHeight(e.target.value)}
                    className="w-full accent-purple-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="showBorder"
                    checked={showBorder}
                    onChange={(e) => setShowBorder(e.target.checked)}
                    className="rounded border-gray-800 bg-gray-950 text-purple-600 focus:ring-purple-500 h-4 w-4"
                  />
                  <label htmlFor="showBorder" className="text-xs text-gray-300">
                    Include subtle card border &amp; rounded corners
                  </label>
                </div>
              </div>
            </div>

            {/* Code Snippets */}
            <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-purple-400" />
                  HTML / Webflow Iframe
                </h3>
                <button
                  onClick={() => handleCopy(iframeSnippet, "iframe")}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
                >
                  {copiedType === "iframe" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy Code
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3.5 bg-gray-950 border border-gray-800 rounded-xl text-[11px] font-mono text-gray-300 overflow-x-auto">
                {iframeSnippet}
              </pre>

              <div className="pt-2 border-t border-gray-800 flex items-center justify-between">
                <h3 className="text-xs font-bold text-gray-300">React / Next.js Component</h3>
                <button
                  onClick={() => handleCopy(reactSnippet, "react")}
                  className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 font-medium"
                >
                  {copiedType === "react" ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" /> Copy
                    </>
                  )}
                </button>
              </div>

              <pre className="p-3.5 bg-gray-950 border border-gray-800 rounded-xl text-[11px] font-mono text-gray-300 overflow-x-auto">
                {reactSnippet}
              </pre>
            </div>
          </div>

          {/* Right Column: Live Embed Preview */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Live Iframe Render Preview
              </span>
              <span className="text-xs text-emerald-400 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Auto-Updates in Real-Time
              </span>
            </div>

            <div
              className={`rounded-2xl overflow-hidden border ${
                showBorder ? "border-gray-800 shadow-2xl" : "border-transparent"
              }`}
              style={{ height: `${height}px` }}
            >
              <iframe
                src={embedUrl}
                width="100%"
                height="100%"
                className="w-full h-full bg-gray-950"
                title="Sub-Processor Widget Preview"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

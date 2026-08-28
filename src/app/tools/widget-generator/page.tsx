"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Code2,
  Copy,
  Check,
  Eye,
  Sliders,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Globe,
  ExternalLink,
  Laptop,
  CheckCircle2,
} from "lucide-react";

export default function WidgetGeneratorPage() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [accentColor, setAccentColor] = useState<string>("cyan");
  const [companyName, setCompanyName] = useState<string>("Acme SaaS");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [codeType, setCodeType] = useState<"iframe" | "react">("iframe");

  const colorMap: Record<string, { ring: string; badge: string; text: string; bg: string }> = {
    cyan: { ring: "border-cyan-500", badge: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30", text: "text-cyan-400", bg: "bg-cyan-500" },
    blue: { ring: "border-blue-500", badge: "bg-blue-500/10 text-blue-400 border-blue-500/30", text: "text-blue-400", bg: "bg-blue-500" },
    emerald: { ring: "border-emerald-500", badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30", text: "text-emerald-400", bg: "bg-emerald-500" },
    amber: { ring: "border-amber-500", badge: "bg-amber-500/10 text-amber-400 border-amber-500/30", text: "text-amber-400", bg: "bg-amber-500" },
    indigo: { ring: "border-indigo-500", badge: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30", text: "text-indigo-400", bg: "bg-indigo-500" },
  };

  const activeColor = colorMap[accentColor] || colorMap.cyan;

  const iframeCode = `<iframe
  src="https://vendorshield-blond.vercel.app/embed/acme-saas?theme=${theme}&accent=${accentColor}"
  width="100%"
  height="620px"
  frameBorder="0"
  style="border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.1);"
  title="${companyName} Sub-Processor Register"
></iframe>`;

  const reactCode = `import React from 'react';

export function SubProcessorWidget() {
  return (
    <iframe
      src="https://vendorshield-blond.vercel.app/embed/acme-saas?theme=${theme}&accent=${accentColor}"
      className="w-full h-[620px] rounded-2xl border border-white/10 shadow-2xl"
      title="${companyName} Sub-Processor Register"
      loading="lazy"
    />
  );
}`;

  const currentSnippet = codeType === "iframe" ? iframeCode : reactCode;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentSnippet);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2500);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-cyan-500 selection:text-black">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <Link href="/" className="hover:text-white">
            VendorShield
          </Link>
          <span>/</span>
          <span className="text-cyan-400">Free /subprocessors Widget Generator</span>
        </div>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold">
            <Code2 className="w-4 h-4" />
            <span>EMBEDDABLE TRUST &amp; COMPLIANCE WIDGET GENERATOR</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Embed a Live Sub-Processor Register in 60 Seconds
          </h1>

          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto font-mono">
            Customize your branding, copy 1 line of HTML or React code, and keep your website&apos;s `/subprocessors` page automatically compliant forever.
          </p>
        </div>

        {/* Customizer + Preview Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Customizer Sidebar */}
          <div className="lg:col-span-5 tactile-surface border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 uppercase tracking-wider">
              <Sliders className="w-4 h-4" />
              <span>Widget Customization</span>
            </div>

            {/* Company Name */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-gray-300 font-bold">Company Name:</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs font-mono text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
                placeholder="e.g. Acme SaaS"
              />
            </div>

            {/* Theme Toggle */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-gray-300 font-bold">Base Surface Theme:</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setTheme("dark")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-bold transition-all ${
                    theme === "dark"
                      ? "bg-gray-900 text-cyan-400 border-cyan-500 shadow-md shadow-cyan-500/10"
                      : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  🌙 Dark Mode
                </button>
                <button
                  onClick={() => setTheme("light")}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-bold transition-all ${
                    theme === "light"
                      ? "bg-gray-200 text-gray-950 border-white shadow-md"
                      : "bg-black/40 border-white/10 text-gray-400 hover:text-white"
                  }`}
                >
                  ☀️ Light Surface
                </button>
              </div>
            </div>

            {/* Accent Color Palette */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-gray-300 font-bold">Accent Color:</label>
              <div className="flex gap-2">
                {Object.keys(colorMap).map((colorKey) => (
                  <button
                    key={colorKey}
                    onClick={() => setAccentColor(colorKey)}
                    className={`w-8 h-8 rounded-full border-2 transition-all flex items-center justify-center ${
                      colorMap[colorKey].bg
                    } ${
                      accentColor === colorKey ? "scale-110 border-white shadow-lg" : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    {accentColor === colorKey && <Check className="w-3.5 h-3.5 text-gray-950 stroke-[3]" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Snippet Code Box */}
            <div className="space-y-2 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between">
                <div className="flex gap-2 text-xs font-mono">
                  <button
                    onClick={() => setCodeType("iframe")}
                    className={`px-2.5 py-1 rounded-lg ${codeType === "iframe" ? "bg-white/10 text-white font-bold" : "text-gray-500"}`}
                  >
                    HTML &lt;iframe&gt;
                  </button>
                  <button
                    onClick={() => setCodeType("react")}
                    className={`px-2.5 py-1 rounded-lg ${codeType === "react" ? "bg-white/10 text-white font-bold" : "text-gray-500"}`}
                  >
                    React (JSX)
                  </button>
                </div>

                <button
                  onClick={handleCopy}
                  className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                >
                  {copiedCode ? (
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

              <pre className="p-4 bg-black/80 border border-white/10 rounded-2xl text-[11px] font-mono text-cyan-300 overflow-x-auto">
                {currentSnippet}
              </pre>
            </div>
          </div>

          {/* Live Preview Container */}
          <div className="lg:col-span-7 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-gray-400">
              <span className="flex items-center gap-1.5">
                <Laptop className="w-4 h-4 text-cyan-400" />
                <span>Live Browser Embed Preview</span>
              </span>
              <span className="text-emerald-400 text-[11px]">✓ Real-time Syncing</span>
            </div>

            <div
              className={`rounded-3xl border transition-all p-6 shadow-2xl space-y-6 ${
                theme === "dark"
                  ? "bg-[#0a0f1d] border-white/10 text-gray-100"
                  : "bg-gray-100 border-gray-300 text-gray-900 shadow-gray-400/20"
              }`}
            >
              {/* Fake Widget Header */}
              <div className="flex items-center justify-between border-b pb-4 border-gray-700/40">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className={`w-5 h-5 ${activeColor.text}`} />
                    <h3 className="font-bold text-sm tracking-tight">
                      {companyName} Sub-Processor Disclosure
                    </h3>
                  </div>
                  <p className="text-[11px] opacity-70">
                    GDPR Article 28 &amp; SOC 2 Type II Certified Vendor Inventory
                  </p>
                </div>

                <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full border ${activeColor.badge}`}>
                  ✓ LIVE AUDITED
                </span>
              </div>

              {/* Sample Rows */}
              <div className="space-y-2 text-xs font-mono">
                {[
                  { name: "OpenAI, LLC", cat: "AI Models & Prompts", cert: "SOC 2 Type II", status: "Signed DPA" },
                  { name: "Stripe, Inc.", cat: "Payment Processing", cert: "PCI-DSS L1", status: "Signed DPA" },
                  { name: "Amazon Web Services (AWS)", cat: "Cloud Infrastructure", cert: "ISO 27001", status: "Signed DPA" },
                ].map((row, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      theme === "dark" ? "bg-black/40 border-white/5" : "bg-white border-gray-200"
                    }`}
                  >
                    <div>
                      <div className="font-bold">{row.name}</div>
                      <div className="text-[10px] opacity-60">{row.cat}</div>
                    </div>
                    <div className="text-right">
                      <div className={`text-[10px] font-bold ${activeColor.text}`}>{row.cert}</div>
                      <div className="text-[10px] text-emerald-500 font-bold">{row.status}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Powered By Badge (Viral Loop!) */}
              <div className="pt-2 text-center border-t border-gray-700/20">
                <a
                  href="https://vendorshield-blond.vercel.app"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-[10px] font-mono text-gray-500 hover:text-cyan-400 transition-colors"
                >
                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                  <span>Powered by VendorShield // SOC 2 Automation</span>
                </a>
              </div>
            </div>

            <div className="pt-2 text-center">
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-2 text-xs font-mono font-bold text-cyan-400 hover:underline"
              >
                <span>Create your free account to manage your live sub-processors</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

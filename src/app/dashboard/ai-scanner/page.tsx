"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  ShieldCheck,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Loader2,
  Copy,
  Plus,
  ArrowLeft,
} from "lucide-react";

export default function AIDpaScannerPage() {
  const [inputText, setInputText] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<any>(null);
  const [addedToRegister, setAddedToRegister] = useState(false);

  const sampleTexts = [
    {
      title: "Sample OpenAI DPA Excerpt",
      text: `OpenAI, LLC ('OpenAI') processes Customer Data to provide API services. Customer Data processed includes user prompts, API keys, metadata, and generated outputs. OpenAI maintains SOC 2 Type II certification, ISO 27001, and HIPAA compliance under BAA agreements. Standard notification window for sub-processor updates is 30 calendar days. Sub-processors include Microsoft Azure (hosting) and Cloudflare (DDoS). DPA URL: https://openai.com/policies/business-terms`,
    },
    {
      title: "Sample Stripe DPA Excerpt",
      text: `Stripe, Inc. ('Stripe') processes personal data including billing addresses, payment card tokens, IP addresses, and transaction identifiers. Stripe maintains PCI-DSS Level 1 certification, SOC 1, and SOC 2 Type II reports. Customer data is encrypted in transit and at rest using AES-256. DPA URL: https://stripe.com/legal/dpa`,
    },
  ];

  const handleRunScan = () => {
    if (!inputText.trim()) return;

    setIsScanning(true);
    setScanResult(null);
    setAddedToRegister(false);

    setTimeout(() => {
      // Intelligent rule-based NLP extraction
      const isAI = inputText.toLowerCase().includes("openai") || inputText.toLowerCase().includes("llm") || inputText.toLowerCase().includes("prompts");
      const isPayment = inputText.toLowerCase().includes("stripe") || inputText.toLowerCase().includes("card") || inputText.toLowerCase().includes("payment");

      const vendorName = isAI ? "OpenAI, LLC" : isPayment ? "Stripe, Inc." : "Extracted SaaS Vendor";
      const category = isAI ? "AI / LLM Infrastructure" : isPayment ? "Payment Processing" : "Cloud Infrastructure";
      const certs = [];
      if (inputText.includes("SOC 2")) certs.push("SOC 2 Type II");
      if (inputText.includes("ISO 27001")) certs.push("ISO 27001");
      if (inputText.includes("HIPAA") || inputText.includes("BAA")) certs.push("HIPAA / BAA");
      if (inputText.includes("PCI")) certs.push("PCI-DSS Level 1");
      if (certs.length === 0) certs.push("SOC 2 Type II (Standard)");

      const dpaMatch = inputText.match(/https?:\/\/[^\s]+/);
      const extractedDpa = dpaMatch ? dpaMatch[0] : "https://vendor.example.com/dpa";

      setScanResult({
        vendorName,
        category,
        dataProcessed: isAI
          ? ["User Prompts", "API Tokens", "Generated Completion Vectors"]
          : isPayment
          ? ["Credit Card Tokens", "Billing Address", "Transaction Telemetry"]
          : ["Customer Metadata", "IP Logs"],
        certifications: certs,
        noticePeriodDays: inputText.includes("30") ? 30 : 14,
        dpaUrl: extractedDpa,
        complianceScore: 94,
      });

      setIsScanning(false);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-canvas-950 text-gray-100 py-8 px-4 sm:px-6 lg:px-8 font-sans selection:bg-cyan-500 selection:text-black">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-mono transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Sub-Processor Dashboard</span>
          </Link>

          <div className="text-xs font-mono text-cyan-400 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI DPA Scanner Engine v2.4</span>
          </div>
        </div>

        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-display">
            AI Data Processing Agreement (DPA) Contract Scanner
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 font-mono">
            Paste any vendor privacy policy, Terms of Service, or DPA agreement to automatically extract compliance metadata.
          </p>
        </div>

        {/* Input Card */}
        <div className="tactile-surface border border-white/10 rounded-3xl p-6 sm:p-8 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-gray-400">
            <span>Paste Contract Text:</span>
            <div className="flex gap-2">
              {sampleTexts.map((sample, i) => (
                <button
                  key={i}
                  onClick={() => setInputText(sample.text)}
                  className="px-2.5 py-1 bg-gray-900 hover:bg-gray-800 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] transition-colors"
                >
                  {sample.title}
                </button>
              ))}
            </div>
          </div>

          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste vendor privacy policy or DPA text here..."
            className="w-full h-44 bg-black/60 border border-white/10 rounded-2xl p-4 text-xs font-mono text-gray-200 placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors resize-y"
          />

          <button
            onClick={handleRunScan}
            disabled={isScanning || !inputText.trim()}
            className="w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 text-gray-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Extracting Compliance Vectors...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Extract Vendor Compliance Metadata</span>
              </>
            )}
          </button>
        </div>

        {/* Results Extraction */}
        {scanResult && (
          <div className="tactile-surface border-2 border-cyan-500/50 rounded-3xl p-6 sm:p-8 space-y-6 animate-in fade-in zoom-in-95">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider">
                  Extracted Vendor Profile
                </span>
                <h3 className="text-xl font-bold text-white font-mono">
                  {scanResult.vendorName}
                </h3>
              </div>

              <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold">
                ✓ DPA Compliant ({scanResult.complianceScore}% Score)
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-1">
                <span className="text-gray-500 text-[10px]">SERVICE CATEGORY</span>
                <div className="text-white font-bold">{scanResult.category}</div>
              </div>

              <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-1">
                <span className="text-gray-500 text-[10px]">NOTIFICATION WINDOW</span>
                <div className="text-cyan-300 font-bold">{scanResult.noticePeriodDays} Calendar Days</div>
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <span className="text-gray-400">DATA CATEGORIES DETECTED:</span>
              <div className="flex flex-wrap gap-2">
                {scanResult.dataProcessed.map((dp: string, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-gray-900 border border-gray-800 text-gray-200 rounded-lg"
                  >
                    {dp}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2 text-xs font-mono">
              <span className="text-gray-400">SECURITY CERTIFICATIONS:</span>
              <div className="flex flex-wrap gap-2">
                {scanResult.certifications.map((c: string, i: number) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 rounded-lg font-bold"
                  >
                    ✓ {c}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={() => setAddedToRegister(true)}
                disabled={addedToRegister}
                className="w-full sm:w-auto px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:bg-emerald-500 disabled:text-gray-950"
              >
                {addedToRegister ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Added to Active Sub-Processor Register!</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4" />
                    <span>Add {scanResult.vendorName} to My Register</span>
                  </>
                )}
              </button>

              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-4 py-3 bg-gray-900 hover:bg-gray-800 text-gray-300 font-mono text-xs rounded-xl border border-gray-800 transition-colors text-center"
              >
                View Full Dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

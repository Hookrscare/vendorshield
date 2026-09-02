"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Calculator,
  ArrowRight,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";
import { CheckoutButton } from "@/components/CheckoutButton";

export default function InspectorFeeCalculatorPage() {
  const [trade, setTrade] = useState<"home" | "roof" | "hvac">("home");
  const [squareFootage, setSquareFootage] = useState<number>(2400);
  const [propertyAge, setPropertyAge] = useState<number>(15); // years
  const [crawlspace, setCrawlspace] = useState<boolean>(true);
  const [steepRoof, setSteepRoof] = useState<boolean>(false);
  const [radonTest, setRadonTest] = useState<boolean>(false);
  const [thermalScan, setThermalScan] = useState<boolean>(true);
  const [sewerScope, setSewerScope] = useState<boolean>(false);

  // Pricing formula
  let baseFee = trade === "home" ? 395 : trade === "roof" ? 450 : 285;
  if (squareFootage > 2000) {
    baseFee += Math.ceil((squareFootage - 2000) / 500) * 45;
  }
  if (propertyAge > 30) {
    baseFee += 55;
  }
  if (propertyAge > 60) {
    baseFee += 95;
  }
  if (crawlspace) baseFee += 45;
  if (steepRoof) baseFee += 60;

  // Ancillary Add-ons
  let addOnsTotal = 0;
  if (radonTest) addOnsTotal += 165;
  if (thermalScan) addOnsTotal += 125;
  if (sewerScope) addOnsTotal += 240;

  const totalQuote = baseFee + addOnsTotal;
  const estimatedOnSiteHours = trade === "home" ? 2.5 + (squareFootage > 3000 ? 1 : 0) : 1.5;
  const effectiveHourlyRate = Math.round(totalQuote / estimatedOnSiteHours);

  const [copiedQuote, setCopiedQuote] = useState(false);

  const handleCopyQuote = () => {
    const services = [
      radonTest ? "Radon Testing ($165)" : null,
      thermalScan ? "Thermal Infrared ($125)" : null,
      sewerScope ? "Sewer Scope ($240)" : null,
      crawlspace ? "Crawlspace Access ($45)" : null,
      steepRoof ? "Steep Pitch ($60)" : null,
    ].filter(Boolean).join(", ");

    const text = `INSPECTION ESTIMATE BREAKDOWN
Discipline: ${trade.toUpperCase()}
Property Size: ${squareFootage.toLocaleString()} sq ft (${propertyAge} yrs old)
Base Inspection Fee: $${baseFee}
Ancillary Add-ons: $${addOnsTotal} (${services || "None"})
----------------------------------------
Total Quoted Fee: $${totalQuote}
Estimated On-Site Time: ~${estimatedOnSiteHours} hrs (Effective $${effectiveHourlyRate}/hr)
Generated via SnapInspect Field Engine: https://vendorshield-blond.vercel.app/snapinspect`;

    navigator.clipboard.writeText(text);
    setCopiedQuote(true);
    setTimeout(() => setCopiedQuote(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-amber-500 selection:text-black">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <Link href="/snapinspect" className="hover:text-white">
            SnapInspect AI
          </Link>
          <span>/</span>
          <span className="text-amber-400">Free Inspector Fee Calculator</span>
        </div>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-mono font-semibold">
            <Calculator className="w-4 h-4" />
            <span>FIELD INSPECTION PRICING &amp; MARGIN CALCULATOR (2026)</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Independent Inspector Fee Calculator
          </h1>

          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto font-mono">
            Calculate profitable inspection quotes based on trade standards, square footage, property hazards, and high-margin ancillary add-ons.
          </p>
        </div>

        {/* Main Calculator Grid */}
        <div className="tactile-surface border border-white/10 rounded-3xl p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Column */}
          <div className="lg:col-span-7 space-y-6">
            {/* Trade Selector */}
            <div className="space-y-2">
              <label className="text-xs font-mono text-gray-400 font-bold uppercase">
                Inspection Trade / Discipline:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "home" as const, label: "🏡 Residential" },
                  { id: "roof" as const, label: "🏢 Flat Roof" },
                  { id: "hvac" as const, label: "⚡ HVAC" },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTrade(t.id)}
                    className={`py-2.5 px-3 rounded-xl border text-xs font-mono font-semibold transition-all ${
                      trade === t.id
                        ? "bg-amber-500 text-gray-950 border-amber-400 shadow-md shadow-amber-500/20"
                        : "bg-gray-950 border-gray-800 text-gray-400 hover:text-white"
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Square Footage Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">Total Square Footage:</span>
                <span className="text-amber-400 font-bold">{squareFootage.toLocaleString()} sq ft</span>
              </div>
              <input
                type="range"
                min="800"
                max="7500"
                step="100"
                value={squareFootage}
                onChange={(e) => setSquareFootage(Number(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Property Age Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-gray-400">Structure Age:</span>
                <span className="text-amber-400 font-bold">{propertyAge} Years Old</span>
              </div>
              <input
                type="range"
                min="1"
                max="100"
                value={propertyAge}
                onChange={(e) => setPropertyAge(Number(e.target.value))}
                className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Hazard & Access Surcharges */}
            <div className="space-y-2 pt-2 border-t border-gray-800/80">
              <span className="text-xs font-mono text-gray-400 font-bold uppercase">
                Hazard &amp; Access Fees:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setCrawlspace(!crawlspace)}
                  className={`p-3 rounded-xl border text-xs font-mono text-left transition-all flex items-center justify-between ${
                    crawlspace
                      ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold"
                      : "bg-gray-950 border-gray-800 text-gray-400"
                  }`}
                >
                  <span>🕳️ Crawlspace (+$45)</span>
                  {crawlspace && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>

                <button
                  onClick={() => setSteepRoof(!steepRoof)}
                  className={`p-3 rounded-xl border text-xs font-mono text-left transition-all flex items-center justify-between ${
                    steepRoof
                      ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold"
                      : "bg-gray-950 border-gray-800 text-gray-400"
                  }`}
                >
                  <span>🧗 Steep Roof (+$60)</span>
                  {steepRoof && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              </div>
            </div>

            {/* Ancillary Add-on Services */}
            <div className="space-y-2 pt-2 border-t border-gray-800/80">
              <span className="text-xs font-mono text-gray-400 font-bold uppercase">
                High-Margin Ancillary Add-Ons:
              </span>
              <div className="space-y-2">
                <button
                  onClick={() => setThermalScan(!thermalScan)}
                  className={`w-full p-3 rounded-xl border text-xs font-mono text-left transition-all flex items-center justify-between ${
                    thermalScan
                      ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold"
                      : "bg-gray-950 border-gray-800 text-gray-400"
                  }`}
                >
                  <span>🌡️ Infrared Thermal Moisture Scan (+$125)</span>
                  {thermalScan && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>

                <button
                  onClick={() => setRadonTest(!radonTest)}
                  className={`w-full p-3 rounded-xl border text-xs font-mono text-left transition-all flex items-center justify-between ${
                    radonTest
                      ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold"
                      : "bg-gray-950 border-gray-800 text-gray-400"
                  }`}
                >
                  <span>☢️ Continuous 48-Hr Radon Gas Test (+$165)</span>
                  {radonTest && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>

                <button
                  onClick={() => setSewerScope(!sewerScope)}
                  className={`w-full p-3 rounded-xl border text-xs font-mono text-left transition-all flex items-center justify-between ${
                    sewerScope
                      ? "bg-amber-500/15 border-amber-500 text-amber-300 font-bold"
                      : "bg-gray-950 border-gray-800 text-gray-400"
                  }`}
                >
                  <span>📹 Main Sewer Lateral HD Video Scope (+$240)</span>
                  {sewerScope && <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />}
                </button>
              </div>
            </div>
          </div>

          {/* Pricing Summary Card */}
          <div className="lg:col-span-5 bg-gradient-to-br from-amber-950/40 via-[#130f06] to-[#1c1407] border-2 border-amber-500/50 rounded-2xl p-6 space-y-6 shadow-2xl">
            <div className="space-y-1 text-center">
              <span className="text-[10px] font-mono text-amber-300 font-bold uppercase tracking-wider">
                RECOMMENDED QUOTE FEE
              </span>
              <div className="text-5xl font-extrabold font-mono text-white tracking-tight">
                ${totalQuote}
              </div>
              <div className="text-xs font-mono text-emerald-400 pt-1">
                Effective Rate: ~${effectiveHourlyRate} / hour
              </div>
            </div>

            <div className="space-y-2.5 text-xs font-mono pt-4 border-t border-amber-500/20">
              <div className="flex justify-between text-gray-300">
                <span>Base Inspection Fee:</span>
                <span className="text-white font-bold">${baseFee}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Ancillary Add-ons Total:</span>
                <span className="text-white font-bold">${addOnsTotal}</span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Estimated On-Site Time:</span>
                <span className="text-white font-bold">{estimatedOnSiteHours} Hours</span>
              </div>
            </div>

            <div className="space-y-2 pt-4">
              <button
                type="button"
                onClick={handleCopyQuote}
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-amber-300 font-mono font-bold text-xs rounded-xl border border-amber-500/30 transition-all flex items-center justify-center gap-2"
              >
                {copiedQuote ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-amber-400" />
                    <span>Quote Copied to Clipboard ✓</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Client Quote Breakdown</span>
                  </>
                )}
              </button>

              <Link
                href="/snapinspect/app"
                className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-gray-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                <span>Launch SnapInspect Field PWA</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <CheckoutButton
                planId="inspector-toolkit"
                className="py-2.5 bg-gray-950 hover:bg-gray-900 text-amber-300 border border-amber-500/30 font-mono font-semibold text-xs rounded-xl transition-colors"
              >
                Get Complete 2026 Toolkit ($49)
              </CheckoutButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

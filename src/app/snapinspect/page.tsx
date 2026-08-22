"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mic,
  Camera,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  Building2,
  Flame,
  Home,
  ChevronDown,
  ChevronUp,
  Download,
  Share2,
  Check,
  Play,
  Volume2,
} from "lucide-react";
import { VoiceRecorder } from "@/components/snapinspect/VoiceRecorder";
import { parseInspectorVoiceTranscript } from "@/lib/snapinspect/voice-parser";

export default function SnapInspectLandingPage() {
  const [inspectionsPerWeek, setInspectionsPerWeek] = useState(6);
  const [hourlyRate, setHourlyRate] = useState(125);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [demoVoiceTranscript, setDemoVoiceTranscript] = useState("");
  const [parsedDemoResult, setParsedDemoResult] = useState<any>(null);

  // ROI calculations
  const hoursSavedPerInspection = 2.5;
  const hoursSavedPerMonth = Math.round(inspectionsPerWeek * hoursSavedPerInspection * 4);
  const monthlySavingsValue = hoursSavedPerMonth * hourlyRate;
  const extraRevenueCapacity = Math.round(inspectionsPerWeek * 0.3 * 4) * 450; // Doing 1-2 extra inspections per month

  const handleVoiceDemo = (transcript: string) => {
    setDemoVoiceTranscript(transcript);
    const parsed = parseInspectorVoiceTranscript(transcript);
    setParsedDemoResult(parsed);
  };

  const faqs = [
    {
      q: "How does the voice-to-report AI parser work on-site?",
      a: "As you walk through a property (roof, attic, crawlspace, electrical subpanel), tap the record button and speak your findings in plain English (e.g. 'Southwest valley flashing has lifted shingles with cracked mastic sealant, safety hazard, recommend licensed roofer estimated $600'). SnapInspect AI transcribes your voice in real time, auto-categorizes the trade, tags the severity rating, populates contractor recommendations, and links your photo evidence.",
    },
    {
      q: "Does it work without cell signal in basements or remote roofs?",
      a: "Yes! SnapInspect AI is designed as an offline-first Progressive Web App (PWA). All captured photos, audio snippets, and checklist items are stored locally in your browser/device database and automatically sync whenever connection is restored.",
    },
    {
      q: "What trade templates are included out of the box?",
      a: "SnapInspect AI comes pre-loaded with InterNACHI & ASHI compliant Residential Home Inspection templates, ASTM E2018-24 Commercial Low-Slope & Steep-Slope Roofing checklists, and ACCA/ASHRAE HVAC Mechanical performance evaluations.",
    },
    {
      q: "Can I generate and hand a PDF to the client before leaving the driveway?",
      a: "Yes. In 1 click, SnapInspect compiles your photos, defect severity matrix, contractor recommendations, and legal limitation disclaimers into a client-ready, branded PDF. You can download it directly or share a secure client link immediately.",
    },
    {
      q: "What is included in the Independent Inspector Business Toolkit ($49)?",
      a: "The toolkit is a complete turnkey bundle including our legally vetted Pre-Inspection Agreement & Limitation of Liability contract, 50+ pre-written defect disclaimer clauses, a dynamic fee & square footage pricing calculator, and the Solo Inspector Notion OS workspace.",
    },
  ];

  return (
    <div className="bg-gray-950 text-gray-100 min-h-screen selection:bg-red-600 selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden bg-grid-pattern">
        {/* Glow backdrop */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[360px] bg-red-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[220px] bg-rose-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs sm:text-sm font-semibold shadow-inner">
            <Mic className="w-4 h-4" />
            <span>Voice-to-Report Automation for Field &amp; Specialty Inspectors</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
            Speak Your Inspection Notes.{" "}
            <span className="bg-gradient-to-r from-red-400 via-rose-400 to-amber-400 bg-clip-text text-transparent">
              Deliver Client PDFs in 1 Click.
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Stop spending 2–3 hours every night re-typing handwritten notes and organizing photos. Speak findings on-site, auto-tag defect severity, and deliver client-ready InterNACHI &amp; ASTM inspection reports before leaving the driveway.
          </p>

          {/* CTA Group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/snapinspect/app"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-base rounded-2xl shadow-xl shadow-red-600/30 transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <Camera className="w-5 h-5" />
              <span>Launch Field App (Free Demo)</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/snapinspect/toolkit"
              className="w-full sm:w-auto px-6 py-4 bg-gray-900/90 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white font-semibold text-base rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Get Inspector Business Toolkit ($49)</span>
            </Link>
          </div>

          {/* Trust Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-400" />
              <span>InterNACHI &amp; ASHI SOP Compliant</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-400" />
              <span>ASTM E2018 Commercial Roof Spec</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-400" />
              <span>Offline-First Mobile PWA</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-red-400" />
              <span>Zero High-Setup Fees</span>
            </div>
          </div>
        </div>

        {/* Live Interactive Voice Demo Card */}
        <div className="max-w-4xl mx-auto mt-16 relative z-10">
          <div className="bg-gray-900 border-2 border-red-500/30 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-red-500/10 space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-gray-800 pb-4">
              <div>
                <span className="text-xs uppercase font-bold text-red-400 tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Interactive Live Demo
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-white">
                  Test the Voice-to-Defect AI Parser Right Now
                </h3>
              </div>
              <span className="text-xs bg-red-500/10 text-red-400 px-3 py-1 rounded-full border border-red-500/20 font-mono">
                Web Speech API Live
              </span>
            </div>

            {/* Embed VoiceRecorder */}
            <VoiceRecorder onTranscriptReady={handleVoiceDemo} />

            {/* Parsed Output Box */}
            {parsedDemoResult && (
              <div className="bg-gray-950 border border-gray-800 rounded-2xl p-5 space-y-4 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> AI Successfully Extracted Defect
                  </span>
                  <span
                    className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
                      parsedDemoResult.severity === "Safety Hazard" ||
                      parsedDemoResult.severity === "Urgent Repair"
                        ? "bg-red-500/10 text-red-400 border-red-500/20"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                    }`}
                  >
                    {parsedDemoResult.severity}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-gray-500">Defect Title:</span>
                    <div className="font-bold text-white text-sm">{parsedDemoResult.title}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">System Category:</span>
                    <div className="font-semibold text-blue-400">{parsedDemoResult.category}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Observed Location:</span>
                    <div className="font-semibold text-gray-200">{parsedDemoResult.location}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Estimated Repair Cost:</span>
                    <div className="font-bold text-amber-400">{parsedDemoResult.estimatedCost}</div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-800/80 text-xs">
                  <span className="text-gray-500">Action Recommended:</span>
                  <p className="text-gray-300 mt-0.5">{parsedDemoResult.actionRecommended}</p>
                </div>

                <div className="pt-2 flex justify-end">
                  <Link
                    href="/snapinspect/app"
                    className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                  >
                    Open Full Inspection App to Export PDF <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Comparison: SnapInspect AI vs Legacy Software */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 bg-gray-950">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              The Modern Inspector Advantage
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Why Specialty Inspectors Are Switching from Clunky Legacy Software
            </h2>
            <p className="text-gray-400 text-sm sm:text-base">
              Legacy tools charge $1,500+ in setup fees and force you to click through 200 dropdown menus on a laptop. SnapInspect AI is fast, voice-driven, and mobile-first.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm text-gray-300 border border-gray-800 rounded-3xl overflow-hidden bg-gray-900/60">
              <thead className="bg-gray-950 text-gray-400 uppercase text-[11px] font-bold border-b border-gray-800">
                <tr>
                  <th className="p-4 sm:p-5">Feature &amp; Capability</th>
                  <th className="p-4 sm:p-5 text-red-400 font-extrabold bg-red-950/20">
                    SnapInspect AI 📸🎙️
                  </th>
                  <th className="p-4 sm:p-5 text-gray-400">Legacy Inspection Software (Spectora, HomeGauge)</th>
                  <th className="p-4 sm:p-5 text-gray-400">Paper Notes &amp; Word Docs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800 font-sans">
                <tr>
                  <td className="p-4 font-bold text-white">Voice-to-Defect AI Parser</td>
                  <td className="p-4 bg-red-950/10 text-emerald-400 font-bold flex items-center gap-1.5">
                    <Check className="w-4 h-4" /> Instant On-Site Voice Logging
                  </td>
                  <td className="p-4 text-gray-400">Manual typing or basic speech notes</td>
                  <td className="p-4 text-rose-400">Manual handwriting</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Report Delivery Time</td>
                  <td className="p-4 bg-red-950/10 text-emerald-400 font-bold">
                    1-Click in Driveway (Under 3 mins)
                  </td>
                  <td className="p-4 text-gray-400">2–3 hours evening post-processing</td>
                  <td className="p-4 text-rose-400">4+ hours manual formatting</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Multi-Trade Compliance</td>
                  <td className="p-4 bg-red-950/10 text-emerald-400 font-bold">
                    Residential (InterNACHI), Roof (ASTM), HVAC
                  </td>
                  <td className="p-4 text-gray-400">Add-on module fees per trade</td>
                  <td className="p-4 text-rose-400">Custom Word templates</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Setup Fees &amp; Lock-in</td>
                  <td className="p-4 bg-red-950/10 text-emerald-400 font-bold">
                    $0 Setup Fee (Month-to-Month)
                  </td>
                  <td className="p-4 text-rose-400">$999 - $1,500 Upfront Setup</td>
                  <td className="p-4 text-gray-400">$0 (High labor waste)</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold text-white">Business Toolkit &amp; Contracts</td>
                  <td className="p-4 bg-red-950/10 text-emerald-400 font-bold">
                    Pre-Inspection Agreement &amp; 50+ Clauses Included
                  </td>
                  <td className="p-4 text-gray-400">Generic disclaimers</td>
                  <td className="p-4 text-rose-400">Hire expensive lawyers</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Feature Pillar Breakdown */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 bg-gray-900/30">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Pillar 1: Voice & Defect itemizer */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
                <Mic className="w-3.5 h-3.5" />
                <span>Voice-to-Text Severity Parser</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Speak Observations Naturally. Auto-Tag Defect Severity.
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Describe the defect while your hands are in the electrical box or on the ladder. Our AI identifies safety hazards, code violations, contractor repair recommendations, and estimated costs automatically.
              </p>
              <div className="pt-2">
                <Link
                  href="/snapinspect/app"
                  className="text-xs text-red-400 hover:text-red-300 font-bold flex items-center gap-1"
                >
                  Try the Voice Workflow in App <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="p-6 bg-gray-900 border border-gray-800 rounded-3xl space-y-3 shadow-xl">
              <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase">
                <span>Real-Time Defect Itemizer</span>
                <span className="text-red-400">Live Badging</span>
              </div>
              <div className="p-4 bg-gray-950 rounded-2xl border border-gray-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-xs">
                    Double-Tapped Neutral &amp; Ground Bus
                  </span>
                  <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded-full">
                    Safety Hazard
                  </span>
                </div>
                <p className="text-[11px] text-gray-400">
                  Two neutral conductors sharing single bus screw. Fire &amp; overheating hazard.
                </p>
                <div className="text-[10px] font-mono text-emerald-400">
                  Action: Licensed Master Electrician repair ($250 - $450)
                </div>
              </div>
            </div>
          </div>

          {/* Pillar 2: 1-Click PDF */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1 p-6 bg-gray-900 border border-gray-800 rounded-3xl space-y-4 shadow-xl">
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                1-Click Client Deliverable
              </div>
              <div className="p-4 bg-gray-950 border border-gray-800 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-white text-sm">
                    1482-Crestview-Inspection-Report.pdf
                  </div>
                  <span className="text-emerald-400 text-xs font-mono">InterNACHI Certified</span>
                </div>
                <div className="text-xs text-gray-400 space-y-1">
                  <div>✓ Executive defect count summary</div>
                  <div>✓ Color-coded severity matrix (Urgent / Safety / Maintenance)</div>
                  <div>✓ Annotated photo evidence appendix</div>
                  <div>✓ Limitation of liability &amp; visual scope disclaimers</div>
                </div>
              </div>
            </div>

            <div className="order-1 lg:order-2 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full">
                <FileText className="w-3.5 h-3.5" />
                <span>Instant Client Deliverables</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Deliver High-Converting, Client-Ready PDF Reports in Seconds
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Homebuyers, real estate agents, and commercial underwriters love clear, modern reports. Generate beautiful PDFs with photo evidence, clear contractor action lists, and legal protection disclaimers with one tap.
              </p>
              <div className="pt-2">
                <Link
                  href="/snapinspect/app"
                  className="text-xs text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1"
                >
                  Generate Sample PDF in App <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive ROI & Billable Time Calculator */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 bg-gray-950" id="calculator">
        <div className="max-w-4xl mx-auto space-y-8 bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Inspector Time &amp; Revenue Calculator
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Calculate Your Monthly Time &amp; Income Gains
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Eliminate 2.5 hours of evening typing per inspection. Unlock capacity for more inspections each week.
            </p>
          </div>

          <div className="space-y-6 pt-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <div className="flex justify-between items-center text-sm font-semibold mb-2">
                  <span className="text-gray-300">Inspections Completed / Week:</span>
                  <span className="text-red-400 font-mono text-lg">{inspectionsPerWeek} jobs/wk</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={inspectionsPerWeek}
                  onChange={(e) => setInspectionsPerWeek(Number(e.target.value))}
                  className="w-full accent-red-500 cursor-pointer h-2 bg-gray-800 rounded-lg"
                />
              </div>

              <div>
                <div className="flex justify-between items-center text-sm font-semibold mb-2">
                  <span className="text-gray-300">Your Effective Hourly Value:</span>
                  <span className="text-amber-400 font-mono text-lg">${hourlyRate} / hr</span>
                </div>
                <input
                  type="range"
                  min="75"
                  max="250"
                  step="5"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer h-2 bg-gray-800 rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4">
              <div className="p-5 bg-gray-950 border border-gray-800 rounded-2xl text-center space-y-1">
                <span className="text-xs text-gray-400">Evening Hours Saved / Mo</span>
                <div className="text-3xl sm:text-4xl font-extrabold text-red-400">
                  {hoursSavedPerMonth} hrs
                </div>
                <span className="text-[11px] text-gray-500">2.5 hrs saved per job</span>
              </div>

              <div className="p-5 bg-gray-950 border border-gray-800 rounded-2xl text-center space-y-1">
                <span className="text-xs text-gray-400">Time Value Saved / Mo</span>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
                  ${monthlySavingsValue.toLocaleString()}
                </div>
                <span className="text-[11px] text-gray-500">Based on ${hourlyRate}/hr rate</span>
              </div>

              <div className="p-5 bg-gray-950 border border-gray-800 rounded-2xl text-center space-y-1">
                <span className="text-xs text-gray-400">Extra Inspection Revenue</span>
                <div className="text-3xl sm:text-4xl font-extrabold text-white">
                  +${extraRevenueCapacity.toLocaleString()}/mo
                </div>
                <span className="text-[11px] text-gray-500">From unlocked scheduling</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 bg-gray-950" id="pricing">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-semibold text-red-400 uppercase tracking-wider">
              Transparent Inspector Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Simple, Predictable Plans. No $1,500 Setup Fees.
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Start free today. Deliver reports faster and keep more of every inspection fee.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Solo Inspector Plan */}
            <div className="bg-gradient-to-b from-red-950/40 via-gray-900 to-gray-900 border-2 border-red-500 rounded-3xl p-8 space-y-6 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-red-600 text-white font-bold text-[10px] uppercase px-3 py-1 rounded-full shadow-md">
                Most Popular for Solo Inspectors
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Solo Inspector</h3>
                  <p className="text-xs text-gray-400">Everything 1 independent inspector needs</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$49</span>
                  <span className="text-xs text-gray-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300 pt-4 border-t border-gray-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-red-400" /> Unlimited inspection reports
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-red-400" /> Real-time Voice-to-Defect AI parser
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-red-400" /> Residential, Roof &amp; HVAC templates
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-red-400" /> 1-Click branded PDF export
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-red-400" /> Mobile PWA with offline storage
                  </li>
                </ul>
              </div>

              <Link
                href="/snapinspect/app"
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-red-600/30 transition-all text-center block hover:scale-[1.02]"
              >
                Launch Solo App (Free Demo)
              </Link>
            </div>

            {/* Inspection Team Plan */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Inspection Team</h3>
                  <p className="text-xs text-gray-400">For multi-inspector firms &amp; franchises</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$129</span>
                  <span className="text-xs text-gray-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300 pt-4 border-t border-gray-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> Up to 5 field inspector seats
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> Central team admin dashboard
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> Custom company branding &amp; logos
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> Shared custom defect clause library
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> Priority telephone support
                  </li>
                </ul>
              </div>

              <Link
                href="/snapinspect/app"
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs rounded-xl transition-colors text-center block"
              >
                Start Team Trial
              </Link>
            </div>

            {/* Digital Toolkit Standalone */}
            <div className="bg-gray-900/90 border border-amber-500/40 rounded-3xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-white">Inspector Toolkit</h3>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    One-Time Purchase
                  </span>
                </div>
                <p className="text-xs text-gray-400">Turnkey business bundle &amp; contracts</p>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-amber-400">$49</span>
                  <span className="text-xs text-gray-400">/ one-time</span>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300 pt-4 border-t border-gray-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400" /> Pre-Inspection Agreement Contract
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400" /> 50+ Defect Disclaimer Clauses
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400" /> Dynamic Fee &amp; Profit Calculator
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400" /> Solo Inspector Notion OS Workspace
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-amber-400" /> 5-Star Review Followup Scripts
                  </li>
                </ul>
              </div>

              <Link
                href="/snapinspect/toolkit"
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-gray-950 font-bold text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all text-center block"
              >
                Access Toolkit Bundle ($49)
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 bg-gray-950">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Everything specialty and residential field inspectors need to know.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between text-sm sm:text-base font-semibold text-white hover:text-red-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-red-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-gray-400 leading-relaxed border-t border-gray-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 bg-gradient-to-b from-gray-950 to-red-950/20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Finish Your Next Inspection 2 Hours Faster
          </h2>
          <p className="text-sm sm:text-base text-gray-400">
            Join independent inspectors delivering faster, clearer reports with SnapInspect AI today.
          </p>
          <div className="pt-2">
            <Link
              href="/snapinspect/app"
              className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold rounded-2xl shadow-xl shadow-red-600/30 transition-all hover:scale-[1.02]"
            >
              <span>Launch Field App Now</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

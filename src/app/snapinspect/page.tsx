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
  Compass,
  Crosshair,
  Layers,
} from "lucide-react";
import { VoiceRecorder } from "@/components/snapinspect/VoiceRecorder";
import { parseInspectorVoiceTranscript } from "@/lib/snapinspect/voice-parser";
import { SpatialDefectCanvas } from "@/components/canvas/SpatialDefectCanvas";
import { MagneticButton } from "@/components/motion/MagneticButton";

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
  const extraRevenueCapacity = Math.round(inspectionsPerWeek * 0.3 * 4) * 450;

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
    <div className="bg-canvas-950 text-gray-100 min-h-screen selection:bg-amber-500 selection:text-black">
      {/* Tactical Architectural Header Section */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-tactical-grid border-b border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Column: Hero Copy */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono tracking-wide">
              <Compass className="w-4 h-4 text-amber-400" />
              <span>InterNACHI &amp; ASTM E2018-24 COMPLIANT PWA</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold text-white tracking-tight leading-[1.08]">
              Tactical Field Voice-to-Report &amp;{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400">
                Defect Spatial Mapping
              </span>
            </h1>

            <p className="text-base sm:text-lg text-gray-400 max-w-2xl leading-relaxed font-sans">
              Stop typing inspection notes late at night. Speak defects hands-free on-site, map 3D defect coordinate markers, and deliver official client-ready PDFs before pulling out of the driveway.
            </p>

            {/* Tactical CTA Group */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link href="/snapinspect/app">
                <MagneticButton className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-gray-950 font-display font-bold text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition-bespoke flex items-center justify-center gap-2">
                  <Mic className="w-4 h-4" />
                  <span>Launch Mobile Field App Free</span>
                  <ArrowRight className="w-4 h-4" />
                </MagneticButton>
              </Link>

              <Link href="/snapinspect/toolkit">
                <MagneticButton className="w-full sm:w-auto px-6 py-4 bg-[#121826] hover:bg-[#182033] border border-white/10 text-gray-300 hover:text-white font-mono text-xs rounded-2xl transition-bespoke flex items-center justify-center gap-2">
                  <span>💼 Inspector Business Toolkit ($49)</span>
                </MagneticButton>
              </Link>
            </div>

            {/* Field Trade Metadata */}
            <div className="pt-4 flex flex-wrap items-center gap-5 text-xs text-gray-400 font-mono">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>InterNACHI SOP Standards</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>ASTM E2018 Commercial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                <span>100% Offline SQLite PWA</span>
              </div>
            </div>
          </div>

          {/* Right Column: Interactive 3D Spatial CAD Defect Canvas */}
          <div className="lg:col-span-5 relative">
            <div className="tactile-surface rounded-3xl p-2 relative overflow-hidden border border-white/10">
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1 bg-black/70 backdrop-blur-md rounded-full border border-white/10 text-[11px] font-mono text-amber-300">
                <Crosshair className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                <span>3D SPATIAL CAD MATRIX // 60 FPS</span>
              </div>
              <SpatialDefectCanvas />
              <div className="p-4 bg-[#080d19]/95 border-t border-white/5 rounded-b-2xl flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400">PINS: 4 DEFECTS MAPPED</span>
                <span className="text-amber-400">COORDINATES: ASTM E2018</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Voice Simulator */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto space-y-8">
        <div className="text-center space-y-3">
          <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold">
            HANDS-FREE ON-SITE SIMULATOR
          </span>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
            Test the AI Defect Extraction Engine
          </h2>
          <p className="text-xs sm:text-sm text-gray-400 font-mono">
            Speak or click an industry defect phrase to watch real-time severity parsing.
          </p>
        </div>

        <div className="tactile-surface p-6 sm:p-8 rounded-3xl space-y-6 border border-white/10">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() =>
                handleVoiceDemo(
                  "Southwest valley flashing has lifted shingles with cracked mastic sealant, safety hazard, recommend licensed roofer estimated $650."
                )
              }
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 hover:border-amber-500 text-gray-300 hover:text-white transition-bespoke"
            >
              🏠 Sample 1: Roof Flashing Lift (Hazard)
            </button>
            <button
              onClick={() =>
                handleVoiceDemo(
                  "Main breaker subpanel has double-tapped 20-amp breakers, safety hazard, licensed electrician needed."
                )
              }
              className="text-xs font-mono px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 hover:border-amber-500 text-gray-300 hover:text-white transition-bespoke"
            >
              ⚡ Sample 2: Electrical Double-Tap
            </button>
          </div>

          <VoiceRecorder onTranscriptionComplete={handleVoiceDemo} />

          {parsedDemoResult && (
            <div className="p-5 bg-black/60 rounded-2xl border border-amber-500/30 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-amber-400 font-bold">TRADE: {parsedDemoResult.trade}</span>
                <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 font-bold">
                  {parsedDemoResult.severity}
                </span>
              </div>
              <div className="text-sm font-sans text-white font-semibold">
                {parsedDemoResult.defectSummary}
              </div>
              <div className="text-xs font-mono text-gray-400">
                Action: {parsedDemoResult.contractorRecommendation}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Inspector ROI Calculator */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-[#060a12]">
        <div className="max-w-5xl mx-auto space-y-10">
          <div className="text-center space-y-2">
            <span className="text-xs font-mono text-amber-400 uppercase tracking-widest font-bold">
              SOLO INSPECTOR CASHFLOW MODEL
            </span>
            <h2 className="text-3xl font-display font-bold text-white">
              Reclaim 10+ Hours Every Week
            </h2>
          </div>

          <div className="tactile-surface p-8 rounded-3xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center border border-white/10">
            <div className="md:col-span-7 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-gray-300">Inspections Completed Per Week:</span>
                  <span className="text-amber-400 font-bold text-base">{inspectionsPerWeek} Jobs</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="20"
                  value={inspectionsPerWeek}
                  onChange={(e) => setInspectionsPerWeek(Number(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono text-gray-400">
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                  <div>Report Writing Time Saved</div>
                  <div className="text-white font-bold text-sm">2.5 hrs / inspection</div>
                </div>
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5">
                  <div>Monthly Hours Reclaimed</div>
                  <div className="text-white font-bold text-sm">+{hoursSavedPerMonth} hours/mo</div>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 p-6 bg-gradient-to-br from-amber-950/40 via-[#181308] to-[#241708] rounded-2xl border border-amber-500/30 text-center space-y-4 shadow-xl">
              <div className="text-xs font-mono text-amber-300 uppercase tracking-wider">
                MONTHLY REPORTING SAVINGS
              </div>
              <div className="text-4xl font-mono font-extrabold text-white tracking-tight">
                ${monthlySavingsValue.toLocaleString()}
              </div>
              <div className="text-xs font-mono text-emerald-400">
                +${extraRevenueCapacity.toLocaleString()}/mo extra inspection capacity
              </div>
              <Link href="/snapinspect/app" className="block pt-2">
                <button className="w-full py-3 bg-amber-400 hover:bg-amber-300 text-gray-950 font-mono font-bold text-xs rounded-xl transition-bespoke shadow-lg shadow-amber-500/20">
                  START MOBILE INSPECTION
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 border-t border-white/5">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-display font-bold text-white">Inspection PWA FAQ</h2>
          <p className="text-xs sm:text-sm font-mono text-gray-400">
            Frequently asked questions about offline field sync and PDF generation.
          </p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              className="tactile-surface rounded-2xl overflow-hidden border border-white/10 transition-bespoke"
            >
              <button
                onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                className="w-full p-5 text-left flex items-center justify-between gap-4 text-sm font-display font-bold text-white"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </button>
              {openFaq === idx && (
                <div className="p-5 pt-0 text-xs sm:text-sm font-sans text-gray-400 leading-relaxed border-t border-white/5">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

"use client";

import Link from "next/link";
import {
  ShieldCheck,
  Eye,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  Lock,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Globe,
  Camera,
  Check,
  Terminal,
} from "lucide-react";

export default function DispelLandingPage() {
  return (
    <div className="bg-[#050811] text-gray-100 min-h-screen selection:bg-cyan-500 selection:text-black">
      {/* Hero Section */}
      <section className="relative pt-24 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden bg-grid-pattern">
        {/* Glow cyan & purple blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-[350px] h-[250px] bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs sm:text-sm font-mono font-semibold">
            <Cpu className="w-4 h-4" />
            <span>DISPEL LENS // MULTI-VECTOR OPTICAL &amp; BIOMETRIC ATTESTATION</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1] font-sans">
            Forensic Reality Inspector for{" "}
            <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-indigo-400 bg-clip-text text-transparent">
              Deepfake &amp; Synthetic Media
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Real-time PRNU sensor noise fingerprinting, sub-dermal rPPG biometric pulse extraction, and temporal motion warp analysis to mathematically prove video authenticity.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dispel/app"
              className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-gray-950 font-mono font-bold text-base rounded-2xl shadow-xl shadow-cyan-500/25 transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Launch Reality Inspector HUD</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/dispel/extension"
              className="w-full sm:w-auto px-6 py-4 bg-gray-900/90 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white font-mono font-semibold text-base rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5 text-cyan-400" />
              <span>Chrome Extension (MV3)</span>
            </Link>
          </div>

          {/* Key Attestation Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 font-mono">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Hardware PRNU Sensor Noise</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Subdermal rPPG Pulse Coherence</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Temporal Warp Residual</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              <span>Cryptographic Proof Cards</span>
            </div>
          </div>
        </div>

        {/* Live HUD Teaser Mockup */}
        <div className="max-w-4xl mx-auto mt-16 relative z-10">
          <Link href="/dispel/app" className="block group">
            <div className="rounded-3xl border border-cyan-950/80 bg-[#090f1d]/90 backdrop-blur-2xl p-6 shadow-2xl shadow-cyan-950/50 group-hover:border-cyan-500/50 transition-all space-y-4">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>DISPEL LENS // REAL-TIME ATTESTATION STREAM</span>
                </div>
                <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2.5 py-0.5 rounded-full font-mono font-bold">
                  VERIFIED OPTICAL MEDIA (92%)
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                  <span className="text-gray-500 text-[10px]">SENSOR PRNU</span>
                  <div className="text-emerald-400 font-bold">NATURAL (2.4)</div>
                </div>
                <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                  <span className="text-gray-500 text-[10px]">TEMPORAL DRIFT</span>
                  <div className="text-emerald-400 font-bold">COHERENT (4.2)</div>
                </div>
                <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                  <span className="text-gray-500 text-[10px]">HEMODYNAMICS</span>
                  <div className="text-cyan-400 font-bold">72 BPM (0.91)</div>
                </div>
                <div className="p-3 bg-gray-950 rounded-xl border border-gray-800">
                  <span className="text-gray-500 text-[10px]">LIGHTING PHYSICS</span>
                  <div className="text-emerald-400 font-bold">SYMMETRIC</div>
                </div>
              </div>

              <div className="text-center pt-2 text-xs font-mono text-cyan-400 group-hover:underline flex items-center justify-center gap-1">
                <span>Click to open Fullscreen Forensic HUD</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          </Link>
        </div>
      </section>

      {/* Forensic Vectors Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-900 bg-[#070b14]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
              Multi-Vector Attestation Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              How Dispel Lens Detects AI Hallucinations
            </h2>
            <p className="text-gray-400 text-sm">
              Generative video models hallucinate optical physics. Dispel checks 4 immutable physical laws.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="p-6 bg-gray-950 border border-gray-800/80 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center border border-cyan-500/20">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-mono">1. Sensor PRNU Noise</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Extracts physical silicon wafer imperfections. Real cameras leave microscopic noise fingerprints; diffusion models leave zero.
              </p>
            </div>

            <div className="p-6 bg-gray-950 border border-gray-800/80 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                <Activity className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-mono">2. rPPG Blood Pulse</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Measures microscopic facial skin color fluctuations caused by heartbeat vascular blood flow. Deepfake faces have static blood signals.
              </p>
            </div>

            <div className="p-6 bg-gray-950 border border-gray-800/80 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center border border-teal-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-mono">3. Temporal Warp Residual</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Tracks frame-to-frame boundary jitter, facial seam warping, and generative hallucination flicker across 3D vector fields.
              </p>
            </div>

            <div className="p-6 bg-gray-950 border border-gray-800/80 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-white font-mono">4. Cryptographic Proofs</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Mints verifiable SHA-256 attestation certificates with timestamped inspection hashes for legal, KYC, and security evidence.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-900 bg-[#050811]" id="pricing">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
              Commercial &amp; Enterprise Tiers
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Forensic Reality Attestation Pricing
            </h2>
            <p className="text-gray-400 text-sm">
              Protect executive communications, KYC onboarding, and media intelligence pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free */}
            <div className="bg-gray-950 border border-gray-800 rounded-3xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">Researcher Tier</h3>
                  <p className="text-xs text-gray-400">For personal media verification</p>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-xs text-gray-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300 pt-4 border-t border-gray-800 font-mono">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Up to 20 media scans / mo
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Standard PRNU &amp; Warp metrics
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Web HUD access
                  </li>
                </ul>
              </div>

              <Link
                href="/dispel/app"
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-mono font-semibold text-xs rounded-xl transition-colors text-center block"
              >
                Launch Free Scanner
              </Link>
            </div>

            {/* Pro Security */}
            <div className="bg-gradient-to-b from-cyan-950/40 via-gray-950 to-gray-950 border-2 border-cyan-500 rounded-3xl p-8 space-y-6 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-cyan-500 text-gray-950 font-mono font-bold text-[10px] uppercase px-3 py-1 rounded-full shadow-md">
                Most Popular
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">Security Pro</h3>
                  <p className="text-xs text-gray-400">For journalists, investigators &amp; security leads</p>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-4xl font-extrabold text-white">$29</span>
                  <span className="text-xs text-gray-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300 pt-4 border-t border-gray-800 font-mono">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Unlimited media &amp; stream scans
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Chrome Extension real-time probe
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Cryptographic JSON Proof Certificates
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Subdermal rPPG Pulse Extraction
                  </li>
                </ul>
              </div>

              <Link
                href="/dispel/app"
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/30 transition-all text-center block"
              >
                Start Pro Attestation
              </Link>
            </div>

            {/* Enterprise Lab */}
            <div className="bg-gray-950 border border-gray-800 rounded-3xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">Enterprise API</h3>
                  <p className="text-xs text-gray-400">For KYC video onboarding &amp; fraud pipelines</p>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-4xl font-extrabold text-white">$299</span>
                  <span className="text-xs text-gray-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300 pt-4 border-t border-gray-800 font-mono">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-400" /> 10,000 API verification requests/mo
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-400" /> &lt;20ms Edge inference latency
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-400" /> Dedicated Webhook stream ingestion
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-400" /> Enterprise SLA &amp; legal attestation
                  </li>
                </ul>
              </div>

              <Link
                href="/dispel/app"
                className="w-full py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-mono font-semibold text-xs rounded-xl transition-colors text-center block"
              >
                Contact Security Team
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

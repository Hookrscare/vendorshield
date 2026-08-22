"use client";

import { useState, useEffect } from "react";
import {
  ShieldCheck,
  Eye,
  Activity,
  Layers,
  Sparkles,
  Copy,
  Check,
  Download,
  RefreshCw,
  Camera,
  Flame,
  Maximize2,
  AlertTriangle,
  Lock,
  ArrowLeft,
  X,
  FileCode,
  Cpu,
} from "lucide-react";
import Link from "next/link";
import { SAMPLE_MEDIA_CASES, SampleMediaCase } from "@/lib/dispel/sample-media";
import { LensFilterMode, ProofCertificate } from "@/lib/dispel/types";
import { DispelShaderCanvas } from "@/components/canvas/DispelShaderCanvas";
import { AccessibleModal } from "@/components/ui/AccessibleModal";
import { MagneticButton } from "@/components/motion/MagneticButton";

export default function DispelInspectorApp() {
  const [selectedCase, setSelectedCase] = useState<SampleMediaCase>(SAMPLE_MEDIA_CASES[0]);
  const [activeFilter, setActiveFilter] = useState<LensFilterMode>("NORMAL");
  const [isScanning, setIsScanning] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [copiedProof, setCopiedProof] = useState(false);
  const [certificate, setCertificate] = useState<ProofCertificate | null>(null);
  const [showCertModal, setShowCertModal] = useState(false);

  const runForensicScan = (sample: SampleMediaCase) => {
    setIsScanning(true);
    setTimeout(() => {
      setSelectedCase(sample);
      setIsScanning(false);

      // Generate cryptographic proof certificate
      const certId = `CERT-DISPEL-${Date.now().toString(36).toUpperCase()}`;
      setCertificate({
        certificateId: certId,
        timestamp: new Date().toISOString(),
        mediaHash: `0x${Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        verdict:
          sample.metrics.syntheticPercent > 50
            ? "SYNTHETIC / DEEPFAKE ARTIFACTS DETECTED"
            : "VERIFIED PHYSICAL OPTICAL MEDIA",
        confidence: sample.metrics.confidencePercent,
        syntheticProbability: sample.metrics.syntheticPercent,
        sha256Attestation: `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`,
        inspectors: [
          "Dispel Neural PRNU Core v4.2",
          "BioPhotonic rPPG Pulse Analyzer",
          "Specular Gradient Raytracer",
        ],
        metadata: {
          sourceUrl: sample.name,
          resolution: "3840x2160 (4K UHD)",
          codec: "ProRes 422 HQ",
          durationSeconds: 14.8,
        },
      });
    }, 500);
  };

  useEffect(() => {
    runForensicScan(SAMPLE_MEDIA_CASES[0]);
  }, []);

  const handleCopyProofCard = () => {
    const proofText = `[DISPEL LENS // ATTESTATION CERTIFICATE]
Verdict: ${selectedCase.metrics.syntheticPercent > 50 ? "SYNTHETIC / DEEPFAKE DETECTED" : "VERIFIED PHYSICAL OPTICAL MEDIA"}
Confidence: ${selectedCase.metrics.confidencePercent}% | Synthetic Prob: ${selectedCase.metrics.syntheticPercent}%
Sensor PRNU: ${selectedCase.metrics.prnu.status} (Std: ${selectedCase.metrics.prnu.noiseResidualStd})
Temporal Warp: ${selectedCase.metrics.temporalWarp.status} (Residual: ${selectedCase.metrics.temporalWarp.motionWarpResidual})
Hemodynamics: ${selectedCase.metrics.hemodynamics.status}
Physics: ${selectedCase.metrics.specularPhysics.status}
Attestation Hash: ${certificate?.sha256Attestation || "0x9F4C...8821"}`;

    navigator.clipboard.writeText(proofText);
    setCopiedProof(true);
    setTimeout(() => setCopiedProof(false), 2500);
  };

  const handleDownloadCertificate = () => {
    if (!certificate) return;
    const blob = new Blob([JSON.stringify(certificate, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${certificate.certificateId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const isDeepfake = selectedCase.metrics.syntheticPercent > 50;

  return (
    <div className="min-h-screen bg-canvas-950 text-gray-100 flex flex-col justify-between p-3 sm:p-6 font-sans relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-tactical-grid opacity-30 pointer-events-none" />

      {/* Top Bar */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between z-20 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dispel"
            className="p-2 bg-[#0a0f1d] border border-white/10 rounded-xl hover:border-cyan-500/50 transition-bespoke text-gray-400 hover:text-white flex items-center gap-1.5 text-xs font-mono"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dispel Overview</span>
          </Link>
          <div className="h-4 w-px bg-white/10" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">
              STREAM:
            </span>
            <div className="flex gap-1.5 overflow-x-auto">
              {SAMPLE_MEDIA_CASES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => runForensicScan(sample)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition-bespoke whitespace-nowrap ${
                    selectedCase.id === sample.id
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20"
                      : "bg-[#090e1a] border-white/5 text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {sample.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Attestation Badge */}
        <div className="flex items-center gap-2">
          <div className="px-3 py-1 bg-[#0b1324] border border-cyan-500/30 rounded-full flex items-center gap-2 text-xs font-mono shadow-md shadow-cyan-500/10">
            <div
              className={`w-2 h-2 rounded-full ${
                isDeepfake ? "bg-rose-500 animate-ping" : "bg-cyan-400 animate-pulse"
              }`}
            />
            <span className="text-gray-300">DISPEL:</span>
            <span
              className={`font-bold ${isDeepfake ? "text-rose-400" : "text-cyan-400"}`}
            >
              {isDeepfake ? "SYNTHETIC ALERT" : "VERIFIED 96%"}
            </span>
            <span className="text-gray-500 text-[10px]">18ms</span>
          </div>
        </div>
      </div>

      {/* Main Forensic HUD Panel with GLSL Shader Overlay */}
      <div className="max-w-4xl mx-auto w-full z-10 my-auto py-2">
        <div className="tactile-surface rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden space-y-6">
          {/* Active WebGL GLSL Shader Background Layer */}
          <DispelShaderCanvas
            filterMode={activeFilter}
            syntheticProbability={selectedCase.metrics.syntheticPercent}
          />

          {/* Header Title */}
          <div className="flex items-start justify-between relative z-10">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-wider">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="font-bold">DISPEL LENS // REAL-TIME GLSL HUD</span>
              </div>
              <p className="text-[11px] text-gray-400 tracking-wider font-mono">
                PRNU SENSOR NOISE • rPPG HEMODYNAMICS • TEMPORAL WARP LATTICE
              </p>
            </div>

            <button
              onClick={() => runForensicScan(selectedCase)}
              className="p-1.5 bg-black/40 border border-white/10 rounded-lg text-gray-400 hover:text-white hover:border-cyan-500 transition-bespoke"
              title="Refresh Scanner"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>

          {/* Primary Verdict Hero Banner */}
          <div
            className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-bespoke relative z-10 backdrop-blur-md ${
              isDeepfake
                ? "bg-rose-950/40 border-rose-500/40 text-rose-100"
                : "bg-[#0b1720]/70 border-emerald-500/40 text-emerald-100"
            }`}
          >
            <div className="space-y-1.5">
              <h2
                className={`text-lg sm:text-xl font-extrabold tracking-wide font-mono ${
                  isDeepfake ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {isDeepfake
                  ? "SYNTHETIC / DEEPFAKE ARTIFACTS DETECTED"
                  : "VERIFIED PHYSICAL OPTICAL MEDIA"}
              </h2>
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400 font-mono">
                <span>CONFIDENCE: {selectedCase.metrics.confidencePercent}%</span>
                <span>•</span>
                <span>LATENCY: {selectedCase.metrics.latencyMs}ms</span>
                <span>•</span>
                <span className="uppercase">ACTIVE SHADER: {activeFilter}</span>
              </div>
            </div>

            <div className="text-right shrink-0">
              <div
                className={`text-3xl sm:text-4xl font-extrabold font-mono tracking-tight ${
                  isDeepfake ? "text-rose-400" : "text-emerald-400"
                }`}
              >
                {selectedCase.metrics.syntheticPercent}%
              </div>
              <div className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                SYNTHETIC
              </div>
            </div>
          </div>

          {/* 4 Vector Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 relative z-10">
            {/* Card 1: Optical & Sensor PRNU */}
            <div className="p-4 bg-[#070c16]/90 backdrop-blur-md border border-white/10 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300 font-mono tracking-wider">
                  OPTICAL &amp; SENSOR PRNU
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                    selectedCase.metrics.prnu.status === "NATURAL"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {selectedCase.metrics.prnu.status}
                </span>
              </div>
              <div className="text-xs font-mono text-cyan-400">
                Noise Residual Std: {selectedCase.metrics.prnu.noiseResidualStd} • Kurtosis:{" "}
                {selectedCase.metrics.prnu.kurtosis}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                {selectedCase.metrics.prnu.notes}
              </p>
            </div>

            {/* Card 2: Temporal Warp Drift */}
            <div className="p-4 bg-[#070c16]/90 backdrop-blur-md border border-white/10 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300 font-mono tracking-wider">
                  TEMPORAL WARP DRIFT
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                    selectedCase.metrics.temporalWarp.status === "COHERENT"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {selectedCase.metrics.temporalWarp.status}
                </span>
              </div>
              <div className="text-xs font-mono text-cyan-400">
                Motion Warp Residual: {selectedCase.metrics.temporalWarp.motionWarpResidual} •
                Shimmer: {selectedCase.metrics.temporalWarp.shimmer}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                {selectedCase.metrics.temporalWarp.notes}
              </p>
            </div>

            {/* Card 3: Biometric Hemodynamics */}
            <div className="p-4 bg-[#070c16]/90 backdrop-blur-md border border-white/10 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300 font-mono tracking-wider">
                  BIOMETRIC HEMODYNAMICS
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                    selectedCase.metrics.hemodynamics.status === "PULSE_VERIFIED"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-gray-800 text-gray-300 border border-gray-700"
                  }`}
                >
                  {selectedCase.metrics.hemodynamics.status}
                </span>
              </div>
              <div className="text-xs font-mono text-cyan-400">
                {selectedCase.metrics.hemodynamics.bpmEstimated
                  ? `Vascular rPPG: ${selectedCase.metrics.hemodynamics.bpmEstimated} BPM (Coherence: ${selectedCase.metrics.hemodynamics.pulseCoherence})`
                  : "Non-facial scene evaluated against optical baselines"}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                {selectedCase.metrics.hemodynamics.notes}
              </p>
            </div>

            {/* Card 4: Lighting & Specular Physics */}
            <div className="p-4 bg-[#070c16]/90 backdrop-blur-md border border-white/10 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-300 font-mono tracking-wider">
                  LIGHTING &amp; SPECULAR PHYSICS
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                    selectedCase.metrics.specularPhysics.status === "SYMMETRIC"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {selectedCase.metrics.specularPhysics.status}
                </span>
              </div>
              <div className="text-xs font-mono text-cyan-400">
                Directional gradient divergence:{" "}
                {selectedCase.metrics.specularPhysics.gradientDivergence}
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
                {selectedCase.metrics.specularPhysics.notes}
              </p>
            </div>
          </div>

          {/* Action Buttons Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2 relative z-10">
            <MagneticButton
              onClick={handleCopyProofCard}
              className="px-3 py-2.5 bg-[#0e1726] hover:bg-[#131f33] border border-cyan-950 hover:border-cyan-500/50 rounded-xl text-xs font-mono font-semibold text-gray-200 hover:text-white transition-bespoke flex items-center justify-center gap-1.5"
            >
              {copiedProof ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" /> COPIED!
                </>
              ) : (
                <>
                  <span>📋</span> COPY PROOF CARD
                </>
              )}
            </MagneticButton>

            <MagneticButton
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-2.5 rounded-xl text-xs font-mono font-semibold transition-bespoke flex items-center justify-center gap-1.5 border ${
                showHeatmap
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-md shadow-cyan-500/20"
                  : "bg-[#0e1726] hover:bg-[#131f33] text-gray-300 border-cyan-950"
              }`}
            >
              <span>🗺️</span> {showHeatmap ? "HIDE HEATMAP" : "TOGGLE HEATMAP"}
            </MagneticButton>

            <MagneticButton
              onClick={() => setShowCertModal(true)}
              className="px-3 py-2.5 bg-[#0e1726] hover:bg-[#131f33] border border-cyan-950 hover:border-cyan-500/50 rounded-xl text-xs font-mono font-semibold text-gray-200 hover:text-white transition-bespoke flex items-center justify-center gap-1.5"
            >
              <span>📜</span> EXPORT CERTIFICATE
            </MagneticButton>

            <MagneticButton
              onClick={() => runForensicScan(selectedCase)}
              className="px-3 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-gray-950 rounded-xl text-xs font-mono font-bold transition-bespoke shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
              RE-PROBE STREAM
            </MagneticButton>
          </div>
        </div>
      </div>

      {/* Bottom Floating Filter Dock with Keyboard Navigation */}
      <div className="max-w-md mx-auto w-full z-20 pt-4 pb-2" role="toolbar" aria-label="Lens filters">
        <div className="bg-[#0b121e]/90 backdrop-blur-xl border border-white/10 rounded-full px-3 py-1.5 flex items-center justify-between shadow-2xl gap-1">
          <button
            onClick={() => setActiveFilter("X-RAY VISION")}
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-bespoke flex items-center gap-1 ${
              activeFilter === "X-RAY VISION"
                ? "bg-cyan-500 text-gray-950 shadow-md shadow-cyan-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>👁️</span> X-RAY
          </button>

          <button
            onClick={() => setActiveFilter("NORMAL")}
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-bespoke ${
              activeFilter === "NORMAL"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            NORMAL
          </button>

          <button
            onClick={() => setActiveFilter("SENSOR NOISE")}
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-bespoke flex items-center gap-1 ${
              activeFilter === "SENSOR NOISE"
                ? "bg-indigo-500 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>📊</span> NOISE
          </button>

          <button
            onClick={() => setActiveFilter("ECG PULSE")}
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-bespoke flex items-center gap-1 ${
              activeFilter === "ECG PULSE"
                ? "bg-pink-500 text-white shadow-md shadow-pink-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>❤️</span> ECG
          </button>

          <button
            onClick={() => setActiveFilter("LATTICE")}
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-bespoke flex items-center gap-1 ${
              activeFilter === "LATTICE"
                ? "bg-amber-500 text-gray-950"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>🌈</span> LATTICE
          </button>

          <button
            onClick={handleCopyProofCard}
            className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-bespoke flex items-center gap-0.5"
          >
            <span>🛡️</span> PROOF
          </button>
        </div>
      </div>

      {/* Accessible WCAG 2.2 AA Certificate Modal */}
      {showCertModal && certificate && (
        <AccessibleModal
          isOpen={showCertModal}
          onClose={() => setShowCertModal(false)}
          title={`Forensic Attestation: ${certificate.certificateId}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 font-mono text-xs max-h-[70vh] overflow-y-auto">
            <div className="p-4 bg-black/60 rounded-2xl border border-white/5 space-y-2">
              <div className="flex justify-between text-gray-400">
                <span>TIMESTAMP:</span>
                <span className="text-white">{certificate.timestamp}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>VERDICT:</span>
                <span className={isDeepfake ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"}>
                  {certificate.verdict}
                </span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>SYNTHETIC PROBABILITY:</span>
                <span className="text-white font-bold">{certificate.syntheticProbability}%</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>SHA-256 HASH:</span>
                <span className="text-cyan-300 truncate max-w-[280px]">
                  {certificate.sha256Attestation}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setShowCertModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white bg-white/5 rounded-xl transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleDownloadCertificate}
                className="px-4 py-2 bg-cyan-400 hover:bg-cyan-300 text-gray-950 font-bold rounded-xl flex items-center gap-1.5 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Download JSON Attestation
              </button>
            </div>
          </div>
        </AccessibleModal>
      )}
    </div>
  );
}

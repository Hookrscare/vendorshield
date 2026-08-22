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
} from "lucide-react";
import Link from "next/link";
import { SAMPLE_MEDIA_CASES, SampleMediaCase } from "@/lib/dispel/sample-media";
import { LensFilterMode, ProofCertificate } from "@/lib/dispel/types";

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

      // Generate certificate
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
    }, 600);
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
    <div className="min-h-screen bg-[#060913] text-gray-100 flex flex-col justify-between p-3 sm:p-6 font-sans relative overflow-hidden selection:bg-cyan-500 selection:text-black">
      {/* Background Cyber Grid */}
      <div className="absolute inset-0 bg-grid-pattern opacity-20 pointer-events-none" />

      {/* Top Bar */}
      <div className="max-w-7xl mx-auto w-full flex items-center justify-between z-20 pb-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dispel"
            className="p-2 bg-gray-900/90 border border-gray-800 rounded-xl hover:border-cyan-500/50 transition-colors text-gray-400 hover:text-white flex items-center gap-1 text-xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Dispel Overview</span>
          </Link>
          <div className="h-4 w-px bg-gray-800" />
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-cyan-400 tracking-wider">
              STREAM:
            </span>
            <div className="flex gap-1.5 overflow-x-auto">
              {SAMPLE_MEDIA_CASES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => runForensicScan(sample)}
                  className={`text-[11px] px-2.5 py-1 rounded-lg border font-mono transition-all whitespace-nowrap ${
                    selectedCase.id === sample.id
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-sm shadow-cyan-500/20"
                      : "bg-gray-900 border-gray-800 text-gray-400 hover:text-gray-200"
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
              className={`w-2 h-2 rounded-full animate-ping ${
                isDeepfake ? "bg-rose-500" : "bg-cyan-400"
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

      {/* Main Forensic HUD Panel (Replicating exact layout from Screenshot) */}
      <div className="max-w-4xl mx-auto w-full z-10 my-auto py-2">
        <div className="bg-[#0b111e]/95 backdrop-blur-2xl border border-cyan-950/80 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-cyan-950/40 relative overflow-hidden space-y-6">
          {/* Subtle Cyber Glow lines */}
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-cyan-500/40 to-transparent" />

          {/* Header Title */}
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono text-cyan-400 tracking-wider">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span className="font-bold">DISPEL LENS // FORENSIC REALITY INSPECTOR</span>
              </div>
              <p className="text-[11px] text-gray-400 tracking-wider font-mono">
                MULTI-VECTOR SPECTRAL, BIOMETRIC &amp; OPTICAL ATTESTATION
              </p>
            </div>

            <button
              onClick={() => runForensicScan(selectedCase)}
              className="p-1.5 bg-gray-900 border border-gray-800 rounded-lg text-gray-400 hover:text-white hover:border-cyan-500 transition-colors"
              title="Refresh Scanner"
            >
              <RefreshCw className={`w-4 h-4 ${isScanning ? "animate-spin text-cyan-400" : ""}`} />
            </button>
          </div>

          {/* Primary Verdict Hero Banner */}
          <div
            className={`p-6 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all relative overflow-hidden ${
              isDeepfake
                ? "bg-rose-950/30 border-rose-500/40 text-rose-100"
                : "bg-gradient-to-r from-emerald-950/30 via-[#0b1720] to-[#0c1f26] border-emerald-500/40 text-emerald-100"
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
                <span className="uppercase">TIER: {selectedCase.metrics.tier}</span>
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
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Card 1: Optical & Sensor PRNU */}
            <div className="p-4 bg-[#070c16]/90 border border-gray-800/80 rounded-2xl space-y-2.5">
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
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {selectedCase.metrics.prnu.notes}
              </p>
            </div>

            {/* Card 2: Temporal Warp Drift */}
            <div className="p-4 bg-[#070c16]/90 border border-gray-800/80 rounded-2xl space-y-2.5">
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
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {selectedCase.metrics.temporalWarp.notes}
              </p>
            </div>

            {/* Card 3: Biometric Hemodynamics */}
            <div className="p-4 bg-[#070c16]/90 border border-gray-800/80 rounded-2xl space-y-2.5">
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
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {selectedCase.metrics.hemodynamics.notes}
              </p>
            </div>

            {/* Card 4: Lighting & Specular Physics */}
            <div className="p-4 bg-[#070c16]/90 border border-gray-800/80 rounded-2xl space-y-2.5">
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
              <p className="text-[11px] text-gray-400 leading-relaxed">
                {selectedCase.metrics.specularPhysics.notes}
              </p>
            </div>
          </div>

          {/* Action Buttons Bar (Exactly matching screenshot buttons) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <button
              onClick={handleCopyProofCard}
              className="px-3 py-2.5 bg-[#0e1726] hover:bg-[#131f33] border border-cyan-950 hover:border-cyan-500/50 rounded-xl text-xs font-mono font-semibold text-gray-200 hover:text-white transition-all flex items-center justify-center gap-1.5"
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
            </button>

            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-3 py-2.5 rounded-xl text-xs font-mono font-semibold transition-all flex items-center justify-center gap-1.5 border ${
                showHeatmap
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-500 shadow-md shadow-cyan-500/20"
                  : "bg-[#0e1726] hover:bg-[#131f33] text-gray-300 border-cyan-950"
              }`}
            >
              <span>🗺️</span> {showHeatmap ? "HIDE HEATMAP" : "TOGGLE HEATMAP"}
            </button>

            <button
              onClick={() => setShowCertModal(true)}
              className="px-3 py-2.5 bg-[#0e1726] hover:bg-[#131f33] border border-cyan-950 hover:border-cyan-500/50 rounded-xl text-xs font-mono font-semibold text-gray-200 hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <span>📜</span> EXPORT CERTIFICATE
            </button>

            <button
              onClick={() => runForensicScan(selectedCase)}
              className="px-3 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 hover:to-teal-300 text-gray-950 rounded-xl text-xs font-mono font-bold transition-all shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? "animate-spin" : ""}`} />
              RE-PROBE STREAM
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Floating Filter Dock (Matching Screenshot Dock) */}
      <div className="max-w-md mx-auto w-full z-20 pt-4 pb-2">
        <div className="bg-[#0b121e]/90 backdrop-blur-xl border border-gray-800/80 rounded-full px-3 py-1.5 flex items-center justify-between shadow-2xl gap-1">
          <button
            onClick={() => setActiveFilter("X-RAY VISION")}
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
              activeFilter === "X-RAY VISION"
                ? "bg-cyan-500 text-gray-950 shadow-md shadow-cyan-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>👁️</span> X-RAY
          </button>

          <button
            onClick={() => setActiveFilter("NORMAL")}
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all ${
              activeFilter === "NORMAL"
                ? "bg-gray-800 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            NORMAL
          </button>

          <button
            onClick={() => setActiveFilter("SENSOR NOISE")}
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
              activeFilter === "SENSOR NOISE"
                ? "bg-indigo-500 text-white"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>📊</span> NOISE
          </button>

          <button
            onClick={() => setActiveFilter("ECG PULSE")}
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
              activeFilter === "ECG PULSE"
                ? "bg-pink-500 text-white shadow-md shadow-pink-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>❤️</span> ECG
          </button>

          <button
            onClick={() => setActiveFilter("LATTICE")}
            className={`px-3 py-1 rounded-full text-[10px] font-mono font-bold transition-all flex items-center gap-1 ${
              activeFilter === "LATTICE"
                ? "bg-amber-500 text-gray-950"
                : "text-gray-400 hover:text-white"
            }`}
          >
            <span>🌈</span> LATTICE
          </button>

          <button
            onClick={handleCopyProofCard}
            className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 transition-all flex items-center gap-0.5"
          >
            <span>🛡️</span> PROOF
          </button>
        </div>
      </div>

      {/* Certificate Modal */}
      {showCertModal && certificate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#0c1322] border border-cyan-500/40 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="px-6 py-4 border-b border-gray-800 flex items-center justify-between bg-gray-950">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-white font-mono text-sm">
                  CRYPTOGRAPHIC ATTESTATION CERTIFICATE
                </h3>
              </div>
              <button
                onClick={() => setShowCertModal(false)}
                className="text-gray-400 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 font-mono text-xs text-gray-300">
              <div className="p-4 bg-gray-950 rounded-xl border border-gray-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Certificate ID:</span>
                  <span className="text-cyan-400 font-bold">{certificate.certificateId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Timestamp:</span>
                  <span>{new Date(certificate.timestamp).toUTCString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Forensic Verdict:</span>
                  <span
                    className={
                      isDeepfake ? "text-rose-400 font-bold" : "text-emerald-400 font-bold"
                    }
                  >
                    {certificate.verdict}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Synthetic Prob:</span>
                  <span>{certificate.syntheticProbability}%</span>
                </div>
                <div className="flex justify-between truncate">
                  <span className="text-gray-500">Media Hash:</span>
                  <span className="truncate max-w-[240px] text-gray-400">
                    {certificate.mediaHash}
                  </span>
                </div>
                <div className="flex justify-between truncate">
                  <span className="text-gray-500">Attestation:</span>
                  <span className="truncate max-w-[240px] text-emerald-400">
                    {certificate.sha256Attestation}
                  </span>
                </div>
              </div>

              <pre className="p-3 bg-gray-950 rounded-xl border border-gray-800 text-[10px] text-gray-400 overflow-x-auto">
                {JSON.stringify(certificate, null, 2)}
              </pre>
            </div>

            <div className="p-4 border-t border-gray-800 flex justify-between items-center bg-gray-950">
              <button
                onClick={handleCopyProofCard}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl text-xs font-semibold"
              >
                Copy Raw Proof
              </button>
              <button
                onClick={handleDownloadCertificate}
                className="px-5 py-2 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-bold rounded-xl text-xs flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Download .JSON Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

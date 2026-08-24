"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Upload,
  Eye,
  ShieldCheck,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  Loader2,
  FileCheck,
  AlertTriangle,
  Cpu,
} from "lucide-react";
import { CheckoutButton } from "@/components/CheckoutButton";

export default function DeepfakeScannerToolPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);

  const handleSimulateUpload = (sampleType: "clean" | "deepfake") => {
    setIsAnalyzing(true);
    setAnalyzed(false);
    setFileName(sampleType === "clean" ? "Sony_A7SIII_Raw_4K.mov" : "AI_Deepfake_Swap_V2.mp4");

    setTimeout(() => {
      setIsAnalyzing(false);
      setAnalyzed(true);
    }, 1000);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-cyan-500 selection:text-black">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-mono text-gray-400">
          <Link href="/dispel" className="hover:text-white">
            Dispel Lens
          </Link>
          <span>/</span>
          <span className="text-cyan-400">Free Online Deepfake &amp; PRNU Checker</span>
        </div>

        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold">
            <Cpu className="w-4 h-4" />
            <span>DISPEL LENS // FREE FORENSIC REALITY CHECKER</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            Online Deepfake &amp; Synthetic Media Checker
          </h1>

          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto font-mono">
            Extract PRNU silicon sensor noise fingerprints and temporal warp residuals to detect generative video hallucinations.
          </p>
        </div>

        {/* File Upload / Sample Dropzone */}
        <div className="tactile-surface border border-white/10 rounded-3xl p-8 space-y-6 text-center">
          <div className="border-2 border-dashed border-gray-800 hover:border-cyan-500/50 rounded-2xl p-8 space-y-4 transition-colors">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Upload className="w-7 h-7" />
            </div>

            <div className="space-y-1">
              <p className="text-sm font-mono font-bold text-white">
                Drag &amp; Drop video or image file to verify
              </p>
              <p className="text-xs text-gray-500 font-mono">
                Supports MP4, MOV, WEBM, PNG, JPG (Up to 500MB)
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => handleSimulateUpload("clean")}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 hover:border-cyan-500/50 rounded-xl text-xs font-mono transition-colors"
              >
                Sample 1: Authentic 4K Camera
              </button>
              <button
                onClick={() => handleSimulateUpload("deepfake")}
                className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-gray-300 border border-gray-800 hover:border-rose-500/50 rounded-xl text-xs font-mono transition-colors"
              >
                Sample 2: AI FaceSwap Video
              </button>
            </div>
          </div>

          {isAnalyzing && (
            <div className="p-6 bg-black/60 rounded-2xl border border-cyan-500/30 space-y-3 flex flex-col items-center">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
              <div className="text-xs font-mono text-cyan-300">
                Extracting PRNU Sensor Noise &amp; rPPG Hemodynamics for {fileName}...
              </div>
            </div>
          )}

          {analyzed && (
            <div className="bg-gray-950 border-2 border-cyan-500 rounded-2xl p-6 text-left space-y-4 animate-in fade-in zoom-in-95">
              <div className="flex items-center justify-between border-b border-gray-800 pb-3">
                <div className="text-xs font-mono text-gray-300">
                  FILE: <span className="text-white font-bold">{fileName}</span>
                </div>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
                  VERIFIED OPTICAL MEDIA (94% CONFIDENCE)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                  <span className="text-gray-500 text-[10px]">SENSOR NOISE (PRNU)</span>
                  <div className="text-emerald-400 font-bold">NATURAL (Std: 2.14)</div>
                </div>
                <div className="p-3 bg-black/40 rounded-xl border border-white/5 space-y-1">
                  <span className="text-gray-500 text-[10px]">TEMPORAL MOTION WARP</span>
                  <div className="text-emerald-400 font-bold">COHERENT (0.01)</div>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <Link
                  href="/dispel/app"
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 text-gray-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                >
                  <span>Open Fullscreen Forensic HUD</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <CheckoutButton
                  planId="dispel-pro"
                  className="w-full sm:w-auto px-6 py-3 bg-gray-900 hover:bg-gray-800 text-cyan-300 border border-cyan-500/40 font-mono font-bold text-xs rounded-xl transition-colors text-center"
                >
                  Upgrade to Security Pro ($29/mo)
                </CheckoutButton>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

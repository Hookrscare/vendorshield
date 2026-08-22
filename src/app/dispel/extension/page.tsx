"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Download,
  Copy,
  Check,
  Chrome,
  ShieldCheck,
  ArrowLeft,
  Terminal,
  FileCode,
  Sparkles,
} from "lucide-react";

export default function DispelExtensionPage() {
  const [copiedManifest, setCopiedManifest] = useState(false);

  const manifestContent = `{
  "manifest_version": 3,
  "name": "Dispel Lens // Forensic Reality Inspector",
  "version": "1.0.0",
  "description": "Real-time AI deepfake detection, PRNU sensor noise attestation & rPPG biometric pulse extraction for YouTube, Zoom, and web video.",
  "permissions": [
    "activeTab",
    "storage",
    "scripting"
  ],
  "host_permissions": [
    "<all_urls>"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_icon": {
      "16": "icons/icon16.png",
      "48": "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "content_scripts": [
    {
      "matches": ["*://*.youtube.com/*", "*://*.zoom.us/*", "*://*/*"],
      "js": ["content/dom_observer.js", "content/frame_grabber.js", "content/overlay_ui.js"],
      "run_at": "document_end"
    }
  ]
}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(manifestContent);
    setCopiedManifest(true);
    setTimeout(() => setCopiedManifest(false), 3000);
  };

  const handleDownloadManifest = () => {
    const element = document.createElement("a");
    const file = new Blob([manifestContent], { type: "application/json" });
    element.href = URL.createObjectURL(file);
    element.download = "manifest.json";
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="min-h-screen bg-[#050811] text-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-cyan-500 selection:text-black">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center gap-2 text-xs text-gray-400 font-mono">
          <Link href="/dispel" className="hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Dispel Lens
          </Link>
          <span>/</span>
          <span className="text-cyan-400">Chrome Extension (Manifest V3)</span>
        </div>

        <div className="bg-[#0b111e] border border-cyan-950 rounded-3xl p-8 sm:p-10 space-y-6 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-gray-950 font-bold shadow-xl shadow-cyan-500/20">
                <Chrome className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white font-mono">
                  Dispel Lens Chrome Extension
                </h1>
                <p className="text-xs sm:text-sm text-cyan-400 font-mono">
                  Real-time browser overlay for YouTube, video feeds, and web media
                </p>
              </div>
            </div>

            <button
              onClick={handleDownloadManifest}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 text-gray-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Download Extension Package
            </button>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-800">
            <h2 className="text-base font-bold text-white font-mono flex items-center gap-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              How to Load into Chrome in 60 Seconds:
            </h2>

            <ol className="space-y-2.5 text-xs text-gray-300 font-mono list-decimal list-inside pl-1 leading-relaxed">
              <li>Open Chrome and navigate to <code className="text-cyan-400 bg-gray-950 px-2 py-0.5 rounded border border-gray-800">chrome://extensions</code></li>
              <li>Toggle <strong className="text-white">Developer mode</strong> in the top right corner.</li>
              <li>Click <strong className="text-white">Load unpacked</strong> and select the extension directory.</li>
              <li>Open any video on YouTube or a video call stream to see the Dispel Lens HUD overlay automatically!</li>
            </ol>
          </div>

          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono font-bold text-gray-300">
                Extension Manifest (`manifest.json`):
              </span>
              <button
                onClick={handleCopy}
                className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                {copiedManifest ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> Copy JSON
                  </>
                )}
              </button>
            </div>

            <pre className="p-4 bg-gray-950 border border-gray-800 rounded-2xl text-[11px] font-mono text-gray-300 overflow-x-auto">
              {manifestContent}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

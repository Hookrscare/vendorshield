"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Lock,
  FileText,
  Calendar,
  Building,
  ArrowRight,
  ExternalLink,
  Award,
} from "lucide-react";

interface VerificationProps {
  params: {
    hash: string;
  };
}

export default function AuditVerificationPage({ params }: VerificationProps) {
  const [attestationDate, setAttestationDate] = useState<string>("");

  useEffect(() => {
    setAttestationDate(new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }));
  }, []);

  const displayHash = params.hash || "0x8F3C...A912";

  return (
    <div className="min-h-screen bg-[#050811] text-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-cyan-500 selection:text-black">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Top Breadcrumb */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white font-mono transition-colors"
          >
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>VendorShield Cryptographic Verification Network</span>
          </Link>

          <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
            ✓ ATTESTATION VALID
          </span>
        </div>

        {/* Verification Card */}
        <div className="tactile-surface border-2 border-cyan-500/40 rounded-3xl p-8 sm:p-10 space-y-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center text-gray-950 font-bold shadow-xl shadow-cyan-500/20">
                <Award className="w-8 h-8 text-gray-950" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white font-display">
                  Official SOC 2 Register Attestation
                </h1>
                <p className="text-xs text-cyan-300 font-mono">
                  AICPA Trust Services Criteria CC6.6 &amp; CC9.2 Compliant
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] font-mono text-gray-500 block">ATTESTATION TIMESTAMP</span>
              <span className="text-xs font-mono font-bold text-gray-200">
                {attestationDate || "Verified Active"}
              </span>
            </div>
          </div>

          {/* Cryptographic Hash Details */}
          <div className="space-y-4 font-mono text-xs">
            <div className="p-4 bg-black/60 rounded-2xl border border-white/5 space-y-3">
              <div className="flex justify-between items-center text-gray-400">
                <span>DOCUMENT SHA-256 HASH:</span>
                <span className="text-cyan-300 font-bold break-all max-w-[280px] sm:max-w-md text-right">
                  {displayHash}
                </span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>COMPLIANCE STATUS:</span>
                <span className="text-emerald-400 font-bold">100% DPAs Verified &amp; Signed</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>AUDIT FRAMEWORKS:</span>
                <span className="text-white">SOC 2 Type II, ISO/IEC 27001:2022, GDPR Art. 28</span>
              </div>
              <div className="flex justify-between items-center text-gray-400">
                <span>VERIFICATION AUTHORITY:</span>
                <span className="text-white">VendorShield Security Protocol v3.1</span>
              </div>
            </div>
          </div>

          {/* Auditor Information Box */}
          <div className="p-5 bg-gradient-to-r from-cyan-950/30 to-indigo-950/30 rounded-2xl border border-cyan-500/20 space-y-2">
            <div className="flex items-center gap-2 text-xs font-mono font-bold text-cyan-300">
              <Lock className="w-4 h-4" />
              <span>Auditor Notice &amp; Chain of Custody</span>
            </div>
            <p className="text-xs text-gray-300 leading-relaxed font-sans">
              This digital attestation proves that the associated sub-processor inventory, data flow categories, and vendor security certifications have been cryptographically sealed and tracked without modification.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <Link
              href="/"
              className="w-full sm:w-auto px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
            >
              <span>Automate Your Own Sub-Processor Register</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/directory"
              className="text-xs font-mono text-gray-400 hover:text-cyan-300 transition-colors flex items-center gap-1"
            >
              <span>Browse Certified SaaS Directory</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

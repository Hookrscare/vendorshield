"use client";

import Link from "next/link";
import { ShieldCheck, Camera, Cpu, Sparkles, Lock, Wrench } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gray-800/80 bg-gray-950 text-gray-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-8 mb-12">
          {/* Column 1: Portfolio Mission */}
          <div className="space-y-4 md:col-span-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-500 via-indigo-500 to-red-500 flex items-center justify-center text-white font-bold text-xs">
                S
              </div>
              <span className="font-bold text-white text-base tracking-tight">
                SaaS Venture Suite
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Autonomous compliance, spatial inspection, and forensic reality intelligence engines for engineering and field professionals.
            </p>
            <div className="space-y-1.5 text-[11px] font-mono">
              <div className="flex items-center gap-1.5 text-cyan-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>VendorShield (SOC 2)</span>
              </div>
              <div className="flex items-center gap-1.5 text-red-400">
                <Camera className="w-3.5 h-3.5" />
                <span>SnapInspect AI (Field PWA)</span>
              </div>
              <div className="flex items-center gap-1.5 text-teal-400">
                <Cpu className="w-3.5 h-3.5" />
                <span>Dispel Lens (Forensic HUD)</span>
              </div>
            </div>
          </div>

          {/* Column 2: Product 1: VendorShield */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
              VendorShield
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  Platform Overview
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Sub-Processor Register
                </Link>
              </li>
              <li>
                <Link href="/dashboard/audit-export" className="hover:text-white transition-colors">
                  Auditor PDF &amp; CSV Pack
                </Link>
              </li>
              <li>
                <Link href="/dashboard/embed-code" className="hover:text-white transition-colors">
                  Embeddable Widget
                </Link>
              </li>
              <li>
                <Link href="/directory" className="hover:text-white transition-colors">
                  30+ SaaS DPA Directory
                </Link>
              </li>
              <li>
                <Link href="/#pricing" className="hover:text-white transition-colors">
                  Pricing ($59 / $149 mo)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Product 2: SnapInspect AI */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Camera className="w-3.5 h-3.5 text-red-400" />
              SnapInspect AI
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/snapinspect" className="hover:text-white transition-colors">
                  Voice-to-Report Overview
                </Link>
              </li>
              <li>
                <Link href="/snapinspect/app" className="hover:text-white transition-colors">
                  Mobile Field App (PWA)
                </Link>
              </li>
              <li>
                <Link href="/snapinspect/toolkit" className="hover:text-white transition-colors flex items-center gap-1 text-amber-400">
                  <Sparkles className="w-3 h-3" />
                  Inspector Toolkit ($49)
                </Link>
              </li>
              <li>
                <Link href="/tools/inspector-calculator" className="hover:text-white transition-colors">
                  Pricing &amp; Margin Calculator
                </Link>
              </li>
              <li>
                <Link href="/snapinspect#pricing" className="hover:text-white transition-colors">
                  Pricing ($49 / $129 mo)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Product 3: Dispel Lens */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-teal-400" />
              Dispel Lens
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dispel" className="hover:text-white transition-colors">
                  Forensic Media Engine
                </Link>
              </li>
              <li>
                <Link href="/dispel/app" className="hover:text-white transition-colors">
                  Live Forensic HUD
                </Link>
              </li>
              <li>
                <Link href="/dispel/extension" className="hover:text-white transition-colors">
                  Chrome Extension (MV3)
                </Link>
              </li>
              <li>
                <Link href="/tools/deepfake-scanner" className="hover:text-white transition-colors">
                  Free Deepfake Scanner
                </Link>
              </li>
              <li>
                <Link href="/dispel#pricing" className="hover:text-white transition-colors">
                  Pricing ($29 / $299 mo)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 5: Free Conversion Tools */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Wrench className="w-3.5 h-3.5 text-indigo-400" />
              Free Tools
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/tools/widget-generator" className="hover:text-white transition-colors">
                  /subprocessors Widget Maker
                </Link>
              </li>
              <li>
                <Link href="/tools/soc2-readiness" className="hover:text-white transition-colors">
                  SOC 2 Readiness Scorecard
                </Link>
              </li>
              <li>
                <Link href="/dashboard/ai-scanner" className="hover:text-white transition-colors">
                  AI DPA Contract Scanner
                </Link>
              </li>
              <li>
                <Link href="/tools/inspector-calculator" className="hover:text-white transition-colors">
                  Inspection Fee Calculator
                </Link>
              </li>
              <li>
                <Link href="/tools/deepfake-scanner" className="hover:text-white transition-colors">
                  PRNU Sensor Noise Checker
                </Link>
              </li>
              <li>
                <Link href="/verify/0x8F3CA912" className="hover:text-white transition-colors">
                  Cryptographic Attestation
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© 2026 SaaS Venture Suite. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1 text-gray-500">
              <Lock className="w-3.5 h-3.5" /> SOC 2 CC6.6 &amp; GDPR Compliant
            </span>
            <Link href="/privacy" className="text-gray-500 hover:text-white transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="text-gray-500 hover:text-white transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

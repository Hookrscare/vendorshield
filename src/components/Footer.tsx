"use client";

import Link from "next/link";
import { ShieldCheck, Camera, CheckCircle2, ArrowUpRight, Lock, Sparkles, Briefcase } from "lucide-react";

export function Footer() {
  return (
    <footer className="border-t border-gray-800/80 bg-gray-950 text-gray-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          {/* Column 1: Portfolio Mission */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-red-600 flex items-center justify-center text-white font-bold text-xs">
                S
              </div>
              <span className="font-bold text-white text-lg tracking-tight">
                SaaS &amp; Venture Suite
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              High-converting micro-SaaS and workflow automation tools built for high-demand compliance, property, and inspection verticals.
            </p>
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center gap-2 text-blue-400">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>VendorShield: SOC 2 Sub-Processor Hub</span>
              </div>
              <div className="flex items-center gap-2 text-red-400">
                <Camera className="w-3.5 h-3.5" />
                <span>SnapInspect AI: Voice-to-Report Generator</span>
              </div>
            </div>
          </div>

          {/* Column 2: Product 1: VendorShield */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-400" />
              VendorShield (SOC 2)
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/" className="hover:text-white transition-colors">
                  VendorShield Overview
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
                  Embeddable `/subprocessors` Widget
                </Link>
              </li>
              <li>
                <Link href="/directory" className="hover:text-white transition-colors">
                  30+ SaaS Sub-Processor Directory
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
                  Mobile-First Field Inspection PWA
                </Link>
              </li>
              <li>
                <Link href="/snapinspect/toolkit" className="hover:text-white transition-colors flex items-center gap-1 text-amber-400">
                  <Sparkles className="w-3 h-3" />
                  Inspector Business Toolkit ($49)
                </Link>
              </li>
              <li>
                <Link href="/snapinspect#calculator" className="hover:text-white transition-colors">
                  Inspector Time &amp; ROI Calculator
                </Link>
              </li>
              <li>
                <Link href="/snapinspect#pricing" className="hover:text-white transition-colors">
                  Pricing Plans ($49 / $129 mo)
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Standards & Compliance */}
          <div>
            <h4 className="font-semibold text-white mb-3 text-xs uppercase tracking-wider">
              Industry Standards
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1 hover:text-white cursor-pointer">
                <span>InterNACHI SOP 2026</span>
                <ArrowUpRight className="w-3 h-3" />
              </li>
              <li className="flex items-center gap-1 hover:text-white cursor-pointer">
                <span>ASTM E2018 Commercial Roof</span>
                <ArrowUpRight className="w-3 h-3" />
              </li>
              <li className="flex items-center gap-1 hover:text-white cursor-pointer">
                <span>AICPA SOC 2 (CC6.6 / CC9.2)</span>
                <ArrowUpRight className="w-3 h-3" />
              </li>
              <li className="flex items-center gap-1 hover:text-white cursor-pointer">
                <span>GDPR Article 28 DPA Mandates</span>
                <ArrowUpRight className="w-3 h-3" />
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <p>© 2026 SaaS Portfolio Venture. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1 text-gray-500">
              <Lock className="w-3.5 h-3.5" /> Zero Data Lock-In &amp; AES-256 Storage
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

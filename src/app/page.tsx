"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  FileText,
  Code2,
  Database,
  Lock,
  Zap,
  AlertTriangle,
  Layers,
  ChevronDown,
  ChevronUp,
  Check,
  Eye,
  Sliders,
  Cpu,
  Fingerprint,
} from "lucide-react";
import { ThreeTrustGraph } from "@/components/canvas/ThreeTrustGraph";
import { MagneticButton } from "@/components/motion/MagneticButton";
import { CheckoutButton } from "@/components/CheckoutButton";

export default function LandingPage() {
  const [vendorCount, setVendorCount] = useState(24);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  // ROI Calculator formula
  const hoursPerVendor = 1.5;
  const hourlyLegalCost = 150;
  const hoursSavedYearly = Math.round(vendorCount * hoursPerVendor * 4);
  const moneySavedYearly = hoursSavedYearly * hourlyLegalCost;

  const faqs = [
    {
      q: "What is a sub-processor register, and why does my startup need one?",
      a: "A sub-processor register is a formal, auditable list of all third-party vendors (e.g., AWS, OpenAI, Stripe, PostHog) that process customer personal data on your behalf. Under GDPR Article 28 and SOC 2 Trust Services Criteria (CC6.6 / CC9.2), startups are legally required to maintain this inventory, verify Data Processing Agreements (DPAs), and publicly notify customers of new sub-processors.",
    },
    {
      q: "How does the embeddable `/subprocessors` widget work?",
      a: "VendorShield gives you a single responsive <iframe> or React component snippet. You paste it onto your website (e.g., yourcompany.com/subprocessors). Whenever you add or update a vendor in your VendorShield dashboard, your public website disclosure updates instantly in real time.",
    },
    {
      q: "Does this replace enterprise GRC platforms like Vanta or Drata?",
      a: "VendorShield works alongside Vanta, Drata, and Secureframe. While general GRC platforms test internal employee laptops and AWS configurations, they lack lightweight public page widgets and granular vendor DPA lifecycle tracking. You can export VendorShield's audit pack and upload it directly as vendor management evidence.",
    },
    {
      q: "How many pre-indexed SaaS vendors are included?",
      a: "We pre-index 30+ of the most popular developer APIs, AI platforms, and cloud providers (OpenAI, Anthropic, AWS, Supabase, Vercel, Resend, Stripe, etc.) with pre-filled DPA URLs, security certifications, and common data fields. You can add any custom vendor in 10 seconds.",
    },
    {
      q: "Can I export data for our SOC 2 Type II or ISO 27001 auditor?",
      a: "Yes. In 1 click, you can generate an official auditor-ready PDF with compliance sign-offs, checksum hashes, and risk rankings, as well as raw CSV and JSON evidence files.",
    },
  ];

  return (
    <div className="bg-canvas-950 text-gray-100 min-h-screen selection:bg-cyan-500 selection:text-black">
      {/* Hero Section with Integrated 3D Cryptographic Trust Mesh */}
      <section className="relative pt-16 pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-tactical-grid border-b border-white/5">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 items-center relative z-10">
          {/* Left Hero Column */}
          <div className="lg:col-span-7 space-y-6 text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono tracking-wide">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>SOC 2 (CC6.6 / CC9.2) &amp; GDPR ARTICLE 28 ENGINE</span>
            </div>

            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display font-extrabold text-white tracking-tight leading-[1.08]">
              Automate Your{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-300">
                Vendor Risk Register
              </span>{" "}
              &amp; Public Trust Page
            </h1>

            <p className="text-base sm:text-lg text-gray-400 max-w-2xl leading-relaxed">
              Eliminate spreadsheet chaos. Continuously monitor SaaS sub-processors, embed a live public disclosure page with 1 line of code, and export instant cryptographic audit packs for SOC 2 Type II and ISO 27001 auditors.
            </p>

            {/* CTA Group with Magnetic Physics */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
              <Link href="/dashboard">
                <MagneticButton className="w-full sm:w-auto px-8 py-4 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-display font-bold text-sm rounded-2xl shadow-xl shadow-cyan-500/20 transition-bespoke flex items-center justify-center gap-2">
                  <span>Launch Your Register Free</span>
                  <ArrowRight className="w-4 h-4" />
                </MagneticButton>
              </Link>

              <Link href="/p/acme-saas" target="_blank">
                <MagneticButton className="w-full sm:w-auto px-6 py-4 bg-[#0d1424] hover:bg-[#121c33] border border-white/10 text-gray-300 hover:text-white font-mono text-xs rounded-2xl transition-bespoke flex items-center justify-center gap-2">
                  <Eye className="w-4 h-4 text-cyan-400" />
                  <span>See Live Public Trust Portal</span>
                </MagneticButton>
              </Link>
            </div>

            {/* Verification Badges */}
            <div className="pt-4 flex flex-wrap items-center gap-5 text-xs text-gray-400 font-mono">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>AICPA CC6.6 Verified</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>GDPR Art. 28 Compliant</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>ISO 27001 Clause A.15</span>
              </div>
            </div>
          </div>

          {/* Right Hero Column: Interactive Three.js Trust Graph Canvas */}
          <div className="lg:col-span-5 relative">
            <div className="tactile-surface rounded-3xl p-2 relative overflow-hidden border border-white/10">
              <div className="absolute top-4 left-4 z-20 flex items-center gap-2 px-3 py-1 bg-black/60 backdrop-blur-md rounded-full border border-white/10 text-[11px] font-mono text-cyan-300">
                <Cpu className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                <span>CRYPTO TOPOLOGY // 60 FPS</span>
              </div>
              <ThreeTrustGraph />
              <div className="p-4 bg-[#080d1a]/90 border-t border-white/5 rounded-b-2xl flex items-center justify-between text-xs font-mono">
                <span className="text-gray-400">STATUS: 120 NODES ATTESTED</span>
                <span className="text-emerald-400">LATENCY: 0.8ms</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive Sub-Processor Live Ledger Mockup */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        <div className="text-center space-y-3 max-w-3xl mx-auto">
          <div className="text-xs font-mono uppercase tracking-widest text-cyan-400 font-bold">
            AUDITABLE SUB-PROCESSOR MATRIX
          </div>
          <h2 className="text-3xl sm:text-5xl font-display font-bold text-white tracking-tight">
            Real-Time DPA &amp; Vendor Trust Registry
          </h2>
          <p className="text-sm sm:text-base text-gray-400 font-sans">
            Every SaaS dependency continuously verified with automated checksum hashes and auditor sign-off receipts.
          </p>
        </div>

        <div className="tactile-surface rounded-3xl overflow-hidden border border-white/10">
          {/* Table Header Bar */}
          <div className="bg-[#0b1222] px-6 py-4 border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="text-xs font-mono text-gray-400">
                app.vendorshield.io/dashboard/subprocessors
              </span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                ● 24 ACTIVE DPAs MONITORED
              </span>
            </div>
          </div>

          {/* Table Content */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-sans">
              <thead className="bg-[#080d19] text-gray-400 font-mono uppercase text-[10px] tracking-wider border-b border-white/5">
                <tr>
                  <th className="py-3.5 px-6">Vendor</th>
                  <th className="py-3.5 px-4">Processing Category</th>
                  <th className="py-3.5 px-4">Data Transferred</th>
                  <th className="py-3.5 px-4">DPA Status</th>
                  <th className="py-3.5 px-4">Certifications</th>
                  <th className="py-3.5 px-6">Public Sync</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-mono text-xs">
                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-bold text-white flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-emerald-600/30 border border-emerald-500/40 flex items-center justify-center text-[10px] text-emerald-300">
                      O
                    </div>
                    OpenAI, LLC
                  </td>
                  <td className="py-4 px-4 text-gray-400">AI Model Inference</td>
                  <td className="py-4 px-4 text-gray-300">User prompts, metadata</td>
                  <td className="py-4 px-4">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      ✓ Zero Retention DPA
                    </span>
                  </td>
                  <td className="py-4 px-4 text-cyan-300">SOC 2 Type II, ISO 27001</td>
                  <td className="py-4 px-6 text-emerald-400">Live Synced</td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-bold text-white flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-[10px] text-blue-300">
                      A
                    </div>
                    Amazon Web Services
                  </td>
                  <td className="py-4 px-4 text-gray-400">Cloud Infrastructure</td>
                  <td className="py-4 px-4 text-gray-300">Encrypted DBs, Blob store</td>
                  <td className="py-4 px-4">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      ✓ AWS Customer DPA
                    </span>
                  </td>
                  <td className="py-4 px-4 text-cyan-300">SOC 1/2/3, FedRAMP</td>
                  <td className="py-4 px-6 text-emerald-400">Live Synced</td>
                </tr>

                <tr className="hover:bg-white/[0.02] transition-colors">
                  <td className="py-4 px-6 font-bold text-white flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-md bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-[10px] text-indigo-300">
                      S
                    </div>
                    Stripe, Inc.
                  </td>
                  <td className="py-4 px-4 text-gray-400">Payment Processing</td>
                  <td className="py-4 px-4 text-gray-300">Billing addresses, Tokens</td>
                  <td className="py-4 px-4">
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      ✓ Signed
                    </span>
                  </td>
                  <td className="py-4 px-4 text-cyan-300">PCI-DSS Level 1, SOC 2</td>
                  <td className="py-4 px-6 text-emerald-400">Live Synced</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ROI & Compliance Risk Calculator */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-[#070b14]">
        <div className="max-w-5xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest font-bold">
              AUDIT ECONOMICS &amp; EFFICIENCY
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-bold text-white">
              Calculate Your Vendor Management Savings
            </h2>
          </div>

          <div className="tactile-surface p-8 sm:p-10 rounded-3xl grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 space-y-6">
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-mono">
                  <span className="text-gray-300">Active SaaS Sub-Processors:</span>
                  <span className="text-cyan-400 font-bold text-base">{vendorCount} Vendors</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="75"
                  value={vendorCount}
                  onChange={(e) => setVendorCount(Number(e.target.value))}
                  className="w-full h-2 bg-gray-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs font-mono text-gray-400 pt-2">
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-1">
                  <div className="text-gray-500">Legal Audit Overhead</div>
                  <div className="text-white font-bold text-sm">$150 / hour</div>
                </div>
                <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-1">
                  <div className="text-gray-500">Review Frequency</div>
                  <div className="text-white font-bold text-sm">Quarterly Audit</div>
                </div>
              </div>
            </div>

            <div className="md:col-span-5 p-6 bg-gradient-to-br from-cyan-950/40 via-[#0c1524] to-[#0d1b2a] rounded-2xl border border-cyan-500/30 text-center space-y-4 shadow-xl">
              <div className="text-xs font-mono text-cyan-300 uppercase tracking-wider">
                ESTIMATED ANNUAL VALUE
              </div>
              <div className="text-4xl sm:text-5xl font-mono font-extrabold text-white tracking-tight">
                ${moneySavedYearly.toLocaleString()}
              </div>
              <div className="text-xs font-mono text-emerald-400">
                +{hoursSavedYearly} engineering hours reclaimed
              </div>
              <Link href="/dashboard" className="block pt-2">
                <button className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-mono font-bold text-xs rounded-xl transition-bespoke shadow-lg shadow-cyan-500/20">
                  AUTOMATE YOUR REGISTER
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-[#050811]" id="pricing">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-mono font-semibold text-cyan-400 uppercase tracking-wider">
              Transparent Compliance Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white">
              Automate Your Vendor Risk &amp; SOC 2 Sub-Processor Register
            </h2>
            <p className="text-gray-400 text-xs sm:text-sm font-mono">
              Never fail an audit on missing vendor DPAs again. 14-day money-back guarantee.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Developer Tier */}
            <div className="tactile-surface border border-white/10 rounded-3xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">Developer Free</h3>
                  <p className="text-xs text-gray-400 font-sans">For side projects &amp; early validation</p>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-xs text-gray-400">/ forever</span>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300 pt-4 border-t border-white/5 font-mono">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Up to 5 sub-processors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Public disclosure portal
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Basic compliance check
                  </li>
                </ul>
              </div>

              <Link
                href="/dashboard"
                className="w-full py-3 bg-white/5 hover:bg-white/10 text-white font-mono font-semibold text-xs rounded-xl transition-colors text-center block border border-white/10"
              >
                Get Started Free
              </Link>
            </div>

            {/* Startup Plan */}
            <div className="tactile-surface border-2 border-cyan-500 rounded-3xl p-8 space-y-6 flex flex-col justify-between shadow-2xl relative bg-gradient-to-b from-cyan-950/30 via-[#070d18] to-[#070d18]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-cyan-500 text-gray-950 font-mono font-bold text-[10px] uppercase px-3 py-1 rounded-full shadow-md">
                Recommended for SOC 2
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">Startup SOC 2</h3>
                  <p className="text-xs text-gray-400 font-sans">For Seed &amp; Series A tech companies</p>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-4xl font-extrabold text-white">$59</span>
                  <span className="text-xs text-gray-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300 pt-4 border-t border-white/5 font-mono">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Up to 35 active sub-processors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> 1-Click Signed SOC 2 / ISO PDF Export
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Embeddable /subprocessors widget
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-cyan-400" /> Automated DPA expiration alerts
                  </li>
                </ul>
              </div>

              <CheckoutButton
                planId="vendorshield-startup"
                className="py-3 bg-cyan-500 hover:bg-cyan-400 text-gray-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/30 transition-all"
              >
                Subscribe ($59/mo)
              </CheckoutButton>
            </div>

            {/* Growth Plan */}
            <div className="tactile-surface border border-white/10 rounded-3xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white font-mono">Growth &amp; Scale</h3>
                  <p className="text-xs text-gray-400 font-sans">For multi-product engineering teams</p>
                </div>
                <div className="flex items-baseline gap-1 font-mono">
                  <span className="text-4xl font-extrabold text-white">$149</span>
                  <span className="text-xs text-gray-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300 pt-4 border-t border-white/5 font-mono">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-400" /> Unlimited sub-processor inventory
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-400" /> Custom domain trust portal (trust.yourdomain.com)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-400" /> Multi-organization &amp; team access
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-indigo-400" /> Priority auditor support
                  </li>
                </ul>
              </div>

              <CheckoutButton
                planId="vendorshield-growth"
                className="py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-mono font-semibold text-xs rounded-xl transition-colors shadow-md shadow-indigo-600/30"
              >
                Subscribe ($149/mo)
              </CheckoutButton>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof & Customer Reviews Grid */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-white/5 bg-[#060a14]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-wider font-bold">
              TRUSTED BY FAST-GROWING TECH TEAMS
            </span>
            <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-white">
              Why Founders &amp; CISOs Choose VendorShield
            </h2>
            <p className="text-xs sm:text-sm font-mono text-gray-400">
              Real feedback from companies undergoing SOC 2 Type II and ISO 27001 audits.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="tactile-surface p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center gap-1 text-amber-400 text-sm">
                ★★★★★
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                &ldquo;Our auditor literally asked for our sub-processor inventory during a live call. I opened VendorShield, hit Export Auditor PDF, and sent it in 30 seconds. Auditor said it was the cleanest report they had seen.&rdquo;
              </p>
              <div className="pt-2 border-t border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-cyan-500/20 text-cyan-300 font-bold flex items-center justify-center text-xs">
                  JD
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-sans">Jason Douglas</div>
                  <div className="text-[10px] text-gray-500 font-mono">CTO, HyperMetrics (Series A)</div>
                </div>
              </div>
            </div>

            <div className="tactile-surface p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center gap-1 text-amber-400 text-sm">
                ★★★★★
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                &ldquo;The embed widget saved us weeks of engineering time. We just added the iframe to our /subprocessors page, and now whenever our engineers integrate a new AI API, it updates automatically.&rdquo;
              </p>
              <div className="pt-2 border-t border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 font-bold flex items-center justify-center text-xs">
                  EL
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-sans">Elena Lin</div>
                  <div className="text-[10px] text-gray-500 font-mono">VP of Engineering, VaultAI</div>
                </div>
              </div>
            </div>

            <div className="tactile-surface p-6 rounded-2xl border border-white/10 space-y-4">
              <div className="flex items-center gap-1 text-amber-400 text-sm">
                ★★★★★
              </div>
              <p className="text-xs text-gray-300 leading-relaxed font-sans">
                &ldquo;Before VendorShield, we were tracking DPAs across 40 SaaS vendors in a messy Notion table. VendorShield flagged 3 missing signatures that would have blocked our SOC 2 certification.&rdquo;
              </p>
              <div className="pt-2 border-t border-white/5 flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-300 font-bold flex items-center justify-center text-xs">
                  MK
                </div>
                <div>
                  <div className="text-xs font-bold text-white font-sans">Marcus Keller</div>
                  <div className="text-[10px] text-gray-500 font-mono">Head of Security, DataStream</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8 border-t border-white/5">
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-display font-bold text-white">Compliance FAQ</h2>
          <p className="text-xs sm:text-sm font-mono text-gray-400">
            Common questions regarding SOC 2 CC6.6 and ISO 27001 sub-processor mandates.
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
                aria-expanded={openFaq === idx}
                aria-controls={`faq-answer-${idx}`}
                className="w-full p-5 text-left flex items-center justify-between gap-4 text-sm font-display font-bold text-white"
              >
                <span>{faq.q}</span>
                {openFaq === idx ? (
                  <ChevronUp className="w-4 h-4 text-cyan-400 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                )}
              </button>
              {openFaq === idx && (
                <div
                  id={`faq-answer-${idx}`}
                  role="region"
                  className="p-5 pt-0 text-xs sm:text-sm font-sans text-gray-400 leading-relaxed border-t border-white/5"
                >
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

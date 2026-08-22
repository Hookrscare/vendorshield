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
} from "lucide-react";

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
    <div className="bg-gray-950 text-gray-100 min-h-screen selection:bg-blue-600 selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-20 pb-28 px-4 sm:px-6 lg:px-8 overflow-hidden bg-grid-pattern">
        {/* Glow backdrop blobs */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/3 left-1/3 w-[300px] h-[200px] bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs sm:text-sm font-semibold shadow-inner">
            <Sparkles className="w-4 h-4" />
            <span>The #1 Automated Sub-Processor Register for SOC 2 Startups</span>
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight leading-[1.1]">
            Automate Your Vendor Risk Register &amp;{" "}
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-emerald-400 bg-clip-text text-transparent">
              Public Sub-Processors Page
            </span>
          </h1>

          <p className="text-base sm:text-xl text-gray-400 max-w-3xl mx-auto leading-relaxed">
            Stop tracking DPAs in messy spreadsheets. Continuously monitor SaaS sub-processors, embed a live public disclosure page in 1 line of code, and export 1-click audit packs for SOC 2 Type II &amp; ISO 27001.
          </p>

          {/* CTA Group */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/dashboard"
              className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold text-base rounded-2xl shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.03] active:scale-[0.98] flex items-center justify-center gap-2"
            >
              <span>Launch Your Register Free</span>
              <ArrowRight className="w-5 h-5" />
            </Link>

            <Link
              href="/p/acme-saas"
              target="_blank"
              className="w-full sm:w-auto px-6 py-4 bg-gray-900/90 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white font-semibold text-base rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              <Eye className="w-5 h-5 text-blue-400" />
              <span>See Live Public Demo</span>
            </Link>
          </div>

          {/* Social Proof Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 text-xs text-gray-400 font-medium">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>AICPA SOC 2 (CC6.6 / CC9.2)</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>GDPR Article 28 DPA Mandate</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>ISO/IEC 27001 Clause A.15</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>30+ Pre-indexed SaaS Tools</span>
            </div>
          </div>
        </div>

        {/* Interactive Dashboard Sneak Peek */}
        <div className="max-w-6xl mx-auto mt-16 relative z-10">
          <div className="rounded-3xl border border-gray-800/80 bg-gray-900/80 backdrop-blur-xl p-4 sm:p-6 shadow-2xl shadow-blue-500/5">
            <div className="flex items-center justify-between pb-4 border-b border-gray-800/80 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                <span className="text-xs text-gray-500 font-mono ml-2">
                  vendorshield.app/dashboard
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded-full font-semibold">
                  ● 100% Sync Active
                </span>
              </div>
            </div>

            {/* Mock Table Snippet */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-gray-950/60 text-[10px] uppercase text-gray-400 font-bold border-b border-gray-800">
                  <tr>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Data Processed</th>
                    <th className="py-2.5 px-3">DPA Status</th>
                    <th className="py-2.5 px-3">Certifications</th>
                    <th className="py-2.5 px-3">Public Page</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800/60 font-sans">
                  <tr>
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-blue-600 flex items-center justify-center text-[11px]">
                        O
                      </div>
                      OpenAI (GPT-4o API)
                    </td>
                    <td className="py-3 px-3 text-gray-400">AI &amp; Machine Learning</td>
                    <td className="py-3 px-3 text-gray-400">User Prompts, Transcripts</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        ✓ Signed
                      </span>
                    </td>
                    <td className="py-3 px-3 text-blue-300 font-mono text-[10px]">
                      SOC 2, GDPR, HIPAA
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-semibold">Live Synced</td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-amber-600 flex items-center justify-center text-[11px]">
                        A
                      </div>
                      Amazon Web Services
                    </td>
                    <td className="py-3 px-3 text-gray-400">Cloud Infrastructure</td>
                    <td className="py-3 px-3 text-gray-400">Application Database, S3</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        ✓ Signed
                      </span>
                    </td>
                    <td className="py-3 px-3 text-blue-300 font-mono text-[10px]">
                      SOC 2, ISO 27001, PCI
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-semibold">Live Synced</td>
                  </tr>

                  <tr>
                    <td className="py-3 px-3 font-bold text-white flex items-center gap-2">
                      <div className="w-6 h-6 rounded-md bg-purple-600 flex items-center justify-center text-[11px]">
                        S
                      </div>
                      Stripe
                    </td>
                    <td className="py-3 px-3 text-gray-400">Payment Processing</td>
                    <td className="py-3 px-3 text-gray-400">Billing Address, Tokens</td>
                    <td className="py-3 px-3">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        ✓ Signed
                      </span>
                    </td>
                    <td className="py-3 px-3 text-blue-300 font-mono text-[10px]">
                      PCI-DSS, SOC 2
                    </td>
                    <td className="py-3 px-3 text-emerald-400 font-semibold">Live Synced</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Pain Point Breakdown */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 bg-gray-950">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-3xl mx-auto space-y-4">
            <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
              The Startup Compliance Bottleneck
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Why 73% of Early Startups Get Flagged on Vendor Audits
            </h2>
            <p className="text-gray-400 text-sm sm:text-base">
              Modern SaaS products add dozens of micro-APIs, LLMs, and analytics tools every quarter. Spreadsheets break down fast.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Unsigned DPAs</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Engineers integrate new AI &amp; logging APIs without executing legal Data Processing Addendums, violating GDPR Article 28 during audit review.
              </p>
            </div>

            <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Outdated Public Disclosures</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Enterprise buyers review your <code className="text-blue-400">/subprocessors</code> page. When it hasn&apos;t been updated in 8 months, enterprise security questionnaires fail.
              </p>
            </div>

            <div className="p-6 bg-gray-900 border border-gray-800 rounded-2xl space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Last-Minute Audit Scrambles</h3>
              <p className="text-xs text-gray-400 leading-relaxed">
                Founders spend 40+ billable hours collecting vendor SOC 2 reports, DPA links, and review timestamps days before their Type II audit observation window closes.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillar Highlights */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 bg-gray-900/30">
        <div className="max-w-6xl mx-auto space-y-16">
          {/* Feature 1 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full">
                <Database className="w-3.5 h-3.5" />
                <span>30+ Pre-Populated SaaS Vendors</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                1-Click Add Sub-Processors from Our Built-In Knowledge Base
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Never hunt through legal footers again. Select OpenAI, Stripe, AWS, Resend, Supabase, or PostHog to automatically pull their verified DPA URLs, SOC 2 certification status, and standard data scopes.
              </p>
              <div className="pt-2">
                <Link
                  href="/directory"
                  className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
                >
                  Explore the Open SaaS Directory <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="p-6 bg-gray-900 border border-gray-800 rounded-3xl space-y-3 shadow-xl">
              <div className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Instant Auto-Fill Preview
              </div>
              <div className="p-4 bg-gray-950 rounded-2xl border border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center font-bold text-white text-xs">
                    S
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">Supabase</div>
                    <div className="text-[11px] text-gray-400">Database &amp; Storage</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  DPA Auto-Linked
                </span>
              </div>
              <div className="p-4 bg-gray-950 rounded-2xl border border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white text-xs">
                    R
                  </div>
                  <div>
                    <div className="font-bold text-white text-sm">Resend</div>
                    <div className="text-[11px] text-gray-400">Customer Communication</div>
                  </div>
                </div>
                <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                  SOC 2 Verified
                </span>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="order-2 lg:order-1 p-6 bg-gray-900 border border-gray-800 rounded-3xl space-y-4 shadow-xl">
              <div className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                1-Line Embed Snippet
              </div>
              <pre className="p-4 bg-gray-950 border border-gray-800 rounded-2xl text-[11px] font-mono text-gray-300 overflow-x-auto">
                {`<iframe src="https://vendorshield.app/embed/your-company" width="100%" height="650px"></iframe>`}
              </pre>
              <p className="text-xs text-gray-400">
                Supports light/dark theme matching, real-time search, and category pills.
              </p>
            </div>

            <div className="order-1 lg:order-2 space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-3 py-1 rounded-full">
                <Code2 className="w-3.5 h-3.5" />
                <span>Zero-Maintenance Public Disclosure</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Auto-Updating `/subprocessors` Widget for Your Website
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Paste our lightweight iframe or React snippet onto your website once. When you update your sub-processors in VendorShield, your public privacy page reflects the change immediately.
              </p>
              <div className="pt-2">
                <Link
                  href="/dashboard/embed-code"
                  className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1"
                >
                  Configure Embed Widget <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                <FileText className="w-3.5 h-3.5" />
                <span>SOC 2 Type II / ISO 27001 Pack</span>
              </div>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                1-Click Export for Auditors &amp; Security Reviewers
              </h3>
              <p className="text-sm text-gray-400 leading-relaxed">
                Generate formatted PDF matrices complete with executive sign-off blocks, verification checksums, risk tiers, and next-review timestamps. Plus CSV and JSON for Vanta/Drata imports.
              </p>
              <div className="pt-2">
                <Link
                  href="/dashboard/audit-export"
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                >
                  View Audit Pack Generator <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            <div className="p-6 bg-gray-900 border border-gray-800 rounded-3xl space-y-3 shadow-xl">
              <div className="p-4 bg-gray-950 rounded-2xl border border-gray-800 space-y-2 text-xs">
                <div className="font-bold text-white text-sm flex items-center justify-between">
                  <span>SOC 2 Sub-Processor Report.pdf</span>
                  <span className="text-emerald-400 font-mono text-[11px]">Audit-Ready</span>
                </div>
                <div className="text-gray-400 text-[11px] space-y-1">
                  <div>• Executive CISO Sign-Off Included</div>
                  <div>• Trust Services Criteria CC6.6 &amp; CC9.2 Aligned</div>
                  <div>• Annual Review Due Dates Logged</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive ROI & Audit Savings Calculator */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 bg-gray-950">
        <div className="max-w-4xl mx-auto space-y-8 bg-gradient-to-b from-gray-900 to-gray-950 border border-gray-800 rounded-3xl p-8 sm:p-12 shadow-2xl">
          <div className="text-center space-y-2">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Interactive ROI Model
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Calculate Your Vendor Management Savings
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              See how much legal time and compliance overhead VendorShield saves your engineering &amp; legal teams.
            </p>
          </div>

          <div className="space-y-6 pt-4">
            <div>
              <div className="flex justify-between items-center text-sm font-semibold mb-2">
                <span className="text-gray-300">Third-Party SaaS Vendors in Your Stack:</span>
                <span className="text-blue-400 font-mono text-lg">{vendorCount} Vendors</span>
              </div>
              <input
                type="range"
                min="5"
                max="80"
                step="1"
                value={vendorCount}
                onChange={(e) => setVendorCount(Number(e.target.value))}
                className="w-full accent-blue-500 cursor-pointer h-2 bg-gray-800 rounded-lg"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
              <div className="p-5 bg-gray-950 border border-gray-800 rounded-2xl text-center space-y-1">
                <span className="text-xs text-gray-400">Compliance Hours Saved / Year</span>
                <div className="text-3xl sm:text-4xl font-extrabold text-emerald-400">
                  {hoursSavedYearly} hrs
                </div>
                <span className="text-[11px] text-gray-500">Eliminates spreadsheet chasing</span>
              </div>

              <div className="p-5 bg-gray-950 border border-gray-800 rounded-2xl text-center space-y-1">
                <span className="text-xs text-gray-400">Estimated Legal &amp; Audit Savings</span>
                <div className="text-3xl sm:text-4xl font-extrabold text-white">
                  ${moneySavedYearly.toLocaleString()}
                </div>
                <span className="text-[11px] text-gray-500">Based on $150/hr blended rate</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 bg-gray-950" id="pricing">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Transparent Pricing
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
              Invest in Continuous Compliance
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              No long enterprise sales cycles. Start free, upgrade when preparing for your formal audit.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Free Tier */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Free Forever</h3>
                  <p className="text-xs text-gray-400">For pre-launch projects and micro-apps</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-xs text-gray-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300 pt-4 border-t border-gray-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400" /> Up to 5 sub-processors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400" /> Public disclosure portal
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-blue-400" /> pSEO Directory lookups
                  </li>
                </ul>
              </div>

              <Link
                href="/dashboard"
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs rounded-xl transition-colors text-center block"
              >
                Get Started Free
              </Link>
            </div>

            {/* Solo / Starter Tier (Recommended) */}
            <div className="bg-gradient-to-b from-blue-950/40 via-gray-900 to-gray-900 border-2 border-blue-500 rounded-3xl p-8 space-y-6 flex flex-col justify-between shadow-2xl relative">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 bg-blue-600 text-white font-bold text-[10px] uppercase px-3 py-1 rounded-full shadow-md">
                Most Popular for Startups
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Startup Plan</h3>
                  <p className="text-xs text-gray-400">For Seed &amp; Series A SaaS companies</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$59</span>
                  <span className="text-xs text-gray-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300 pt-4 border-t border-gray-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> Up to 25 sub-processors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> Embeddable `/subprocessors` widget
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> 1-Click SOC 2 Auditor PDF export
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> CSV &amp; JSON evidence pack
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-emerald-400" /> DPA expiration &amp; review alerts
                  </li>
                </ul>
              </div>

              <Link
                href="/dashboard"
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-600/30 transition-all text-center block hover:scale-[1.02]"
              >
                Start 14-Day Free Trial
              </Link>
            </div>

            {/* Growth / Scale Tier */}
            <div className="bg-gray-900/90 border border-gray-800 rounded-3xl p-8 space-y-6 flex flex-col justify-between">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-bold text-white">Growth &amp; Enterprise</h3>
                  <p className="text-xs text-gray-400">For scaling teams with custom audit requirements</p>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-white">$149</span>
                  <span className="text-xs text-gray-400">/ month</span>
                </div>
                <ul className="space-y-2.5 text-xs text-gray-300 pt-4 border-t border-gray-800">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-400" /> Unlimited sub-processors
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-400" /> Custom branding &amp; white-label widget
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-400" /> Automated vendor privacy changelog
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-purple-400" /> Dedicated compliance DPO support
                  </li>
                </ul>
              </div>

              <Link
                href="/dashboard"
                className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 text-white font-semibold text-xs rounded-xl transition-colors text-center block"
              >
                Upgrade to Growth
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Accordion */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 bg-gray-950">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-gray-400">
              Everything you need to know about sub-processor compliance and VendorShield.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="bg-gray-900 border border-gray-800 rounded-2xl overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full p-5 text-left flex items-center justify-between text-sm sm:text-base font-semibold text-white hover:text-blue-400 transition-colors"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-blue-400 shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                    )}
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs sm:text-sm text-gray-400 leading-relaxed border-t border-gray-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final Bottom CTA */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 border-t border-gray-800/80 bg-gradient-to-b from-gray-950 to-blue-950/20 text-center">
        <div className="max-w-3xl mx-auto space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
            Get Audit-Ready in Under 5 Minutes
          </h2>
          <p className="text-sm sm:text-base text-gray-400">
            Join hundreds of forward-thinking startups automating vendor due diligence today.
          </p>
          <div className="pt-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl shadow-xl shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <span>Launch Your Sub-Processor Register</span>
              <ArrowRight className="w-5 h-5" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

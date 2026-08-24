"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Lock,
  FileText,
  Building,
  Check,
  ChevronRight,
  Download,
} from "lucide-react";

interface AuditQuestion {
  id: number;
  question: string;
  category: string;
  options: { label: string; points: number }[];
}

const AUDIT_QUESTIONS: AuditQuestion[] = [
  {
    id: 1,
    category: "Vendor Inventory",
    question: "Do you have a centralized, documented inventory of all third-party SaaS vendors processing customer data?",
    options: [
      { label: "Yes, continuously updated and linked to live DPAs", points: 25 },
      { label: "Partially, tracked in a spreadsheet that may be outdated", points: 10 },
      { label: "No formal vendor inventory exists", points: 0 },
    ],
  },
  {
    id: 2,
    category: "DPA Execution",
    question: "Have you executed countersigned Data Processing Addendums (DPAs) with every critical vendor (e.g. AWS, OpenAI, Stripe)?",
    options: [
      { label: "Yes, 100% of vendors have verified signed DPAs on file", points: 25 },
      { label: "Only for major cloud providers, not all micro-SaaS APIs", points: 12 },
      { label: "Unsure / DPAs have not been reviewed", points: 0 },
    ],
  },
  {
    id: 3,
    category: "Customer Disclosure & Notification",
    question: "How do you notify customers before adding new sub-processors (GDPR Art. 28 / SOC 2 CC9.2)?",
    options: [
      { label: "Public trust page with automated 30-day email notifications", points: 25 },
      { label: "Static privacy policy page updated manually once a year", points: 10 },
      { label: "No formal customer notification mechanism", points: 0 },
    ],
  },
  {
    id: 4,
    category: "Auditor Evidence & SOC 2 Reports",
    question: "Can you provide signed vendor risk evidence and SOC 2 Type II reports to your auditor in under 5 minutes?",
    options: [
      { label: "Yes, 1-click auditor export with checksum hashes", points: 25 },
      { label: "Takes 2–3 weeks of back-and-forth gathering emails and links", points: 8 },
      { label: "Not prepared for an auditor review", points: 0 },
    ],
  },
];

export default function SOC2ReadinessScorecard() {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [completed, setCompleted] = useState(false);

  const handleSelectOption = (questionId: number, points: number) => {
    const nextAnswers = { ...answers, [questionId]: points };
    setAnswers(nextAnswers);

    if (Object.keys(nextAnswers).length === AUDIT_QUESTIONS.length) {
      setCompleted(true);
    }
  };

  const totalScore = Object.values(answers).reduce((acc, curr) => acc + curr, 0);

  const getScoreGrade = (score: number) => {
    if (score >= 85) {
      return {
        rating: "AUDIT READY (GRADE A)",
        color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10",
        message: "Excellent! Your vendor risk controls align well with SOC 2 CC6.6 & GDPR mandates.",
      };
    }
    if (score >= 50) {
      return {
        rating: "MODERATE RISK (GRADE C)",
        color: "text-amber-400 border-amber-500/30 bg-amber-500/10",
        message: "Warning: Missing DPAs or manual spreadsheets will trigger auditor exceptions.",
      };
    }
    return {
      rating: "CRITICAL AUDIT RISK (GRADE F)",
      color: "text-rose-400 border-rose-500/30 bg-rose-500/10",
      message: "Urgent: High risk of failing SOC 2 vendor management controls and enterprise security reviews.",
    };
  };

  const grade = getScoreGrade(totalScore);

  return (
    <div className="min-h-screen bg-[#050811] text-gray-100 py-12 px-4 sm:px-6 lg:px-8 font-sans selection:bg-cyan-500 selection:text-black">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div className="space-y-3 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-mono font-semibold">
            <ShieldCheck className="w-4 h-4" />
            <span>FREE COMPLIANCE TOOL // SOC 2 &amp; GDPR VENDOR READINESS</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight">
            SOC 2 Sub-Processor Readiness Scorecard
          </h1>

          <p className="text-xs sm:text-sm text-gray-400 max-w-xl mx-auto font-mono">
            Answer 4 questions to evaluate your vendor risk posture and discover missing audit evidence in 60 seconds.
          </p>
        </div>

        {/* Quiz Flow */}
        <div className="space-y-6">
          {AUDIT_QUESTIONS.map((q) => {
            const selectedPoints = answers[q.id];
            return (
              <div
                key={q.id}
                className="bg-gray-950 border border-gray-800/90 rounded-2xl p-6 space-y-4 shadow-xl"
              >
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-cyan-400 font-bold uppercase tracking-wider">
                    {q.category}
                  </span>
                  <span className="text-gray-500">Step {q.id} of 4</span>
                </div>

                <h2 className="text-sm sm:text-base font-bold text-white font-sans leading-snug">
                  {q.question}
                </h2>

                <div className="space-y-2 pt-1">
                  {q.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => handleSelectOption(q.id, opt.points)}
                      className={`w-full p-3.5 rounded-xl border text-left text-xs sm:text-sm font-sans transition-all flex items-center justify-between gap-3 ${
                        selectedPoints === opt.points
                          ? "bg-cyan-500/15 border-cyan-500 text-white font-medium shadow-md shadow-cyan-500/10"
                          : "bg-gray-900/60 border-gray-800 text-gray-300 hover:text-white hover:border-gray-700"
                      }`}
                    >
                      <span>{opt.label}</span>
                      {selectedPoints === opt.points && (
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Results Card */}
        {completed && (
          <div className="bg-gradient-to-br from-gray-900 via-gray-950 to-gray-950 border-2 border-cyan-500 rounded-3xl p-8 space-y-6 shadow-2xl animate-in fade-in zoom-in-95">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-800 pb-6">
              <div className="space-y-1">
                <span className="text-xs font-mono font-bold text-gray-400">
                  YOUR READINESS SCORE
                </span>
                <div className="text-4xl font-extrabold font-mono text-white tracking-tight">
                  {totalScore} / 100
                </div>
              </div>

              <div
                className={`px-4 py-2 rounded-2xl border font-mono font-bold text-xs ${grade.color}`}
              >
                {grade.rating}
              </div>
            </div>

            <p className="text-sm text-gray-300 font-sans leading-relaxed">
              {grade.message}
            </p>

            <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-6 py-3.5 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 text-gray-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
              >
                <span>Automate Your Register in VendorShield</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                onClick={() => {
                  setAnswers({});
                  setCompleted(false);
                }}
                className="w-full sm:w-auto px-4 py-3.5 bg-gray-900 hover:bg-gray-800 text-gray-300 text-xs font-mono rounded-xl border border-gray-800 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retake Scorecard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

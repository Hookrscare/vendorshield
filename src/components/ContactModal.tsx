"use client";

import { useState } from "react";
import { AccessibleModal } from "@/components/ui/AccessibleModal";
import { Mail, CheckCircle2, Loader2, Send, Building, User, MessageSquare } from "lucide-react";

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
}

export function ContactModal({ isOpen, onClose, productName = "VendorShield" }: ContactModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company, message, product: productName }),
      });

      const data = await res.json();
      if (data.success) {
        setSubmitted(true);
      } else {
        setError(data.error || "Failed to submit. Please try again.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Contact Compliance & Enterprise Team // ${productName}`}
      maxWidth="max-w-lg"
    >
      {submitted ? (
        <div className="text-center py-8 space-y-4 font-sans">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white">Inquiry Received!</h3>
          <p className="text-xs text-gray-300 max-w-sm mx-auto leading-relaxed">
            Thank you for reaching out. A security specialist will contact you at <strong className="text-white">{email}</strong> within 24 hours.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-mono text-xs rounded-xl border border-gray-800 transition-colors"
          >
            Close Window
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
          <p className="text-gray-400 leading-relaxed font-mono">
            Get personalized onboarding, custom enterprise DPA integrations, or request an auditor review walk-through.
          </p>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-gray-300 font-bold uppercase">Your Full Name:</label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-gray-300 font-bold uppercase">Work Email Address:</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="sarah@company.com"
              className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-gray-300 font-bold uppercase">Company Name:</label>
            <input
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme SaaS, Inc."
              className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors"
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-mono text-gray-300 font-bold uppercase">How can we help? (Optional):</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Tell us about your upcoming audit timeline or specific vendor questions..."
              rows={3}
              className="w-full bg-black/60 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500 transition-colors resize-none"
            />
          </div>

          {error && <p className="text-xs text-rose-400 font-mono">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 bg-gradient-to-r from-cyan-500 to-teal-400 hover:from-cyan-400 text-gray-950 font-mono font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Submitting Request...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Enterprise Request</span>
              </>
            )}
          </button>
        </form>
      )}
    </AccessibleModal>
  );
}

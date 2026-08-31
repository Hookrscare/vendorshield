"use client";

import { ArrowRight, KeyRound, Loader2, Mail, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to send a code.");
        return;
      }

      setStep("code");
    } catch {
      setError("Unable to reach the sign-in service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, otp: code }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to verify that code.");
        return;
      }

      router.push("/onboarding");
      router.refresh();
    } catch {
      setError("Unable to reach the sign-in service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-tactical-grid px-4 py-16">
      <div className="mx-auto max-w-md rounded-3xl border border-white/10 bg-gray-950/90 p-7 shadow-2xl shadow-cyan-950/30 backdrop-blur-xl sm:p-9">
        <div className="mb-8">
          <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-400/20 bg-cyan-400/10">
            <ShieldCheck className="h-5 w-5 text-cyan-300" aria-hidden="true" />
          </div>
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-cyan-400">
            Secure workspace access
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold text-white">
            {step === "email" ? "Open your VendorShield workspace" : "Check your email"}
          </h1>
          <p className="mt-3 text-sm leading-6 text-gray-400">
            {step === "email"
              ? "No password to remember. We’ll email you a short-lived sign-in code."
              : `Enter the six-digit code sent to ${email}.`}
          </p>
        </div>

        {step === "email" ? (
          <form className="space-y-5" onSubmit={requestCode}>
            <label className="block text-sm font-medium text-gray-200">
              Your name <span className="text-gray-500">(optional)</span>
              <input
                className="mt-2 w-full rounded-xl border border-white/10 bg-gray-900 px-4 py-3 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="name"
                maxLength={120}
              />
            </label>
            <label className="block text-sm font-medium text-gray-200">
              Work email
              <div className="relative mt-2">
                <Mail className="absolute left-4 top-3.5 h-4 w-4 text-gray-500" aria-hidden="true" />
                <input
                  className="w-full rounded-xl border border-white/10 bg-gray-900 py-3 pl-11 pr-4 text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </label>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-display font-bold text-gray-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading}
              type="submit"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              Email my sign-in code
            </button>
          </form>
        ) : (
          <form className="space-y-5" onSubmit={verifyCode}>
            <label className="block text-sm font-medium text-gray-200">
              Verification code
              <div className="relative mt-2">
                <KeyRound className="absolute left-4 top-3.5 h-4 w-4 text-gray-500" aria-hidden="true" />
                <input
                  className="w-full rounded-xl border border-white/10 bg-gray-900 py-3 pl-11 pr-4 font-mono text-xl tracking-[0.35em] text-white outline-none transition focus:border-cyan-400 focus:ring-2 focus:ring-cyan-400/20"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  autoComplete="one-time-code"
                  aria-describedby="code-help"
                  required
                />
              </div>
              <span id="code-help" className="mt-2 block text-xs font-normal text-gray-500">
                The code expires shortly and can only be used once.
              </span>
            </label>
            <button
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 font-display font-bold text-gray-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={loading || code.length !== 6}
              type="submit"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Verify and continue
            </button>
            <button
              className="w-full text-sm text-gray-400 transition hover:text-white"
              onClick={() => {
                setCode("");
                setError("");
                setStep("email");
              }}
              type="button"
            >
              Use a different email
            </button>
          </form>
        )}

        {error && (
          <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
            {error}
          </p>
        )}

        <p className="mt-8 text-center text-xs text-gray-500">
          Want to explore first?{" "}
          <Link className="text-cyan-400 hover:text-cyan-300" href="/dashboard">
            View the read-only demo
          </Link>
        </p>
      </div>
    </div>
  );
}

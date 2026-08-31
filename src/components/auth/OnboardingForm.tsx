"use client";

import { Building2, Loader2, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export function OnboardingForm({ email }: { email: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const result = await response.json();

      if (!response.ok) {
        setError(result.error || "Unable to create your workspace.");
        return;
      }

      router.push("/dashboard");
      router.refresh();
    } catch {
      setError("Unable to reach the workspace service. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-tactical-grid px-4 py-16">
      <div className="mx-auto max-w-lg rounded-3xl border border-white/10 bg-gray-950/90 p-7 shadow-2xl sm:p-9">
        <div className="mb-7 flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-400/10">
            <ShieldCheck className="h-5 w-5 text-emerald-300" aria-hidden="true" />
          </div>
          <div>
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-emerald-400">
              Identity verified
            </p>
            <h1 className="mt-2 font-display text-3xl font-bold text-white">Create your workspace</h1>
            <p className="mt-2 text-sm text-gray-400">Signed in as {email}</p>
          </div>
        </div>

        <form className="space-y-5" onSubmit={submit}>
          <label className="block text-sm font-medium text-gray-200">
            Company or organization name
            <div className="relative mt-2">
              <Building2 className="absolute left-4 top-3.5 h-4 w-4 text-gray-500" aria-hidden="true" />
              <input
                className="w-full rounded-xl border border-white/10 bg-gray-900 py-3 pl-11 pr-4 text-white outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20"
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="organization"
                maxLength={160}
                required
              />
            </div>
          </label>
          <p className="text-xs leading-5 text-gray-500">
            This creates an isolated tenant. Only members you authorize can access its vendor,
            inspection, audit, or billing records.
          </p>
          <button
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-display font-bold text-gray-950 transition hover:bg-emerald-300 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading || !name.trim()}
            type="submit"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Create secure workspace
          </button>
        </form>

        {error && (
          <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-200" role="alert">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

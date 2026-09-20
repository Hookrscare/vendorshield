import Link from "next/link";

export function UnavailableCapability({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="max-w-3xl mx-auto px-6 py-20 space-y-8">
      <p className="text-xs font-mono uppercase tracking-widest text-amber-300">Capability status · Not available</p>
      <h1 className="text-4xl font-display font-bold text-white">{title}</h1>
      <div className="rounded-2xl border border-amber-400/30 bg-amber-400/5 p-6 text-gray-300 leading-relaxed space-y-4">{children}</div>
      <Link href="/capabilities" className="inline-flex text-cyan-300 underline underline-offset-4">See what currently works</Link>
    </section>
  );
}

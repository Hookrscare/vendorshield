import Link from "next/link";

const capabilities = [
  ["VendorShield register", "Working core", "Account-based vendor records, DPA status fields, public disclosure pages, and PDF/CSV/JSON exports. Records are user-maintained, not independently verified."],
  ["Public pages and embeds", "Working with limits", "Publish a register and embed its page. The public widget generator uses sample ACME data; use your dashboard for your own organization. Updates appear when the page reloads."],
  ["Vendor directory", "Reference data", "Static descriptions and links for third-party services. Listings are not endorsements or verified certifications. Mux’s video streaming description describes Mux, not a VendorShield feature."],
  ["Alerts and teams", "Partial", "Subscription and invitation records can be stored, but automatic DPA alerts, invitation acceptance, and email delivery for those flows are not available."],
  ["DPA scanning and audit verification", "Unavailable", "The former scanner used keyword guesses and a fixed score. No legal analysis, independent compliance certification, or cryptographic verification is provided."],
  ["SnapInspect", "Local prototype", "Edit inspection notes, attach photos, and generate PDFs in your browser. Speech recognition depends on browser support; categorization uses keyword rules. No cloud backup or client sharing. Review all sample records and suggestions."],
  ["Dispel Lens / YouTube checking", "Unavailable", "No functioning video authenticity analysis, deepfake detector, or installable browser extension. Earlier preset verdicts and random certificate strings were not evidence and have been disabled."],
  ["Calculators and scorecard", "Illustrative tools", "Arithmetic estimates and a self-reported checklist. They do not establish market prices, realized savings, audit readiness, or legal compliance."],
  ["Inspector toolkit", "Template files", "Markdown templates and a JSON pricing model, including a Notion workspace blueprint. No independently established legal vetting, certification, or ready-to-duplicate Notion workspace."],
  ["Paid plans", "Not ready for live purchase", "Checkout was tested in Stripe sandbox. Advertised paid features are not all delivered. Do not treat price listings as proof of feature availability."],
];

export default function CapabilitiesPage() {
  return (
    <section className="mx-auto max-w-5xl px-6 py-16 space-y-8">
      <p className="font-mono text-xs uppercase tracking-widest text-cyan-300">Product status · September 20, 2026</p>
      <h1 className="font-display text-4xl sm:text-5xl font-bold text-white">What currently works</h1>
      <p className="max-w-3xl text-gray-300 leading-relaxed">VendorShield has a usable record-management foundation. The wider suite includes unfinished prototypes. This page separates available workflows from demonstrations and unavailable capabilities.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {capabilities.map(([name, status, detail]) => (
          <article key={name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-3">
            <p className="font-mono text-xs text-amber-200">{status}</p>
            <h2 className="text-xl font-bold text-white">{name}</h2>
            <p className="text-sm leading-relaxed text-gray-300">{detail}</p>
          </article>
        ))}
      </div>
      <Link href="/dashboard" className="inline-block rounded-xl bg-cyan-400 px-6 py-3 font-semibold text-gray-950">Explore the register</Link>
    </section>
  );
}

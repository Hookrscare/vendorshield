import Link from "next/link";

const capabilities = [
  [
    "VendorShield register",
    "Working core",
    "Account-based vendor records, DPA status fields, public disclosure pages, and PDF/CSV/JSON exports. Records are user-maintained, not independently verified.",
  ],
  [
    "Public pages and embeds",
    "Working with limits",
    "Publish a register and embed its page. The public widget generator uses sample ACME data; use your dashboard for your own organization. Updates appear when the page reloads.",
  ],
  [
    "Vendor directory",
    "Reference data",
    "Static descriptions and links for third-party services. Listings are not endorsements or verified certifications. Mux’s video streaming description describes Mux, not a VendorShield feature.",
  ],
  [
    "Alerts and teams",
    "Partial",
    "Subscription and invitation records can be stored, but automatic DPA alerts, invitation acceptance, and email delivery for those flows are not available.",
  ],
  [
    "DPA scanning and audit verification",
    "Unavailable",
    "The former scanner used keyword guesses and a fixed score. No legal analysis, independent compliance certification, or cryptographic verification is provided.",
  ],
  [
    "SnapInspect",
    "Workspace reports",
    "Edit notes and photos, export PDF/JSON, explicitly save reports to a private workspace, restore on another device, and share revocable seven-day snapshots. Reports are limited to 3 MB. Unsaved drafts remain local. Speech recognition depends on browser support; categorization uses keyword rules. Review sample records and all findings.",
  ],
  [
    "Dispel Lens / YouTube checking",
    "Unavailable",
    "No functioning video authenticity analysis, deepfake detector, or installable browser extension. Earlier preset verdicts and random certificate strings were not evidence and have been disabled.",
  ],
  [
    "Calculators and scorecard",
    "Illustrative tools",
    "Arithmetic estimates and a self-reported checklist. They do not establish market prices, realized savings, audit readiness, or legal compliance.",
  ],
  [
    "Inspector toolkit",
    "Template files",
    "Markdown templates and a JSON pricing model, including a Notion workspace blueprint. No independently established legal vetting, certification, or ready-to-duplicate Notion workspace.",
  ],
  [
    "Paid plans",
    "Not ready for live purchase",
    "Checkout was tested in Stripe sandbox. Advertised paid features are not all delivered. Do not treat price listings as proof of feature availability.",
  ],
];

export default function CapabilitiesPage() {
  return (
    <div className="reference-page">
      <section className="reference-container capability-page">
        <p className="eyebrow">Product status / September 20, 2026</p>
        <h1>
          What currently
          <br />
          <em>works.</em>
        </h1>
        <p className="capability-intro">
          Available workflows, unfinished prototypes, and their limits. A clear
          account of the product today.
        </p>
        <div className="capability-table">
          {capabilities.map(([name, status, detail], i) => (
            <article key={name}>
              <span className="capability-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <div>
                <h2>{name}</h2>
                <p className="capability-status">{status}</p>
              </div>
              <p>{detail}</p>
            </article>
          ))}
        </div>
        <Link href="/dashboard" className="ink-button">
          Explore the register <span aria-hidden="true">↗</span>
        </Link>
      </section>
    </div>
  );
}

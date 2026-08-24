import Link from "next/link";

export const metadata = {
  title: "Terms of Service | VendorShield",
  description: "Terms governing VendorShield, SnapInspect AI, and Dispel Lens.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-16 text-gray-300 sm:px-6">
      <article className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3 border-b border-gray-800 pb-8">
          <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
            ← Back to VendorShield
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Terms of Service</h1>
          <p className="text-sm text-gray-500">Effective August 24, 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Agreement</h2>
          <p>
            By accessing or purchasing VendorShield, SnapInspect AI, Dispel Lens, or related
            digital products, you agree to these terms. If you do not agree, do not use the services.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Product use</h2>
          <p>
            You may use the services only for lawful business purposes. You are responsible for
            information you submit, account security, and independently reviewing generated reports,
            compliance records, inspection language, and authenticity assessments before relying on them.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Payments and subscriptions</h2>
          <p>
            Prices and billing intervals are shown before checkout. Stripe processes payments.
            Subscriptions continue for the selected billing period until canceled. Digital downloads
            are licensed to the purchaser for internal business use and may not be redistributed or resold.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">No professional advice</h2>
          <p>
            The services provide workflow and informational tools, not legal, engineering, accounting,
            cybersecurity-certification, or licensed inspection advice. You remain responsible for
            professional judgment and compliance with laws and industry standards that apply to you.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Service availability and liability</h2>
          <p>
            Services are provided on an “as available” basis. To the extent permitted by law, we are not
            liable for indirect or consequential losses arising from service interruption, generated output,
            or third-party services. Rights that cannot legally be excluded remain unaffected.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Contact</h2>
          <p>
            Questions about these terms may be sent to{" "}
            <a className="text-blue-400 hover:text-blue-300" href="mailto:rc@serengular.com">
              rc@serengular.com
            </a>.
          </p>
        </section>
      </article>
    </main>
  );
}

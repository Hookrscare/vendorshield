import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | VendorShield",
  description: "Privacy practices for VendorShield, SnapInspect AI, and Dispel Lens.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-gray-950 px-4 py-16 text-gray-300 sm:px-6">
      <article className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-3 border-b border-gray-800 pb-8">
          <Link href="/" className="text-sm text-blue-400 hover:text-blue-300">
            ← Back to VendorShield
          </Link>
          <h1 className="text-4xl font-extrabold tracking-tight text-white">Privacy Policy</h1>
          <p className="text-sm text-gray-500">Effective August 24, 2026</p>
        </div>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Information we process</h2>
          <p>
            We process information you provide when requesting a checkout, contacting us,
            or using product features. This may include your email address, business details,
            inspection inputs, and technical request information such as IP address and browser type.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Payments</h2>
          <p>
            Payments are processed by Stripe. We do not store full payment-card numbers.
            Stripe receives payment and billing information under its own privacy policy.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">How information is used</h2>
          <p>
            We use information to deliver requested services, complete purchases, secure the
            site, respond to support requests, improve product reliability, and meet legal obligations.
            We do not sell personal information.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Retention and security</h2>
          <p>
            Information is retained only as long as needed for the purposes described above,
            contractual requirements, fraud prevention, and applicable law. We use reasonable
            administrative and technical safeguards, but no internet service can guarantee absolute security.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold text-white">Your choices</h2>
          <p>
            You may request access, correction, or deletion of personal information, subject to
            applicable legal exceptions. Contact us at{" "}
            <a className="text-blue-400 hover:text-blue-300" href="mailto:rc@serengular.com">
              rc@serengular.com
            </a>.
          </p>
        </section>
      </article>
    </main>
  );
}

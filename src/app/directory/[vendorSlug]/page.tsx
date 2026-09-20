import { DIRECTORY_VENDORS } from "@/lib/initial-data";
import {
  generateDirectoryMetadata,
  generateDirectoryVendorSchema,
} from "@/lib/directory-schema";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight } from "lucide-react";
export function generateStaticParams() {
  return DIRECTORY_VENDORS.map((v) => ({ vendorSlug: v.slug }));
}
export async function generateMetadata({
  params,
}: {
  params: Promise<{ vendorSlug: string }>;
}) {
  const { vendorSlug } = await params;
  return generateDirectoryMetadata(
    DIRECTORY_VENDORS.find((v) => v.slug === vendorSlug),
  );
}
export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ vendorSlug: string }>;
}) {
  const { vendorSlug } = await params;
  const vendor = DIRECTORY_VENDORS.find((v) => v.slug === vendorSlug);
  if (!vendor) notFound();
  const related = DIRECTORY_VENDORS.filter(
    (v) => v.category === vendor.category && v.slug !== vendor.slug,
  ).slice(0, 3);
  return (
    <div className="reference-page">
      <div className="reference-container profile-container">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(
              generateDirectoryVendorSchema(vendor),
            ).replace(/</g, "\\u003c"),
          }}
        />
        <nav className="profile-breadcrumb" aria-label="Breadcrumb">
          <Link href="/directory">
            <ArrowLeft size={16} /> Reference library
          </Link>
          <span>/</span>
          <span>{vendor.name}</span>
        </nav>
        <header className="profile-hero">
          <p className="eyebrow">Vendor reference / {vendor.category}</p>
          <div>
            <h1>
              {vendor.name}
              <span>.</span>
            </h1>
            <a
              href={vendor.dpaUrl}
              target="_blank"
              rel="noreferrer"
              className="text-action"
            >
              View DPA source <ArrowUpRight size={18} />
            </a>
          </div>
          <p className="profile-deck">{vendor.description}</p>
        </header>
        <div className="profile-notice">
          <span className="eyebrow">Reference only</span>
          <p>
            This describes a third-party service, not a VendorShield feature.
            Details and certification labels are unverified. Confirm their
            current scope with the vendor.
          </p>
        </div>
        <div className="profile-body">
          <aside>
            <p className="eyebrow">At a glance</p>
            <dl>
              <div>
                <dt>Headquarters</dt>
                <dd>{vendor.headquarters}</dd>
              </div>
              <div>
                <dt>Privacy contact · unverified</dt>
                <dd>{vendor.privacyContact}</dd>
              </div>
              <div>
                <dt>Reference risk label · unverified</dt>
                <dd>{vendor.riskLevel}</dd>
              </div>
            </dl>
            <Link href="/dashboard" className="text-action">
              Open your register <ArrowUpRight size={16} />
            </Link>
            <p className="profile-aside-note">
              Review the source, then add the details relevant to your
              organization.
            </p>
          </aside>
          <div className="profile-sections">
            <section>
              <div className="section-heading">
                <span>01</span>
                <h2>Go to the source.</h2>
              </div>
              <p>
                Policy documents published by the vendor. Links open in a new
                tab.
              </p>
              <div className="source-links">
                <a href={vendor.dpaUrl} target="_blank" rel="noreferrer">
                  <div>
                    <span className="eyebrow">Legal document</span>
                    <h3>Data Processing Addendum</h3>
                  </div>
                  <ArrowUpRight size={24} />
                </a>
                <a
                  href={vendor.subprocessorUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <div>
                    <span className="eyebrow">Vendor disclosure</span>
                    <h3>Sub-processor list</h3>
                  </div>
                  <ArrowUpRight size={24} />
                </a>
              </div>
            </section>
            <section>
              <div className="section-heading">
                <span>02</span>
                <h2>Data in context.</h2>
              </div>
              <p>
                Common data fields listed for this service. Your implementation
                may differ.
              </p>
              <ul className="data-field-list">
                {vendor.commonDataProcessed.map((field, i) => (
                  <li key={field}>
                    <span>{String(i + 1).padStart(2, "0")}</span>
                    {field}
                  </li>
                ))}
              </ul>
            </section>
            <section>
              <div className="section-heading">
                <span>03</span>
                <h2>Labels to investigate.</h2>
              </div>
              <p>
                These certification labels come from the reference dataset. They
                are not independently verified, and do not establish that your
                use is covered.
              </p>
              <ul className="certification-list">
                {vendor.certifications.map((cert) => (
                  <li key={cert}>
                    {cert}
                    <span>Unverified</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
        {related.length > 0 && (
          <section className="related-vendors">
            <div className="section-heading">
              <span>Next</span>
              <h2>In the same discipline.</h2>
            </div>
            {related.map((item) => (
              <Link href={`/directory/${item.slug}`} key={item.slug}>
                <span>{item.name}</span>
                <ArrowRight size={21} />
              </Link>
            ))}
          </section>
        )}
      </div>
    </div>
  );
}

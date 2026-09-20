import Link from "next/link";
import { ArrowUpRight, ArrowRight } from "lucide-react";
import { DocumentSculpture } from "@/components/directory/DocumentSculpture";
import { DIRECTORY_VENDORS } from "@/lib/initial-data";
export default function HomePage() {
  return (
    <div className="reference-page">
      <div className="reference-container">
        <section className="library-hero home-hero">
          <div className="library-intro">
            <p className="eyebrow">Vendor records / A clearer perspective</p>
            <h1>
              Know your stack.
              <br />
              <em>Keep your record.</em>
            </h1>
            <p className="hero-deck">
              A deliberate place to organize third-party services, record
              data-processing details, and publish your sub-processor
              disclosure.
            </p>
            <div className="home-actions">
              <Link href="/dashboard" className="ink-button">
                Open your workspace <ArrowUpRight size={17} />
              </Link>
              <Link href="/directory" className="text-action">
                Explore the directory <ArrowRight size={17} />
              </Link>
            </div>
          </div>
          <DocumentSculpture count={DIRECTORY_VENDORS.length} />
        </section>
        <div className="home-index">
          <span className="eyebrow">The working practice</span>
          <span>Document. Review. Disclose.</span>
          <span className="eyebrow">VendorShield / 01—03</span>
        </div>
        <section className="practice-list" aria-label="VendorShield workflows">
          {[
            [
              "01",
              "A record worth keeping.",
              "Organize vendor names, categories, DPA status, and the data they process. Maintain the details that matter to your organization.",
              "Open vendor register",
              "/dashboard",
            ],
            [
              "02",
              "A disclosure you can share.",
              "Publish your entered records on a public sub-processor page, or embed the disclosure in your own site.",
              "Open disclosure settings",
              "/dashboard/embed-code",
            ],
            [
              "03",
              "Your information, portable.",
              "Export the records you maintain as PDF, CSV, or JSON. Review them before sharing with your team or an auditor.",
              "View record exports",
              "/dashboard/audit-export",
            ],
          ].map(([number, title, description, label, href]) => (
            <article key={number}>
              <span className="practice-number">{number}</span>
              <h2>{title}</h2>
              <div>
                <p>{description}</p>
                <Link href={href} className="text-action">
                  {label}
                  <ArrowUpRight size={17} />
                </Link>
              </div>
            </article>
          ))}
        </section>
        <section className="home-directory">
          <div>
            <p className="eyebrow">An open reference</p>
            <h2>
              Before the decision,
              <br />
              <em>the research.</em>
            </h2>
            <p>
              Browse {DIRECTORY_VENDORS.length} third-party services across
              eight disciplines. Find policy sources and common data fields to
              support your own review.
            </p>
            <Link href="/directory" className="text-action">
              Enter the reference library <ArrowRight size={18} />
            </Link>
          </div>
          <div className="home-directory-index">
            {[
              "AI & machine learning",
              "Cloud infrastructure",
              "Databases & storage",
              "Payments",
              "Analytics & observability",
              "Identity & security",
              "Communication & support",
              "Developer tools",
            ].map((item, i) => (
              <span key={item}>
                <small>{String(i + 1).padStart(2, "0")}</small>
                {item}
                <i aria-hidden="true">↗</i>
              </span>
            ))}
          </div>
        </section>
        <section className="library-closing" id="pricing">
          <p className="eyebrow">A clear scope</p>
          <h2>
            Useful records.
            <br />
            <em>No manufactured assurance.</em>
          </h2>
          <div>
            <p>
              VendorShield does not independently certify vendors or
              automatically monitor policy changes. Purchase flows are currently
              unavailable. Review the capability status before using any
              product.
            </p>
            <Link href="/capabilities" className="ink-button">
              See what currently works <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

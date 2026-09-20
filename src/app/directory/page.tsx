"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Search,
  X,
  Plus,
  Minus,
} from "lucide-react";
import { DIRECTORY_VENDORS } from "@/lib/initial-data";
import { DocumentSculpture } from "@/components/directory/DocumentSculpture";

const CATEGORIES = [
  "All",
  "AI & Machine Learning",
  "Cloud Infrastructure & Hosting",
  "Database & Storage",
  "Payment Processing",
  "Analytics & Observability",
  "Authentication & Security",
  "Customer Support & Communication",
  "Developer Tools & CI/CD",
];
const LABELS = [
  "All disciplines",
  "AI & machine learning",
  "Cloud infrastructure",
  "Databases & storage",
  "Payments",
  "Analytics & observability",
  "Identity & security",
  "Communication & support",
  "Developer tools",
];

export default function DirectoryPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [visible, setVisible] = useState(12);
  const [expanded, setExpanded] = useState<string | null>(null);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setSearch(params.get("q") || "");
    if (CATEGORIES.includes(params.get("category") || ""))
      setCategory(params.get("category")!);
  }, []);
  const changeFilter = (nextSearch: string, nextCategory: string) => {
    setSearch(nextSearch);
    setCategory(nextCategory);
    setVisible(12);
    setExpanded(null);
    const url = new URL(window.location.href);
    if (nextSearch) url.searchParams.set("q", nextSearch);
    else url.searchParams.delete("q");
    if (nextCategory !== "All") url.searchParams.set("category", nextCategory);
    else url.searchParams.delete("category");
    window.history.replaceState(
      null,
      "",
      `${url.pathname}${url.search}${url.hash}`,
    );
  };
  const query = search.trim().toLowerCase();
  const filtered = DIRECTORY_VENDORS.filter(
    (item) =>
      (category === "All" || item.category === category) &&
      [item.name, item.description, ...item.commonDataProcessed].some((text) =>
        text.toLowerCase().includes(query),
      ),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="reference-page">
      <div className="reference-container">
        <section className="library-hero" aria-labelledby="library-title">
          <div className="library-intro">
            <p className="eyebrow">
              <span>01 / The public directory</span>
              <span>VendorShield</span>
            </p>
            <h1 id="library-title">
              The vendor
              <br />
              <em>reference library.</em>
            </h1>
            <p className="hero-deck">
              A considered view of the services behind your stack. Data
              practices, policy links, and a place to begin your own review.
            </p>
            <a href="#vendor-index" className="text-action">
              Explore {DIRECTORY_VENDORS.length} vendors <ArrowDown size={17} />
            </a>
          </div>
          <DocumentSculpture count={DIRECTORY_VENDORS.length} />
        </section>
        <div className="library-note">
          <span className="eyebrow">A note on the source</span>
          <p>
            Reference material, not verification. Listings and certification
            labels are unverified. Confirm current details with each vendor.
          </p>
          <Link
            href="/capabilities"
            aria-label="Read about capability and directory limitations"
          >
            <ArrowUpRight size={20} />
          </Link>
        </div>
        <section
          id="vendor-index"
          className="library-workspace"
          aria-label="Browse vendor directory"
        >
          <aside className="library-sidebar">
            <h2 className="eyebrow">Browse by discipline</h2>
            <nav className="category-index" aria-label="Vendor categories">
              {CATEGORIES.map((cat, i) => (
                <button
                  key={cat}
                  aria-pressed={category === cat}
                  onClick={() => changeFilter(search, cat)}
                >
                  <span className="category-number">
                    {String(i).padStart(2, "0")}
                  </span>
                  <span>{LABELS[i]}</span>
                  <span className="category-count">
                    {cat === "All"
                      ? DIRECTORY_VENDORS.length
                      : DIRECTORY_VENDORS.filter((v) => v.category === cat)
                          .length}
                  </span>
                </button>
              ))}
            </nav>
            <label className="mobile-category">
              Discipline
              <select
                value={category}
                onChange={(event) => changeFilter(search, event.target.value)}
              >
                {CATEGORIES.map((cat, i) => (
                  <option key={cat} value={cat}>
                    {LABELS[i]}
                  </option>
                ))}
              </select>
            </label>
            <div className="sidebar-note">
              <span className="small-cross" aria-hidden="true">
                +
              </span>
              <p>
                Start with the source.
                <br />
                Build your own record.
              </p>
              <Link href="/dashboard" className="text-action">
                Open your register <ArrowUpRight size={16} />
              </Link>
            </div>
          </aside>
          <div className="library-results">
            <div className="library-search">
              <label htmlFor="vendor-search" className="eyebrow">
                Find a vendor
              </label>
              <div className="search-line">
                <Search size={21} aria-hidden="true" />
                <input
                  id="vendor-search"
                  type="search"
                  value={search}
                  onChange={(event) =>
                    changeFilter(event.target.value, category)
                  }
                  placeholder="Name, service, or data processed…"
                  autoComplete="off"
                />
                {search && (
                  <button
                    aria-label="Clear search"
                    onClick={() => changeFilter("", category)}
                  >
                    <X size={18} />
                  </button>
                )}
              </div>
            </div>
            <div className="results-caption">
              <p role="status" aria-live="polite">
                {filtered.length} {filtered.length === 1 ? "vendor" : "vendors"}
                {category !== "All"
                  ? ` / ${LABELS[CATEGORIES.indexOf(category)]}`
                  : " / All disciplines"}
              </p>
              <span>Alphabetical index</span>
            </div>
            <div className="vendor-list">
              {filtered.slice(0, visible).map((item, i) => (
                <article
                  key={item.slug}
                  className={`vendor-entry ${expanded === item.slug ? "expanded" : ""}`}
                >
                  <div className="vendor-row">
                    <span className="vendor-number">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div className="vendor-identity">
                      <h3>
                        <Link href={`/directory/${item.slug}`}>
                          {item.name}
                          <ArrowUpRight size={17} />
                        </Link>
                      </h3>
                      <p>
                        {LABELS[CATEGORIES.indexOf(item.category)] ||
                          item.category}
                      </p>
                    </div>
                    <p className="vendor-description">{item.description}</p>
                    <button
                      className="preview-toggle"
                      aria-label={`${expanded === item.slug ? "Close" : "Preview"} ${item.name}`}
                      aria-expanded={expanded === item.slug}
                      aria-controls={`preview-${item.slug}`}
                      onClick={() =>
                        setExpanded(expanded === item.slug ? null : item.slug)
                      }
                    >
                      {expanded === item.slug ? (
                        <Minus size={20} />
                      ) : (
                        <Plus size={20} />
                      )}
                    </button>
                  </div>
                  <div
                    id={`preview-${item.slug}`}
                    className="vendor-preview"
                    hidden={expanded !== item.slug}
                  >
                    <div>
                      <h4 className="eyebrow">Common data processed</h4>
                      <p>{item.commonDataProcessed.join(" · ")}</p>
                    </div>
                    <div className="preview-links">
                      <a href={item.dpaUrl} target="_blank" rel="noreferrer">
                        DPA source <ArrowUpRight size={16} />
                      </a>
                      <a
                        href={item.subprocessorUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Sub-processor source <ArrowUpRight size={16} />
                      </a>
                      <Link href={`/directory/${item.slug}`}>
                        Read reference profile <ArrowRight size={16} />
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
            {!filtered.length && (
              <div className="directory-empty">
                <span className="empty-glyph" aria-hidden="true">
                  ∅
                </span>
                <h3>No matching vendors.</h3>
                <p>Try another name or view all disciplines.</p>
                <button
                  className="ink-button"
                  onClick={() => changeFilter("", "All")}
                >
                  Reset filters <ArrowRight size={17} />
                </button>
              </div>
            )}
            {filtered.length > visible && (
              <div className="load-more">
                <span>
                  Showing {visible} of {filtered.length}
                </span>
                <button
                  className="text-action"
                  onClick={() => setVisible((value) => value + 12)}
                >
                  Show 12 more <Plus size={18} />
                </button>
              </div>
            )}
          </div>
        </section>
        <section className="library-closing">
          <p className="eyebrow">From reference to record</p>
          <h2>
            A directory is a starting point.
            <br />
            <em>Your register is the working record.</em>
          </h2>
          <div>
            <p>
              Keep your vendor details, record DPA status, and publish your
              sub-processor disclosure from one workspace.
            </p>
            <Link href="/dashboard" className="ink-button">
              Open your register <ArrowUpRight size={18} />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}

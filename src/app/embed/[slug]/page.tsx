"use client";

import { useState, useEffect, use } from "react";
import { SubProcessorVendor } from "@/lib/types";
import { ArrowUpRight } from "lucide-react";
import "./embed.css";
import { useSearchParams } from "next/navigation";

export default function EmbedWidgetPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const theme = searchParams?.get("theme") || "dark";
  const isLight = theme === "light";

  const [vendors, setVendors] = useState<SubProcessorVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [loadError, setLoadError] = useState(false);
  const [selectedCat, setSelectedCat] = useState("All");

  useEffect(() => {
    fetch(`/api/public/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setVendors(data.data.vendors);
        else setLoadError(true);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
  }, [slug]);

  const categories = [
    "All",
    ...Array.from(new Set(vendors.map((v) => v.category))),
  ];

  const filtered = vendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase()) ||
      v.dataProcessed.some((d) =>
        d.toLowerCase().includes(search.toLowerCase()),
      );
    const matchesCat = selectedCat === "All" || v.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div className={`disclosure-embed ${isLight ? "light" : ""}`}>
      <header>
        <span>Published vendor records</span>
        <p>Maintained by the publishing organization.</p>
      </header>
      {loading ? (
        <p role="status">Loading published records…</p>
      ) : loadError ? (
        <p role="alert">
          This disclosure could not be loaded. Please try again later.
        </p>
      ) : (
        <>
          <div className="embed-filters">
            <label>
              Find a vendor
              <input
                type="search"
                placeholder="Name or data processed…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              Category
              <select
                value={selectedCat}
                onChange={(e) => setSelectedCat(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat === "All" ? "All categories" : cat}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="embed-records">
            {filtered.length ? (
              filtered.map((v) => (
                <article key={v.id}>
                  <div>
                    <h2>{v.name}</h2>
                    <p>{v.description}</p>
                    <small>{v.category}</small>
                  </div>
                  <dl>
                    <div>
                      <dt>Data processed</dt>
                      <dd>{v.dataProcessed.join(" · ") || "Not recorded"}</dd>
                    </div>
                    <div>
                      <dt>Location</dt>
                      <dd>{v.dataLocation || "Not recorded"}</dd>
                    </div>
                    <div>
                      <dt>DPA status</dt>
                      <dd>{v.dpaStatus || "Not recorded"}</dd>
                    </div>
                  </dl>
                  {v.dpaUrl && (
                    <a href={v.dpaUrl} target="_blank" rel="noreferrer">
                      DPA source <ArrowUpRight size={13} />
                    </a>
                  )}
                </article>
              ))
            ) : (
              <p className="embed-empty">
                {vendors.length
                  ? "No records match these filters."
                  : "No vendors have been published."}
              </p>
            )}
          </div>
          <footer>
            {filtered.length} published records · Not independently verified
            <br />
            Published with VendorShield
          </footer>
        </>
      )}
    </div>
  );
}

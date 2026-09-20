"use client";

import { useState } from "react";
import { SubProcessorVendor, Category } from "@/lib/types";
import { Search, ArrowUpRight } from "lucide-react";

interface VendorTableProps {
  vendors: SubProcessorVendor[];
  onEditVendor: (vendor: SubProcessorVendor) => void;
  onAddClick: () => void;
  readOnly?: boolean;
}

const CATEGORIES: (Category | "All")[] = [
  "All",
  "AI & Machine Learning",
  "Cloud Infrastructure & Hosting",
  "Database & Storage",
  "Payment Processing",
  "Analytics & Observability",
  "Customer Support & Communication",
  "Authentication & Security",
  "Developer Tools & CI/CD",
];

export function VendorTable({
  vendors,
  onEditVendor,
  onAddClick,
  readOnly = false,
}: VendorTableProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");

  const filtered = vendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase()) ||
      v.dataProcessed.some((d) =>
        d.toLowerCase().includes(search.toLowerCase()),
      );

    const matchesCategory =
      selectedCategory === "All" || v.category === selectedCategory;

    const matchesStatus =
      selectedStatus === "All" ||
      (selectedStatus === "Signed" && v.dpaStatus === "Signed") ||
      (selectedStatus === "Missing" &&
        (v.dpaStatus === "Missing" || v.dpaStatus === "Under Review")) ||
      (selectedStatus === "HighRisk" && v.riskLevel === "High");

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <section className="vendor-register" aria-label="Vendor records">
      <div className="register-toolbar">
        <label className="register-search">
          <span>Find a record</span>
          <div>
            <Search size={18} />
            <input
              type="search"
              placeholder="Name, purpose, or data…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </label>
        <label>
          Category
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat === "All" ? "All categories" : cat}
              </option>
            ))}
          </select>
        </label>
        <label>
          Record status
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="All">All statuses</option>
            <option value="Signed">Signed DPA</option>
            <option value="Missing">Missing / under review</option>
            <option value="HighRisk">High risk</option>
          </select>
        </label>
      </div>
      <div className="register-count" role="status">
        {filtered.length} of {vendors.length} records{" "}
        <span>
          Certification labels are recorded, not independently verified.
        </span>
      </div>
      {filtered.length === 0 ? (
        <div className="workspace-empty">
          <span className="empty-index" aria-hidden="true">
            —
          </span>
          <h2>
            {vendors.length
              ? "No matching records."
              : "A clear record starts here."}
          </h2>
          <p>
            {vendors.length
              ? "Try another name, category, or status."
              : "Add your first vendor to track its data use, agreements, and review dates."}
          </p>
          {vendors.length ? (
            <button
              className="ws-button"
              onClick={() => {
                setSearch("");
                setSelectedCategory("All");
                setSelectedStatus("All");
              }}
            >
              Clear filters
            </button>
          ) : (
            !readOnly && (
              <button className="ws-button primary" onClick={onAddClick}>
                Add your first vendor
              </button>
            )
          )}
        </div>
      ) : (
        <div className="register-table-wrap">
          <table className="register-table">
            <thead>
              <tr>
                <th>Vendor / purpose</th>
                <th>Data & location</th>
                <th>Agreement</th>
                <th>Risk & review</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((vendor, index) => (
                <tr key={vendor.id}>
                  <td className="vendor-identity">
                    <span className="record-number">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      {!readOnly ? (
                        <button
                          className="vendor-name"
                          onClick={() => onEditVendor(vendor)}
                        >
                          {vendor.name}
                        </button>
                      ) : (
                        <h3 className="vendor-name">{vendor.name}</h3>
                      )}
                      <p>{vendor.description || "No description recorded"}</p>
                      <small>
                        {vendor.category} ·{" "}
                        {vendor.isPublic ? "Public" : "Internal"}
                      </small>
                    </div>
                  </td>
                  <td data-label="Data & location">
                    <p>{vendor.dataProcessed.join(" · ") || "Not recorded"}</p>
                    <small>
                      {vendor.dataLocation || "Location not recorded"}
                    </small>
                    {vendor.certifications.length > 0 && (
                      <small className="record-certifications">
                        {vendor.certifications.join(" · ")}
                      </small>
                    )}
                  </td>
                  <td data-label="Agreement">
                    <span
                      className={`record-status ${vendor.dpaStatus === "Signed" ? "signed" : vendor.dpaStatus === "Missing" ? "missing" : "pending"}`}
                    >
                      {vendor.dpaStatus}
                    </span>
                    {vendor.dpaUrl && (
                      <a
                        className="record-source"
                        href={vendor.dpaUrl}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`${vendor.name} DPA source`}
                      >
                        DPA source <ArrowUpRight size={13} />
                      </a>
                    )}
                  </td>
                  <td data-label="Risk & review">
                    <span
                      className={`risk-label ${vendor.riskLevel === "High" ? "high" : ""}`}
                    >
                      {vendor.riskLevel} risk
                    </span>
                    <small>
                      {vendor.nextReviewDate
                        ? `Review ${vendor.nextReviewDate}`
                        : "Review not scheduled"}
                    </small>
                  </td>
                  <td className="record-actions">
                    {readOnly ? (
                      <span className="workspace-caption">Read only</span>
                    ) : (
                      <button
                        className="record-edit"
                        aria-label={`Edit ${vendor.name}`}
                        onClick={() => onEditVendor(vendor)}
                      >
                        Edit <ArrowUpRight size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

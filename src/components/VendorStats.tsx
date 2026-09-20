import { useState } from "react";
import { SubProcessorVendor } from "@/lib/types";
export function VendorStats({
  vendors,
}: {
  vendors: SubProcessorVendor[];
  onFilterChange?: (status: string) => void;
}) {
  const [reviewHorizon] = useState(() => new Date(Date.now() + 60 * 86400000));
  const signed = vendors.filter((v) => v.dpaStatus === "Signed").length;
  const pending = vendors.filter(
    (v) => v.dpaStatus === "Missing" || v.dpaStatus === "Under Review",
  ).length;
  const due = vendors.filter(
    (v) => v.nextReviewDate && new Date(v.nextReviewDate) <= reviewHorizon,
  ).length;
  return (
    <dl className="workspace-summary">
      {[
        ["Registered vendors", vendors.length, "In your inventory"],
        [
          "Signed DPAs",
          signed,
          `${vendors.length ? Math.round((signed / vendors.length) * 100) : 0}% marked signed`,
        ],
        ["DPAs to review", pending, "Missing or under review"],
        ["Reviews due", due, "Overdue or within 60 days"],
      ].map(([label, value, note]) => (
        <div key={label}>
          <dt>{label}</dt>
          <dd>{value}</dd>
          <small>{note}</small>
        </div>
      ))}
    </dl>
  );
}

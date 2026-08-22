"use client";

import { useState, useEffect } from "react";
import { Save } from "lucide-react";
import { Category, DPAStatus, RiskLevel, SecurityCertification, SubProcessorVendor } from "@/lib/types";
import { AccessibleModal } from "@/components/ui/AccessibleModal";

interface EditVendorModalProps {
  vendor: SubProcessorVendor | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (id: string, updated: Partial<SubProcessorVendor>) => void;
  onDelete: (id: string) => void;
}

const CATEGORIES: Category[] = [
  "AI & Machine Learning",
  "Cloud Infrastructure & Hosting",
  "Database & Storage",
  "Payment Processing",
  "Analytics & Observability",
  "Authentication & Security",
  "Customer Support & Communication",
  "Developer Tools & CI/CD",
];

const ALL_CERTS: SecurityCertification[] = [
  "SOC 2 Type II",
  "ISO 27001",
  "HIPAA",
  "GDPR Compliant",
  "PCI-DSS",
];

export function EditVendorModal({
  vendor,
  isOpen,
  onClose,
  onUpdate,
  onDelete,
}: EditVendorModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("Cloud Infrastructure & Hosting");
  const [description, setDescription] = useState("");
  const [website, setWebsite] = useState("");
  const [dataProcessed, setDataProcessed] = useState("");
  const [dataLocation, setDataLocation] = useState("");
  const [dpaUrl, setDpaUrl] = useState("");
  const [dpaStatus, setDpaStatus] = useState<DPAStatus>("Signed");
  const [riskLevel, setRiskLevel] = useState<RiskLevel>("Low");
  const [certifications, setCertifications] = useState<SecurityCertification[]>([]);
  const [notes, setNotes] = useState("");
  const [lastReviewedDate, setLastReviewedDate] = useState("");
  const [nextReviewDate, setNextReviewDate] = useState("");
  const [isPublic, setIsPublic] = useState(true);

  useEffect(() => {
    if (vendor) {
      setName(vendor.name);
      setCategory(vendor.category);
      setDescription(vendor.description || "");
      setWebsite(vendor.website || "");
      setDataProcessed(vendor.dataProcessed.join(", "));
      setDataLocation(vendor.dataLocation || "");
      setDpaUrl(vendor.dpaUrl || "");
      setDpaStatus(vendor.dpaStatus);
      setRiskLevel(vendor.riskLevel);
      setCertifications(vendor.certifications || []);
      setNotes(vendor.notes || "");
      setLastReviewedDate(vendor.lastReviewedDate || "");
      setNextReviewDate(vendor.nextReviewDate || "");
      setIsPublic(vendor.isPublic);
    }
  }, [vendor]);

  if (!isOpen || !vendor) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate(vendor.id, {
      name,
      category,
      description,
      website,
      dataProcessed: dataProcessed
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
      dataLocation,
      dpaUrl,
      dpaStatus,
      riskLevel,
      certifications,
      notes,
      lastReviewedDate,
      nextReviewDate,
      isPublic,
    });
    onClose();
  };

  const toggleCert = (cert: SecurityCertification) => {
    if (certifications.includes(cert)) {
      setCertifications(certifications.filter((c) => c !== cert));
    } else {
      setCertifications([...certifications, cert]);
    }
  };

  return (
    <AccessibleModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Sub-Processor: ${vendor.name}`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
              Vendor Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as Category)}
              className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
              DPA Status
            </label>
            <select
              value={dpaStatus}
              onChange={(e) => setDpaStatus(e.target.value as DPAStatus)}
              className={`w-full px-3 py-1.5 bg-black/40 border rounded-lg text-xs font-mono focus:outline-none ${
                dpaStatus === "Signed"
                  ? "text-emerald-400 border-emerald-500/30"
                  : dpaStatus === "Missing"
                  ? "text-rose-400 border-rose-500/30"
                  : "text-amber-400 border-amber-500/30"
              }`}
            >
              <option value="Signed">Signed (Full Compliance)</option>
              <option value="Under Review">Under Review</option>
              <option value="Standard Terms">Standard Online Terms</option>
              <option value="Missing">Missing (Audit Risk)</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
              Risk Level
            </label>
            <select
              value={riskLevel}
              onChange={(e) => setRiskLevel(e.target.value as RiskLevel)}
              className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
            >
              <option value="Low">Low Risk</option>
              <option value="Medium">Medium Risk</option>
              <option value="High">High Risk</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
            Data Processed
          </label>
          <input
            type="text"
            value={dataProcessed}
            onChange={(e) => setDataProcessed(e.target.value)}
            className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
              Hosting Location
            </label>
            <input
              type="text"
              value={dataLocation}
              onChange={(e) => setDataLocation(e.target.value)}
              className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
              DPA / Legal URL
            </label>
            <input
              type="url"
              value={dpaUrl}
              onChange={(e) => setDpaUrl(e.target.value)}
              className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
            Auditor Notes
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Zero retention confirmed."
            className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs text-white focus:border-cyan-400 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-mono font-semibold text-gray-300 mb-1">
            Security Certifications
          </label>
          <div className="flex flex-wrap gap-1.5">
            {ALL_CERTS.map((cert) => {
              const active = certifications.includes(cert);
              return (
                <button
                  type="button"
                  key={cert}
                  onClick={() => toggleCert(cert)}
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border transition-all ${
                    active
                      ? "bg-cyan-500/20 border-cyan-500 text-cyan-300"
                      : "bg-black/40 border-white/10 text-gray-400 hover:border-white/20"
                  }`}
                >
                  {active && "✓ "}
                  {cert}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="editIsPublic"
            checked={isPublic}
            onChange={(e) => setIsPublic(e.target.checked)}
            className="rounded border-white/10 bg-black/40 text-cyan-500 focus:ring-cyan-400 h-4 w-4"
          />
          <label htmlFor="editIsPublic" className="text-xs text-gray-300 font-mono">
            Visible on public customer-facing sub-processors page
          </label>
        </div>

        <div className="pt-3 border-t border-white/10 flex items-center justify-between">
          <button
            type="button"
            onClick={() => {
              if (confirm(`Are you sure you want to remove ${vendor.name} from your register?`)) {
                onDelete(vendor.id);
                onClose();
              }
            }}
            className="px-3 py-1.5 text-xs font-mono text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors border border-rose-500/20"
          >
            Delete Sub-Processor
          </button>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-mono text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 text-xs font-mono font-bold text-gray-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg shadow-md shadow-cyan-500/20 transition-all flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Update Register
            </button>
          </div>
        </div>
      </form>
    </AccessibleModal>
  );
}

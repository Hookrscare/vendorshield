import { DIRECTORY_VENDORS } from "@/lib/initial-data";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ShieldCheck,
  ExternalLink,
  Globe,
  CheckCircle2,
  Lock,
  ArrowLeft,
  FileText,
  Building,
  Mail,
  Plus,
  AlertCircle,
} from "lucide-react";
import { CheckoutButton } from "@/components/CheckoutButton";

export function generateStaticParams() {
  return DIRECTORY_VENDORS.map((v) => ({
    vendorSlug: v.slug,
  }));
}

export default async function VendorDetailPage({
  params,
}: {
  params: Promise<{ vendorSlug: string }>;
}) {
  const { vendorSlug } = await params;
  const vendor = DIRECTORY_VENDORS.find((v) => v.slug === vendorSlug);

  if (!vendor) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Link href="/directory" className="hover:text-white flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to SaaS Directory
          </Link>
          <span>/</span>
          <span className="text-gray-200">{vendor.name} Compliance Profile</span>
        </div>

        {/* Vendor Profile Header Card */}
        <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center font-extrabold text-white text-2xl shadow-xl shadow-blue-600/30">
                {vendor.name.charAt(0)}
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  {vendor.name}
                </h1>
                <p className="text-xs sm:text-sm text-blue-400 font-medium">{vendor.category}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs sm:text-sm rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add to My Register
              </Link>
            </div>
          </div>

          <p className="text-sm text-gray-300 leading-relaxed border-t border-gray-800/80 pt-4">
            {vendor.description}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
            <div className="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                Headquarters
              </span>
              <div className="flex items-center gap-1.5 font-medium text-white">
                <Globe className="w-3.5 h-3.5 text-blue-400" />
                <span>{vendor.headquarters}</span>
              </div>
            </div>

            <div className="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                Risk Tier Rating
              </span>
              <div className="flex items-center gap-1.5 font-medium text-white">
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    vendor.riskLevel === "Low"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}
                >
                  {vendor.riskLevel.toUpperCase()} RISK
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-gray-950/80 border border-gray-800 rounded-xl space-y-1">
              <span className="text-gray-500 uppercase tracking-wider text-[10px] font-semibold">
                Privacy / DPO Contact
              </span>
              <div className="flex items-center gap-1.5 font-medium text-white truncate">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                <span className="truncate">{vendor.privacyContact}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Security & Compliance Certifications */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Verified Security Frameworks &amp; Compliance Standards
          </h2>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {vendor.certifications.map((cert) => (
              <div
                key={cert}
                className="p-3.5 bg-gray-950 border border-gray-800 rounded-xl text-center space-y-1"
              >
                <div className="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                </div>
                <div className="text-xs font-bold text-white">{cert}</div>
                <div className="text-[10px] text-gray-500 font-mono">Third-party Audited</div>
              </div>
            ))}
          </div>
        </div>

        {/* Legal & DPA Execution Links */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-400" />
            Legal Agreement &amp; Sub-Processor Documentation
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <a
              href={vendor.dpaUrl}
              target="_blank"
              rel="noreferrer"
              className="p-4 bg-gray-950 border border-gray-800 hover:border-blue-500/50 rounded-xl flex items-center justify-between transition-all group"
            >
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                  Customer Data Processing Addendum (DPA)
                </div>
                <div className="text-xs text-gray-500">Official legal terms &amp; SCCs</div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
            </a>

            <a
              href={vendor.subprocessorUrl}
              target="_blank"
              rel="noreferrer"
              className="p-4 bg-gray-950 border border-gray-800 hover:border-blue-500/50 rounded-xl flex items-center justify-between transition-all group"
            >
              <div>
                <div className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors">
                  Official Sub-Processor Disclosure
                </div>
                <div className="text-xs text-gray-500">Infrastructure providers listed</div>
              </div>
              <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-400" />
            </a>
          </div>
        </div>

        {/* Data Processing Scope */}
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 space-y-4">
          <h2 className="text-base font-bold text-white">Typical Processed Data Fields</h2>
          <p className="text-xs text-gray-400">
            Common categories of customer data transferred to {vendor.name} during standard application usage:
          </p>

          <div className="flex flex-wrap gap-2 pt-1">
            {vendor.commonDataProcessed.map((dp, i) => (
              <span
                key={i}
                className="px-3 py-1.5 bg-gray-950 border border-gray-800 text-gray-200 rounded-lg text-xs font-medium"
              >
                {dp}
              </span>
            ))}
          </div>
        </div>

        {/* Claim / Update CTA */}
        <div className="p-6 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 border border-blue-500/20 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-white">Are you a representative of {vendor.name}?</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Claim this profile to verify your security certifications and receive sub-processor update inquiries.
            </p>
          </div>
          <div className="shrink-0 w-full sm:w-auto">
            <CheckoutButton
              planId="vendorshield-pso-claim"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-md shadow-blue-600/30 transition-colors"
            >
              Claim Profile ($199/mo)
            </CheckoutButton>
          </div>
        </div>
      </div>
    </div>
  );
}

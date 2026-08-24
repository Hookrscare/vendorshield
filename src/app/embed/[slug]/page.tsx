"use client";

import { useState, useEffect, use } from "react";
import { SubProcessorVendor } from "@/lib/types";
import { Search, ExternalLink, Globe, CheckCircle2, ShieldCheck } from "lucide-react";
import { useSearchParams } from "next/navigation";

export default function EmbedWidgetPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const searchParams = useSearchParams();
  const theme = searchParams?.get("theme") || "dark";
  const isLight = theme === "light";

  const [vendors, setVendors] = useState<SubProcessorVendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");

  useEffect(() => {
    fetch(`/api/public/${slug}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setVendors(data.data.vendors);
      })
      .catch((e) => console.error(e))
      .finally(() => setLoading(false));
  }, [slug]);

  const categories = ["All", ...Array.from(new Set(vendors.map((v) => v.category)))];

  const filtered = vendors.filter((v) => {
    const matchesSearch =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.description.toLowerCase().includes(search.toLowerCase()) ||
      v.dataProcessed.some((d) => d.toLowerCase().includes(search.toLowerCase()));
    const matchesCat = selectedCat === "All" || v.category === selectedCat;
    return matchesSearch && matchesCat;
  });

  return (
    <div
      className={`min-h-screen p-4 sm:p-6 transition-colors font-sans ${
        isLight
          ? "bg-white text-gray-900"
          : "bg-gray-950 text-gray-100"
      }`}
    >
      <div className="max-w-5xl mx-auto space-y-4">
        {/* Controls Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:max-w-xs">
            <Search
              className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                isLight ? "text-gray-400" : "text-gray-500"
              }`}
            />
            <input
              type="text"
              placeholder="Search sub-processors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full pl-8 pr-3 py-1.5 rounded-lg text-xs outline-none border transition-colors ${
                isLight
                  ? "bg-gray-50 border-gray-200 text-gray-900 focus:border-blue-500"
                  : "bg-gray-900 border-gray-800 text-white focus:border-blue-500 placeholder-gray-500"
              }`}
            />
          </div>

          <div className="flex items-center gap-1 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCat(cat)}
                className={`text-[11px] px-2.5 py-1 rounded-md whitespace-nowrap transition-all ${
                  selectedCat === cat
                    ? "bg-blue-600 text-white font-semibold"
                    : isLight
                    ? "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    : "bg-gray-900 text-gray-400 hover:text-white"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Vendors Table / List */}
        <div
          className={`border rounded-xl overflow-hidden shadow-sm ${
            isLight ? "border-gray-200 bg-white" : "border-gray-800 bg-gray-900/90"
          }`}
        >
          <table className="w-full text-left text-xs">
            <thead
              className={`text-[10px] uppercase font-bold tracking-wider border-b ${
                isLight
                  ? "bg-gray-50 text-gray-500 border-gray-200"
                  : "bg-gray-950 text-gray-400 border-gray-800"
              }`}
            >
              <tr>
                <th className="py-2.5 px-3">Sub-Processor</th>
                <th className="py-2.5 px-3">Category &amp; Scope</th>
                <th className="py-2.5 px-3">Location</th>
                <th className="py-2.5 px-3">Compliance &amp; DPA</th>
              </tr>
            </thead>
            <tbody
              className={`divide-y ${
                isLight ? "divide-gray-100" : "divide-gray-800/60"
              }`}
            >
              {filtered.map((v) => (
                <tr
                  key={v.id}
                  className={`transition-colors ${
                    isLight ? "hover:bg-gray-50" : "hover:bg-gray-800/40"
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="font-bold">{v.name}</div>
                    <div
                      className={`text-[11px] mt-0.5 line-clamp-1 ${
                        isLight ? "text-gray-500" : "text-gray-400"
                      }`}
                    >
                      {v.description}
                    </div>
                  </td>

                  <td className="py-3 px-3">
                    <div className="font-medium text-blue-500 text-[11px] mb-1">
                      {v.category}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {v.dataProcessed.slice(0, 3).map((dp, i) => (
                        <span
                          key={i}
                          className={`text-[10px] px-1.5 py-0.2 rounded border ${
                            isLight
                              ? "bg-gray-100 border-gray-200 text-gray-700"
                              : "bg-gray-950 border-gray-800 text-gray-300"
                          }`}
                        >
                          {dp}
                        </span>
                      ))}
                    </div>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center gap-1 text-[11px]">
                      <Globe className="w-3 h-3 text-gray-400" />
                      <span>{v.dataLocation || "United States / EU"}</span>
                    </div>
                  </td>

                  <td className="py-3 px-3 whitespace-nowrap">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3" /> Signed DPA
                      </span>

                      {v.dpaUrl && (
                        <a
                          href={v.dpaUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-500 hover:underline inline-flex items-center gap-0.5 text-[11px]"
                        >
                          DPA Link <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Minimal Footer */}
        <div
          className={`flex items-center justify-between text-[10px] pt-2 ${
            isLight ? "text-gray-400" : "text-gray-500"
          }`}
        >
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-emerald-500" />
            <span>SOC 2 &amp; GDPR Verified Sub-Processor Register</span>
          </div>
          <span>Updated dynamically via VendorShield</span>
        </div>
      </div>
    </div>
  );
}

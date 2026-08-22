"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Camera,
  Cpu,
  ChevronDown,
  Sparkles,
  ExternalLink,
} from "lucide-react";

export function PortfolioSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const isDispel = pathname?.startsWith("/dispel");
  const isSnapInspect = pathname?.startsWith("/snapinspect");
  const isVendorShield = !isDispel && !isSnapInspect;

  const currentProduct = isDispel
    ? {
        name: "Dispel Lens",
        badge: "AI Reality",
        icon: Cpu,
        color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
      }
    : isSnapInspect
    ? {
        name: "SnapInspect AI",
        badge: "Field PWA",
        icon: Camera,
        color: "text-red-400 bg-red-500/10 border-red-500/20",
      }
    : {
        name: "VendorShield",
        badge: "SOC 2 B2B",
        icon: ShieldCheck,
        color: "text-blue-400 bg-blue-500/10 border-blue-500/20",
      };

  const Icon = currentProduct.icon;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-900/90 border border-gray-800 hover:border-gray-700 transition-all text-left"
      >
        <div
          className={`w-7 h-7 rounded-lg flex items-center justify-center ${
            isDispel
              ? "bg-cyan-500 text-gray-950"
              : isSnapInspect
              ? "bg-red-600 text-white"
              : "bg-blue-600 text-white"
          }`}
        >
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-white tracking-tight">
              {currentProduct.name}
            </span>
            <span
              className={`text-[9px] uppercase font-bold px-1.5 py-0.2 rounded border ${currentProduct.color}`}
            >
              {currentProduct.badge}
            </span>
          </div>
        </div>
        <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
      </button>

      {isOpen && (
        <div className="absolute left-0 mt-2 w-72 bg-gray-900 border border-gray-800 rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in zoom-in-95 space-y-1">
          <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-gray-500 tracking-wider">
            SaaS Portfolio Suite
          </div>

          {/* Product 1: VendorShield */}
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className={`p-2.5 rounded-xl flex items-center gap-3 transition-colors ${
              isVendorShield ? "bg-gray-800/80 text-white" : "hover:bg-gray-800/40 text-gray-300"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-white flex items-center gap-1">
                VendorShield
                <span className="text-[9px] bg-blue-500/10 text-blue-400 px-1.5 rounded">
                  SOC 2
                </span>
              </div>
              <div className="text-[11px] text-gray-400">
                Sub-Processor &amp; Vendor Risk Register
              </div>
            </div>
          </Link>

          {/* Product 2: SnapInspect AI */}
          <Link
            href="/snapinspect/app"
            onClick={() => setIsOpen(false)}
            className={`p-2.5 rounded-xl flex items-center gap-3 transition-colors ${
              isSnapInspect ? "bg-gray-800/80 text-white" : "hover:bg-gray-800/40 text-gray-300"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shrink-0">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-white flex items-center gap-1">
                SnapInspect AI
                <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 rounded">
                  PWA
                </span>
              </div>
              <div className="text-[11px] text-gray-400">
                Voice-to-Report Field Inspector App
              </div>
            </div>
          </Link>

          {/* Product 3: Dispel Lens */}
          <Link
            href="/dispel/app"
            onClick={() => setIsOpen(false)}
            className={`p-2.5 rounded-xl flex items-center gap-3 transition-colors ${
              isDispel ? "bg-gray-800/80 text-white" : "hover:bg-gray-800/40 text-gray-300"
            }`}
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-gray-950 shrink-0">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-xs text-white flex items-center gap-1">
                Dispel Lens
                <span className="text-[9px] bg-cyan-500/10 text-cyan-400 px-1.5 rounded">
                  AI DEFENSE
                </span>
              </div>
              <div className="text-[11px] text-gray-400">
                Forensic Reality &amp; Deepfake Inspector
              </div>
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

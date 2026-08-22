"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck, Camera, ChevronDown, Sparkles, CheckCircle2, Layers } from "lucide-react";

export function PortfolioSwitcher() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const isSnapInspect = pathname?.startsWith("/snapinspect");

  const products = [
    {
      id: "vendorshield",
      name: "VendorShield",
      tagline: "SOC 2 Sub-Processor Register",
      href: "/",
      activeMatch: !isSnapInspect,
      badge: "Product 1: Live",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      icon: ShieldCheck,
      iconBg: "bg-blue-600",
    },
    {
      id: "snapinspect",
      name: "SnapInspect AI",
      tagline: "Voice-to-Report Field App",
      href: "/snapinspect",
      activeMatch: isSnapInspect,
      badge: "Product 2: Active",
      badgeColor: "bg-red-500/10 text-red-400 border-red-500/20",
      icon: Camera,
      iconBg: "bg-red-600",
    },
  ];

  const currentProduct = isSnapInspect ? products[1] : products[0];
  const CurrentIcon = currentProduct.icon;

  return (
    <div className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-gray-900/90 hover:bg-gray-800 border border-gray-800 text-left transition-all group"
      >
        <div
          className={`w-7 h-7 rounded-lg ${currentProduct.iconBg} flex items-center justify-center text-white shadow-sm`}
        >
          <CurrentIcon className="w-4 h-4" />
        </div>

        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-xs text-white tracking-tight leading-none">
              {currentProduct.name}
            </span>
            <span
              className={`text-[9px] uppercase font-semibold px-1.5 py-0.2 rounded border ${currentProduct.badgeColor}`}
            >
              {currentProduct.id === "vendorshield" ? "SOC 2" : "Voice AI"}
            </span>
          </div>
          <span className="text-[10px] text-gray-400 leading-tight">
            {currentProduct.tagline}
          </span>
        </div>

        <ChevronDown className="w-3.5 h-3.5 text-gray-400 group-hover:text-white transition-transform duration-200 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 mt-2 w-72 origin-top-left rounded-2xl bg-gray-900 border border-gray-800 p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-150">
            <div className="px-3 py-2 border-b border-gray-800/80 mb-1 flex items-center justify-between">
              <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider flex items-center gap-1">
                <Layers className="w-3 h-3 text-blue-400" /> SaaS Venture Portfolio
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">2 Products</span>
            </div>

            <div className="space-y-1">
              {products.map((prod) => {
                const Icon = prod.icon;
                const isSelected = prod.activeMatch;

                return (
                  <Link
                    key={prod.id}
                    href={prod.href}
                    onClick={() => setIsOpen(false)}
                    className={`p-2.5 rounded-xl flex items-center justify-between transition-colors ${
                      isSelected
                        ? "bg-gray-800/90 border border-gray-700/60"
                        : "hover:bg-gray-800/50"
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div
                        className={`w-8 h-8 rounded-lg ${prod.iconBg} flex items-center justify-center text-white`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white flex items-center gap-1.5">
                          {prod.name}
                          {isSelected && (
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          )}
                        </div>
                        <div className="text-[10px] text-gray-400">{prod.tagline}</div>
                      </div>
                    </div>

                    <span
                      className={`text-[9px] font-semibold px-2 py-0.5 rounded-full border ${prod.badgeColor}`}
                    >
                      {prod.id === "vendorshield" ? "SOC 2 Register" : "Field App"}
                    </span>
                  </Link>
                );
              })}
            </div>

            <div className="mt-2 pt-2 border-t border-gray-800/80 px-2 flex items-center justify-between text-[11px] text-gray-400">
              <Link
                href="/snapinspect/toolkit"
                onClick={() => setIsOpen(false)}
                className="hover:text-white transition-colors text-[10px] text-amber-400 flex items-center gap-1"
              >
                <Sparkles className="w-3 h-3" />
                <span>Inspector Toolkit ($49)</span>
              </Link>
              <Link
                href="/directory"
                onClick={() => setIsOpen(false)}
                className="hover:text-white transition-colors text-[10px]"
              >
                pSEO Directory
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

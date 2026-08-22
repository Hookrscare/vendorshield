"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ShieldCheck,
  Database,
  LayoutDashboard,
  FileText,
  Code2,
  Sparkles,
  ExternalLink,
  Camera,
  Mic,
  Briefcase,
  Layers,
} from "lucide-react";
import { PortfolioSwitcher } from "./PortfolioSwitcher";

export function Navbar() {
  const pathname = usePathname();
  const isEmbed = pathname?.startsWith("/embed");

  if (isEmbed) return null;

  const isSnapInspect = pathname?.startsWith("/snapinspect");

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800/80 bg-gray-950/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand & Portfolio Switcher */}
        <div className="flex items-center gap-3">
          <PortfolioSwitcher />
        </div>

        {/* Dynamic Navigation Links based on active product */}
        {isSnapInspect ? (
          /* SnapInspect AI Navigation */
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-300">
            <Link
              href="/snapinspect"
              className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
                pathname === "/snapinspect"
                  ? "bg-gray-800/80 text-white"
                  : "hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <Camera className="w-4 h-4 text-red-400" />
              Overview
            </Link>
            <Link
              href="/snapinspect/app"
              className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
                pathname === "/snapinspect/app"
                  ? "bg-gray-800/80 text-white"
                  : "hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <Mic className="w-4 h-4 text-rose-400" />
              Field App (PWA)
            </Link>
            <Link
              href="/snapinspect/toolkit"
              className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
                pathname === "/snapinspect/toolkit"
                  ? "bg-gray-800/80 text-white"
                  : "hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <Briefcase className="w-4 h-4 text-amber-400" />
              Inspector Toolkit
            </Link>
            <Link
              href="/snapinspect#pricing"
              className="px-3 py-2 rounded-md hover:text-white hover:bg-gray-800/50 transition-colors text-xs text-gray-400"
            >
              Pricing &amp; ROI
            </Link>
          </nav>
        ) : (
          /* VendorShield Navigation */
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-gray-300">
            <Link
              href="/dashboard"
              className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
                pathname?.startsWith("/dashboard") &&
                pathname !== "/dashboard/embed-code" &&
                pathname !== "/dashboard/audit-export"
                  ? "bg-gray-800/80 text-white"
                  : "hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-blue-400" />
              Register
            </Link>
            <Link
              href="/dashboard/audit-export"
              className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
                pathname === "/dashboard/audit-export"
                  ? "bg-gray-800/80 text-white"
                  : "hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <FileText className="w-4 h-4 text-emerald-400" />
              Audit Pack
            </Link>
            <Link
              href="/dashboard/embed-code"
              className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
                pathname === "/dashboard/embed-code"
                  ? "bg-gray-800/80 text-white"
                  : "hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <Code2 className="w-4 h-4 text-purple-400" />
              Embed Widget
            </Link>
            <Link
              href="/directory"
              className={`px-3 py-2 rounded-md transition-colors flex items-center gap-1.5 ${
                pathname?.startsWith("/directory")
                  ? "bg-gray-800/80 text-white"
                  : "hover:text-white hover:bg-gray-800/50"
              }`}
            >
              <Database className="w-4 h-4 text-amber-400" />
              SaaS Directory
            </Link>
            <Link
              href="/p/acme-saas"
              target="_blank"
              className="px-3 py-2 rounded-md text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors flex items-center gap-1 text-xs"
            >
              Live Public Page
              <ExternalLink className="w-3 h-3" />
            </Link>
          </nav>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          {isSnapInspect ? (
            <>
              <Link
                href="/snapinspect/toolkit"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-full border border-amber-500/20 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Toolkit ($49 Bundle)
              </Link>
              <Link
                href="/snapinspect/app"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-lg shadow-md shadow-red-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Launch Field App
              </Link>
            </>
          ) : (
            <>
              <Link
                href="/snapinspect"
                className="hidden sm:inline-flex items-center gap-1.5 text-xs text-red-400 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-full border border-red-500/20 transition-colors"
              >
                <Camera className="w-3.5 h-3.5" />
                Try SnapInspect AI 📸
              </Link>
              <Link
                href="/dashboard"
                className="inline-flex items-center justify-center px-4 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Open Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

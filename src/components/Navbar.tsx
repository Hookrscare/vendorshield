"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ArrowUpRight, Menu, X } from "lucide-react";

export function Navbar() {
  const pathname = usePathname() || "/";
  const [menuPath, setMenuPath] = useState<string | null>(null);
  if (pathname.startsWith("/embed") || pathname.startsWith("/dashboard")) return null;
  const isSnap = pathname.startsWith("/snapinspect");
  const isDispel = pathname.startsWith("/dispel");
  const editorial =
    pathname === "/" ||
    pathname.startsWith("/directory") ||
    pathname === "/capabilities";
  const brand = isSnap ? "SnapInspect" : isDispel ? "Dispel" : "VendorShield";
  const home = isSnap ? "/snapinspect" : isDispel ? "/dispel" : "/";
  const links = isSnap
    ? [
        ["Overview", "/snapinspect"],
        ["Field workspace", "/snapinspect/app"],
        ["Toolkit", "/snapinspect/toolkit"],
        ["Fee calculator", "/tools/inspector-calculator"],
      ]
    : isDispel
      ? [
          ["Overview", "/dispel"],
          ["Analysis status", "/dispel/app"],
          ["Extension status", "/dispel/extension"],
        ]
      : [
          ["Overview", "/"],
          ["Directory", "/directory"],
          ["Capabilities", "/capabilities"],
        ];
  const action = isSnap
    ? ["Field workspace", "/snapinspect/app"]
    : isDispel
      ? ["Current availability", "/dispel/app"]
      : ["Open workspace", "/dashboard"];
  const open = menuPath === pathname;
  return (
    <header className={`library-header ${editorial ? "is-paper" : "is-ink"}`}>
      <div className="library-nav">
        <Link
          href={home}
          className="library-brand"
          aria-label={`${brand} home`}
        >
          <span className="brand-symbol" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          {brand}
          <span className="brand-period">.</span>
        </Link>
        <nav className="desktop-nav" aria-label="Main navigation">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              aria-current={
                (href === "/" ? pathname === href : pathname.startsWith(href))
                  ? "page"
                  : undefined
              }
            >
              {label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <Link className="workspace-link" href={action[1]}>
            {action[0]}
            <ArrowUpRight size={16} />
          </Link>
          <button
            className="mobile-menu-toggle"
            aria-label={open ? "Close navigation" : "Open navigation"}
            aria-expanded={open}
            aria-controls="mobile-navigation"
            onClick={() => setMenuPath(open ? null : pathname)}
          >
            {open ? <X size={21} /> : <Menu size={21} />}
          </button>
        </div>
      </div>
      {open && (
        <nav
          id="mobile-navigation"
          className="mobile-navigation"
          aria-label="Mobile navigation"
        >
          {links.map(([label, href]) => (
            <Link key={href} href={href} onClick={() => setMenuPath(null)}>
              {label}
              <ArrowUpRight size={16} />
            </Link>
          ))}
          <Link href="/snapinspect" onClick={() => setMenuPath(null)}>
            SnapInspect <ArrowUpRight size={16} />
          </Link>
          <Link href="/dispel" onClick={() => setMenuPath(null)}>
            Dispel status <ArrowUpRight size={16} />
          </Link>
        </nav>
      )}
    </header>
  );
}

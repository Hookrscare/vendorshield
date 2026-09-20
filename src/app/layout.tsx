import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono, Newsreader } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { CapabilityNotice } from "@/components/CapabilityNotice";
import "./reference.css";

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["500", "700", "800"],
});

const plusJakarta = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
  weight: ["400", "500", "600"],
});

const editorial = Newsreader({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-editorial",
  weight: ["400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "VendorShield | Vendor records, clearly considered",
  description:
    "Organize vendor records and DPA details, publish sub-processor disclosures, and export your records. See current capability limits before using the prototypes.",
  keywords: [
    "sub processor register tool",
    "vendor risk assessment software for startups",
    "SOC 2 vendor compliance tracker",
    "third party risk management micro saas",
    "DPA tracker",
    "subprocessors public page widget",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${syne.variable} ${plusJakarta.variable} ${jetbrainsMono.variable} ${editorial.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-canvas-950 text-gray-100 font-sans antialiased selection:bg-cyan-500 selection:text-black bg-noise">
        <>
          <Navbar />
          <CapabilityNotice />
          <a href="#main-content" className="skip-link">
            Skip to content
          </a>
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <Footer />
        </>
      </body>
    </html>
  );
}

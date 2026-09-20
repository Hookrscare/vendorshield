import type { Metadata } from "next";
import { Syne, Plus_Jakarta_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { SmoothScrollProvider } from "@/components/motion/SmoothScrollProvider";

const syne = Syne({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
  weight: ["500", "700", "800"],
});

const plusJakarta = Plus_Jakarta_Sans({
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

export const metadata: Metadata = {
  title: "VendorShield | Automated Sub-Processor Register & SOC 2 Compliance Tracker",
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
      className={`dark ${syne.variable} ${plusJakarta.variable} ${jetbrainsMono.variable}`}
    >
      <body className="min-h-screen flex flex-col bg-canvas-950 text-gray-100 font-sans antialiased selection:bg-cyan-500 selection:text-black bg-noise">
        <SmoothScrollProvider>
          <Navbar />
          <div className="border-b border-amber-400/20 bg-amber-400/5 px-6 py-3 text-center text-sm text-amber-100">Product status: working register, local prototypes, and unavailable features. <a href="/capabilities" className="underline underline-offset-4">See what currently works</a>.</div>
          <main className="flex-1">{children}</main>
          <Footer />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}

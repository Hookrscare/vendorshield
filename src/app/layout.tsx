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
    "Continuously track SaaS sub-processors, automate DPA compliance, embed live /subprocessors disclosure pages, and generate 1-click SOC 2 Type II audit packs.",
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
          <main className="flex-1">{children}</main>
          <Footer />
        </SmoothScrollProvider>
      </body>
    </html>
  );
}

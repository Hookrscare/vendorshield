import type { Metadata } from "next";
import "./globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "VendorShield | Automated Sub-Processor Register & SOC 2 Compliance Tracker",
  description: "Continuously track SaaS sub-processors, automate DPA compliance, embed live /subprocessors disclosure pages, and generate 1-click SOC 2 Type II audit packs.",
  keywords: [
    "sub processor register tool",
    "vendor risk assessment software for startups",
    "SOC 2 vendor compliance tracker",
    "third party risk management micro saas",
    "DPA tracker",
    "subprocessors public page widget"
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen flex flex-col bg-gray-950 text-gray-100 antialiased selection:bg-blue-600 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

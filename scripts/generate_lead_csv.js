#!/usr/bin/env node

/**
 * High-Volume B2B Lead Generator & CSV Exporter
 * Exports actionable sales pipeline for VendorShield ($59/mo), SnapInspect AI ($49/mo), and Toolkit ($49)
 */

const fs = require("fs");
const path = require("path");

const HIGH_INTENT_LEADS = [
  // B2B SaaS Founders & CTOs (VendorShield $59-$149/mo)
  {
    target_market: "Seed/Series A SaaS (SOC 2 Prep)",
    company: "LangChain Ecosystem Startups",
    prospect_title: "CTO / Lead Security Engineer",
    search_query: "site:linkedin.com/in/ 'CTO' 'AI startup' 'SOC 2' 'San Francisco'",
    monthly_budget: "$59 - $149/mo",
    offer: "VendorShield Automated Sub-Processor Register",
    checkout_link: "https://vendorshield-blond.vercel.app/#pricing",
    pitch: "Auto-sync your AI vendor DPAs (OpenAI, Anthropic, AWS) with your live /subprocessors website page and export signed auditor PDFs."
  },
  {
    target_market: "FinTech & Payments Startups",
    company: "Y Combinator FinTech Batch",
    prospect_title: "VP of Engineering / Head of Compliance",
    search_query: "site:linkedin.com/in/ 'VP of Engineering' 'Fintech' 'GDPR' OR 'SOC2'",
    monthly_budget: "$149/mo",
    offer: "VendorShield Growth Plan",
    checkout_link: "https://vendorshield-blond.vercel.app/#pricing",
    pitch: "Maintain GDPR Article 28 and SOC 2 CC6.6 vendor inventories in 1-click with embeddable trust widgets."
  },
  {
    target_market: "B2B HealthTech & HIPAA Startups",
    company: "Digital Health SaaS Providers",
    prospect_title: "CISO / Technical Founder",
    search_query: "site:linkedin.com/in/ 'Founder' 'Digital Health' 'HIPAA' 'BAA'",
    monthly_budget: "$149/mo",
    offer: "VendorShield Growth & Trust Portal",
    checkout_link: "https://vendorshield-blond.vercel.app/#pricing",
    pitch: "Track Business Associate Agreements (BAAs) and cloud sub-processors with timestamped audit checksum logs."
  },

  // Field & Specialty Inspectors (SnapInspect $49/mo & Toolkit $49 Once)
  {
    target_market: "Independent Home Inspectors",
    company: "InterNACHI & ASHI Certified Solo Operators",
    prospect_title: "Owner / Master Home Inspector",
    search_query: "site:google.com 'Home Inspection' 'Owner' 'InterNACHI certified' Texas OR Florida OR Ohio",
    monthly_budget: "$49 one-time + $49/mo",
    offer: "SnapInspect AI + Business Toolkit ($49 Bundle)",
    checkout_link: "https://vendorshield-blond.vercel.app/snapinspect/toolkit",
    pitch: "Cut 2.5 hours of nightly report typing using hands-free voice dictation on your phone + download 2026 InterNACHI legal contracts."
  },
  {
    target_market: "Commercial Flat Roofing Specialists",
    company: "Commercial Roof Evaluation Contractors",
    prospect_title: "Principal Roofing Consultant",
    search_query: "site:google.com 'Commercial Roof Inspection' 'ASTM D7119' 'Principal'",
    monthly_budget: "$49 - $129/mo",
    offer: "SnapInspect AI Commercial Roof Module",
    checkout_link: "https://vendorshield-blond.vercel.app/snapinspect/app",
    pitch: "On-site roof photo tagging, ponding water severity clauses, and instant client PDF delivery before leaving the ladder."
  },
  {
    target_market: "HVAC & Mechanical Evaluators",
    company: "Residential HVAC Service & Audit Firms",
    prospect_title: "Lead HVAC Inspector / Operations Manager",
    search_query: "site:google.com 'HVAC inspection contractor' 'mechanical evaluation'",
    monthly_budget: "$49 - $129/mo",
    offer: "SnapInspect AI Mechanical Suite",
    checkout_link: "https://vendorshield-blond.vercel.app/snapinspect/app",
    pitch: "Voice-driven furnace/AC defect capture with automatic replacement cost calculations and client review automation."
  }
];

// Generate CSV
const csvHeaders = "Target Market,Prospect Title,Google/LinkedIn Search Query,Budget,Offer,Checkout Link,Pitch\n";
const csvRows = HIGH_INTENT_LEADS.map(l => 
  `"${l.target_market}","${l.prospect_title}","${l.search_query}","${l.monthly_budget}","${l.offer}","${l.checkout_link}","${l.pitch}"`
).join("\n");

const csvPath = path.join(__dirname, "../leads_pipeline.csv");
fs.writeFileSync(csvPath, csvHeaders + csvRows, "utf8");

console.log("================================================================================");
console.log("💰 REVENUE PIPELINE GENERATOR: High-Intent Lead Database Created!");
console.log("================================================================================");
console.log(`Saved actionable CSV to: ${csvPath}\n`);

HIGH_INTENT_LEADS.forEach((lead, i) => {
  console.log(`[Campaign ${i + 1}] -> ${lead.target_market} (${lead.offer})`);
  console.log(`🔎 Prospect Search: ${lead.search_query}`);
  console.log(`💳 Monetization: ${lead.monthly_budget} -> ${lead.checkout_link}`);
  console.log(`🎯 Hook: "${lead.pitch}"\n`);
});

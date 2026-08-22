# VendorShield 🛡️
> **Automated Sub-Processor Register & SOC 2 Compliance Tracker for Startups**

VendorShield enables SaaS founders, CTOs, and InfoSec leads to eliminate messy spreadsheet tracking, continuously monitor 3rd-party vendor Data Processing Agreements (DPAs), synchronize a live embeddable `/subprocessors` page with 1 line of code, and export 1-click auditor packs for SOC 2 Type II and ISO 27001 audits.

---

## 🌟 Key Features

1. **Active Sub-Processor Risk Register**:
   - Track vendors, processed data categories (PII, billing, telemetry), hosting regions, DPA execution status, and risk ratings.
   - 1-Click auto-fill from our pre-indexed directory of 30+ top developer APIs (OpenAI, AWS, Stripe, Vercel, Supabase, Resend, PostHog, Sentry, etc.).

2. **Embeddable Public `/subprocessors` Widget**:
   - Zero-maintenance public disclosure widget formatted for Webflow, WordPress, React, or custom static sites.
   - Real-time search, category filtering, and light/dark mode support.

3. **SOC 2 & ISO 27001 Auditor Export Center**:
   - 1-Click branded PDF generation with executive sign-off blocks, verification checksums, and AICPA CC6.6/CC9.2 trust criteria alignment.
   - Raw CSV & JSON data exports for direct ingestion into Vanta, Drata, or audit workpapers.

4. **Programmatic SEO (pSEO) SaaS Directory (`/directory`)**:
   - 30+ pre-indexed compliance profiles with verified DPA links, sub-processor policy pages, and third-party security certifications.

5. **Auditable Change Trail**:
   - Real-time event logging capturing vendor additions, modifications, and DPA status changes.

---

## 🚀 Quickstart & Local Development

### Prerequisites
- Node.js 18.x or 20.x+
- npm 9.x+

```bash
# Clone or navigate to the directory
cd /Users/castro/Documents/SaaS

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Routes Overview

| Route | Purpose |
| :--- | :--- |
| `/` | High-converting SaaS landing page with interactive ROI calculator and live demo |
| `/dashboard` | Main sub-processor management dashboard with stats and modals |
| `/dashboard/audit-export` | 1-Click PDF, CSV, and JSON audit evidence generator |
| `/dashboard/embed-code` | Embed widget customizer & live iframe code generator |
| `/p/[slug]` | Standalone public-facing customer trust & disclosure portal |
| `/embed/[slug]` | Clean, frameless embed view for iframes |
| `/directory` | Programmatic SEO Directory of 30+ popular SaaS APIs & tools |
| `/directory/[vendorSlug]` | Dedicated compliance profile page for search engines |

---

## 🚢 Deployment Guide

### Option 1: 1-Click Vercel Deployment (Recommended)
1. Push your repository to GitHub / GitLab.
2. Import the repository into [Vercel](https://vercel.com).
3. Framework preset: **Next.js**.
4. Click **Deploy**.

### Option 2: Docker Container Deployment (Railway, Render, Fly.io, AWS ECS)
```bash
# Build Docker image
docker build -t vendorshield:latest .

# Run container locally on port 3000
docker run -p 3000:3000 vendorshield:latest
```

### Option 3: Standard Node.js Server
```bash
npm run build
npm run start
```

---

## 🔒 Security & Compliance Standards Addressed
- **AICPA SOC 2 (2017 Trust Services Criteria)**: CC6.6 (Logical Access & Vendor Boundaries) and CC9.2 (Vendor Risk Management & Periodic Due Diligence).
- **GDPR Article 28(2) & 28(4)**: Mandatory Data Processing Addendum and Sub-Processor Engagement notification.
- **ISO/IEC 27001:2022**: Clause A.15 (Supplier Relationships & Information Security in Supply Chain).

---

## 📄 License
MIT License. Built for speed, compliance, and enterprise sales acceleration.

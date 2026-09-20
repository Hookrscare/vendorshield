# VendorShield capability and content-integrity audit

Date: 2026-09-20. Scope: all advertised product areas and public routes, their source implementations, and selected live workflows. This is a product audit, not a security certification or a claim that every device/browser has been tested.

## Candid assessment

The site was substantially overstating its capabilities. The useful foundation is a manually maintained vendor register with public disclosure pages and record exports. It is not a finished automated compliance suite. SnapInspect began as a local prototype; this follow-up adds private workspace storage and controlled snapshot sharing. Dispel did not analyze supplied media at all. Hundreds of library tests do not establish that library modules are connected to product workflows or that their scientific claims are valid.

A small assisted vendor-register setup pilot is plausible. Broad paid subscriptions, security-verdict products, and professional inspection guarantees are not ready to sell.

## Buyer-facing capability table

| Offering / public route | Status and actual behavior | Evidence and practical limit |
| --- | --- | --- |
| Account and tenant vendor register `/login`, `/onboarding`, `/dashboard` | Working core; manually create/update vendors, DPA status, categories, risk and disclosure details | Originating task verified signed-in CRUD and tenant/role boundaries using cleaned temporary fixtures in the preceding session. This audit inspected `src/app/api/vendors`, `src/app/api/company`, and dashboard wiring. That prior end-to-end proof is not a new production account test here. |
| Public disclosures `/p/[slug]`, `/embed/[slug]` | Implemented read-only publication of stored records; public ACME route is a sample | Both clients fetch `/api/public/[slug]` on load; no continuous push subscription. Changes need a reload. No independent vendor verification. |
| Embed code `/dashboard/embed-code` | Implemented code generation for organization portal | Depends on valid slug/public settings. Embedding does not make a company compliant. |
| Free widget `/tools/widget-generator` | Sample customization demo | Generated URL is hard-coded to `acme-saas`; changing company label does not create a customer register. Now explicit. |
| Audit exports `/dashboard/audit-export` | PDF/CSV/JSON record generation, not independent audit verification | `src/lib/pdf-export.ts` and page handlers export entered records. Random purported SHA-256 checksum and false online verification link removed. Review block now acknowledges unverified records, with no automatic compliance certification. |
| Online attestation `/verify/[hash]` | Unavailable | Previously rendered valid for arbitrary identifiers without lookup. Replaced with explicit unavailable state. |
| Directory `/directory`, `/directory/[vendorSlug]` | Static reference data, search/filter/navigation | `src/lib/initial-data.ts`; certification labels have no evidence pipeline/freshness guarantee. Removed “Verified” labels and paid-verification implication. Actual directory claims need vendor-by-vendor validation before relying on them. |
| “Real-time video streaming” | Description of Mux, a third-party listed vendor | Exact string in `src/lib/initial-data.ts` under `slug: "mux"`. It means Mux provides video transport/encoding services. VendorShield does not provide streaming, nor does streaming establish authenticity. |
| DPA alerts / public subscription | Partial record collection only | Prior session established no alert delivery, double opt-in or unsubscribe pipeline. No automated DPA monitoring. Homepage corrected. |
| Team invitations `/dashboard/team` | Partial | Role boundaries were verified previously, but invitation acceptance and mail delivery are not complete. Not a finished team onboarding workflow. |
| AI DPA scanner `/dashboard/ai-scanner` | Disabled as misleading | Previously keyword guesses, default certification, hard-coded 94 score and “Add” button that only toggled local state. No legal analysis or actual register insertion. |
| Readiness `/tools/soc2-readiness` | Illustrative checklist | Four self-reported answers summed to a grade; no audit of systems. Revised description and deterministic outcome language. |
| Cost calculators `/`, `/tools/inspector-calculator` | Arithmetic tools | Preset hours/rates and fee rules, not measured savings or verified market pricing. Assumptions labeled. |
| SnapInspect `/snapinspect/app` | Local editing plus private workspace saves, restore, PDF/JSON export and revocable seven-day snapshot links | Full reports/photos stored in private storage; tenant-scoped reads and writer-only RPC changes. 3 MB/report. Explicit save; queued draft retained until server acknowledgement. Browser speech and keyword suggestions still require review. |
| SnapInspect cloud/share | Implemented and integration-tested | Owner save/restore, viewer read-only, cross-tenant denial, stale-write conflict, frozen snapshots, revocation, expiry and private-blob denial passed against the linked backend. Unsaved drafts remain device-local. |
| SnapInspect voice fallback | Corrected | Previously substituted a canned defect when recognition was unsupported or empty. Now reports unavailable/no speech and creates no defect. Explicitly selected sample examples remain examples. |
| SnapInspect spatial/industrial functionality | Not established as an integrated product | Animated marketing visualization and numerous standalone library modules are not proof of a connected sensor/CAD/industrial workflow. Removed broad marketing claims; no new engine invented. |
| Inspector toolkit `/snapinspect/toolkit` | Files exist; delivery is payment gated | Private ZIP contains Markdown and JSON, including a Notion architecture blueprint, not a proven turnkey workspace. Download handler checks a paid Stripe session. No legal-vetting evidence found; unsupported badges corrected. Purchase UI disabled. |
| Dispel `/dispel`, `/dispel/app`, `/tools/deepfake-scanner` | Unavailable, not a working authenticity checker | Live synthetic sample returned “VERIFIED OPTICAL MEDIA (94% CONFIDENCE).” Source used presets/timers. Replaced misleading pages; no upload/analysis/verdict/certificate controls remain. Cannot verify YouTube videos. |
| Dispel API `/api/dispel/verify` | Fails closed, 501 | Previously ignored supplied media/frame content and returned predefined metrics plus random “SHA256” strings. Now returns no result/certificate. |
| Dispel extension `/dispel/extension` | Unavailable | Download was manifest-only; referenced scripts, popup and icons were absent from package. Removed download/install claims. |
| Enterprise contact `/api/contact` | Unavailable | Only logged contact data and promised follow-up within 24 hours. Now returns 503 without claiming delivery or logging a new lead. |
| Pricing and checkout | Live purchase UI disabled; unfinished product plans rejected server-side | Earlier task verified Stripe sandbox, not live billing. No credentials changed, charges made or prices changed. Dispel, SnapInspect and paid profile-verification checkout requests return 503 before Stripe. Existing VendorShield/toolkit billing plumbing retained. |
| Testimonials | Unsupported, removed | Three named five-star endorsements hard-coded by commit `09860a3`, labeled “Real feedback.” No provenance found. Initial avatars, not customer photos. No aggregate review count/schema found. We cannot prove the people are fictitious; we can establish that the site lacked support for presenting their endorsements as real. |

## What was changed

Initial release `39f18bd`: removed the entire testimonial section; corrected verification badges, static network metrics, sample register and calculator labeling. Production HTML confirmed all three names, stars and “Real feedback” absent.

Follow-up: disabled fake analysis/certificates and incomplete downloads, fixed local queue retention and fabricated voice fallback, removed false PDF hash/verification, labeled directory/sample tools, disabled misleading paid offers and published `/capabilities` with a prominent sitewide link. These are integrity corrections, not implementations of missing products.

## Prioritized gaps before seeking recurring SaaS revenue

1. Sell only the bounded register/publication/export workflow. Verify a new buyer’s complete setup, edit, public-page refresh and export with their authorized data before calling a pilot delivered.
2. Make account onboarding reliable (OTP landed in Junk previously), document recovery and ownership, and verify backups/restoration and real plan enforcement. This audit did not establish production support readiness.
3. Complete invitation acceptance and outbound email only if necessary for the narrow offer. Keep alerts excluded until consent, delivery, unsubscribe, retries and failure reporting work end-to-end.
4. Validate directory data and remove unsupported certification labels at the data level. A disclaimer is not evidence of vendor status.
5. Prove a customer need before expanding SnapInspect or Dispel. A real media authenticity product requires independently validated methods and accuracy evaluation; presets or unit-test counts cannot substitute.
6. Establish real billing configuration and paid-plan delivery before re-enabling purchase UI. No revenue or paying customers were established by this audit.

See `ASSISTED_PILOT_ACQUISITION_2026-09-20.md` for a draft-only, five-prospect acquisition packet.

## Integrity-release validation

Production build passed. Vitest: 1,439 tests across 425 files passed. Focused lint reported no errors (existing loose-type warnings remain). Desktop and 390px mobile browser review of `/capabilities` passed; SnapInspect report screen showed disabled client sharing. Final wording removes unsupported inspector sign-off and PDF seal claims. This snapshot describes the integrity release; subsequent implementation work must update the capability statuses as it gains end-to-end evidence.

## SnapInspect implementation follow-up

Added immutable JSON documents in private `snapinspect-documents` storage, organization-scoped metadata, atomic optimistic revisions, and server-side sharing with hashed random tokens. Seven-day links expose only a saved snapshot after explicit consent and can be replaced/revoked. Direct table mutations are denied; writer roles use validated RPCs. Server secrets are environment-only. No external email or billing was enabled.

Live integration script `scripts/qa-snapinspect-cloud.mjs` verifies tenant/role boundaries, save and restoration, stale revisions, frozen shared snapshots, invalid/revoked/expired tokens, and anonymous storage denial. Synthetic users and organizations are removed after each run. Three component tests cover acknowledgement before queue removal, rejected-save preservation and account-switch privacy. Existing 1,439 tests passed; production build passed. New reports start with blank identity/property fields and an unassessed condition. Uploaded field photos are resized before storage.

Operational limits: 3 MB per report, first 100 cloud reports listed, no deletion/history management UI, no automatic retention cleanup for superseded/orphan immutable blobs yet, no cross-device push updates, and no guarantee that device-local unsaved drafts survive cleared browser storage. Keep exports. A failed/ambiguous save never deletes its potentially committed blob. Snapshot links are bearer links; recipients can retain downloaded reports even after revocation. This is not inspection certification.

Dispel remains unavailable. See `DISPEL_PROVIDER_DECISION_2026-09-20.md` for real-provider comparison, Chrome/YouTube capture architecture and the remaining account/paid-video entitlement plus validation gate.

Production follow-up proof: Vercel deployment `vendorshield-2lsu97skf-rrcc1.vercel.app` was aliased to `https://vendorshield-blond.vercel.app`. The cloud integration suite passed against that production alias, including exact restoration of an embedded PNG photo; synthetic fixture cleanup completed (two organizations, three users). Browser review confirmed the deployed workspace panel and sign-in boundary. The production PDF action generated a 19,900-byte, two-page PDF in Downloads. Browser download-event observation timed out, but the new files and timestamps confirmed that the download itself succeeded. No authenticated end-to-end browser/device matrix was completed; authorization and sharing behavior were verified through the production APIs plus component tests.

# Public website redesign — September 20, 2026

Shipped commit: `16ad964`. Production: https://vendorshield-blond.vercel.app/directory . Vercel deployment: `vendorshield-2mvsi30tm-rrcc1.vercel.app`.

## Diagnosis and design

The old directory centered a long marketing heading above cramped pill filters and uniform cards. Small metadata, repeated green checkmarks, competing blue CTAs and a crowded product switcher weakened hierarchy. On a 390px mobile viewport the initial screen contained no vendor. Its CTA also incorrectly claimed automatic policy monitoring, and profiles retained “Third-party Audited” beneath unverified labels.

The new reference-library design uses warm paper, ink, olive, Newsreader display typography and DM Sans. A layered CSS 3D document object responds to pointer and keyboard activation; it has no continuous rendering loop and becomes static under reduced motion. Mobile prioritizes search and records, omitting the sculpture. Numbered categories and ruled vendor rows replace cards. Inline previews put DPA and sub-processor source links beside the data fields. Search/category state survives in the URL; no-match states include a reset action. Results progressively reveal 12 records at a time.

The same design now covers the homepage, all directory profiles, capability page, and public navigation/footer. Real mobile navigation replaces hidden desktop-only links. Product workspaces retain their dark functional surfaces. Removed artificial scrolling from the shared shell; native scrolling respects input and motion preferences. Disclosures remain visible, and register links say what they actually do. No fabricated endorsements or capabilities were introduced. No assets/services were purchased.

## Verification

- Local and Vercel production builds passed.
- Seven focused component tests passed across directory search/deep-link/reset behavior, footer legal navigation, and existing SnapInspect queued-save protections.
- Initial concurrent tests hit host resource timeouts; isolated directory tests and the other two files subsequently passed. This was not reported as a clean full-suite run.
- Focused lint: zero errors, one warning about initial URL-state hydration in an effect.
- Desktop 1440×1000 and mobile 390×844 browser inspection; mobile first vendor now visible on initial screen, with no horizontal overflow on the inspected profile.
- Browser behavior: Stripe search, inline DPA preview, category/no-result/reset flow, 12-to-24 result expansion, Payments category, mobile navigation, vendor profile, and keyboard activation of the archive.
- Reduced-motion emulation verified a zero-second transition and flattened transform; emulation and viewport overrides reset afterward.
- Production search/preview returned Stripe's DPA source. No browser console errors in that flow.
- Homepage, directory, Mux profile, capabilities, SnapInspect app and Dispel app return HTTP 200; Dispel verification API remains disabled with HTTP 501.

Rendered before/after evidence is saved under the task artifact folder `vendorshield-redesign`, including `directory-desktop-live.jpg` and `directory-mobile-live.jpg`. These are actual production screenshots, not mockups.

## Scope limits

This redesign does not validate third-party certification claims, complete Dispel detection, enable billing or send outreach. SnapInspect storage/sharing logic and backend migrations are unchanged. Other tool/workspace interiors remain outside this visual overhaul; their shared navigation and typography have been updated.

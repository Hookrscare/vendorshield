# VendorShield workspace redesign

## Scope and design diagnosis

The public editorial redesign originally stopped at the workspace boundary. The dashboard still used a blue/purple card mosaic, small seven-column table, repeated actions and misleading compliance language. This release applies the dark reference-library system to the working product.

- `/dashboard`: persistent navigation, ruled summary, searchable/filterable records, responsive mobile record layout, activity, company/privacy settings and current plan.
- `/dashboard/audit-export`: document preparation and PDF/CSV/JSON exports.
- `/dashboard/embed-code`: disclosure controls, code snippets, explicit embed theme choices and preview.
- `/dashboard/team`: member roster, pending invitations, permissions reference and accessible invitation dialog.
- `/dashboard/ai-scanner`: consistent unavailable-capability presentation; analysis remains unavailable.
- Vendor add/edit dialogs: visible associated labels, keyboard-operable directory choices, full existing record fields, restrained dialog depth and dynamic focus trapping.
- `/embed/[slug]`: the preview is part of the disclosure workflow. Its embedded records now match the design and display actual DPA status. Explicit light theme remains supported.

There was no separate billing screen. Current entitlement is displayed under Settings & plan; paid upgrades remain unavailable. Public marketing, standalone public `/p/[slug]` disclosures, account sign-in/onboarding, SnapInspect and Dispel product workspaces are outside this redesign.

## Integrity corrections discovered during visual review

The old summary inferred “SOC 2 compliant” and “audit-ready” from DPA counts. It now describes recorded agreement states only. Empty inventories do not display 100% compliance. New directory imports no longer invent signed agreements, review dates or hosting locations. New custom entries start under review without preselected certifications. Existing saved records are not rewritten.

The embed hardcoded “Signed DPA” for every record and claimed a verified register; it now renders the saved status with an explicit independent-verification limitation.

## Verification

- Production build passed after source changes.
- 26 focused tests passed across seven files (25 component/API checks and the additional embed status test). The new embed test initially needed an awaited React act for asynchronous route params; it then passed.
- Scoped lint: no errors; three existing state-in-effect warnings remain in dashboard/team initial loading and edit-form hydration.
- A temporary, synthetic owner and organization were created using the existing InsForge test pattern. Browser traffic used a loopback-only proxy that supplied that test session to the real app. No personal sign-in or credentials were exposed.
- Browser: signed-in empty register, custom vendor creation, record edits, company settings save, settings/current plan, team invitation dialog and Escape, disclosure theme controls, desktop and 390px mobile navigation/forms/records.
- Real PDF (10,189 bytes), CSV (360 bytes) and JSON (1,242 bytes) downloads. JSON contained the edited data, Missing DPA state and saved reviewer.
- A deliberately blocked vendor request showed the recoverable error state; unblocking and Try again restored the record.
- DPA preview showed Missing from the saved record and respected explicit light mode.
- Existing API tests cover tenant/role behavior; no backend authorization, schema or payment code changed.

## Design review

The high-impact fixes are the workspace composition, record legibility and truthfulness of status displays. Navigation now identifies the current task; operational pages use a common type hierarchy, fine rules, sage actions and warm dark surfaces. Mobile records expose labeled fields instead of requiring a seven-column sideways table. Remaining compact tables use their own mobile roster layout. Motion is limited to small action feedback; reduced-motion removes transitions. Depth distinguishes actionable file choices and modal layers without adding an ornamental 3D object to the register.

Production deployment and final synthetic-fixture cleanup are recorded in the completion report.

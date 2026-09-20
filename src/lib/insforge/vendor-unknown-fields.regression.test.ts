import { describe, it, expect, vi } from "vitest";
import {
  InsForgeRepository,
  mapVendorRowToSubProcessorVendor,
} from "./repository";
import type { TenantAuthContext } from "./context";
import type { VendorRow } from "./database.types";
const row: VendorRow = {
  description: "",
  website: "",
  logo_url: null,
  dpa_url: "",
  dpa_status: "Under Review",
  risk_level: "Low",
  notes: "",
  is_public: false,
  created_by: "user",
  created_at: "2026-09-20T00:00:00Z",
  updated_at: "2026-09-20T00:00:00Z",
  id: "vendor",
  organization_id: "org",
  name: "Unknown location vendor",
  slug: "vendor",
  category: "Database & Storage",
  data_location: "",
  last_reviewed_date: null,
  next_review_date: null,
  data_processed: [],
  certifications: [],
};
function setup() {
  const q = {
    select: vi.fn(),
    eq: vi.fn(),
    limit: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    maybeSingle: vi.fn().mockResolvedValue({ data: row, error: null }),
    single: vi.fn().mockResolvedValue({ data: row, error: null }),
  };
  for (const method of ["select", "eq", "limit", "insert", "update"] as const)
    q[method].mockReturnValue(q);
  const context = {
    user: { id: "user", email: "qa@example.com" },
    organization: { id: "org", name: "QA", slug: "qa" },
    role: "owner",
    client: { database: { from: vi.fn().mockReturnValue(q) } },
  } as unknown as TenantAuthContext;
  return { q, context };
}
describe("Unknown vendor field persistence", () => {
  it("does not invent a location when reading a saved record", () => {
    expect(mapVendorRowToSubProcessorVendor(row)).toMatchObject({
      dataLocation: "",
      lastReviewedDate: "",
      nextReviewDate: "",
    });
  });
  it("stores blank review dates as null and does not guess a location on create", async () => {
    const { q, context } = setup();
    q.maybeSingle.mockResolvedValueOnce({ data: null, error: null });
    await InsForgeRepository.createVendor(context, {
      name: "Unreviewed",
      category: "Database & Storage",
      dataLocation: "",
      lastReviewedDate: "",
      nextReviewDate: "",
    });
    expect(q.insert).toHaveBeenCalledWith([
      expect.objectContaining({
        data_location: "",
        last_reviewed_date: null,
        next_review_date: null,
      }),
    ]);
  });
  it("can clear existing review dates without sending invalid empty date strings", async () => {
    const { q, context } = setup();
    await InsForgeRepository.updateVendor(context, "vendor", {
      lastReviewedDate: "",
      nextReviewDate: "",
    });
    expect(q.update).toHaveBeenCalledWith(
      expect.objectContaining({
        last_reviewed_date: null,
        next_review_date: null,
      }),
    );
  });
});

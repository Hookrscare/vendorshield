import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as CREATE_VENDOR, GET as GET_VENDORS } from "./route";
import { PUT as UPDATE_VENDOR, DELETE as DELETE_VENDOR, GET as GET_VENDOR_BY_ID } from "./[id]/route";
import { PUT as UPDATE_COMPANY, GET as GET_COMPANY } from "../company/route";
import { GET as GET_PUBLIC_SLUG } from "../public/[slug]/route";
import * as contextModule from "@/lib/insforge/context";
import { InsForgeRepository } from "@/lib/insforge/repository";

describe("Route Layer Authorization & Persistence Isolation", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("blocks viewer role from creating a vendor (403)", async () => {
    vi.spyOn(contextModule, "resolveTenantContext").mockResolvedValue({
      success: true,
      context: {
        user: { id: "u-viewer", email: "viewer@example.com" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
        role: "viewer",
        client: {} as any,
      },
    });

    const req = new NextRequest("http://localhost:3000/api/vendors", {
      method: "POST",
      body: JSON.stringify({ name: "AWS", category: "Cloud Infrastructure & Hosting" }),
    });

    const res = await CREATE_VENDOR(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("Viewers");
  });

  it("blocks viewer role from updating a vendor (403)", async () => {
    vi.spyOn(contextModule, "resolveTenantContext").mockResolvedValue({
      success: true,
      context: {
        user: { id: "u-viewer", email: "viewer@example.com" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
        role: "viewer",
        client: {} as any,
      },
    });

    const req = new NextRequest("http://localhost:3000/api/vendors/v-123", {
      method: "PUT",
      body: JSON.stringify({ name: "AWS Updated" }),
    });

    const res = await UPDATE_VENDOR(req, {
      params: Promise.resolve({ id: "v-123" }),
    });
    expect(res.status).toBe(403);
  });

  it("blocks member role from deleting a vendor (403)", async () => {
    vi.spyOn(contextModule, "resolveTenantContext").mockResolvedValue({
      success: true,
      context: {
        user: { id: "u-member", email: "member@example.com" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
        role: "member",
        client: {} as any,
      },
    });

    const req = new NextRequest("http://localhost:3000/api/vendors/v-123", {
      method: "DELETE",
    });

    const res = await DELETE_VENDOR(req, {
      params: Promise.resolve({ id: "v-123" }),
    });
    expect(res.status).toBe(403);
  });

  it("blocks member role from updating company settings (403)", async () => {
    vi.spyOn(contextModule, "resolveTenantContext").mockResolvedValue({
      success: true,
      context: {
        user: { id: "u-member", email: "member@example.com" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
        role: "member",
        client: {} as any,
      },
    });

    const req = new NextRequest("http://localhost:3000/api/company", {
      method: "PUT",
      body: JSON.stringify({ website: "https://evil.com" }),
    });

    const res = await UPDATE_COMPANY(req);
    expect(res.status).toBe(403);
  });

  it("returns 404 for unknown or cross-tenant vendor IDs without enumeration leaks", async () => {
    vi.spyOn(contextModule, "resolveTenantContext").mockResolvedValue({
      success: true,
      context: {
        user: { id: "u-admin", email: "admin@example.com" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
        role: "admin",
        client: {} as any,
      },
    });

    vi.spyOn(InsForgeRepository, "getVendorById").mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/vendors/non-existent-or-other-tenant", {
      method: "GET",
    });

    const res = await GET_VENDOR_BY_ID(req, {
      params: Promise.resolve({ id: "non-existent-or-other-tenant" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toBe("Vendor not found");
  });

  it("returns 404 for unknown public register slugs instead of leaking ACME data", async () => {
    vi.spyOn(InsForgeRepository, "getPublicCompanyAndVendors").mockResolvedValue(null);

    const req = new NextRequest("http://localhost:3000/api/public/unknown-customer-slug", {
      method: "GET",
    });

    const res = await GET_PUBLIC_SLUG(req, {
      params: Promise.resolve({ slug: "unknown-customer-slug" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.error).toContain("not found");
  });

  it("preserves anonymous demo data for slug=demo", async () => {
    const req = new NextRequest("http://localhost:3000/api/public/demo", {
      method: "GET",
    });

    const res = await GET_PUBLIC_SLUG(req, {
      params: Promise.resolve({ slug: "demo" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.company.name).toBe("Acme SaaS Inc.");
    expect(body.data.vendors.length).toBeGreaterThan(0);
  });
});

import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET as GET_TEAM, POST as INVITE_MEMBER, DELETE as REMOVE_MEMBER } from "./route";
import * as contextModule from "@/lib/insforge/context";
import { InsForgeTeamRepository } from "@/lib/insforge/team";

describe("Team Route Layer Authorization & RBAC (QA-107)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns demo team roster for anonymous requests", async () => {
    vi.spyOn(contextModule, "resolveTenantContext").mockResolvedValue({
      success: false,
      status: 401,
      error: "Authentication required",
    });

    const req = new NextRequest("http://localhost:3000/api/team");
    const res = await GET_TEAM(req);
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.isDemo).toBe(true);
    expect(body.data.members.length).toBeGreaterThan(0);
  });

  it("blocks unauthenticated users from inviting members (403)", async () => {
    vi.spyOn(contextModule, "resolveTenantContext").mockResolvedValue({
      success: false,
      status: 401,
      error: "Authentication required",
    });

    const req = new NextRequest("http://localhost:3000/api/team", {
      method: "POST",
      body: JSON.stringify({ email: "auditor@external.com", role: "viewer" }),
    });

    const res = await INVITE_MEMBER(req);
    expect(res.status).toBe(403);
    const body = await res.json();
    expect(body.success).toBe(false);
  });

  it("blocks viewer and member roles from inviting members (403)", async () => {
    vi.spyOn(contextModule, "resolveTenantContext").mockResolvedValue({
      success: true,
      context: {
        user: { id: "u-viewer", email: "viewer@example.com" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
        role: "viewer",
        client: {} as any,
      },
    });

    const req = new NextRequest("http://localhost:3000/api/team", {
      method: "POST",
      body: JSON.stringify({ email: "new@example.com", role: "viewer" }),
    });

    const res = await INVITE_MEMBER(req);
    expect(res.status).toBe(403);
  });

  it("allows workspace admin to invite new members", async () => {
    vi.spyOn(contextModule, "resolveTenantContext").mockResolvedValue({
      success: true,
      context: {
        user: { id: "u-admin", email: "admin@example.com" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
        role: "admin",
        client: {} as any,
      },
    });

    vi.spyOn(InsForgeTeamRepository, "inviteTeamMember").mockResolvedValue({
      id: "inv-123",
      email: "colleague@acme.com",
      role: "member",
      expiresAt: "2026-03-10T00:00:00Z",
      createdAt: "2026-03-03T00:00:00Z",
    });

    const req = new NextRequest("http://localhost:3000/api/team", {
      method: "POST",
      body: JSON.stringify({ email: "colleague@acme.com", role: "member" }),
    });

    const res = await INVITE_MEMBER(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.id).toBe("inv-123");
  });

  it("blocks viewer from removing members (403)", async () => {
    vi.spyOn(contextModule, "resolveTenantContext").mockResolvedValue({
      success: true,
      context: {
        user: { id: "u-viewer", email: "viewer@example.com" },
        organization: { id: "org-1", name: "Acme", slug: "acme" },
        role: "viewer",
        client: {} as any,
      },
    });

    const req = new NextRequest("http://localhost:3000/api/team?userId=u-target", {
      method: "DELETE",
    });

    const res = await REMOVE_MEMBER(req);
    expect(res.status).toBe(403);
  });
});

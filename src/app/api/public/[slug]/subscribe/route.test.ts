import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { POST as SUBSCRIBE } from "./route";
import * as serverModule from "@/lib/insforge/server";

describe("Public Sub-Processor Change Subscribe Route (QA-108)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("validates that email is present and well-formed", async () => {
    const reqEmpty = new NextRequest("http://localhost:3000/api/public/acme-saas/subscribe", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const resEmpty = await SUBSCRIBE(reqEmpty, { params: Promise.resolve({ slug: "acme-saas" }) });
    expect(resEmpty.status).toBe(400);

    const reqInvalid = new NextRequest("http://localhost:3000/api/public/acme-saas/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "not-an-email" }),
    });
    const resInvalid = await SUBSCRIBE(reqInvalid, { params: Promise.resolve({ slug: "acme-saas" }) });
    expect(resInvalid.status).toBe(400);
  });

  it("subscribes valid email addresses and returns confirmation", async () => {
    const rpcMock = vi.fn().mockResolvedValue({ error: null });
    vi.spyOn(serverModule, "createInsForgeServerClient").mockResolvedValue({
      database: {
        rpc: rpcMock,
      },
    } as any);

    const req = new NextRequest("http://localhost:3000/api/public/acme-saas/subscribe", {
      method: "POST",
      body: JSON.stringify({ email: "compliance-officer@enterprise.com" }),
    });

    const res = await SUBSCRIBE(req, { params: Promise.resolve({ slug: "acme-saas" }) });
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.message).toContain("compliance-officer@enterprise.com");
    expect(rpcMock).toHaveBeenCalledWith("subscribe_subprocessor_changes", {
      p_slug: "acme-saas",
      p_email: "compliance-officer@enterprise.com",
    });
  });
});

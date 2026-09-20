import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const signInWithOtp = vi.fn();

vi.mock("@insforge/sdk/ssr", () => ({
  createAuthActions: vi.fn(() => ({ signInWithOtp })),
}));

import { POST } from "./route";

describe("POST /api/auth/request-code", () => {
  beforeEach(() => {
    signInWithOtp.mockReset();
  });

  it("rejects malformed email without calling InsForge", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/auth/request-code", {
        method: "POST",
        body: JSON.stringify({ email: "not-an-email" }),
      })
    );

    expect(response.status).toBe(400);
    expect(signInWithOtp).not.toHaveBeenCalled();
  });

  it("normalizes the email and requests a managed OTP", async () => {
    signInWithOtp.mockResolvedValue({ error: null });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/request-code", {
        method: "POST",
        body: JSON.stringify({ email: "  RC@SERENGULAR.COM  " }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(signInWithOtp).toHaveBeenCalledWith({ email: "rc@serengular.com" });
  });

  it("returns the upstream status when OTP dispatch fails", async () => {
    signInWithOtp.mockResolvedValue({
      error: { statusCode: 429, message: "rate limited" },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/request-code", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" }),
      })
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toMatchObject({ success: false });
  });
});

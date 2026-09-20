import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const verifyOtp = vi.fn();

vi.mock("@insforge/sdk/ssr", () => ({
  createAuthActions: vi.fn(() => ({ verifyOtp })),
}));

import { POST } from "./route";

describe("POST /api/auth/verify-code", () => {
  beforeEach(() => {
    verifyOtp.mockReset();
  });

  it("rejects malformed codes without calling InsForge", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", otp: "123" }),
      })
    );

    expect(response.status).toBe(400);
    expect(verifyOtp).not.toHaveBeenCalled();
  });

  it("returns only safe user fields after successful verification", async () => {
    verifyOtp.mockResolvedValue({
      data: {
        user: {
          id: "user-123",
          email: "user@example.com",
          internalMetadata: "must-not-leak",
        },
      },
      error: null,
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({
          email: " USER@EXAMPLE.COM ",
          name: "  Example User  ",
          otp: "123456",
        }),
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      success: true,
      user: { id: "user-123", email: "user@example.com" },
    });
    expect(verifyOtp).toHaveBeenCalledWith({
      email: "user@example.com",
      name: "Example User",
      otp: "123456",
    });
  });

  it("returns a generic rejection for an invalid or expired code", async () => {
    verifyOtp.mockResolvedValue({
      data: null,
      error: { statusCode: 401, message: "invalid code" },
    });

    const response = await POST(
      new NextRequest("http://localhost/api/auth/verify-code", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com", otp: "654321" }),
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({
      success: false,
      error: "That code is invalid or expired.",
    });
  });
});

import { describe, expect, it } from "vitest";
import { POST } from "./route";

describe("media verification availability", () => {
  it("fails closed without issuing metrics or a certificate", async () => {
    const response = await POST();
    expect(response.status).toBe(501);
    const body = await response.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("MEDIA_ANALYSIS_UNAVAILABLE");
    expect(body).not.toHaveProperty("data");
    expect(body).not.toHaveProperty("certificate");
  });
});

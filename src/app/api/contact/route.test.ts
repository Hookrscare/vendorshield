import { expect, it, vi } from "vitest";
import { POST } from "./route";

it("does not claim delivery or log a lead when contact delivery is unavailable", async () => {
  const log = vi.spyOn(console, "log").mockImplementation(() => {});
  try {
    const response = await POST();
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ success: false, error: "Contact delivery is not configured. No inquiry has been submitted or scheduled for follow-up." });
    expect(log).not.toHaveBeenCalled();
  } finally { log.mockRestore(); }
});

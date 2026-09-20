import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { Suspense } from "react";
import Page from "./page";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("theme=light"),
}));
describe("Published disclosure status", () => {
  it("shows the saved DPA state, preserves light choice, and makes no verified claim", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        json: async () => ({
          success: true,
          data: {
            vendors: [
              {
                id: "qa",
                name: "QA vendor",
                description: "Test",
                category: "Analytics",
                dataProcessed: [],
                dataLocation: "",
                dpaStatus: "Missing",
                dpaUrl: "",
              },
            ],
          },
        }),
      }),
    );
    let result!: ReturnType<typeof render>;
    await act(async () => {
      result = render(
        <Suspense fallback="Loading">
          <Page params={Promise.resolve({ slug: "qa" })} />
        </Suspense>,
      );
    });
    const { container } = result;
    await waitFor(() =>
      expect(screen.getByText("Missing")).toBeInTheDocument(),
    );
    expect(
      container.querySelector(".disclosure-embed.light"),
    ).toBeInTheDocument();
    expect(screen.queryByText("Signed DPA")).not.toBeInTheDocument();
    expect(screen.getByText(/Not independently verified/)).toBeInTheDocument();
  });
});

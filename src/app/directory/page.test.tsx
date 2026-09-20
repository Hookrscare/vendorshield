import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, it } from "vitest";
import DirectoryPage from "./page";
beforeEach(() => window.history.replaceState(null, "", "/directory"));
afterEach(cleanup);
it("searches all records, preserves the query, and exposes source previews", () => {
  render(<DirectoryPage />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Find a vendor" }), {
    target: { value: "Stripe" },
  });
  expect(screen.getByRole("status")).toHaveTextContent("1 vendor");
  expect(window.location.search).toBe("?q=Stripe");
  fireEvent.click(screen.getByRole("button", { name: "Preview Stripe" }));
  expect(screen.getByRole("button", { name: "Close Stripe" })).toHaveAttribute(
    "aria-expanded",
    "true",
  );
  expect(screen.getByRole("link", { name: /DPA source/ })).toHaveAttribute(
    "href",
    expect.stringContaining("stripe.com"),
  );
});
it("provides recovery when search and discipline have no matches", () => {
  render(<DirectoryPage />);
  fireEvent.change(screen.getByRole("searchbox", { name: "Find a vendor" }), {
    target: { value: "no-such-vendor" },
  });
  expect(screen.getByText("No matching vendors.")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /Reset filters/ }));
  expect(window.location.search).toBe("");
  expect(screen.getByRole("status")).toHaveTextContent("50 vendors");
});
it("restores deep-linked filters and lets mobile users change discipline", () => {
  window.history.replaceState(
    null,
    "",
    "/directory?q=stripe&category=Payment+Processing",
  );
  render(<DirectoryPage />);
  expect(screen.getByRole("searchbox")).toHaveValue("stripe");
  expect(screen.getByRole("combobox", { name: "Discipline" })).toHaveValue(
    "Payment Processing",
  );
  fireEvent.change(screen.getByRole("combobox", { name: "Discipline" }), {
    target: { value: "AI & Machine Learning" },
  });
  expect(screen.getByText("No matching vendors.")).toBeInTheDocument();
});

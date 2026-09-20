import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VendorTable } from "./VendorTable";
import { VendorStats } from "./VendorStats";
import { AddVendorModal } from "./AddVendorModal";
import { AccessibleModal } from "./ui/AccessibleModal";
import type { SubProcessorVendor } from "@/lib/types";
const vendor: SubProcessorVendor = {
  id: "one",
  slug: "example",
  name: "Example vendor",
  description: "Testing analytics",
  category: "Analytics & Observability",
  website: "https://example.com",
  dataProcessed: ["Email"],
  dataLocation: "EU",
  dpaStatus: "Under Review",
  dpaUrl: "https://example.com/dpa",
  certifications: [],
  riskLevel: "High",
  lastReviewedDate: "",
  nextReviewDate: "",
  notes: "",
  isPublic: false,
  addedAt: "2026-09-20",
};
describe("Workspace register interactions", () => {
  it("filters records, clears an empty result, and uses an explicit edit action", () => {
    const edit = vi.fn();
    render(
      <VendorTable
        vendors={[vendor]}
        onEditVendor={edit}
        onAddClick={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByRole("searchbox"), {
      target: { value: "missing" },
    });
    expect(screen.getByText("No matching records.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Clear filters" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Edit Example vendor" }),
    );
    expect(edit).toHaveBeenCalledWith(vendor);
  });
  it("keeps viewers read-only and labels unscheduled reviews honestly", () => {
    render(
      <VendorTable
        vendors={[vendor]}
        onEditVendor={vi.fn()}
        onAddClick={vi.fn()}
        readOnly
      />,
    );
    expect(
      screen.queryByRole("button", { name: "Edit Example vendor" }),
    ).not.toBeInTheDocument();
    expect(screen.getByText("Review not scheduled")).toBeInTheDocument();
  });
  it("does not present an empty inventory as full compliance", () => {
    render(<VendorStats vendors={[]} />);
    expect(screen.getByText("0% marked signed")).toBeInTheDocument();
    expect(screen.queryByText(/audit-ready/i)).not.toBeInTheDocument();
  });
  it("directory imports do not invent a signed agreement or review dates", () => {
    const add = vi.fn();
    render(<AddVendorModal isOpen onClose={vi.fn()} onAdd={add} />);
    fireEvent.change(screen.getByLabelText("Search directory references"), {
      target: { value: "Stripe" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /Stripe.*Reference only/s }),
    );
    expect(add).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Stripe",
        dpaStatus: "Under Review",
        lastReviewedDate: "",
        nextReviewDate: "",
        dataLocation: "",
      }),
    );
  });
  it("focus trap includes controls introduced after a dialog opens", () => {
    const close = vi.fn();
    const { rerender } = render(
      <AccessibleModal isOpen onClose={close} title="Edit">
        <button>First</button>
      </AccessibleModal>,
    );
    rerender(
      <AccessibleModal isOpen onClose={close} title="Edit">
        <button>First</button>
        <button>New final action</button>
      </AccessibleModal>,
    );
    screen.getByRole("button", { name: "New final action" }).focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(screen.getByRole("button", { name: "Close dialog" })).toHaveFocus();
  });
});

import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { CloudInspectionPanel } from "./CloudInspectionPanel";
import type { InspectionData } from "@/lib/snapinspect/types";
const inspection = { id: "draft1", title: "Field report", defects: [] } as unknown as InspectionData;
const workspace = { organization: { id: "org1", name: "Test workspace" }, userId: "user1", role: "owner", data: [] };
const pendingKey = "snapinspect_cloud_org1_user1_pending_draft1";
beforeEach(() => localStorage.clear());
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
function serve(status: number) {
  vi.stubGlobal("fetch", vi.fn(async (_url, options) => new Response(JSON.stringify(options?.method === "POST" ? status === 200 ? { data: { revision: 1 } } : { error: "Revision conflict; local draft retained" } : workspace), { status: options?.method === "POST" ? status : 200 })));
}
it("retains the pending document after a rejected save", async () => {
  serve(409);
  render(<CloudInspectionPanel inspection={inspection} onLoad={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Save current report to workspace" }));
  await screen.findByText("Revision conflict; local draft retained");
  expect(JSON.parse(localStorage.getItem(pendingKey)!).inspection).toEqual(inspection);
  expect(screen.getByRole("button", { name: "Create read-only report link" })).toBeDisabled();
});
it("removes queued data only after acknowledgement and requires sharing consent", async () => {
  serve(200);
  render(<CloudInspectionPanel inspection={inspection} onLoad={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Save current report to workspace" }));
  await screen.findByText("Current draft matches the saved snapshot.", { exact: false });
  await waitFor(() => expect(localStorage.getItem(pendingKey)).toBeNull());
  expect(JSON.parse(localStorage.getItem("snapinspect_cloud_org1_user1_revisions")!)).toEqual({draft1:1});
  expect(screen.getByRole("button", { name: "Create read-only report link" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox"));
  expect(screen.getByRole("button", { name: "Create read-only report link" })).toBeEnabled();
});
it("does not upload queued private data when the signed-in account changes", async () => {
  let reads=0;
  const fetcher=vi.fn(async (_url, options) => {
    if(options?.method === "POST") throw Error("must not upload");
    return new Response(JSON.stringify({...workspace,userId:++reads>1?"other-user":"user1"}));
  });
  vi.stubGlobal("fetch",fetcher);
  render(<CloudInspectionPanel inspection={inspection} onLoad={() => {}} />);
  fireEvent.click(await screen.findByRole("button", { name: "Save current report to workspace" }));
  await screen.findByText(/Account or workspace changed/);
  expect(localStorage.getItem(pendingKey)).not.toBeNull();
  expect(fetcher.mock.calls.every(call => call[1]?.method !== "POST")).toBe(true);
});

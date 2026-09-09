// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from "vitest";
import { OfflineSyncManager } from "./offline-sync";

describe("SNAP-01: Offline Sync & PWA State Manager", () => {
  let manager: OfflineSyncManager;

  beforeEach(() => {
    localStorage.clear();
    manager = OfflineSyncManager.getInstance();
  });

  it("initializes with initial online state", () => {
    const state = manager.getState();
    expect(state.isOnline).toBe(true);
    expect(state.pendingSyncCount).toBe(0);
  });

  it("enqueues offline change items to persistent localStorage queue", () => {
    manager.enqueueChange({
      type: "DEFECT_ADD",
      payload: { title: "Rooftop HVAC Leak" },
      timestamp: new Date().toISOString(),
    });

    const queue = manager.getPendingQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].payload.title).toBe("Rooftop HVAC Leak");

    const state = manager.getState();
    expect(state.pendingSyncCount).toBe(1);
  });

  it("flushes pending queue on sync reconnection", () => {
    manager.enqueueChange({
      type: "INSPECTION_UPDATE",
      payload: { id: "insp-1" },
      timestamp: new Date().toISOString(),
    });

    expect(manager.getPendingQueue()).toHaveLength(1);
    const flushed = manager.processPendingSyncQueue();
    expect(flushed).toBe(1);
    expect(manager.getPendingQueue()).toHaveLength(0);
    expect(manager.getState().lastSyncedAt).toBeDefined();
  });
});

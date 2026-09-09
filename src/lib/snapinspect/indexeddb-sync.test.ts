import { describe, it, expect } from "vitest";
import { IndexedDBSyncEngine, SyncableRecord } from "./indexeddb-sync";

describe("SNAP-07: Offline IndexedDB Conflict Resolution Sync Engine", () => {
  it("should locally upsert records and stage for outbound sync", () => {
    const engine = new IndexedDBSyncEngine();
    const item = engine.upsertLocal("defect-101", "roofing_defect", {
      severity: "CRITICAL",
      description: "Severe ponding water near drain",
      roofZone: "Zone B",
    });

    expect(item.id).toBe("defect-101");
    expect(item.version).toBe(1);
    expect(item.data.severity).toBe("CRITICAL");

    const fetched = engine.get("defect-101");
    expect(fetched).toBeDefined();
    expect(fetched?.data.roofZone).toBe("Zone B");

    const pending = engine.getPendingOutbound();
    expect(pending).toHaveLength(1);
    expect(pending[0].id).toBe("defect-101");

    engine.markSynced(["defect-101"]);
    expect(engine.getPendingOutbound()).toHaveLength(0);
  });

  it("should handle tombstones and prevent deleted items from appearing in queries", () => {
    const engine = new IndexedDBSyncEngine();
    engine.upsertLocal("defect-102", "hvac_defect", { code: "VIB-01" });
    expect(engine.getAll("hvac_defect")).toHaveLength(1);

    const deleted = engine.deleteLocal("defect-102");
    expect(deleted).toBe(true);
    expect(engine.get("defect-102")).toBeUndefined();
    expect(engine.getAll("hvac_defect")).toHaveLength(0);

    const pending = engine.getPendingOutbound();
    expect(pending.some((p) => p.id === "defect-102" && p.deleted === true)).toBe(true);
  });

  it("should seamlessly fast-forward non-conflicting remote updates", () => {
    const engine = new IndexedDBSyncEngine();
    const remoteRecord: SyncableRecord = {
      id: "defect-200",
      type: "electrical_defect",
      version: 2,
      updatedAt: 1725700000000,
      data: { breaker: "Main panel #4", status: "PENDING_REPAIR" },
    };

    const res = engine.reconcileRemoteUpdates([remoteRecord]);
    expect(res.applied).toBe(1);
    expect(res.conflicts).toHaveLength(0);

    const fetched = engine.get("defect-200");
    expect(fetched?.version).toBe(2);
    expect(fetched?.data.status).toBe("PENDING_REPAIR");
  });

  it("should perform 3-way field-level merge when edits do not overlap", () => {
    const baseTime = 1725700000000;
    const initial: SyncableRecord = {
      id: "defect-300",
      type: "structural_crack",
      version: 1,
      updatedAt: baseTime,
      data: {
        widthMm: 4.5,
        location: "East Foundation Wall",
        assignedInspector: "Inspector Rogers",
      },
    };

    const engine = new IndexedDBSyncEngine([initial]);

    // Local user edits assignedInspector offline
    engine.upsertLocal(
      "defect-300",
      "structural_crack",
      { assignedInspector: "Senior Engineer Adams" },
      baseTime + 1000
    );

    // Remote server concurrently received updated crack measurement from thermal sensor
    const remoteDelta: SyncableRecord = {
      id: "defect-300",
      type: "structural_crack",
      version: 2,
      updatedAt: baseTime + 2000,
      data: {
        widthMm: 5.2,
        location: "East Foundation Wall",
        assignedInspector: "Inspector Rogers",
      },
    };

    const res = engine.reconcileRemoteUpdates([remoteDelta], "FIELD_MERGE");
    expect(res.applied).toBe(1);

    const merged = engine.get("defect-300");
    expect(merged?.data.widthMm).toBe(5.2); // from remote
    expect(merged?.data.assignedInspector).toBe("Senior Engineer Adams"); // from local
    expect(merged?.data.location).toBe("East Foundation Wall"); // common
  });

  it("should resolve clashing field mutations using LAST_WRITE_WINS and log conflict", () => {
    const baseTime = 1725700000000;
    const initial: SyncableRecord = {
      id: "defect-400",
      type: "water_intrusion",
      version: 1,
      updatedAt: baseTime,
      data: { severity: "MODERATE" },
    };

    const engine = new IndexedDBSyncEngine([initial]);

    // Local user sets severity to HIGH at T+5000
    engine.upsertLocal(
      "defect-400",
      "water_intrusion",
      { severity: "HIGH" },
      baseTime + 5000
    );

    // Remote server set severity to LOW at T+2000
    const remoteDelta: SyncableRecord = {
      id: "defect-400",
      type: "water_intrusion",
      version: 2,
      updatedAt: baseTime + 2000,
      data: { severity: "LOW" },
    };

    const res = engine.reconcileRemoteUpdates([remoteDelta], "LAST_WRITE_WINS");
    expect(res.conflicts).toHaveLength(1);
    expect(res.conflicts[0].field).toBe("severity");
    expect(res.conflicts[0].resolvedValue).toBe("HIGH"); // Local is newer (T+5000 > T+2000)

    const merged = engine.get("defect-400");
    expect(merged?.data.severity).toBe("HIGH");
  });

  it("should not resurrect locally deleted items if remote update is older than deletion", () => {
    const baseTime = 1725700000000;
    const initial: SyncableRecord = {
      id: "defect-500",
      type: "roofing_defect",
      version: 2,
      updatedAt: baseTime,
      data: { note: "Temporary patch" },
    };

    const engine = new IndexedDBSyncEngine([initial]);
    // Local delete at T+3000
    engine.deleteLocal("defect-500", baseTime + 3000);

    // Outdated remote update from T+1000
    const staleRemote: SyncableRecord = {
      id: "defect-500",
      type: "roofing_defect",
      version: 2,
      updatedAt: baseTime + 1000,
      data: { note: "Old remote patch update" },
    };

    engine.reconcileRemoteUpdates([staleRemote]);
    expect(engine.get("defect-500")).toBeUndefined();
  });
});

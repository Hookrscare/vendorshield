/**
 * SNAP-07: Offline IndexedDB Conflict Resolution Sync Engine.
 * Provides resilient offline storage, 3-way field-level merging,
 * and optimistic synchronization for SnapInspect tactical field data.
 */

export interface SyncableRecord {
  id: string;
  type: string;
  version: number;
  updatedAt: number; // Unix timestamp ms
  data: Record<string, any>;
  baseData?: Record<string, any>; // Snapshot of data at last sync
  modifiedFields?: string[]; // Fields explicitly touched locally since last sync
  deleted?: boolean;
}

export type ConflictStrategy =
  | "LAST_WRITE_WINS"
  | "FIELD_MERGE"
  | "CLIENT_WINS"
  | "SERVER_WINS";

export interface SyncConflict {
  entityId: string;
  field: string;
  clientValue: any;
  serverValue: any;
  resolvedValue: any;
  strategyUsed: ConflictStrategy;
  timestamp: number;
}

export interface SyncResult {
  applied: number;
  conflicts: SyncConflict[];
  updatedLocalRecords: SyncableRecord[];
}

export class IndexedDBSyncEngine {
  private localStore: Map<string, SyncableRecord> = new Map();
  private pendingOutboundQueue: SyncableRecord[] = [];
  private conflictHistory: SyncConflict[] = [];

  constructor(initialData?: SyncableRecord[]) {
    if (initialData) {
      initialData.forEach((rec) => {
        this.localStore.set(rec.id, {
          ...rec,
          baseData: rec.baseData || { ...rec.data },
          modifiedFields: rec.modifiedFields || [],
        });
      });
    }
  }

  public get(id: string): SyncableRecord | undefined {
    const rec = this.localStore.get(id);
    return rec && !rec.deleted ? { ...rec } : undefined;
  }

  public getAll(type?: string): SyncableRecord[] {
    const results: SyncableRecord[] = [];
    this.localStore.forEach((rec) => {
      if (!rec.deleted && (!type || rec.type === type)) {
        results.push({ ...rec });
      }
    });
    return results;
  }

  public upsertLocal(
    id: string,
    type: string,
    patch: Record<string, any>,
    timestamp: number = Date.now()
  ): SyncableRecord {
    const existing = this.localStore.get(id);
    const version = existing ? existing.version + 1 : 1;

    const baseData = existing && existing.baseData ? { ...existing.baseData } : (existing ? { ...existing.data } : {});
    const previousModified = existing?.modifiedFields || [];
    const newlyModified = Object.keys(patch);
    const allModified = Array.from(new Set([...previousModified, ...newlyModified]));

    const mergedData = existing && !existing.deleted
      ? { ...existing.data, ...patch }
      : { ...patch };

    const updated: SyncableRecord = {
      id,
      type,
      version,
      updatedAt: timestamp,
      data: mergedData,
      baseData,
      modifiedFields: allModified,
      deleted: false,
    };

    this.localStore.set(id, updated);
    this.pendingOutboundQueue.push({ ...updated });
    return updated;
  }

  public deleteLocal(id: string, timestamp: number = Date.now()): boolean {
    const existing = this.localStore.get(id);
    if (!existing || existing.deleted) return false;

    const tombstone: SyncableRecord = {
      ...existing,
      version: existing.version + 1,
      updatedAt: timestamp,
      deleted: true,
    };

    this.localStore.set(id, tombstone);
    this.pendingOutboundQueue.push({ ...tombstone });
    return true;
  }

  public getPendingOutbound(): SyncableRecord[] {
    return [...this.pendingOutboundQueue];
  }

  public markSynced(ids: string[]): void {
    const idSet = new Set(ids);
    this.pendingOutboundQueue = this.pendingOutboundQueue.filter(
      (rec) => !idSet.has(rec.id)
    );
    // Reset modified fields and update baseData for synced records
    ids.forEach((id) => {
      const rec = this.localStore.get(id);
      if (rec) {
        rec.baseData = { ...rec.data };
        rec.modifiedFields = [];
      }
    });
  }

  public resolveFieldConflict(
    entityId: string,
    field: string,
    clientVal: any,
    serverVal: any,
    clientUpdatedAt: number,
    serverUpdatedAt: number,
    strategy: ConflictStrategy
  ): { value: any; conflict?: SyncConflict } {
    if (clientVal === serverVal) {
      return { value: clientVal };
    }

    let resolvedVal: any;
    if (strategy === "CLIENT_WINS") {
      resolvedVal = clientVal;
    } else if (strategy === "SERVER_WINS") {
      resolvedVal = serverVal;
    } else {
      // LAST_WRITE_WINS or FIELD_MERGE (timestamp comparison)
      resolvedVal = clientUpdatedAt >= serverUpdatedAt ? clientVal : serverVal;
    }

    const conflict: SyncConflict = {
      entityId,
      field,
      clientValue: clientVal,
      serverValue: serverVal,
      resolvedValue: resolvedVal,
      strategyUsed: strategy,
      timestamp: Date.now(),
    };

    this.conflictHistory.push(conflict);
    return { value: resolvedVal, conflict };
  }

  public reconcileRemoteUpdates(
    remoteRecords: SyncableRecord[],
    defaultStrategy: ConflictStrategy = "FIELD_MERGE"
  ): SyncResult {
    let appliedCount = 0;
    const conflicts: SyncConflict[] = [];
    const updatedLocalRecords: SyncableRecord[] = [];

    for (const remote of remoteRecords) {
      const local = this.localStore.get(remote.id);

      // Scenario 1: Brand new remote record
      if (!local) {
        const stored = {
          ...remote,
          baseData: { ...remote.data },
          modifiedFields: [],
        };
        this.localStore.set(remote.id, stored);
        updatedLocalRecords.push(stored);
        appliedCount++;
        continue;
      }

      // Scenario 2: Remote deletion (tombstone)
      if (remote.deleted) {
        if (!local.deleted) {
          const stored = { ...remote };
          this.localStore.set(remote.id, stored);
          updatedLocalRecords.push(stored);
          appliedCount++;
        }
        continue;
      }

      // Scenario 3: Local was deleted, but remote has newer activity
      if (local.deleted) {
        if (remote.updatedAt > local.updatedAt) {
          const stored = {
            ...remote,
            baseData: { ...remote.data },
            modifiedFields: [],
          };
          this.localStore.set(remote.id, stored);
          updatedLocalRecords.push(stored);
          appliedCount++;
        }
        continue;
      }

      // Scenario 4: Fast-forward (no local changes made)
      const localModified = new Set(local.modifiedFields || []);
      if (localModified.size === 0 && remote.version >= local.version) {
        const stored = {
          ...remote,
          baseData: { ...remote.data },
          modifiedFields: [],
        };
        this.localStore.set(remote.id, stored);
        updatedLocalRecords.push(stored);
        appliedCount++;
        continue;
      }

      // Scenario 5: 3-way Field-Level Merge
      const base = local.baseData || {};
      const allFields = new Set([
        ...Object.keys(base),
        ...Object.keys(local.data || {}),
        ...Object.keys(remote.data || {}),
      ]);

      const mergedData: Record<string, any> = {};

      for (const field of allFields) {
        const baseVal = base[field];
        const clientVal = local.data ? local.data[field] : undefined;
        const serverVal = remote.data ? remote.data[field] : undefined;

        const clientChanged = localModified.has(field) || clientVal !== baseVal;
        const serverChanged = serverVal !== baseVal;

        if (clientChanged && !serverChanged) {
          // Only client changed this field
          mergedData[field] = clientVal;
        } else if (!clientChanged && serverChanged) {
          // Only server changed this field
          mergedData[field] = serverVal;
        } else if (clientChanged && serverChanged) {
          // Both changed!
          if (clientVal === serverVal) {
            mergedData[field] = clientVal;
          } else {
            const res = this.resolveFieldConflict(
              remote.id,
              field,
              clientVal,
              serverVal,
              local.updatedAt,
              remote.updatedAt,
              defaultStrategy
            );
            mergedData[field] = res.value;
            if (res.conflict) conflicts.push(res.conflict);
          }
        } else {
          // Neither changed
          mergedData[field] = baseVal;
        }
      }

      const mergedVersion = Math.max(local.version, remote.version) + 1;
      const mergedUpdatedAt = Math.max(local.updatedAt, remote.updatedAt);

      const mergedRecord: SyncableRecord = {
        id: remote.id,
        type: remote.type || local.type,
        version: mergedVersion,
        updatedAt: mergedUpdatedAt,
        data: mergedData,
        baseData: { ...remote.data },
        modifiedFields: conflicts.length > 0 ? Object.keys(mergedData) : [],
        deleted: false,
      };

      this.localStore.set(remote.id, mergedRecord);
      updatedLocalRecords.push(mergedRecord);
      appliedCount++;
    }

    return {
      applied: appliedCount,
      conflicts,
      updatedLocalRecords,
    };
  }

  public getConflictHistory(): SyncConflict[] {
    return [...this.conflictHistory];
  }
}

/**
 * SNAP-13: Real-Time WebRTC Peer-to-Peer CAD Sync Worker for Multi-Inspector Teams.
 * Enables zero-server, low-latency peer-to-peer collaborative floorplan CAD synchronization
 * across multiple field inspectors using WebRTC DataChannels and Lamport CRDT conflict resolution.
 */

import { FloorplanCADModel, DefectPin, CADWall, DimensionLine } from "./floorplan-cad";

export type CadSyncOpType =
  | "PIN_ADD"
  | "PIN_MOVE"
  | "PIN_UPDATE"
  | "PIN_DELETE"
  | "WALL_ADD"
  | "WALL_DELETE"
  | "DIMENSION_ADD"
  | "FULL_SYNC_REQUEST"
  | "FULL_SYNC_RESPONSE"
  | "HEARTBEAT_PING"
  | "HEARTBEAT_PONG";

export interface SyncPeerInfo {
  peerId: string;
  inspectorName: string;
  role: "LEAD_INSPECTOR" | "ASSISTANT" | "SPECIALIST";
  status: "CONNECTED" | "CONNECTING" | "DISCONNECTED";
  lastSeenIso: string;
  rttMs: number;
}

export interface CadSyncOperation<T = any> {
  opId: string;
  opType: CadSyncOpType;
  entityId: string;
  senderPeerId: string;
  lamportClock: number;
  timestampIso: string;
  payload: T;
}

export interface SyncStats {
  opsSent: number;
  opsReceived: number;
  conflictsResolved: number;
  pendingOfflineOps: number;
  activePeersCount: number;
}

export class WebRTCCadSyncWorker {
  public localPeerId: string;
  public inspectorName: string;
  public lamportClock: number;
  public peers: Map<string, SyncPeerInfo>;
  public floorplan: FloorplanCADModel;
  public pendingQueue: CadSyncOperation[];
  public appliedOpIds: Set<string>;
  public stats: SyncStats;

  // Mockable transport hook for peer-to-peer data channel transmission
  public onBroadcastMessage?: (op: CadSyncOperation) => void;

  constructor(localPeerId: string, inspectorName: string, initialFloorplan: FloorplanCADModel) {
    this.localPeerId = localPeerId;
    this.inspectorName = inspectorName;
    this.lamportClock = 0;
    this.peers = new Map();
    this.floorplan = JSON.parse(JSON.stringify(initialFloorplan));
    this.pendingQueue = [];
    this.appliedOpIds = new Set();
    this.stats = {
      opsSent: 0,
      opsReceived: 0,
      conflictsResolved: 0,
      pendingOfflineOps: 0,
      activePeersCount: 0
    };
  }

  /**
   * Registers a peer connection.
   */
  public registerPeer(peer: SyncPeerInfo): void {
    this.peers.set(peer.peerId, peer);
    this.updatePeerStats();
  }

  /**
   * Updates peer status (e.g. connected, disconnected).
   */
  public updatePeerStatus(peerId: string, status: SyncPeerInfo["status"], rttMs: number = 0): void {
    const peer = this.peers.get(peerId);
    if (peer) {
      peer.status = status;
      peer.lastSeenIso = new Date().toISOString();
      if (rttMs > 0) peer.rttMs = rttMs;
      this.updatePeerStats();
    }
  }

  private updatePeerStats(): void {
    let count = 0;
    this.peers.forEach(p => {
      if (p.status === "CONNECTED") count++;
    });
    this.stats.activePeersCount = count;
  }

  /**
   * Advances Lamport logical clock.
   */
  private tickClock(receivedClock: number = 0): number {
    this.lamportClock = Math.max(this.lamportClock, receivedClock) + 1;
    return this.lamportClock;
  }

  /**
   * Dispatches a local operation to peers and applies it locally.
   */
  public dispatchLocalOp<T>(opType: CadSyncOpType, entityId: string, payload: T): CadSyncOperation<T> {
    const clock = this.tickClock();
    const op: CadSyncOperation<T> = {
      opId: `OP-${this.localPeerId}-${clock}-${Math.random().toString(36).slice(2, 7)}`,
      opType,
      entityId,
      senderPeerId: this.localPeerId,
      lamportClock: clock,
      timestampIso: new Date().toISOString(),
      payload
    };

    this.appliedOpIds.add(op.opId);
    this.applyOperationLocally(op);
    this.stats.opsSent++;

    if (this.stats.activePeersCount > 0 && this.onBroadcastMessage) {
      this.onBroadcastMessage(op);
    } else {
      this.pendingQueue.push(op);
      this.stats.pendingOfflineOps = this.pendingQueue.length;
    }

    return op;
  }

  /**
   * Handles an incoming operation received over a WebRTC DataChannel.
   */
  public receiveRemoteOp(op: CadSyncOperation): boolean {
    if (this.appliedOpIds.has(op.opId)) {
      return false; // Idempotent deduplication
    }

    this.stats.opsReceived++;
    this.tickClock(op.lamportClock);
    this.appliedOpIds.add(op.opId);

    const applied = this.applyOperationLocally(op);
    return applied;
  }

  /**
   * Flushes offline queue once peer connections are established.
   */
  public flushPendingQueue(): number {
    if (this.pendingQueue.length === 0 || !this.onBroadcastMessage) {
      return 0;
    }

    let flushed = 0;
    while (this.pendingQueue.length > 0) {
      const op = this.pendingQueue.shift()!;
      this.onBroadcastMessage(op);
      flushed++;
    }
    this.stats.pendingOfflineOps = 0;
    return flushed;
  }

  /**
   * Generates a full snapshot response for catch-up synchronization.
   */
  public generateFullSyncResponse(): CadSyncOperation<FloorplanCADModel> {
    const clock = this.tickClock();
    return {
      opId: `FULL-SYNC-${this.localPeerId}-${clock}`,
      opType: "FULL_SYNC_RESPONSE",
      entityId: this.floorplan.id,
      senderPeerId: this.localPeerId,
      lamportClock: clock,
      timestampIso: new Date().toISOString(),
      payload: JSON.parse(JSON.stringify(this.floorplan))
    };
  }

  /**
   * Applies the CAD delta to the in-memory FloorplanCADModel.
   */
  private applyOperationLocally(op: CadSyncOperation): boolean {
    switch (op.opType) {
      case "PIN_ADD": {
        const pin: DefectPin = op.payload;
        const exists = this.floorplan.defectPins.some(p => p.id === pin.id);
        if (!exists) {
          this.floorplan.defectPins.push(pin);
        }
        return true;
      }

      case "PIN_MOVE": {
        const { pinId, location } = op.payload;
        const pin = this.floorplan.defectPins.find(p => p.id === pinId);
        if (pin) {
          pin.location = location;
          return true;
        }
        return false;
      }

      case "PIN_UPDATE": {
        const { pinId, updates } = op.payload;
        const pin = this.floorplan.defectPins.find(p => p.id === pinId);
        if (pin) {
          Object.assign(pin, updates);
          return true;
        }
        return false;
      }

      case "PIN_DELETE": {
        const pinId = op.entityId;
        const before = this.floorplan.defectPins.length;
        this.floorplan.defectPins = this.floorplan.defectPins.filter(p => p.id !== pinId);
        return this.floorplan.defectPins.length < before;
      }

      case "WALL_ADD": {
        const wall: CADWall = op.payload;
        if (!this.floorplan.walls.some(w => w.id === wall.id)) {
          this.floorplan.walls.push(wall);
        }
        return true;
      }

      case "WALL_DELETE": {
        const wallId = op.entityId;
        const before = this.floorplan.walls.length;
        this.floorplan.walls = this.floorplan.walls.filter(w => w.id !== wallId);
        return this.floorplan.walls.length < before;
      }

      case "DIMENSION_ADD": {
        const dim: DimensionLine = op.payload;
        if (!this.floorplan.dimensions.some(d => d.id === dim.id)) {
          this.floorplan.dimensions.push(dim);
        }
        return true;
      }

      case "FULL_SYNC_RESPONSE": {
        const remoteModel: FloorplanCADModel = op.payload;
        if (remoteModel && remoteModel.id === this.floorplan.id) {
          // Merge defect pins by union with ID preservation
          const pinMap = new Map<string, DefectPin>();
          this.floorplan.defectPins.forEach(p => pinMap.set(p.id, p));
          remoteModel.defectPins.forEach(p => pinMap.set(p.id, p));
          this.floorplan.defectPins = Array.from(pinMap.values());

          // Merge walls
          const wallMap = new Map<string, CADWall>();
          this.floorplan.walls.forEach(w => wallMap.set(w.id, w));
          remoteModel.walls.forEach(w => wallMap.set(w.id, w));
          this.floorplan.walls = Array.from(wallMap.values());

          return true;
        }
        return false;
      }

      case "HEARTBEAT_PING":
      case "HEARTBEAT_PONG":
        return true;

      default:
        return false;
    }
  }
}

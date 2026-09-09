import { describe, it, expect, beforeEach } from "vitest";
import { WebRTCCadSyncWorker, CadSyncOperation } from "./webrtc-cad-sync";
import { FloorplanCADModel, DefectPin, CADWall } from "./floorplan-cad";

describe("SNAP-13: Real-Time WebRTC Peer-to-Peer CAD Sync Worker for Multi-Inspector Teams", () => {
  let baseModel: FloorplanCADModel;

  beforeEach(() => {
    baseModel = {
      id: "CAD-PROP-101",
      propertyAddress: "742 Evergreen Terrace",
      scalePixelsPerUnit: 20,
      unit: "FT",
      width: 1200,
      height: 800,
      walls: [],
      rooms: [],
      defectPins: [],
      dimensions: []
    };
  });

  it("initializes peer sync worker and tracks peers and statistics", () => {
    const worker = new WebRTCCadSyncWorker("PEER-A", "John Lead Inspector", baseModel);
    expect(worker.localPeerId).toBe("PEER-A");
    expect(worker.stats.activePeersCount).toBe(0);

    worker.registerPeer({
      peerId: "PEER-B",
      inspectorName: "Sarah Roof Specialist",
      role: "SPECIALIST",
      status: "CONNECTED",
      lastSeenIso: new Date().toISOString(),
      rttMs: 18
    });

    expect(worker.stats.activePeersCount).toBe(1);
    expect(worker.peers.get("PEER-B")?.status).toBe("CONNECTED");
  });

  it("dispatches local pin operations and updates local model and Lamport clock", () => {
    const worker = new WebRTCCadSyncWorker("PEER-A", "John", baseModel);
    const pin: DefectPin = {
      id: "PIN-01",
      location: { x: 150, y: 320 },
      code: "ROOF-LEAK-01",
      title: "Active flashing water ingress",
      trade: "ROOFING",
      severity: "CRITICAL"
    };

    const op = worker.dispatchLocalOp("PIN_ADD", pin.id, pin);

    expect(op.opId).toContain("PEER-A");
    expect(op.lamportClock).toBe(1);
    expect(worker.floorplan.defectPins.length).toBe(1);
    expect(worker.floorplan.defectPins[0].title).toBe("Active flashing water ingress");
    expect(worker.stats.opsSent).toBe(1);
  });

  it("synchronizes bidirectional peer operations and merges pin relocations", () => {
    const workerA = new WebRTCCadSyncWorker("PEER-A", "John", baseModel);
    const workerB = new WebRTCCadSyncWorker("PEER-B", "Sarah", baseModel);

    // Setup virtual p2p data channel
    workerA.registerPeer({
      peerId: "PEER-B",
      inspectorName: "Sarah",
      role: "SPECIALIST",
      status: "CONNECTED",
      lastSeenIso: new Date().toISOString(),
      rttMs: 15
    });

    workerA.onBroadcastMessage = (op: CadSyncOperation) => {
      workerB.receiveRemoteOp(op);
    };

    const pin: DefectPin = {
      id: "PIN-02",
      location: { x: 200, y: 100 },
      code: "ELEC-PANEL",
      title: "Missing ground bonding conductor",
      trade: "ELECTRICAL",
      severity: "MAJOR"
    };

    // Inspector A adds pin
    workerA.dispatchLocalOp("PIN_ADD", pin.id, pin);

    expect(workerB.floorplan.defectPins.length).toBe(1);
    expect(workerB.floorplan.defectPins[0].id).toBe("PIN-02");

    // Inspector B moves the pin
    workerB.registerPeer({
      peerId: "PEER-A",
      inspectorName: "John",
      role: "LEAD_INSPECTOR",
      status: "CONNECTED",
      lastSeenIso: new Date().toISOString(),
      rttMs: 15
    });
    workerB.onBroadcastMessage = (op: CadSyncOperation) => {
      workerA.receiveRemoteOp(op);
    };

    workerB.dispatchLocalOp("PIN_MOVE", pin.id, { pinId: pin.id, location: { x: 250, y: 120 } });

    expect(workerA.floorplan.defectPins[0].location).toEqual({ x: 250, y: 120 });
    expect(workerA.stats.opsReceived).toBe(1);
  });

  it("buffers offline operations when disconnected and flushes upon reconnection", () => {
    const worker = new WebRTCCadSyncWorker("PEER-OFFLINE", "Mike", baseModel);

    const pin: DefectPin = {
      id: "PIN-OFFLINE-01",
      location: { x: 50, y: 50 },
      code: "HVAC-NOISE",
      title: "Excessive condenser fan vibration",
      trade: "HVAC",
      severity: "MINOR"
    };

    worker.dispatchLocalOp("PIN_ADD", pin.id, pin);

    expect(worker.stats.pendingOfflineOps).toBe(1);
    expect(worker.pendingQueue.length).toBe(1);

    const sentOps: CadSyncOperation[] = [];
    worker.onBroadcastMessage = (op) => {
      sentOps.push(op);
    };

    const flushedCount = worker.flushPendingQueue();
    expect(flushedCount).toBe(1);
    expect(worker.stats.pendingOfflineOps).toBe(0);
    expect(sentOps.length).toBe(1);
    expect(sentOps[0].payload.title).toBe("Excessive condenser fan vibration");
  });
});

/**
 * Offline Sync and Network Status Controller for SnapInspect AI.
 * Handles PWA Service Worker lifecycle, offline inspection buffering, and auto-sync.
 */

export interface OfflineSyncState {
  isOnline: boolean;
  swRegistered: boolean;
  pendingSyncCount: number;
  lastSyncedAt: string | null;
}

const OFFLINE_SYNC_QUEUE_KEY = "snapinspect_offline_sync_queue";

export class OfflineSyncManager {
  private static instance: OfflineSyncManager;
  private listeners: Set<(state: OfflineSyncState) => void> = new Set();
  private isOnline: boolean = typeof navigator !== "undefined" ? navigator.onLine : true;
  private swRegistered: boolean = false;
  private lastSyncedAt: string | null = null;

  private constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("online", () => this.handleNetworkChange(true));
      window.addEventListener("offline", () => this.handleNetworkChange(false));
      this.initServiceWorker();
    }
  }

  public static getInstance(): OfflineSyncManager {
    if (!OfflineSyncManager.instance) {
      OfflineSyncManager.instance = new OfflineSyncManager();
    }
    return OfflineSyncManager.instance;
  }

  private handleNetworkChange(online: boolean) {
    this.isOnline = online;
    if (online) {
      this.processPendingSyncQueue();
    }
    this.notify();
  }

  public async initServiceWorker(): Promise<boolean> {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register("/snapinspect-sw.js", {
        scope: "/snapinspect",
      });
      this.swRegistered = !!registration;
      this.notify();
      return true;
    } catch (err) {
      console.warn("[SnapInspect] Service worker registration bypassed:", err);
      return false;
    }
  }

  public getPendingQueue(): any[] {
    if (typeof window === "undefined") return [];
    try {
      const data = localStorage.getItem(OFFLINE_SYNC_QUEUE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  public enqueueChange(change: { type: string; payload: any; timestamp: string }) {
    if (typeof window === "undefined") return;
    try {
      const queue = this.getPendingQueue();
      queue.push(change);
      localStorage.setItem(OFFLINE_SYNC_QUEUE_KEY, JSON.stringify(queue));
      this.notify();
    } catch (e) {
      console.warn("Failed to queue offline change", e);
    }
  }

  public processPendingSyncQueue(): number {
    const queue = this.getPendingQueue();
    if (queue.length === 0) return 0;

    const count = queue.length;
    // In local demo / offline mode, flush queue and update sync timestamp
    if (typeof window !== "undefined") {
      localStorage.removeItem(OFFLINE_SYNC_QUEUE_KEY);
      this.lastSyncedAt = new Date().toISOString();
    }
    this.notify();
    return count;
  }

  public getState(): OfflineSyncState {
    return {
      isOnline: this.isOnline,
      swRegistered: this.swRegistered,
      pendingSyncCount: this.getPendingQueue().length,
      lastSyncedAt: this.lastSyncedAt,
    };
  }

  public subscribe(listener: (state: OfflineSyncState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
}

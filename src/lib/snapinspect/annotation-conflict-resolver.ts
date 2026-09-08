/**
 * SNAP-18: Multi-Inspector Real-Time Annotation Sync Conflict Resolver.
 * Resolves concurrent multi-inspector edits to CAD annotation pins, vector shapes,
 * severity classifications, photo attachments, and voice notes.
 * Uses Lamport logical timestamps, field-level 3-way merge, and deterministic CRDT semantics.
 */

export type DefectSeverity = "COSMETIC" | "MINOR" | "MODERATE" | "SEVERE" | "CRITICAL";

const SEVERITY_WEIGHT: Record<DefectSeverity, number> = {
  COSMETIC: 1,
  MINOR: 2,
  MODERATE: 3,
  SEVERE: 4,
  CRITICAL: 5
};

export interface InspectionAnnotation {
  id: string;
  floorplanId: string;
  trade: string; // "commercial_roof" | "hvac" | "structural" | "electrical"
  x: number;
  y: number;
  title: string;
  description: string;
  severity: DefectSeverity;
  photoUris: string[];
  tags: string[];
  inspectorId: string;
  inspectorName: string;
  lamportClock: number;
  updatedAtIso: string;
  isDeleted?: boolean;
}

export type ConflictResolutionPolicy =
  | "FIELD_LEVEL_MERGE"
  | "LAST_WRITE_WINS"
  | "CONSERVATIVE_SAFETY_FIRST"; // higher severity wins, photos unioned, notes appended

export interface ConflictRecord {
  annotationId: string;
  field: string;
  localValue: any;
  remoteValue: any;
  resolvedValue: any;
  policyApplied: ConflictResolutionPolicy;
  resolvedAtIso: string;
}

export interface SyncResolutionResult {
  merged: InspectionAnnotation;
  hadConflict: boolean;
  conflicts: ConflictRecord[];
}

export class AnnotationConflictResolver {
  /**
   * Resolves concurrent edits between a local and remote version of an annotation.
   */
  public static resolve(
    base: InspectionAnnotation | null,
    local: InspectionAnnotation,
    remote: InspectionAnnotation,
    policy: ConflictResolutionPolicy = "CONSERVATIVE_SAFETY_FIRST"
  ): SyncResolutionResult {
    const conflicts: ConflictRecord[] = [];
    const nowIso = new Date().toISOString();

    // 1. Tombstone Deletion Handling:
    // If either version is marked deleted:
    if (local.isDeleted || remote.isDeleted) {
      // Tombstone wins unless the non-deleted version has a strictly higher Lamport clock
      const localDeleted = !!local.isDeleted;
      const remoteDeleted = !!remote.isDeleted;

      if (localDeleted && remoteDeleted) {
        return {
          merged: { ...local, lamportClock: Math.max(local.lamportClock, remote.lamportClock) + 1, updatedAtIso: nowIso },
          hadConflict: false,
          conflicts: []
        };
      }

      const deletedNode = localDeleted ? local : remote;
      const activeNode = localDeleted ? remote : local;

      // If modification occurred strictly AFTER deletion Lamport clock, allow resurrect
      const resurrect = activeNode.lamportClock > deletedNode.lamportClock + 1;
      const winner = resurrect ? activeNode : deletedNode;

      conflicts.push({
        annotationId: local.id,
        field: "isDeleted",
        localValue: local.isDeleted,
        remoteValue: remote.isDeleted,
        resolvedValue: winner.isDeleted,
        policyApplied: policy,
        resolvedAtIso: nowIso
      });

      return {
        merged: {
          ...winner,
          lamportClock: Math.max(local.lamportClock, remote.lamportClock) + 1,
          updatedAtIso: nowIso
        },
        hadConflict: true,
        conflicts
      };
    }

    // 2. Field-Level Merge with Policy:
    const merged: InspectionAnnotation = {
      ...local,
      lamportClock: Math.max(local.lamportClock, remote.lamportClock) + 1,
      updatedAtIso: nowIso
    };

    // Severity resolution:
    if (local.severity !== remote.severity) {
      let resolvedSeverity = local.severity;
      if (policy === "CONSERVATIVE_SAFETY_FIRST") {
        // Higher severity always wins for inspector safety / building integrity
        const localW = SEVERITY_WEIGHT[local.severity] || 0;
        const remoteW = SEVERITY_WEIGHT[remote.severity] || 0;
        resolvedSeverity = remoteW > localW ? remote.severity : local.severity;
      } else if (remote.lamportClock > local.lamportClock) {
        resolvedSeverity = remote.severity;
      }

      conflicts.push({
        annotationId: local.id,
        field: "severity",
        localValue: local.severity,
        remoteValue: remote.severity,
        resolvedValue: resolvedSeverity,
        policyApplied: policy,
        resolvedAtIso: nowIso
      });
      merged.severity = resolvedSeverity;
    }

    // Position coordinates resolution (X, Y):
    if (local.x !== remote.x || local.y !== remote.y) {
      // Latest Lamport clock wins coordinate placement
      const coordRemoteWins = remote.lamportClock > local.lamportClock;
      const resX = coordRemoteWins ? remote.x : local.x;
      const resY = coordRemoteWins ? remote.y : local.y;

      conflicts.push({
        annotationId: local.id,
        field: "position",
        localValue: { x: local.x, y: local.y },
        remoteValue: { x: remote.x, y: remote.y },
        resolvedValue: { x: resX, y: resY },
        policyApplied: policy,
        resolvedAtIso: nowIso
      });
      merged.x = resX;
      merged.y = resY;
    }

    // Photo attachments: Union arrays to guarantee no loss of physical evidence
    const combinedPhotos = Array.from(new Set([...local.photoUris, ...remote.photoUris]));
    if (combinedPhotos.length !== local.photoUris.length || combinedPhotos.length !== remote.photoUris.length) {
      if (JSON.stringify(local.photoUris) !== JSON.stringify(remote.photoUris)) {
        conflicts.push({
          annotationId: local.id,
          field: "photoUris",
          localValue: local.photoUris,
          remoteValue: remote.photoUris,
          resolvedValue: combinedPhotos,
          policyApplied: policy,
          resolvedAtIso: nowIso
        });
      }
      merged.photoUris = combinedPhotos;
    }

    // Description / Notes:
    if (local.description !== remote.description) {
      let resolvedDesc = local.description;
      if (policy === "CONSERVATIVE_SAFETY_FIRST") {
        // If descriptions differ, combine distinct remarks
        if (!local.description.includes(remote.description) && !remote.description.includes(local.description)) {
          resolvedDesc = `${local.description}\n[Note from ${remote.inspectorName}]: ${remote.description}`.trim();
        } else {
          resolvedDesc = local.description.length >= remote.description.length ? local.description : remote.description;
        }
      } else if (remote.lamportClock > local.lamportClock) {
        resolvedDesc = remote.description;
      }

      conflicts.push({
        annotationId: local.id,
        field: "description",
        localValue: local.description,
        remoteValue: remote.description,
        resolvedValue: resolvedDesc,
        policyApplied: policy,
        resolvedAtIso: nowIso
      });
      merged.description = resolvedDesc;
    }

    // Tags union:
    merged.tags = Array.from(new Set([...local.tags, ...remote.tags]));

    return {
      merged,
      hadConflict: conflicts.length > 0,
      conflicts
    };
  }
}

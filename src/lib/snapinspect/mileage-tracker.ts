/**
 * SNAP-08: Field Inspector Mileage & GPS Trip Log Export Engine.
 * Provides offline GPS tracking, Haversine distance aggregation,
 * GPS jitter filtration, IRS business mileage calculation, and CSV/GeoJSON export.
 */

export interface GpsCoordinate {
  latitude: number;
  longitude: number;
  altitudeMeters?: number;
  timestampMs: number;
  accuracyMeters?: number;
}

export interface TripSession {
  id: string;
  inspectorId: string;
  purpose: string;
  originName?: string;
  destinationName?: string;
  startTimeMs: number;
  endTimeMs?: number;
  points: GpsCoordinate[];
  totalMiles: number;
  totalKm: number;
  irsDeductionUsd: number;
  isCompleted: boolean;
}

// 2026 IRS Business Standard Mileage Rate: $0.67 / mile
export const DEFAULT_IRS_MILEAGE_RATE_USD = 0.67;
const EARTH_RADIUS_MILES = 3958.8;
const EARTH_RADIUS_KM = 6371.0;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180.0;
}

/**
 * Calculates Great Circle Haversine distance between two GPS coordinates.
 */
export function calculateHaversineDistance(
  p1: Pick<GpsCoordinate, "latitude" | "longitude">,
  p2: Pick<GpsCoordinate, "latitude" | "longitude">,
  unit: "miles" | "km" = "miles"
): number {
  const dLat = toRadians(p2.latitude - p1.latitude);
  const dLon = toRadians(p2.longitude - p1.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(p1.latitude)) *
      Math.cos(toRadians(p2.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const radius = unit === "km" ? EARTH_RADIUS_KM : EARTH_RADIUS_MILES;
  return radius * c;
}

export class MileageTracker {
  private currentTrip: TripSession | null = null;
  private completedTrips: TripSession[] = [];
  private irsRate: number;

  constructor(irsRate: number = DEFAULT_IRS_MILEAGE_RATE_USD) {
    this.irsRate = irsRate;
  }

  public startTrip(
    id: string,
    inspectorId: string,
    purpose: string,
    originName: string = "Site Origin",
    startTimeMs: number = Date.now()
  ): TripSession {
    if (this.currentTrip && !this.currentTrip.isCompleted) {
      this.endTrip(this.currentTrip.points.slice(-1)[0]?.timestampMs || startTimeMs);
    }

    this.currentTrip = {
      id,
      inspectorId,
      purpose,
      originName,
      startTimeMs,
      points: [],
      totalMiles: 0,
      totalKm: 0,
      irsDeductionUsd: 0,
      isCompleted: false,
    };
    return { ...this.currentTrip };
  }

  public recordPoint(point: GpsCoordinate): boolean {
    if (!this.currentTrip || this.currentTrip.isCompleted) {
      return false;
    }

    // Filter out low accuracy GPS noise (> 50m accuracy error)
    if (point.accuracyMeters && point.accuracyMeters > 50) {
      return false;
    }

    const points = this.currentTrip.points;
    if (points.length > 0) {
      const lastPoint = points[points.length - 1];
      const deltaMiles = calculateHaversineDistance(lastPoint, point, "miles");
      const deltaHours = (point.timestampMs - lastPoint.timestampMs) / (1000 * 3600);

      // Discard teleportation / GPS sensor glitch jumps (> 120 mph)
      if (deltaHours > 0 && deltaMiles / deltaHours > 120) {
        return false;
      }

      this.currentTrip.totalMiles = Number((this.currentTrip.totalMiles + deltaMiles).toFixed(3));
      this.currentTrip.totalKm = Number((this.currentTrip.totalMiles * 1.60934).toFixed(3));
      this.currentTrip.irsDeductionUsd = Number(
        (this.currentTrip.totalMiles * this.irsRate).toFixed(2)
      );
    }

    this.currentTrip.points.push({ ...point });
    return true;
  }

  public endTrip(
    endTimeMs: number = Date.now(),
    destinationName: string = "Inspection Target Site"
  ): TripSession | null {
    if (!this.currentTrip) return null;

    this.currentTrip.endTimeMs = endTimeMs;
    this.currentTrip.destinationName = destinationName;
    this.currentTrip.isCompleted = true;

    const finished = { ...this.currentTrip };
    this.completedTrips.push(finished);
    this.currentTrip = null;
    return finished;
  }

  public getActiveTrip(): TripSession | null {
    return this.currentTrip ? { ...this.currentTrip } : null;
  }

  public getCompletedTrips(): TripSession[] {
    return [...this.completedTrips];
  }

  public exportCsv(trips?: TripSession[]): string {
    const list = trips || this.completedTrips;
    const header = [
      "Trip ID",
      "Inspector ID",
      "Purpose",
      "Origin",
      "Destination",
      "Start Time",
      "End Time",
      "Total Miles",
      "Total Km",
      "IRS Rate ($/mi)",
      "IRS Deduction ($)",
    ].join(",");

    const rows = list.map((t) => {
      const startIso = new Date(t.startTimeMs).toISOString();
      const endIso = t.endTimeMs ? new Date(t.endTimeMs).toISOString() : "IN_PROGRESS";
      return [
        `"${t.id}"`,
        `"${t.inspectorId}"`,
        `"${t.purpose.replace(/"/g, '""')}"`,
        `"${(t.originName || "").replace(/"/g, '""')}"`,
        `"${(t.destinationName || "").replace(/"/g, '""')}"`,
        `"${startIso}"`,
        `"${endIso}"`,
        t.totalMiles.toFixed(2),
        t.totalKm.toFixed(2),
        this.irsRate.toFixed(2),
        t.irsDeductionUsd.toFixed(2),
      ].join(",");
    });

    return [header, ...rows].join("\n");
  }

  public exportGeoJson(trip: TripSession): Record<string, any> {
    const coordinates = trip.points.map((p) => [p.longitude, p.latitude]);

    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          properties: {
            tripId: trip.id,
            inspectorId: trip.inspectorId,
            purpose: trip.purpose,
            totalMiles: trip.totalMiles,
            totalKm: trip.totalKm,
            irsDeductionUsd: trip.irsDeductionUsd,
            startTime: new Date(trip.startTimeMs).toISOString(),
            endTime: trip.endTimeMs ? new Date(trip.endTimeMs).toISOString() : null,
          },
          geometry: {
            type: "LineString",
            coordinates,
          },
        },
      ],
    };
  }
}

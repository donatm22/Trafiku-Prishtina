import { distanceBetweenMeters } from "./duplicate-detection.ts";
import type { TrafficReport } from "./traffic.ts";

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RoutePlan = {
  destination: string;
  start: RoutePoint;
  end: RoutePoint;
  geometry: RoutePoint[];
  durationSeconds: number;
  distanceMeters: number;
  incidentIds: string[];
};

export function isPointInPrishtina(point: RoutePoint): boolean {
  return Number.isFinite(point.latitude)
    && Number.isFinite(point.longitude)
    && point.latitude >= 42.55
    && point.latitude <= 42.75
    && point.longitude >= 21.03
    && point.longitude <= 21.30;
}

export function findIncidentsAlongRoute(
  reports: TrafficReport[],
  geometry: RoutePoint[],
  proximityMeters = 140,
): string[] {
  if (geometry.length === 0) return [];
  return reports
    .filter((report) => geometry.some((point) => distanceBetweenMeters(report, point) <= proximityMeters))
    .map((report) => report.id);
}

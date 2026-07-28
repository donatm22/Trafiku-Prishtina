import { distanceBetweenMeters } from "./duplicate-detection.ts";
import type { TrafficReport } from "./traffic.ts";

export type RouteLocation = {
  latitude: number;
  longitude: number;
};

export const REPORT_REFRESH_INTERVAL_MS = 45_000;
export const ROUTE_MOVEMENT_THRESHOLD_METERS = 120;
export const ROUTE_REROUTE_COOLDOWN_MS = 30_000;

export function trafficReportsFingerprint(reports: TrafficReport[]): string {
  return reports
    .map((report) => [
      report.id,
      report.type,
      report.severity,
      report.confirmations,
      report.clearVotes,
      report.latitude.toFixed(5),
      report.longitude.toFixed(5),
    ].join(":"))
    .sort()
    .join("|");
}

export function hasTrafficStateChanged(
  previousFingerprint: string,
  reports: TrafficReport[],
): boolean {
  return previousFingerprint !== trafficReportsFingerprint(reports);
}

export function shouldRerouteForMovement(
  previous: RouteLocation | null,
  current: RouteLocation,
  lastRerouteAt: number,
  now = Date.now(),
): boolean {
  if (!previous || now - lastRerouteAt < ROUTE_REROUTE_COOLDOWN_MS) return false;
  return distanceBetweenMeters(previous, current) >= ROUTE_MOVEMENT_THRESHOLD_METERS;
}

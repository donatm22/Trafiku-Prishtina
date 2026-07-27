import type { IncidentType, TrafficReport } from "./traffic.ts";

export type DuplicateTrafficReport = TrafficReport & {
  distanceMeters: number;
};

const DUPLICATE_RADIUS_METERS: Record<IncidentType, number> = {
  jam: 350,
  accident: 250,
  closure: 300,
  hazard: 150,
};

export function distanceBetweenMeters(
  first: { latitude: number; longitude: number },
  second: { latitude: number; longitude: number },
): number {
  const earthRadiusMeters = 6_371_000;
  const toRadians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = toRadians(second.latitude - first.latitude);
  const longitudeDelta = toRadians(second.longitude - first.longitude);
  const firstLatitude = toRadians(first.latitude);
  const secondLatitude = toRadians(second.latitude);
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(firstLatitude) * Math.cos(secondLatitude) * Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusMeters * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findDuplicateCandidates(
  reports: TrafficReport[],
  input: Pick<TrafficReport, "type" | "latitude" | "longitude">,
): DuplicateTrafficReport[] {
  const radius = DUPLICATE_RADIUS_METERS[input.type];
  return reports
    .filter((report) => report.type === input.type)
    .map((report) => ({
      ...report,
      distanceMeters: Math.round(distanceBetweenMeters(input, report)),
    }))
    .filter((report) => report.distanceMeters <= radius)
    .sort((first, second) => first.distanceMeters - second.distanceMeters)
    .slice(0, 3);
}

import { INCIDENT_TYPES, type IncidentType, type TrafficReport } from "./traffic.ts";

export type NewTrafficReport = Pick<
  TrafficReport,
  "type" | "title" | "description" | "locationName" | "latitude" | "longitude" | "severity"
>;

type ValidationResult =
  | { ok: true; report: NewTrafficReport }
  | { ok: false };

const PRISHTINA_BOUNDS = {
  minLatitude: 42.55,
  maxLatitude: 42.75,
  minLongitude: 21.03,
  maxLongitude: 21.30,
} as const;

export function validateTrafficReport(value: unknown): ValidationResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ok: false };

  const body = value as Record<string, unknown>;
  const type = String(body.type ?? "");
  const severity = String(body.severity ?? "");
  const title = String(body.title ?? "").trim().slice(0, 100);
  const description = String(body.description ?? "").trim().slice(0, 400);
  const locationName = String(body.locationName ?? "").trim().slice(0, 120);
  const latitude = Number(body.latitude);
  const longitude = Number(body.longitude);

  if (
    !Object.hasOwn(INCIDENT_TYPES, type) ||
    !["low", "medium", "high"].includes(severity) ||
    title.length < 4 ||
    locationName.length < 2 ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude) ||
    latitude < PRISHTINA_BOUNDS.minLatitude ||
    latitude > PRISHTINA_BOUNDS.maxLatitude ||
    longitude < PRISHTINA_BOUNDS.minLongitude ||
    longitude > PRISHTINA_BOUNDS.maxLongitude
  ) {
    return { ok: false };
  }

  return {
    ok: true,
    report: {
      type: type as IncidentType,
      title,
      description,
      locationName,
      latitude,
      longitude,
      severity: severity as TrafficReport["severity"],
    },
  };
}

import { distanceBetweenMeters } from "./duplicate-detection.ts";
import { dijkstraShortestPath, type WeightedEdge } from "./dijkstra.ts";
import type { TrafficReport } from "./traffic.ts";

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RoutePlan = RouteAlternative & {
  destination: string;
  start: RoutePoint;
  end: RoutePoint;
  algorithm: "dijkstra";
  evaluatedAlternatives: number;
};

export type RouteCandidate = {
  geometry: RoutePoint[];
  durationSeconds: number;
  distanceMeters: number;
};

export type RouteLabel = "fastest" | "least-traffic" | "shortest";

export type RouteAlternative = RouteCandidate & {
  id: string;
  candidateIndex: number;
  baseDurationSeconds: number;
  incidentDelaySeconds: number;
  incidentIds: string[];
  closureIds: string[];
  blocked: boolean;
  labels: RouteLabel[];
};

export type QuickestRoute = RouteAlternative & {
  algorithm: "dijkstra";
  evaluatedAlternatives: number;
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

export function selectQuickestRoute(
  candidates: RouteCandidate[],
  reports: TrafficReport[] = [],
): QuickestRoute | null {
  const alternatives = evaluateRouteAlternatives(candidates, reports);
  if (alternatives.length === 0) return null;
  const viableAlternatives = alternatives.filter((alternative) => !alternative.blocked);
  if (viableAlternatives.length === 0) return null;

  const graph = new Map<string, WeightedEdge[]>();
  const points = new Map<string, RoutePoint>();
  const routeIndexes = new Map<string, number>();
  graph.set("start", []);
  graph.set("destination", []);

  viableAlternatives.forEach((alternative, routeIndex) => {
    const segmentLengths = alternative.geometry.slice(1).map((point, pointIndex) =>
      distanceBetweenMeters(alternative.geometry[pointIndex]!, point),
    );
    const geometryLength = segmentLengths.reduce((sum, length) => sum + length, 0);
    const firstNode = routeNodeId(routeIndex, 0);
    graph.get("start")!.push({ to: firstNode, weight: 0 });

    alternative.geometry.forEach((point, pointIndex) => {
      const node = routeNodeId(routeIndex, pointIndex);
      points.set(node, point);
      routeIndexes.set(node, routeIndex);
      if (!graph.has(node)) graph.set(node, []);
      if (pointIndex === alternative.geometry.length - 1) {
        graph.get(node)!.push({ to: "destination", weight: 0 });
        return;
      }

      const nextNode = routeNodeId(routeIndex, pointIndex + 1);
      const segmentLength = segmentLengths[pointIndex]!;
      const weight = geometryLength > 0
        ? alternative.durationSeconds * (segmentLength / geometryLength)
        : alternative.durationSeconds / (alternative.geometry.length - 1);
      graph.get(node)!.push({ to: nextNode, weight });
    });
  });

  const result = dijkstraShortestPath(graph, "start", "destination");
  if (!result || result.path.length < 2) return null;

  const geometry = result.path
    .map((node) => points.get(node))
    .filter((point): point is RoutePoint => Boolean(point));
  if (geometry.length < 2) return null;

  const selectedRouteIndex = result.path
    .map((node) => routeIndexes.get(node))
    .find((routeIndex): routeIndex is number => routeIndex !== undefined);
  if (selectedRouteIndex === undefined) return null;
  const selectedAlternative = viableAlternatives[selectedRouteIndex]!;

  return {
    ...selectedAlternative,
    geometry,
    durationSeconds: result.distance,
    algorithm: "dijkstra",
    evaluatedAlternatives: alternatives.length,
  };
}

export function evaluateRouteAlternatives(
  candidates: RouteCandidate[],
  reports: TrafficReport[] = [],
): RouteAlternative[] {
  const alternatives = candidates
    .filter(isValidCandidate)
    .map((candidate, candidateIndex): RouteAlternative => {
      const routeReports = reportsAlongRoute(reports, candidate.geometry);
      const incidentDelaySeconds = routeReports.reduce(
        (total, report) => total + estimateIncidentDelaySeconds(report),
        0,
      );
      const closureIds = routeReports
        .filter(isConfirmedClosure)
        .map((report) => report.id);
      return {
        ...candidate,
        id: `route-${candidateIndex + 1}`,
        candidateIndex,
        baseDurationSeconds: candidate.durationSeconds,
        durationSeconds: candidate.durationSeconds + incidentDelaySeconds,
        incidentDelaySeconds,
        incidentIds: routeReports.map((report) => report.id),
        closureIds,
        blocked: closureIds.length > 0,
        labels: [],
      };
    });

  addLabel(alternatives, "fastest", (route) => route.durationSeconds);
  addLabel(
    alternatives,
    "least-traffic",
    (route) => route.incidentDelaySeconds * 100 + route.incidentIds.length,
  );
  addLabel(alternatives, "shortest", (route) => route.distanceMeters);
  return alternatives;
}

export function estimateIncidentDelaySeconds(report: TrafficReport): number {
  const baseDelay = {
    jam: 300,
    accident: 480,
    closure: 1800,
    hazard: 120,
  }[report.type];
  const severityMultiplier = {
    low: 0.65,
    medium: 1,
    high: 1.6,
  }[report.severity];
  const confirmationMultiplier = 1 + Math.min(Math.max(report.confirmations - 1, 0), 10) * 0.025;
  const clearVoteMultiplier = Math.max(0.25, 1 - Math.max(report.clearVotes, 0) * 0.25);
  return Math.round(baseDelay * severityMultiplier * confirmationMultiplier * clearVoteMultiplier);
}

export function isConfirmedClosure(report: TrafficReport): boolean {
  return report.type === "closure" && report.confirmations >= 2;
}

function reportsAlongRoute(
  reports: TrafficReport[],
  geometry: RoutePoint[],
  proximityMeters = 140,
): TrafficReport[] {
  const seen = new Set<string>();
  return reports.filter((report) => {
    if (seen.has(report.id)) return false;
    const isNearby = geometry.some((point) => distanceBetweenMeters(report, point) <= proximityMeters);
    if (isNearby) seen.add(report.id);
    return isNearby;
  });
}

function addLabel(
  alternatives: RouteAlternative[],
  label: RouteLabel,
  score: (route: RouteAlternative) => number,
): void {
  const best = alternatives.filter((route) => !route.blocked).reduce<RouteAlternative | null>((current, route) => (
    !current || score(route) < score(current) ? route : current
  ), null);
  if (best) best.labels.push(label);
}

function isValidCandidate(candidate: RouteCandidate): boolean {
  return candidate.geometry.length >= 2
    && candidate.geometry.every(isPointInPrishtina)
    && Number.isFinite(candidate.durationSeconds)
    && candidate.durationSeconds >= 0
    && Number.isFinite(candidate.distanceMeters)
    && candidate.distanceMeters >= 0;
}

function routeNodeId(routeIndex: number, pointIndex: number): string {
  return `route-${routeIndex}-point-${pointIndex}`;
}

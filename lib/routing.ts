import { distanceBetweenMeters } from "./duplicate-detection.ts";
import { dijkstraShortestPath, type WeightedEdge } from "./dijkstra.ts";
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
  algorithm: "dijkstra";
  evaluatedAlternatives: number;
};

export type RouteCandidate = {
  geometry: RoutePoint[];
  durationSeconds: number;
  distanceMeters: number;
};

export type QuickestRoute = RouteCandidate & {
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

export function selectQuickestRoute(candidates: RouteCandidate[]): QuickestRoute | null {
  const validCandidates = candidates.filter(isValidCandidate);
  if (validCandidates.length === 0) return null;

  const graph = new Map<string, WeightedEdge[]>();
  const points = new Map<string, RoutePoint>();
  graph.set("start", []);
  graph.set("destination", []);

  validCandidates.forEach((candidate, routeIndex) => {
    const segmentLengths = candidate.geometry.slice(1).map((point, pointIndex) =>
      distanceBetweenMeters(candidate.geometry[pointIndex]!, point),
    );
    const geometryLength = segmentLengths.reduce((sum, length) => sum + length, 0);
    const firstNode = routeNodeId(routeIndex, 0);
    graph.get("start")!.push({ to: firstNode, weight: 0 });

    candidate.geometry.forEach((point, pointIndex) => {
      const node = routeNodeId(routeIndex, pointIndex);
      points.set(node, point);
      if (!graph.has(node)) graph.set(node, []);
      if (pointIndex === candidate.geometry.length - 1) {
        graph.get(node)!.push({ to: "destination", weight: 0 });
        return;
      }

      const nextNode = routeNodeId(routeIndex, pointIndex + 1);
      const segmentLength = segmentLengths[pointIndex]!;
      const weight = geometryLength > 0
        ? candidate.durationSeconds * (segmentLength / geometryLength)
        : candidate.durationSeconds / (candidate.geometry.length - 1);
      graph.get(node)!.push({ to: nextNode, weight });
    });
  });

  const result = dijkstraShortestPath(graph, "start", "destination");
  if (!result || result.path.length < 2) return null;

  const geometry = result.path
    .map((node) => points.get(node))
    .filter((point): point is RoutePoint => Boolean(point));
  if (geometry.length < 2) return null;

  const distanceMeters = geometry.slice(1).reduce(
    (sum, point, index) => sum + distanceBetweenMeters(geometry[index]!, point),
    0,
  );

  return {
    geometry,
    durationSeconds: result.distance,
    distanceMeters,
    algorithm: "dijkstra",
    evaluatedAlternatives: validCandidates.length,
  };
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

import assert from "node:assert/strict";
import test from "node:test";
import {
  estimateIncidentDelaySeconds,
  evaluateRouteAlternatives,
  findIncidentsAlongRoute,
  isConfirmedClosure,
  isPointInPrishtina,
  selectQuickestRoute,
} from "../lib/routing.ts";
import type { TrafficReport } from "../lib/traffic.ts";

const route = [
  { latitude: 42.6600, longitude: 21.1550 },
  { latitude: 42.6610, longitude: 21.1570 },
  { latitude: 42.6620, longitude: 21.1600 },
];

const report: TrafficReport = {
  id: "route-incident",
  type: "accident",
  title: "Aksident pranë rrugës",
  description: "",
  locationName: "Qendër",
  latitude: 42.6611,
  longitude: 21.1571,
  severity: "medium",
  confirmations: 2,
  clearVotes: 0,
  lastConfirmedAt: "2026-07-27T19:00:00.000Z",
  createdAt: "2026-07-27T18:50:00.000Z",
  expiresAt: "2026-07-27T22:00:00.000Z",
};

test("validates route points within the Prishtina service area", () => {
  assert.equal(isPointInPrishtina(route[0]!), true);
  assert.equal(isPointInPrishtina({ latitude: 41.3, longitude: 19.8 }), false);
});

test("highlights only incidents close to the planned route", () => {
  const farReport = { ...report, id: "far-away", latitude: 42.69 };
  assert.deepEqual(findIncidentsAlongRoute([report, farReport], route), ["route-incident"]);
});

test("selects the quickest route candidate with Dijkstra", () => {
  const quickest = selectQuickestRoute([
    {
      geometry: route,
      durationSeconds: 420,
      distanceMeters: 1600,
    },
    {
      geometry: [
        route[0]!,
        { latitude: 42.6605, longitude: 21.1580 },
        route[2]!,
      ],
      durationSeconds: 240,
      distanceMeters: 1900,
    },
  ]);

  assert.ok(quickest);
  assert.equal(Math.round(quickest.durationSeconds), 240);
  assert.equal(quickest.algorithm, "dijkstra");
  assert.equal(quickest.evaluatedAlternatives, 2);
  assert.deepEqual(quickest.geometry[1], { latitude: 42.6605, longitude: 21.1580 });
});

test("labels comparison routes by speed, traffic and distance", () => {
  const alternatives = evaluateRouteAlternatives([
    {
      geometry: route,
      durationSeconds: 420,
      distanceMeters: 1200,
    },
    {
      geometry: [
        route[0]!,
        { latitude: 42.6680, longitude: 21.1700 },
        route[2]!,
      ],
      durationSeconds: 300,
      distanceMeters: 1800,
    },
  ], [report]);

  assert.equal(alternatives.length, 2);
  assert.ok(alternatives[0]!.labels.includes("shortest"));
  assert.ok(alternatives[1]!.labels.includes("fastest"));
  assert.ok(alternatives[1]!.labels.includes("least-traffic"));
  assert.ok(alternatives[0]!.incidentDelaySeconds > 0);
});

test("chooses a slightly longer clear route over a faster route with an accident", () => {
  const clearAlternative = [
    route[0]!,
    { latitude: 42.6680, longitude: 21.1700 },
    route[2]!,
  ];
  const quickest = selectQuickestRoute([
    {
      geometry: route,
      durationSeconds: 240,
      distanceMeters: 1500,
    },
    {
      geometry: clearAlternative,
      durationSeconds: 360,
      distanceMeters: 2100,
    },
  ], [{ ...report, severity: "high", confirmations: 12 }]);

  assert.ok(quickest);
  assert.equal(Math.round(quickest.durationSeconds), 360);
  assert.equal(quickest.incidentDelaySeconds, 0);
  assert.deepEqual(quickest.incidentIds, []);
  assert.deepEqual(quickest.geometry, clearAlternative);
});

test("adds confirmed incident delay to a route's Dijkstra weight", () => {
  const quickest = selectQuickestRoute([
    {
      geometry: route,
      durationSeconds: 240,
      distanceMeters: 1500,
    },
  ], [{ ...report, type: "jam", severity: "medium", confirmations: 5 }]);

  assert.ok(quickest);
  assert.equal(quickest.baseDurationSeconds, 240);
  assert.equal(quickest.incidentDelaySeconds, estimateIncidentDelaySeconds({
    ...report,
    type: "jam",
    severity: "medium",
    confirmations: 5,
  }));
  assert.equal(
    Math.round(quickest.durationSeconds),
    quickest.baseDurationSeconds + quickest.incidentDelaySeconds,
  );
  assert.deepEqual(quickest.incidentIds, ["route-incident"]);
});

test("removes routes with confirmed closures from the Dijkstra graph", () => {
  const clearAlternative = [
    route[0]!,
    { latitude: 42.6680, longitude: 21.1700 },
    route[2]!,
  ];
  const closure = { ...report, type: "closure" as const, confirmations: 2 };
  const candidates = [
    {
      geometry: route,
      durationSeconds: 180,
      distanceMeters: 1200,
    },
    {
      geometry: clearAlternative,
      durationSeconds: 420,
      distanceMeters: 2200,
    },
  ];

  const alternatives = evaluateRouteAlternatives(candidates, [closure]);
  const quickest = selectQuickestRoute(candidates, [closure]);

  assert.equal(isConfirmedClosure(closure), true);
  assert.equal(alternatives[0]!.blocked, true);
  assert.deepEqual(alternatives[0]!.closureIds, ["route-incident"]);
  assert.equal(alternatives[0]!.labels.length, 0);
  assert.ok(quickest);
  assert.deepEqual(quickest.geometry, clearAlternative);
});

test("returns no route when every alternative is closed", () => {
  const closure = { ...report, type: "closure" as const, confirmations: 3 };

  assert.equal(selectQuickestRoute([{
    geometry: route,
    durationSeconds: 180,
    distanceMeters: 1200,
  }], [closure]), null);
});

import assert from "node:assert/strict";
import test from "node:test";
import { findIncidentsAlongRoute, isPointInPrishtina } from "../lib/routing.ts";
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

import assert from "node:assert/strict";
import test from "node:test";
import { distanceBetweenMeters, findDuplicateCandidates } from "../lib/duplicate-detection.ts";
import type { TrafficReport } from "../lib/traffic.ts";

const baseReport: TrafficReport = {
  id: "existing",
  type: "jam",
  title: "Kolonë te qendra",
  description: "",
  locationName: "Sheshi Zahir Pajaziti",
  latitude: 42.6629,
  longitude: 21.1655,
  severity: "medium",
  confirmations: 4,
  clearVotes: 0,
  lastConfirmedAt: "2026-07-27T18:00:00.000Z",
  createdAt: "2026-07-27T17:45:00.000Z",
  expiresAt: "2026-07-27T20:00:00.000Z",
};

test("calculates short Prishtina distances in meters", () => {
  const distance = distanceBetweenMeters(
    baseReport,
    { latitude: 42.6634, longitude: 21.1655 },
  );
  assert.ok(distance > 50 && distance < 60);
});

test("finds only nearby reports of the same incident type", () => {
  const differentType = { ...baseReport, id: "hazard", type: "hazard" as const };
  const farAway = { ...baseReport, id: "far", latitude: 42.67 };
  const matches = findDuplicateCandidates(
    [differentType, farAway, baseReport],
    { type: "jam", latitude: 42.6634, longitude: 21.1655 },
  );

  assert.equal(matches.length, 1);
  assert.equal(matches[0]?.id, "existing");
  assert.ok((matches[0]?.distanceMeters ?? 0) > 0);
});

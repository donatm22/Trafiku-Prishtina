import assert from "node:assert/strict";
import test from "node:test";
import {
  hasTrafficStateChanged,
  shouldRerouteForMovement,
  trafficReportsFingerprint,
} from "../lib/rerouting.ts";
import type { TrafficReport } from "../lib/traffic.ts";

const report: TrafficReport = {
  id: "traffic-a",
  type: "jam",
  title: "Kolonë",
  description: "",
  locationName: "Qendër",
  latitude: 42.6600,
  longitude: 21.1550,
  severity: "medium",
  confirmations: 2,
  clearVotes: 0,
  lastConfirmedAt: "2026-07-28T10:00:00.000Z",
  createdAt: "2026-07-28T10:00:00.000Z",
  expiresAt: "2026-07-28T12:00:00.000Z",
};

test("detects routing-relevant traffic report changes", () => {
  const fingerprint = trafficReportsFingerprint([report]);

  assert.equal(hasTrafficStateChanged(fingerprint, [report]), false);
  assert.equal(hasTrafficStateChanged(fingerprint, [{ ...report, confirmations: 3 }]), true);
  assert.equal(hasTrafficStateChanged(fingerprint, [{ ...report, severity: "high" }]), true);
});

test("reroutes after meaningful movement and respects the cooldown", () => {
  const previous = { latitude: 42.6600, longitude: 21.1550 };
  const moved = { latitude: 42.6620, longitude: 21.1550 };

  assert.equal(shouldRerouteForMovement(previous, moved, 0, 60_000), true);
  assert.equal(shouldRerouteForMovement(previous, moved, 50_000, 60_000), false);
  assert.equal(shouldRerouteForMovement(previous, { ...previous, latitude: 42.6602 }, 0, 60_000), false);
});

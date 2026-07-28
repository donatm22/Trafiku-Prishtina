import assert from "node:assert/strict";
import test from "node:test";
import { MOCK_REPORTS } from "../lib/traffic.ts";

test("provides clearly labelled mock jams, accidents and hazards", () => {
  const types = new Set(MOCK_REPORTS.map((report) => report.type));

  assert.ok(types.has("jam"));
  assert.ok(types.has("accident"));
  assert.ok(types.has("hazard"));
  assert.ok(MOCK_REPORTS.length >= 6);
  assert.ok(MOCK_REPORTS.every((report) => report.id.startsWith("mock-")));
  assert.ok(MOCK_REPORTS.every((report) => report.title.startsWith("[TEST]")));
  assert.ok(MOCK_REPORTS.every((report) => new Date(report.expiresAt).getUTCFullYear() >= 2030));
});

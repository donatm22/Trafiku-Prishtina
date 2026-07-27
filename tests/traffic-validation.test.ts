import assert from "node:assert/strict";
import test from "node:test";
import { isTrustedMutation } from "../lib/request-security.ts";
import { validateTrafficReport } from "../lib/traffic-validation.ts";

const validReport = {
  type: "jam",
  title: "Kolonë te qendra",
  description: "Trafik i ngadalshëm në të dy korsitë.",
  locationName: "Sheshi Zahir Pajaziti",
  latitude: 42.6629,
  longitude: 21.1655,
  severity: "medium",
};

test("accepts and normalizes every supported traffic category", () => {
  for (const type of ["jam", "accident", "closure", "hazard"]) {
    const result = validateTrafficReport({
      ...validReport,
      type,
      title: `  ${validReport.title}  `,
    });
    assert.equal(result.ok, true);
    if (result.ok) assert.equal(result.report.title, validReport.title);
  }
});

test("rejects police, radar, invalid coordinates and incomplete reports", () => {
  for (const type of ["police", "radar"]) {
    assert.equal(validateTrafficReport({ ...validReport, type }).ok, false);
  }
  assert.equal(validateTrafficReport({ ...validReport, latitude: 41.9 }).ok, false);
  assert.equal(validateTrafficReport({ ...validReport, title: "Jo" }).ok, false);
  assert.equal(validateTrafficReport(null).ok, false);
});

test("allows same-origin writes and blocks cross-site browser writes", () => {
  const sameOrigin = new Request("https://trafiku.prishtina.online/api/reports", {
    method: "POST",
    headers: { origin: "https://trafiku.prishtina.online", "sec-fetch-site": "same-origin" },
  });
  const crossSite = new Request("https://trafiku.prishtina.online/api/reports", {
    method: "POST",
    headers: { origin: "https://example.com", "sec-fetch-site": "cross-site" },
  });

  assert.equal(isTrustedMutation(sameOrigin), true);
  assert.equal(isTrustedMutation(crossSite), false);
});

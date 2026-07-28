import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeSearchText,
  selectDestinationCandidate,
  type PhotonFeature,
} from "../lib/geocoding.ts";

const start = { latitude: 42.6585, longitude: 21.1615 };

function feature(
  name: string,
  latitude: number,
  longitude: number,
  properties: Record<string, unknown> = {},
): PhotonFeature {
  return {
    geometry: { coordinates: [longitude, latitude] },
    properties: { name, ...properties },
  };
}

test("prefers the exact Prishtina Mall landmark over a weak mall result", () => {
  const bigMall = feature("Big Mall Center", 42.64, 21.10, {
    city: "Fushë Kosovë",
    osm_key: "shop",
    osm_value: "baby_goods",
  });
  const prishtinaMall = feature("Prishtina Mall", 42.60, 21.14, {
    city: "Livadhe",
    osm_key: "shop",
    osm_value: "mall",
  });

  assert.equal(
    selectDestinationCandidate([bigMall, prishtinaMall], "Prishtina Mall", start),
    prishtinaMall,
  );
});

test("normalizes Albanian diacritics while preserving exact-name intent", () => {
  assert.equal(normalizeSearchText("Sheshi Nënë Tereza"), "sheshi nene tereza");
  const square = feature("Sheshi Nena Tereza", 42.6620, 21.1627, {
    osm_key: "highway",
    osm_value: "pedestrian",
  });
  assert.equal(selectDestinationCandidate([square], "Sheshi Nënë Tereza", start), square);
});

test("rejects candidates that only share one generic word", () => {
  const unrelated = feature("Big Mall Center", 42.64, 21.10, {
    city: "Fushë Kosovë",
    osm_key: "shop",
  });
  assert.equal(selectDestinationCandidate([unrelated], "Prishtina Mall", start), null);
});

test("prefers a navigable street over an equally named waterway", () => {
  const waterway = feature("Rruga B", 42.6442, 21.1689, { osm_key: "waterway" });
  const street = feature("Rruga B", 42.6502, 21.1739, { osm_key: "highway", osm_value: "secondary" });

  assert.equal(selectDestinationCandidate([waterway, street], "Rruga B", start), street);
});

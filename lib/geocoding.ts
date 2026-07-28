import { distanceBetweenMeters } from "./duplicate-detection.ts";

export type GeocodingPoint = {
  latitude: number;
  longitude: number;
};

export type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
};

export function selectDestinationCandidate(
  features: PhotonFeature[],
  query: string,
  start: GeocodingPoint,
): PhotonFeature | null {
  const normalizedQuery = normalizeSearchText(query);
  const queryTokens = tokenize(normalizedQuery);
  if (!normalizedQuery || queryTokens.length === 0) return null;

  const ranked = features
    .map((feature) => rankFeature(feature, normalizedQuery, queryTokens, start))
    .filter((candidate): candidate is RankedFeature => candidate !== null)
    .sort((left, right) => right.score - left.score);

  return ranked[0]?.feature ?? null;
}

export function normalizeSearchText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("sq")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

type RankedFeature = {
  feature: PhotonFeature;
  score: number;
};

function rankFeature(
  feature: PhotonFeature,
  normalizedQuery: string,
  queryTokens: string[],
  start: GeocodingPoint,
): RankedFeature | null {
  const coordinates = feature.geometry?.coordinates;
  const longitude = Number(coordinates?.[0]);
  const latitude = Number(coordinates?.[1]);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;

  const properties = feature.properties ?? {};
  const name = normalizeSearchText(properties.name);
  const street = normalizeSearchText(properties.street);
  const houseNumber = normalizeSearchText(properties.housenumber);
  const primaryTexts = [name, street, [street, houseNumber].filter(Boolean).join(" ")]
    .filter(Boolean);
  const tokenText = new Set(primaryTexts.flatMap(tokenize));
  const matchedTokens = queryTokens.filter((token) =>
    [...tokenText].some((candidateToken) => tokensMatch(token, candidateToken)),
  ).length;
  const tokenCoverage = matchedTokens / queryTokens.length;
  const exactMatch = primaryTexts.some((text) => text === normalizedQuery);
  const phraseMatch = primaryTexts.some((text) =>
    text.startsWith(`${normalizedQuery} `)
    || text.endsWith(` ${normalizedQuery}`)
    || text.includes(` ${normalizedQuery} `),
  );

  // Reject single-word coincidences such as "mall" when the full destination
  // name is "Prishtina Mall".
  if (!exactMatch && !phraseMatch && tokenCoverage < 0.75) return null;

  const point = { latitude, longitude };
  const distanceKm = distanceBetweenMeters(start, point) / 1000;
  const categoryScore = destinationCategoryScore(properties);
  const score = (exactMatch ? 140 : 0)
    + (phraseMatch ? 90 : 0)
    + tokenCoverage * 60
    + categoryScore
    + Math.max(0, 12 - distanceKm);
  return { feature, score };
}

function destinationCategoryScore(properties: Record<string, unknown>): number {
  const osmKey = normalizeSearchText(properties.osm_key);
  const osmValue = normalizeSearchText(properties.osm_value);
  if (osmKey === "waterway") return -50;
  if (osmKey === "shop" && osmValue === "mall") return 35;
  if (osmKey === "amenity" || osmKey === "tourism" || osmKey === "leisure") return 22;
  if (osmKey === "highway") return 16;
  if (osmKey === "shop") return 8;
  return 0;
}

function tokenize(value: string): string[] {
  return value.split(" ").filter(Boolean);
}

function tokensMatch(left: string, right: string): boolean {
  if (left === right) return true;
  if (left.length < 4 || right.length < 4 || Math.abs(left.length - right.length) > 1) return false;

  let leftIndex = 0;
  let rightIndex = 0;
  let edits = 0;
  while (leftIndex < left.length && rightIndex < right.length) {
    if (left[leftIndex] === right[rightIndex]) {
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (left.length > right.length) leftIndex += 1;
    else if (right.length > left.length) rightIndex += 1;
    else {
      leftIndex += 1;
      rightIndex += 1;
    }
  }
  if (leftIndex < left.length || rightIndex < right.length) edits += 1;
  return edits <= 1;
}

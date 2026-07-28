import { NextResponse } from "next/server";
import { listTrafficReports } from "../../../db/traffic-store";
import {
  evaluateRouteAlternatives,
  isPointInPrishtina,
  selectQuickestRoute,
  type RouteAlternative,
  type RouteCandidate,
  type RoutePlan,
  type RoutePoint,
} from "../../../lib/routing";

export const dynamic = "force-dynamic";

const photonOrigin = process.env.PHOTON_ORIGIN ?? "https://photon.komoot.io";
const osrmOrigin = process.env.OSRM_ORIGIN ?? "https://router.project-osrm.org";

type PhotonFeature = {
  geometry?: { coordinates?: [number, number] };
  properties?: Record<string, unknown>;
};

type OsrmResponse = {
  code?: string;
  routes?: Array<{
    distance?: number;
    duration?: number;
    geometry?: { coordinates?: Array<[number, number]> };
  }>;
};

export async function GET(request: Request) {
  const url = new URL(request.url);
  const destinationQuery = String(url.searchParams.get("destination") ?? "").trim().slice(0, 120);
  const start = {
    latitude: Number(url.searchParams.get("latitude")),
    longitude: Number(url.searchParams.get("longitude")),
  };

  if (destinationQuery.length < 2 || !isPointInPrishtina(start)) {
    return NextResponse.json({ error: "Kontrollo destinacionin dhe vendndodhjen e nisjes." }, { status: 422 });
  }

  try {
    const searchUrl = new URL("/api/", photonOrigin);
    searchUrl.searchParams.set("q", `${destinationQuery}, Prishtinë, Kosovë`);
    searchUrl.searchParams.set("limit", "1");
    searchUrl.searchParams.set("bbox", "21.03,42.55,21.30,42.75");
    searchUrl.searchParams.set("lat", String(start.latitude));
    searchUrl.searchParams.set("lon", String(start.longitude));

    const placeResponse = await fetch(searchUrl, {
      headers: {
        accept: "application/geo+json, application/json",
        referer: "https://trafiku.prishtina.online/",
        "user-agent": "Trafiku-Prishtina/1.0 (https://trafiku.prishtina.online)",
      },
      signal: AbortSignal.timeout(6000),
    });
    if (!placeResponse.ok) throw new Error("Place lookup unavailable");
    const placeData = await placeResponse.json() as { features?: PhotonFeature[] };
    const feature = placeData.features?.[0];
    const coordinates = feature?.geometry?.coordinates;
    const end: RoutePoint = {
      latitude: Number(coordinates?.[1]),
      longitude: Number(coordinates?.[0]),
    };
    if (!isPointInPrishtina(end)) {
      return NextResponse.json({ error: "Nuk e gjetëm këtë destinacion brenda Prishtinës." }, { status: 404 });
    }

    const routeUrl = new URL(
      `/route/v1/driving/${start.longitude},${start.latitude};${end.longitude},${end.latitude}`,
      osrmOrigin,
    );
    routeUrl.searchParams.set("overview", "full");
    routeUrl.searchParams.set("geometries", "geojson");
    routeUrl.searchParams.set("steps", "false");
    routeUrl.searchParams.set("alternatives", "3");

    const routeResponse = await fetch(routeUrl, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!routeResponse.ok) throw new Error("Route service unavailable");
    const routeData = await routeResponse.json() as OsrmResponse;
    const candidates = (routeData.routes ?? [])
      .map(toRouteCandidate)
      .filter((candidate): candidate is RouteCandidate => candidate !== null);
    const reports = await listTrafficReports();
    const alternatives = evaluateRouteAlternatives(candidates, reports);
    const fastest = selectQuickestRoute(candidates, reports);
    if (routeData.code === "Ok" && alternatives.length > 0 && !fastest) {
      const blockedDestination = destinationLabel(feature?.properties ?? {}, destinationQuery);
      return NextResponse.json({
        error: "Të gjitha rrugët e gjetura kalojnë nëpër mbyllje të konfirmuara.",
        routes: alternatives.map((alternative) =>
          toRoutePlan(alternative, blockedDestination, start, end, alternatives.length),
        ),
      }, { status: 409 });
    }
    if (routeData.code !== "Ok" || !fastest) {
      return NextResponse.json({ error: "Nuk u gjet një rrugë e kalueshme për këtë destinacion." }, { status: 404 });
    }

    const properties = feature?.properties ?? {};
    const destination = destinationLabel(properties, destinationQuery);
    const plan = toRoutePlan(fastest, destination, start, end, alternatives.length);
    const routes = alternatives.map((alternative) =>
      toRoutePlan(alternative, destination, start, end, alternatives.length),
    );
    return NextResponse.json({ route: plan, routes });
  } catch {
    return NextResponse.json({ error: "Planifikimi i rrugës nuk është i disponueshëm për momentin." }, { status: 503 });
  }
}

function toRoutePlan(
  alternative: RouteAlternative,
  destination: string,
  start: RoutePoint,
  end: RoutePoint,
  evaluatedAlternatives: number,
): RoutePlan {
  return {
    ...alternative,
    destination,
    start,
    end,
    algorithm: "dijkstra",
    evaluatedAlternatives,
  };
}

function toRouteCandidate(route: NonNullable<OsrmResponse["routes"]>[number]): RouteCandidate | null {
  const geometry = route.geometry?.coordinates
    ?.map(([longitude, latitude]) => ({ latitude: Number(latitude), longitude: Number(longitude) }));
  const durationSeconds = Number(route.duration);
  const distanceMeters = Number(route.distance);
  if (!geometry || geometry.length < 2 || !geometry.every(isPointInPrishtina)) return null;
  if (!Number.isFinite(durationSeconds) || durationSeconds < 0) return null;
  if (!Number.isFinite(distanceMeters) || distanceMeters < 0) return null;
  return { geometry, durationSeconds, distanceMeters };
}

function destinationLabel(properties: Record<string, unknown>, fallback: string): string {
  const parts = [
    properties.name,
    properties.street,
    properties.district,
    properties.city,
  ]
    .filter((part): part is string => typeof part === "string" && part.trim().length > 0)
    .map((part) => part.trim());
  return [...new Set(parts)].slice(0, 3).join(", ") || fallback;
}

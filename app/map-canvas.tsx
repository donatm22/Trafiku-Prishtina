"use client";

import { divIcon } from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { CLEAR_VOTES_REQUIRED } from "../lib/incident-lifecycle";
import type { RoutePlan } from "../lib/routing";
import { INCIDENT_TYPES, type TrafficReport } from "../lib/traffic";

type Point = { latitude: number; longitude: number };

function MapInteraction({ onPositionPick }: { onPositionPick?: (point: Point) => void }) {
  useMapEvents({
    click(event) {
      onPositionPick?.({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    },
  });
  return null;
}

function MapFocus({ point }: { point?: Point | null }) {
  const map = useMap();
  useEffect(() => {
    if (point) map.flyTo([point.latitude, point.longitude], Math.max(map.getZoom(), 16));
  }, [map, point]);
  return null;
}

function RouteFocus({ route }: { route?: RoutePlan | null }) {
  const map = useMap();
  useEffect(() => {
    if (!route || route.geometry.length < 2) return;
    map.fitBounds(
      route.geometry.map((point) => [point.latitude, point.longitude] as [number, number]),
      { padding: [34, 34] },
    );
  }, [map, route]);
  return null;
}

export default function MapCanvas({
  reports,
  draftPoint,
  focusPoint,
  routePlan,
  routeOptions = [],
  onPositionPick,
}: {
  reports: TrafficReport[];
  draftPoint?: Point | null;
  focusPoint?: Point | null;
  routePlan?: RoutePlan | null;
  routeOptions?: RoutePlan[];
  onPositionPick?: (point: Point) => void;
}) {
  const routeIncidentIds = new Set(routePlan?.incidentIds ?? []);
  return (
    <MapContainer
      center={[42.6585, 21.1615]}
      zoom={14}
      minZoom={12}
      maxZoom={18}
      zoomControl={false}
      scrollWheelZoom
      className="leaflet-map"
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <ZoomControl position="bottomright" />
      <MapInteraction onPositionPick={onPositionPick} />
      <MapFocus point={focusPoint} />
      <RouteFocus route={routePlan} />
      {routeOptions
        .filter((route) => route.blocked)
        .map((route) => (
          <Polyline
            key={route.id}
            positions={route.geometry.map((point) => [point.latitude, point.longitude])}
            pathOptions={{ color: "#7a4b28", weight: 4, opacity: 0.4, dashArray: "3 9" }}
          />
        ))}
      {routeOptions
        .filter((route) => route.id !== routePlan?.id && !route.blocked)
        .map((route) => (
          <Polyline
            key={route.id}
            positions={route.geometry.map((point) => [point.latitude, point.longitude])}
            pathOptions={{ color: "#817b73", weight: 4, opacity: 0.5, dashArray: "8 8" }}
          />
        ))}
      {routePlan && (
        <>
          <Polyline
            positions={routePlan.geometry.map((point) => [point.latitude, point.longitude])}
            pathOptions={{ color: "#c92f38", weight: 6, opacity: 0.88 }}
          />
          <Marker
            position={[routePlan.start.latitude, routePlan.start.longitude]}
            icon={divIcon({
              className: "route-point-shell",
              html: '<span class="route-point route-point-start">A</span>',
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            })}
            title="Nisja"
          />
          <Marker
            position={[routePlan.end.latitude, routePlan.end.longitude]}
            icon={divIcon({
              className: "route-point-shell",
              html: '<span class="route-point route-point-end">B</span>',
              iconSize: [30, 30],
              iconAnchor: [15, 15],
            })}
            title={routePlan.destination}
          />
        </>
      )}
      {reports.map((report) => {
        const type = INCIDENT_TYPES[report.type];
        const marker = divIcon({
          className: "traffic-marker-shell",
          html: `<span class="traffic-marker traffic-marker-${report.type}${routeIncidentIds.has(report.id) ? " traffic-marker-on-route" : ""}" aria-hidden="true"><b>${type.icon}</b></span>`,
          iconSize: [38, 44],
          iconAnchor: [19, 40],
          popupAnchor: [0, -36],
        });
        return (
          <Marker key={report.id} position={[report.latitude, report.longitude]} icon={marker} title={report.title} keyboard>
            <Popup>
              <article className="map-popup">
                <span className={`incident-badge incident-${report.type}`}>{type.icon} {type.label}</span>
                <strong>{report.title}</strong>
                <p>{report.locationName}</p>
                <small>{report.confirmations} konfirmime · {report.clearVotes}/{CLEAR_VOTES_REQUIRED} vota për mbyllje</small>
              </article>
            </Popup>
          </Marker>
        );
      })}
      {draftPoint && (
        <Marker
          position={[draftPoint.latitude, draftPoint.longitude]}
          icon={divIcon({
            className: "traffic-marker-shell",
            html: '<span class="traffic-marker traffic-marker-draft" aria-hidden="true"><b>+</b></span>',
            iconSize: [38, 44],
            iconAnchor: [19, 40],
          })}
        />
      )}
    </MapContainer>
  );
}

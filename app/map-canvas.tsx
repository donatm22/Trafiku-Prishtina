"use client";

import { divIcon } from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, Popup, TileLayer, useMap, useMapEvents, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
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

export default function MapCanvas({
  reports,
  draftPoint,
  focusPoint,
  onPositionPick,
}: {
  reports: TrafficReport[];
  draftPoint?: Point | null;
  focusPoint?: Point | null;
  onPositionPick?: (point: Point) => void;
}) {
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
      {reports.map((report) => {
        const type = INCIDENT_TYPES[report.type];
        const marker = divIcon({
          className: "traffic-marker-shell",
          html: `<span class="traffic-marker traffic-marker-${report.type}" aria-hidden="true"><b>${type.icon}</b></span>`,
          iconSize: [38, 44],
          iconAnchor: [19, 40],
          popupAnchor: [0, -36],
        });
        return (
          <Marker key={report.id} position={[report.latitude, report.longitude]} icon={marker}>
            <Popup>
              <article className="map-popup">
                <span className={`incident-badge incident-${report.type}`}>{type.icon} {type.label}</span>
                <strong>{report.title}</strong>
                <p>{report.locationName}</p>
                <small>{report.confirmations} konfirmime</small>
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

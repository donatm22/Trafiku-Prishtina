"use client";

import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, ZoomControl } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { INCIDENT_TYPES, type TrafficReport } from "../lib/traffic";

export default function MapCanvas({ reports }: { reports: TrafficReport[] }) {
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
      {reports.map((report) => {
        const type = INCIDENT_TYPES[report.type];
        const marker = divIcon({
          className: "traffic-marker-shell",
          html: `<span class="traffic-marker traffic-marker-${report.type}" aria-hidden="true">${type.icon}</span>`,
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
    </MapContainer>
  );
}

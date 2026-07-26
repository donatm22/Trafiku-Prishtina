"use client";

import dynamic from "next/dynamic";
import { LocateFixed } from "lucide-react";
import { type TrafficReport } from "../lib/traffic";

const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => <div className="map-loading" role="status">Duke ngarkuar hartën…</div>,
});

export function TrafficDashboard({ reports }: { reports: TrafficReport[] }) {
  return (
    <section className="page-shell traffic-stage" id="harta">
      <div className="map-heading">
        <div>
          <span className="live-pill"><i /> DIREKT</span>
          <strong>{reports.length} raportime aktive</strong>
        </div>
        <button className="map-location-button" type="button" aria-label="Gjej vendndodhjen time">
          <LocateFixed size={18} aria-hidden="true" />
          <span>Vendndodhja ime</span>
        </button>
      </div>
      <div className="map-frame">
        <MapCanvas reports={reports} />
        <div className="map-legend" aria-label="Legjenda e hartës">
          <span><i className="legend-jam" />Kolonë</span>
          <span><i className="legend-accident" />Aksident</span>
          <span><i className="legend-closure" />Mbyllje</span>
          <span><i className="legend-hazard" />Rrezik</span>
        </div>
      </div>
    </section>
  );
}

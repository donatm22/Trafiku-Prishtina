"use client";

import { useMemo, useState } from "react";
import { CheckCircle2, Clock3, MapPin, Share2 } from "lucide-react";
import { INCIDENT_TYPES, type IncidentType, type TrafficReport } from "../lib/traffic";

type Filter = "all" | IncidentType;

function relativeTime(value: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "tani";
  if (minutes < 60) return `${minutes} min`;
  return `${Math.floor(minutes / 60)} orë`;
}

export function IncidentFeed({
  reports,
  onConfirm,
  onSelect,
}: {
  reports: TrafficReport[];
  onConfirm: (id: string) => Promise<boolean>;
  onSelect: (report: TrafficReport) => void;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [pendingConfirm, setPendingConfirm] = useState<string | null>(null);
  const visibleReports = useMemo(
    () => filter === "all" ? reports : reports.filter((report) => report.type === filter),
    [filter, reports],
  );

  async function confirm(id: string) {
    if (confirmed.has(id) || pendingConfirm === id) return;
    setPendingConfirm(id);
    const saved = await onConfirm(id);
    if (saved) setConfirmed((current) => new Set(current).add(id));
    setPendingConfirm(null);
  }

  async function share(report: TrafficReport) {
    const text = `${report.title} — ${report.locationName} · Trafiku Prishtina`;
    const url = `${window.location.origin}/#raportimet`;
    try {
      if (navigator.share) {
        await navigator.share({ title: report.title, text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
      }
    } catch {
      // Closing the native share sheet is not an error for the user.
    }
  }

  return (
    <section className="reports-section" id="raportimet" aria-labelledby="reports-title">
      <div className="page-shell">
        <div className="section-heading">
          <div>
            <span>Çfarë po ndodh</span>
            <h2 id="reports-title">Raportimet e fundit</h2>
          </div>
          <strong>{visibleReports.length} aktive</strong>
        </div>
        <div className="report-filters" role="group" aria-label="Filtro raportimet">
          <button className={filter === "all" ? "is-active" : ""} aria-pressed={filter === "all"} onClick={() => setFilter("all")} type="button">
            Të gjitha <b>{reports.length}</b>
          </button>
          {(Object.entries(INCIDENT_TYPES) as [IncidentType, typeof INCIDENT_TYPES[IncidentType]][]).map(([value, type]) => (
            <button className={filter === value ? "is-active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)} type="button" key={value}>
              <i style={{ backgroundColor: type.color }} />{type.label}
            </button>
          ))}
        </div>
        <div className="report-list">
          {visibleReports.map((report) => {
            const type = INCIDENT_TYPES[report.type];
            return (
              <article className="incident-card" key={report.id}>
                <button
                  className={`incident-card-icon incident-card-icon-${report.type}`}
                  type="button"
                  onClick={() => onSelect(report)}
                  aria-label={`Shiko ${report.title} në hartë`}
                >
                  {type.icon}
                </button>
                <div className="incident-card-body">
                  <div className="incident-card-meta">
                    <span className={`incident-badge incident-${report.type}`}>{type.label}</span>
                    <span className={`severity-dot severity-${report.severity}`}>{report.severity === "high" ? "Ndikim i lartë" : report.severity === "medium" ? "Ndikim mesatar" : "Ndikim i ulët"}</span>
                  </div>
                  <h3><button type="button" onClick={() => onSelect(report)}>{report.title}</button></h3>
                  <p>{report.description}</p>
                  <div className="incident-location">
                    <span><MapPin size={14} />{report.locationName}</span>
                    <span><Clock3 size={14} />{relativeTime(report.createdAt)}</span>
                  </div>
                </div>
                <div className="incident-card-actions">
                  <button
                    className={confirmed.has(report.id) ? "is-confirmed" : ""}
                    aria-pressed={confirmed.has(report.id)}
                    aria-busy={pendingConfirm === report.id}
                    disabled={pendingConfirm === report.id}
                    type="button"
                    onClick={() => confirm(report.id)}
                  >
                    <CheckCircle2 size={16} />
                    <span>{pendingConfirm === report.id ? "Duke ruajtur…" : confirmed.has(report.id) ? "Konfirmuar" : "Ende këtu"}</span>
                    <b>{report.confirmations}</b>
                  </button>
                  <button type="button" onClick={() => share(report)} aria-label={`Shpërndaje raportimin ${report.title}`}>
                    <Share2 size={16} />
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

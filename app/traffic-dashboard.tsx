"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, LocateFixed, MapPin, Navigation, X } from "lucide-react";
import { INCIDENT_TYPES, type IncidentType, type TrafficReport } from "../lib/traffic";
import { IncidentFeed } from "./incident-feed";

const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => <div className="map-loading" role="status">Duke ngarkuar hartën…</div>,
});

type Point = { latitude: number; longitude: number };

const EMPTY_POINT = { latitude: 42.6585, longitude: 21.1615 };

export function TrafficDashboard({ initialReports }: { initialReports: TrafficReport[] }) {
  const [reports, setReports] = useState(initialReports);
  const [isReportOpen, setReportOpen] = useState(false);
  const [draftPoint, setDraftPoint] = useState<Point>(EMPTY_POINT);
  const [focusPoint, setFocusPoint] = useState<Point | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [notice, setNotice] = useState("");
  const reportSheetRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#raporto") setReportOpen(true);
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  useEffect(() => {
    const refresh = window.setInterval(async () => {
      try {
        const response = await fetch("/api/reports", { headers: { accept: "application/json" } });
        const data = await response.json() as { reports?: TrafficReport[] };
        if (response.ok && data.reports) setReports(data.reports);
      } catch {
        // Keep the last good map state during a temporary connection failure.
      }
    }, 45_000);
    return () => window.clearInterval(refresh);
  }, []);

  useEffect(() => {
    if (!isReportOpen) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    reportSheetRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeReport();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
      previousFocus?.focus();
    };
  }, [isReportOpen]);

  function useCurrentLocation(forReport = false) {
    if (!navigator.geolocation) {
      setLocationStatus("Shfletuesi nuk e mbështet vendndodhjen.");
      return;
    }
    setLocationStatus("Duke gjetur vendndodhjen…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { latitude: coords.latitude, longitude: coords.longitude };
        setFocusPoint(point);
        if (forReport) setDraftPoint(point);
        setLocationStatus(forReport ? "Vendndodhja u vendos në raportim." : "Harta u përqendrua te ti.");
      },
      () => setLocationStatus("Vendndodhja nuk u lejua. Zgjidhe pikën në hartë."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  function openReport() {
    setReportOpen(true);
    setNotice("");
    window.history.replaceState(null, "", "#raporto");
  }

  function closeReport() {
    setReportOpen(false);
    window.history.replaceState(null, "", window.location.pathname);
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const type = String(form.get("type")) as IncidentType;
    const payload = {
      type,
      title: String(form.get("title")),
      description: String(form.get("description")),
      locationName: String(form.get("locationName")),
      severity: String(form.get("severity")),
      ...draftPoint,
    };

    setNotice("Duke e publikuar raportimin…");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json() as { report?: TrafficReport; error?: string };
      if (!response.ok || !data.report) throw new Error(data.error ?? "Raportimi nuk u ruajt.");
      setReports((current) => [data.report!, ...current]);
      setFocusPoint({ latitude: data.report.latitude, longitude: data.report.longitude });
      closeReport();
      setNotice("Raportimi u publikua. Faleminderit që po e ndihmon qytetin.");
      formElement.reset();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Raportimi nuk u ruajt.");
    }
  }

  async function confirmReport(id: string) {
    const response = await fetch(`/api/reports/${encodeURIComponent(id)}/confirm`, { method: "POST" });
    const data = await response.json() as { confirmations?: number; error?: string };
    if (!response.ok || typeof data.confirmations !== "number") {
      setNotice(data.error ?? "Konfirmimi nuk u ruajt.");
      return;
    }
    setReports((current) => current.map((report) => (
      report.id === id ? { ...report, confirmations: data.confirmations! } : report
    )));
  }

  return (
    <>
      <section className="page-shell traffic-stage" id="harta">
        <div className="map-heading">
          <div>
            <span className="live-pill"><i /> DIREKT</span>
            <strong>{reports.length} raportime aktive</strong>
          </div>
          <button className="map-location-button" type="button" onClick={() => useCurrentLocation()}>
            <LocateFixed size={18} aria-hidden="true" />
            <span>Vendndodhja ime</span>
          </button>
        </div>
        <div className="map-frame">
          <MapCanvas
            reports={reports}
            draftPoint={isReportOpen ? draftPoint : null}
            focusPoint={focusPoint}
            onPositionPick={(point) => {
              if (!isReportOpen) return;
              setDraftPoint(point);
              setLocationStatus("Pika e raportimit u zgjodh në hartë.");
            }}
          />
          <button className="map-report-button button button-primary" type="button" onClick={openReport}>
            + Raporto ngjarje
          </button>
          <div className="map-legend" aria-label="Legjenda e hartës">
            <span><i className="legend-jam" />Kolonë</span>
            <span><i className="legend-accident" />Aksident</span>
            <span><i className="legend-closure" />Mbyllje</span>
            <span><i className="legend-hazard" />Rrezik</span>
          </div>
        </div>
        {locationStatus && <p className="location-status" role="status">{locationStatus}</p>}
        {notice && !isReportOpen && <div className="success-toast" role="status"><Check size={18} />{notice}</div>}
      </section>
      <IncidentFeed
        reports={reports}
        onConfirm={confirmReport}
        onSelect={(report) => {
          setFocusPoint({ latitude: report.latitude, longitude: report.longitude });
          document.getElementById("harta")?.scrollIntoView({ behavior: "smooth" });
        }}
      />

      {isReportOpen && (
        <div className="report-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeReport();
        }}>
          <section className="report-sheet" id="raporto" role="dialog" aria-modal="true" aria-labelledby="report-title" ref={reportSheetRef} tabIndex={-1}>
            <div className="report-sheet-header">
              <div>
                <span className="eyebrow"><b />Raportim i ri</span>
                <h2 id="report-title">Çfarë po ndodh?</h2>
              </div>
              <button className="icon-button" type="button" onClick={closeReport} aria-label="Mbyll raportimin">
                <X size={21} />
              </button>
            </div>
            <form className="report-form" onSubmit={submitReport}>
              <fieldset>
                <legend>Lloji i ngjarjes</legend>
                <div className="incident-picker">
                  {(Object.entries(INCIDENT_TYPES) as [IncidentType, typeof INCIDENT_TYPES[IncidentType]][]).map(([value, type], index) => (
                    <label key={value}>
                      <input type="radio" name="type" value={value} defaultChecked={index === 0} required />
                      <span className={`incident-choice incident-choice-${value}`}><b>{type.icon}</b>{type.label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="field">
                <label htmlFor="report-title-input">Titulli</label>
                <input id="report-title-input" name="title" minLength={4} maxLength={100} placeholder="P.sh. kolonë e dendur te rrethi" required />
              </div>
              <div className="field">
                <label htmlFor="report-location">Vendndodhja</label>
                <div className="input-with-icon">
                  <MapPin size={17} aria-hidden="true" />
                  <input id="report-location" name="locationName" minLength={2} maxLength={120} placeholder="Rruga ose pika e njohur" required />
                </div>
                <div className="location-actions">
                  <button type="button" onClick={() => useCurrentLocation(true)}><Navigation size={15} />Përdor vendndodhjen time</button>
                  <span>ose prek hartën për ta vendosur pikën</span>
                </div>
              </div>
              <fieldset>
                <legend>Ndikimi në trafik</legend>
                <div className="severity-picker">
                  <label><input type="radio" name="severity" value="low" /><span>I ulët</span></label>
                  <label><input type="radio" name="severity" value="medium" defaultChecked /><span>Mesatar</span></label>
                  <label><input type="radio" name="severity" value="high" /><span>I lartë</span></label>
                </div>
              </fieldset>
              <div className="field">
                <label htmlFor="report-description">Detaje <small>opsionale</small></label>
                <textarea id="report-description" name="description" maxLength={400} placeholder="Kahja, korsia ose çfarë duhet ditur…" />
              </div>
              <p className="report-safety-note">Mos raporto gjatë vozitjes. Ndal në një vend të sigurt para se ta përdorësh platformën.</p>
              {notice && <p className="form-notice" role="status">{notice}</p>}
              <button className="button button-primary button-block" type="submit">Publiko raportimin</button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

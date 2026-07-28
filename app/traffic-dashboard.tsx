"use client";

import dynamic from "next/dynamic";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Check, LocateFixed, MapPin, Navigation, Route as RouteIcon, Search, Timer, TriangleAlert, X } from "lucide-react";
import type { DuplicateTrafficReport } from "../lib/duplicate-detection";
import { CLEAR_VOTES_REQUIRED } from "../lib/incident-lifecycle";
import type { RoutePlan } from "../lib/routing";
import { INCIDENT_TYPES, type IncidentType, type TrafficReport } from "../lib/traffic";
import { IncidentFeed } from "./incident-feed";

const MapCanvas = dynamic(() => import("./map-canvas"), {
  ssr: false,
  loading: () => <div className="map-loading" role="status">Duke ngarkuar hartën…</div>,
});

type Point = { latitude: number; longitude: number };
type ReportPayload = Point & {
  type: IncidentType;
  title: string;
  description: string;
  locationName: string;
  severity: string;
};

const EMPTY_POINT = { latitude: 42.6585, longitude: 21.1615 };

export function TrafficDashboard({ initialReports }: { initialReports: TrafficReport[] }) {
  const [reports, setReports] = useState(initialReports);
  const [isReportOpen, setReportOpen] = useState(false);
  const [draftPoint, setDraftPoint] = useState<Point>(EMPTY_POINT);
  const [hasPickedPoint, setHasPickedPoint] = useState(false);
  const [focusPoint, setFocusPoint] = useState<Point | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);
  const [duplicateCandidates, setDuplicateCandidates] = useState<DuplicateTrafficReport[]>([]);
  const [pendingPayload, setPendingPayload] = useState<ReportPayload | null>(null);
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);
  const [routeStatus, setRouteStatus] = useState("");
  const [isRouting, setRouting] = useState(false);
  const reportSheetRef = useRef<HTMLElement>(null);
  const reportFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#raporto") void openReport();
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    return () => window.removeEventListener("hashchange", openFromHash);
  }, []);

  useEffect(() => {
    async function refreshReports() {
      try {
        const response = await fetch("/api/reports", { headers: { accept: "application/json" } });
        const data = await response.json() as { reports?: TrafficReport[] };
        if (response.ok && data.reports) setReports(data.reports);
      } catch {
        // Keep the last good map state during a temporary connection failure.
      }
    }
    void refreshReports();
    const refresh = window.setInterval(refreshReports, 45_000);
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

  function locateCurrentPosition(forReport = false) {
    if (!navigator.geolocation) {
      setLocationStatus("Shfletuesi nuk e mbështet vendndodhjen.");
      return;
    }
    setLocationStatus("Duke gjetur vendndodhjen…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const point = { latitude: coords.latitude, longitude: coords.longitude };
        setFocusPoint(point);
        if (forReport) {
          setDraftPoint(point);
          setHasPickedPoint(true);
        }
        setLocationStatus(forReport ? "Vendndodhja u vendos në raportim." : "Harta u përqendrua te ti.");
      },
      () => setLocationStatus("Vendndodhja nuk u lejua. Zgjidhe pikën në hartë."),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function planRoute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isRouting) return;
    const destination = String(new FormData(event.currentTarget).get("destination") ?? "").trim();
    if (destination.length < 2) {
      setRouteStatus("Shkruaj një destinacion brenda Prishtinës.");
      return;
    }
    if (!navigator.geolocation) {
      setRouteStatus("Shfletuesi nuk e mbështet vendndodhjen për nisjen e rrugës.");
      return;
    }

    setRouting(true);
    setRouteStatus("Duke gjetur vendndodhjen dhe rrugën më të shpejtë…");
    try {
      const start = await new Promise<Point>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          ({ coords }) => resolve({ latitude: coords.latitude, longitude: coords.longitude }),
          reject,
          { enableHighAccuracy: true, timeout: 8000 },
        );
      });
      const params = new URLSearchParams({
        destination,
        latitude: String(start.latitude),
        longitude: String(start.longitude),
      });
      const response = await fetch(`/api/route?${params.toString()}`, {
        headers: { accept: "application/json" },
      });
      const data = await response.json() as { route?: RoutePlan; error?: string };
      if (!response.ok || !data.route) {
        throw new Error(data.error ?? "Rruga nuk u gjet.");
      }
      setRoutePlan(data.route);
      setFocusPoint(null);
      setRouteStatus("");
    } catch (error) {
      setRoutePlan(null);
      setRouteStatus(error instanceof Error && error.message
        ? error.message
        : "Lejo vendndodhjen për të planifikuar rrugën.");
    } finally {
      setRouting(false);
    }
  }

  function openReport() {
    setReportOpen(true);
    setNotice("");
    setDuplicateCandidates([]);
    setPendingPayload(null);
    window.history.replaceState(null, "", "#raporto");
  }

  function closeReport() {
    setReportOpen(false);
    window.history.replaceState(null, "", window.location.pathname);
  }

  async function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;
    if (!hasPickedPoint) {
      setNotice("Zgjidhe pikën e ngjarjes në hartë ose përdor vendndodhjen tënde.");
      return;
    }

    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const type = String(form.get("type")) as IncidentType;
    const payload: ReportPayload = {
      type,
      title: String(form.get("title")),
      description: String(form.get("description")),
      locationName: String(form.get("locationName")),
      severity: String(form.get("severity")),
      ...draftPoint,
    };
    setPendingPayload(payload);
    await publishReport(payload, formElement, false);
  }

  async function publishReport(payload: ReportPayload, formElement: HTMLFormElement, duplicateOverride: boolean) {
    setNotice("Duke e publikuar raportimin…");
    setDuplicateCandidates([]);
    setSubmitting(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...payload, duplicateOverride }),
      });
      const data = await response.json() as {
        report?: TrafficReport;
        duplicates?: DuplicateTrafficReport[];
        error?: string;
      };
      if (response.status === 409 && data.duplicates?.length) {
        setDuplicateCandidates(data.duplicates);
        setNotice("");
        return;
      }
      if (!response.ok || !data.report) throw new Error(data.error ?? "Raportimi nuk u ruajt.");
      setReports((current) => [data.report!, ...current]);
      setFocusPoint({ latitude: data.report.latitude, longitude: data.report.longitude });
      closeReport();
      setNotice("Raportimi u publikua. Faleminderit që po e ndihmon qytetin.");
      formElement.reset();
      setDraftPoint(EMPTY_POINT);
      setHasPickedPoint(false);
      setPendingPayload(null);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Raportimi nuk u ruajt.");
    } finally {
      setSubmitting(false);
    }
  }

  async function confirmReport(id: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(id)}/confirm`, { method: "POST" });
      const data = await response.json() as { confirmations?: number; clearVotes?: number; error?: string };
      if (!response.ok || typeof data.confirmations !== "number" || typeof data.clearVotes !== "number") {
        setNotice(data.error ?? "Konfirmimi nuk u ruajt.");
        return false;
      }
      setReports((current) => current.map((report) => (
        report.id === id
          ? { ...report, confirmations: data.confirmations!, clearVotes: data.clearVotes!, lastConfirmedAt: new Date().toISOString() }
          : report
      )));
      return true;
    } catch {
      setNotice("Konfirmimi nuk u ruajt. Kontrollo lidhjen dhe provo përsëri.");
      return false;
    }
  }

  async function confirmDuplicate(report: DuplicateTrafficReport) {
    if (isSubmitting) return;
    setSubmitting(true);
    try {
      const saved = await confirmReport(report.id);
      if (!saved) return;
      setFocusPoint({ latitude: report.latitude, longitude: report.longitude });
      setDuplicateCandidates([]);
      setPendingPayload(null);
      setDraftPoint(EMPTY_POINT);
      setHasPickedPoint(false);
      reportFormRef.current?.reset();
      closeReport();
      setNotice("Konfirmove raportimin ekzistues. Faleminderit që shmange një dublikatë.");
    } finally {
      setSubmitting(false);
    }
  }

  async function clearReport(id: string): Promise<{ saved: boolean; cleared: boolean }> {
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(id)}/clear`, { method: "POST" });
      const data = await response.json() as { clearVotes?: number; cleared?: boolean; error?: string };
      if (!response.ok || typeof data.clearVotes !== "number" || typeof data.cleared !== "boolean") {
        setNotice(data.error ?? "Vota për mbyllje nuk u ruajt.");
        return { saved: false, cleared: false };
      }
      if (data.cleared) {
        setReports((current) => current.filter((report) => report.id !== id));
        setNotice("Raportimi u mbyll nga komuniteti. Faleminderit për përditësimin.");
      } else {
        setReports((current) => current.map((report) => (
          report.id === id ? { ...report, clearVotes: data.clearVotes! } : report
        )));
        setNotice(`Vota u ruajt. Duhen edhe ${Math.max(0, CLEAR_VOTES_REQUIRED - data.clearVotes)} për ta mbyllur raportimin.`);
      }
      return { saved: true, cleared: data.cleared };
    } catch {
      setNotice("Vota për mbyllje nuk u ruajt. Kontrollo lidhjen dhe provo përsëri.");
      return { saved: false, cleared: false };
    }
  }

  return (
    <>
      <section className="page-shell traffic-stage" id="harta">
        <div className="map-heading">
          <div>
            <span className="live-pill"><i /> DIREKT</span>
            <strong>{reports.length} raportime aktive</strong>
          </div>
          <button className="map-location-button" type="button" onClick={() => locateCurrentPosition()}>
            <LocateFixed size={18} aria-hidden="true" />
            <span>Vendndodhja ime</span>
          </button>
        </div>
        <form className="route-planner" onSubmit={planRoute}>
          <label htmlFor="route-destination"><RouteIcon size={18} aria-hidden="true" /> Planifiko rrugën</label>
          <div className="route-search">
            <Search size={17} aria-hidden="true" />
            <input
              id="route-destination"
              name="destination"
              minLength={2}
              maxLength={120}
              placeholder="Destinacioni, p.sh. Biblioteka Kombëtare"
              required
            />
            <button className="button button-primary" type="submit" disabled={isRouting}>
              {isRouting ? "Duke kërkuar…" : "Gjej rrugën"}
            </button>
          </div>
          <small className="route-privacy">Vendndodhja jote përdoret vetëm kur kërkon një rrugë dhe nuk ruhet.</small>
          {routeStatus && <p className="route-status" role="status">{routeStatus}</p>}
          {routePlan && (
            <div className="route-summary" aria-live="polite">
              <div>
                <strong>{routePlan.destination}</strong>
                <span><Timer size={15} /> {Math.max(1, Math.round(routePlan.durationSeconds / 60))} min</span>
                <span>{(routePlan.distanceMeters / 1000).toFixed(1)} km</span>
                <span>Dijkstra · {routePlan.evaluatedAlternatives} alternativa</span>
                {routePlan.incidentDelaySeconds > 0 && (
                  <span className="has-incidents">
                    +{Math.max(1, Math.round(routePlan.incidentDelaySeconds / 60))} min nga trafiku
                  </span>
                )}
                <span className={routePlan.incidentIds.length > 0 ? "has-incidents" : ""}>
                  <TriangleAlert size={15} /> {routePlan.incidentIds.length} incidente pranë rrugës
                </span>
              </div>
              <button type="button" onClick={() => setRoutePlan(null)}>Hiqe rrugën</button>
            </div>
          )}
        </form>
        <div className="map-frame">
          <MapCanvas
            reports={reports}
            draftPoint={isReportOpen && hasPickedPoint ? draftPoint : null}
            focusPoint={focusPoint}
            routePlan={routePlan}
            onPositionPick={(point) => {
              if (!isReportOpen) return;
              setDraftPoint(point);
              setHasPickedPoint(true);
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
        onClear={clearReport}
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
            <form
              className="report-form"
              onSubmit={submitReport}
              onChange={() => {
                if (duplicateCandidates.length > 0) {
                  setDuplicateCandidates([]);
                  setPendingPayload(null);
                }
              }}
              ref={reportFormRef}
            >
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
                  <button type="button" onClick={() => locateCurrentPosition(true)}><Navigation size={15} />Përdor vendndodhjen time</button>
                  <span>ose zgjidhe pikën në hartën më poshtë</span>
                </div>
              </div>
              <div className="report-location-map" aria-label="Zgjidhe pikën e ngjarjes në hartë">
                <MapCanvas
                  reports={[]}
                  draftPoint={hasPickedPoint ? draftPoint : null}
                  focusPoint={hasPickedPoint ? draftPoint : null}
                  onPositionPick={(point) => {
                    setDraftPoint(point);
                    setHasPickedPoint(true);
                    setLocationStatus("Pika e raportimit u zgjodh në hartë.");
                    setNotice("");
                  }}
                />
                <span className={hasPickedPoint ? "map-pick-status is-picked" : "map-pick-status"}>
                  {hasPickedPoint ? "Pika u zgjodh" : "Prek hartën për ta vendosur pikën"}
                </span>
              </div>
              {duplicateCandidates.length > 0 && (
                <aside className="duplicate-panel" aria-labelledby="duplicate-title">
                  <div>
                    <strong id="duplicate-title">Gjetëm raportime të ngjashme afër</strong>
                    <span>Konfirmo njërin prej tyre për ta mbajtur hartën të pastër.</span>
                  </div>
                  <div className="duplicate-list">
                    {duplicateCandidates.map((candidate) => (
                      <article key={candidate.id}>
                        <span className={`incident-badge incident-${candidate.type}`}>{INCIDENT_TYPES[candidate.type].label}</span>
                        <strong>{candidate.title}</strong>
                        <small>{candidate.locationName} · {candidate.distanceMeters} m larg · {candidate.confirmations} konfirmime</small>
                        <button type="button" disabled={isSubmitting} onClick={() => void confirmDuplicate(candidate)}>
                          <Check size={15} /> Konfirmo këtë
                        </button>
                      </article>
                    ))}
                  </div>
                  <button
                    className="duplicate-continue"
                    type="button"
                    disabled={isSubmitting || !pendingPayload}
                    onClick={() => {
                      if (pendingPayload && reportFormRef.current) {
                        void publishReport(pendingPayload, reportFormRef.current, true);
                      }
                    }}
                  >
                    Është ngjarje tjetër — publiko gjithsesi
                  </button>
                </aside>
              )}
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
              <p className="report-account-note">Raportimi mund të publikohet pa llogari. Nëse je i kyçur në Prishtina.online, ai lidhet automatikisht me llogarinë tënde.</p>
              {notice && <p className="form-notice" role="status">{notice}</p>}
              <button className="button button-primary button-block" type="submit" disabled={isSubmitting} aria-busy={isSubmitting}>
                {isSubmitting ? "Duke publikuar…" : "Publiko raportimin"}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

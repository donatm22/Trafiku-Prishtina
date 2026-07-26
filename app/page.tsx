import { listTrafficReports } from "../db/traffic-store";
import { SEED_REPORTS, type TrafficReport } from "../lib/traffic";
import { InfoSections } from "./info-sections";
import { TrafficDashboard } from "./traffic-dashboard";

export const dynamic = "force-dynamic";

export default async function Home() {
  let reports: TrafficReport[];
  try {
    reports = await listTrafficReports();
  } catch {
    reports = SEED_REPORTS;
  }

  return (
    <main>
      <section className="traffic-intro">
        <div className="page-shell intro-inner">
          <div>
            <span className="eyebrow"><b />Trafiku në kohë reale</span>
            <h1>Shihe trafikun.<br /><em>Raporto çfarë po ndodh.</em></h1>
            <p>Informacion nga qytetarët për lëvizje më të mençur nëpër Prishtinë.</p>
          </div>
          <a className="button button-primary" href="#raporto">+ Raporto ngjarje</a>
        </div>
      </section>
      <TrafficDashboard initialReports={reports.length ? reports : SEED_REPORTS} />
      <InfoSections />
    </main>
  );
}

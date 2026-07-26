import { env } from "cloudflare:workers";
import { SEED_REPORTS, type IncidentType, type TrafficReport } from "../lib/traffic";

type NewTrafficReport = Pick<
  TrafficReport,
  "type" | "title" | "description" | "locationName" | "latitude" | "longitude" | "severity"
>;

const createTableSql = `CREATE TABLE IF NOT EXISTS traffic_reports (
  id TEXT PRIMARY KEY NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('jam','accident','closure','hazard')),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  location_name TEXT NOT NULL,
  latitude REAL NOT NULL,
  longitude REAL NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low','medium','high')),
  confirmations INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
)`;

let initialized = false;

function getBinding(): D1Database {
  if (!env.DB) throw new Error("D1 binding DB is unavailable");
  return env.DB;
}

export async function ensureTrafficSchema() {
  if (initialized) return;
  const db = getBinding();
  await db.batch([
    db.prepare(createTableSql),
    db.prepare("CREATE INDEX IF NOT EXISTS traffic_reports_expires_idx ON traffic_reports (expires_at)"),
    db.prepare("CREATE INDEX IF NOT EXISTS traffic_reports_type_idx ON traffic_reports (type)"),
  ]);

  const count = await db.prepare("SELECT COUNT(*) AS count FROM traffic_reports").first<{ count: number }>();
  if (!count?.count) {
    await db.batch(
      SEED_REPORTS.map((report) =>
        db.prepare(`INSERT OR IGNORE INTO traffic_reports
          (id,type,title,description,location_name,latitude,longitude,severity,confirmations,created_at,expires_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
          .bind(
            report.id,
            report.type,
            report.title,
            report.description,
            report.locationName,
            report.latitude,
            report.longitude,
            report.severity,
            report.confirmations,
            report.createdAt,
            report.expiresAt,
          ),
      ),
    );
  }
  initialized = true;
}

export async function listTrafficReports(): Promise<TrafficReport[]> {
  await ensureTrafficSchema();
  const result = await getBinding()
    .prepare(`SELECT id,type,title,description,location_name AS locationName,
      latitude,longitude,severity,confirmations,created_at AS createdAt,expires_at AS expiresAt
      FROM traffic_reports WHERE expires_at > ? ORDER BY created_at DESC LIMIT 100`)
    .bind(new Date().toISOString())
    .all<TrafficReport>();
  return result.results;
}

export async function createTrafficReport(input: NewTrafficReport): Promise<TrafficReport> {
  await ensureTrafficSchema();
  const now = new Date();
  const durationHours: Record<IncidentType, number> = {
    jam: 2,
    accident: 3,
    closure: 8,
    hazard: 12,
  };
  const report: TrafficReport = {
    ...input,
    id: crypto.randomUUID(),
    confirmations: 1,
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + durationHours[input.type] * 60 * 60 * 1000).toISOString(),
  };
  await getBinding()
    .prepare(`INSERT INTO traffic_reports
      (id,type,title,description,location_name,latitude,longitude,severity,confirmations,created_at,expires_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .bind(
      report.id,
      report.type,
      report.title,
      report.description,
      report.locationName,
      report.latitude,
      report.longitude,
      report.severity,
      report.confirmations,
      report.createdAt,
      report.expiresAt,
    )
    .run();
  return report;
}

export async function confirmTrafficReport(id: string): Promise<number | null> {
  await ensureTrafficSchema();
  const result = await getBinding()
    .prepare("UPDATE traffic_reports SET confirmations = confirmations + 1 WHERE id = ? AND expires_at > ?")
    .bind(id, new Date().toISOString())
    .run();
  if (!result.meta.changes) return null;
  const row = await getBinding()
    .prepare("SELECT confirmations FROM traffic_reports WHERE id = ?")
    .bind(id)
    .first<{ confirmations: number }>();
  return row?.confirmations ?? null;
}

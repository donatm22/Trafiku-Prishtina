import { env } from "cloudflare:workers";
import { findDuplicateCandidates, type DuplicateTrafficReport } from "../lib/duplicate-detection";
import { CLEAR_VOTES_REQUIRED, type IncidentLifecycleUpdate } from "../lib/incident-lifecycle";
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
  clear_votes INTEGER NOT NULL DEFAULT 0,
  reporter_email TEXT,
  last_confirmed_at TEXT,
  cleared_at TEXT,
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
    db.prepare("CREATE INDEX IF NOT EXISTS traffic_reports_cleared_idx ON traffic_reports (cleared_at)"),
  ]);
  const columns = await db.prepare("PRAGMA table_info(traffic_reports)").all<{ name: string }>();
  if (!columns.results.some((column) => column.name === "reporter_email")) {
    await db.prepare("ALTER TABLE traffic_reports ADD COLUMN reporter_email TEXT").run();
  }
  if (!columns.results.some((column) => column.name === "clear_votes")) {
    await db.prepare("ALTER TABLE traffic_reports ADD COLUMN clear_votes INTEGER NOT NULL DEFAULT 0").run();
  }
  if (!columns.results.some((column) => column.name === "last_confirmed_at")) {
    await db.prepare("ALTER TABLE traffic_reports ADD COLUMN last_confirmed_at TEXT").run();
  }
  if (!columns.results.some((column) => column.name === "cleared_at")) {
    await db.prepare("ALTER TABLE traffic_reports ADD COLUMN cleared_at TEXT").run();
  }
  await db.prepare("UPDATE traffic_reports SET last_confirmed_at = created_at WHERE last_confirmed_at IS NULL").run();

  const count = await db.prepare("SELECT COUNT(*) AS count FROM traffic_reports").first<{ count: number }>();
  if (!count?.count) {
    await db.batch(
      SEED_REPORTS.map((report) =>
        db.prepare(`INSERT OR IGNORE INTO traffic_reports
          (id,type,title,description,location_name,latitude,longitude,severity,confirmations,clear_votes,last_confirmed_at,created_at,expires_at)
          VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`)
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
            report.clearVotes,
            report.lastConfirmedAt,
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
  const now = new Date();
  const staleCutoffs = {
    jam: new Date(now.getTime() - 45 * 60 * 1000).toISOString(),
    accident: new Date(now.getTime() - 75 * 60 * 1000).toISOString(),
    closure: new Date(now.getTime() - 4 * 60 * 60 * 1000).toISOString(),
    hazard: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
  };
  const result = await getBinding()
    .prepare(`SELECT id,type,title,description,location_name AS locationName,
      latitude,longitude,severity,confirmations,clear_votes AS clearVotes,
      COALESCE(last_confirmed_at,created_at) AS lastConfirmedAt,
      created_at AS createdAt,expires_at AS expiresAt
      FROM traffic_reports
      WHERE cleared_at IS NULL AND expires_at > ? AND (
        (type = 'jam' AND COALESCE(last_confirmed_at,created_at) > ?) OR
        (type = 'accident' AND COALESCE(last_confirmed_at,created_at) > ?) OR
        (type = 'closure' AND COALESCE(last_confirmed_at,created_at) > ?) OR
        (type = 'hazard' AND COALESCE(last_confirmed_at,created_at) > ?)
      )
      ORDER BY created_at DESC LIMIT 100`)
    .bind(now.toISOString(), staleCutoffs.jam, staleCutoffs.accident, staleCutoffs.closure, staleCutoffs.hazard)
    .all<TrafficReport>();
  return result.results;
}

export async function createTrafficReport(input: NewTrafficReport, reporterEmail: string | null = null): Promise<TrafficReport> {
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
    clearVotes: 0,
    lastConfirmedAt: now.toISOString(),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + durationHours[input.type] * 60 * 60 * 1000).toISOString(),
  };
  await getBinding()
    .prepare(`INSERT INTO traffic_reports
      (id,type,title,description,location_name,latitude,longitude,severity,confirmations,clear_votes,reporter_email,last_confirmed_at,created_at,expires_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
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
      report.clearVotes,
      reporterEmail,
      report.lastConfirmedAt,
      report.createdAt,
      report.expiresAt,
    )
    .run();
  return report;
}

export async function findDuplicateTrafficReports(
  input: Pick<TrafficReport, "type" | "latitude" | "longitude">,
): Promise<DuplicateTrafficReport[]> {
  return findDuplicateCandidates(await listTrafficReports(), input);
}

export async function confirmTrafficReport(id: string): Promise<IncidentLifecycleUpdate | null> {
  await ensureTrafficSchema();
  const now = new Date().toISOString();
  const result = await getBinding()
    .prepare(`UPDATE traffic_reports
      SET confirmations = confirmations + 1,
          clear_votes = MAX(clear_votes - 1, 0),
          last_confirmed_at = ?
      WHERE id = ? AND cleared_at IS NULL AND expires_at > ?`)
    .bind(now, id, now)
    .run();
  if (!result.meta.changes) return null;
  const row = await getBinding()
    .prepare("SELECT confirmations, clear_votes AS clearVotes FROM traffic_reports WHERE id = ?")
    .bind(id)
    .first<{ confirmations: number; clearVotes: number }>();
  return row ? { ...row, cleared: false } : null;
}

export async function clearTrafficReport(id: string): Promise<IncidentLifecycleUpdate | null> {
  await ensureTrafficSchema();
  const now = new Date().toISOString();
  const result = await getBinding()
    .prepare(`UPDATE traffic_reports
      SET clear_votes = clear_votes + 1,
          cleared_at = CASE WHEN clear_votes + 1 >= ? THEN ? ELSE NULL END
      WHERE id = ? AND cleared_at IS NULL AND expires_at > ?`)
    .bind(CLEAR_VOTES_REQUIRED, now, id, now)
    .run();
  if (!result.meta.changes) return null;
  const row = await getBinding()
    .prepare("SELECT confirmations, clear_votes AS clearVotes, cleared_at AS clearedAt FROM traffic_reports WHERE id = ?")
    .bind(id)
    .first<{ confirmations: number; clearVotes: number; clearedAt: string | null }>();
  return row ? { confirmations: row.confirmations, clearVotes: row.clearVotes, cleared: Boolean(row.clearedAt) } : null;
}

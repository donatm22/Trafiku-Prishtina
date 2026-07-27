import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const trafficReports = sqliteTable(
  "traffic_reports",
  {
    id: text("id").primaryKey(),
    type: text("type", { enum: ["jam", "accident", "closure", "hazard"] }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    locationName: text("location_name").notNull(),
    latitude: real("latitude").notNull(),
    longitude: real("longitude").notNull(),
    severity: text("severity", { enum: ["low", "medium", "high"] }).notNull(),
    confirmations: integer("confirmations").notNull().default(1),
    clearVotes: integer("clear_votes").notNull().default(0),
    reporterEmail: text("reporter_email"),
    lastConfirmedAt: text("last_confirmed_at"),
    clearedAt: text("cleared_at"),
    createdAt: text("created_at").notNull(),
    expiresAt: text("expires_at").notNull(),
  },
  (table) => [
    index("traffic_reports_expires_idx").on(table.expiresAt),
    index("traffic_reports_type_idx").on(table.type),
    index("traffic_reports_cleared_idx").on(table.clearedAt),
  ],
);
